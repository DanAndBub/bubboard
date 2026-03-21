/**
 * Integration tests for GET /api/admin/openai/usage
 *
 * The route fetches completions usage and cost data from the OpenAI Admin API
 * using Unix timestamp query params. Requires a valid Bearer token and
 * OPENAI_ADMIN_KEY env var.
 *
 * Test strategy:
 * - MSW intercepts outbound fetch calls at the network level.
 * - All secrets are fake placeholder strings; no real credentials are used.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { GET } from '../openai/usage/route';

const FAKE_ADMIN_SECRET = 'fake-driftwatch-secret';
const FAKE_OPENAI_KEY   = 'fake-openai-admin-key';

const COMPLETIONS_URL = 'https://api.openai.com/v1/organization/usage/completions';
const COSTS_URL       = 'https://api.openai.com/v1/organization/costs';

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------
const usagePayload = { data: [{ model: 'gpt-4.1', tokens: 500 }] };
const costPayload  = { data: [{ model: 'gpt-4.1', cost: 0.25 }] };

const server = setupServer(
  http.get(COMPLETIONS_URL, () => HttpResponse.json(usagePayload)),
  http.get(COSTS_URL,       () => HttpResponse.json(costPayload)),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

function makeRequest(token: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/openai/usage');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

beforeEach(() => {
  process.env.DRIFTWATCH_ADMIN_SECRET = FAKE_ADMIN_SECRET;
  process.env.OPENAI_ADMIN_KEY = FAKE_OPENAI_KEY;
});

afterEach(() => {
  server.resetHandlers();
  delete process.env.DRIFTWATCH_ADMIN_SECRET;
  delete process.env.OPENAI_ADMIN_KEY;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/admin/openai/usage', () => {
  describe('authentication', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/openai/usage');
      const res = await GET(req);
      expect(res.status).toBe(401);
      expect((await res.json()).error).toMatch(/unauthorized/i);
    });

    it('returns 401 for a wrong Bearer token', async () => {
      const res = await GET(makeRequest('bad-token'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when DRIFTWATCH_ADMIN_SECRET is not configured', async () => {
      delete process.env.DRIFTWATCH_ADMIN_SECRET;
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(401);
    });
  });

  describe('server configuration', () => {
    it('returns available:false with reason no_admin_key when OPENAI_ADMIN_KEY is missing', async () => {
      delete process.env.OPENAI_ADMIN_KEY;
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('no_admin_key');
    });
  });

  describe('successful response', () => {
    it('returns available:true with usage and cost data', async () => {
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.available).toBe(true);
      expect(data.provider).toBe('openai');
      expect(data.usage).toEqual(usagePayload);
      expect(data.costs).toEqual(costPayload);
      expect(data.fetched_at).toBeTruthy();
    });

    it('sends the OPENAI_ADMIN_KEY as Authorization Bearer to OpenAI', async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get(COMPLETIONS_URL, ({ request }) => {
          capturedAuth = request.headers.get('authorization');
          return HttpResponse.json(usagePayload);
        }),
      );
      await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(capturedAuth).toBe(`Bearer ${FAKE_OPENAI_KEY}`);
    });

    it('returns costs:null when the costs endpoint fails but usage succeeds', async () => {
      server.use(http.get(COSTS_URL, () => HttpResponse.json({}, { status: 500 })));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.available).toBe(true);
      expect(data.costs).toBeNull();
    });
  });

  describe('upstream error handling', () => {
    it('forwards OpenAI API error status when completions endpoint fails', async () => {
      server.use(http.get(COMPLETIONS_URL, () => HttpResponse.json({ error: 'forbidden' }, { status: 403 })));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('api_error');
    });

    it('returns 500 with reason fetch_error when the network call throws', async () => {
      server.use(http.get(COMPLETIONS_URL, () => HttpResponse.error()));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('fetch_error');
    });
  });
});
