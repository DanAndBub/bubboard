/**
 * Integration tests for GET /api/admin/anthropic/usage
 *
 * The route fetches usage and cost data from the Anthropic Admin API and
 * requires a valid Bearer token (DRIFTWATCH_ADMIN_SECRET) and an
 * ANTHROPIC_ADMIN_KEY env var.
 *
 * Test strategy:
 * - MSW intercepts outbound fetch calls at the network level — the route runs
 *   unmodified and is unaware of the mock.
 * - All secrets are fake placeholder strings; no real credentials are used.
 * - Env vars are set/torn down around each test via beforeEach/afterEach.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { GET } from '../anthropic/usage/route';

// ---------------------------------------------------------------------------
// Fake credentials — never use real keys in source code or tests
// ---------------------------------------------------------------------------
const FAKE_ADMIN_SECRET = 'fake-driftwatch-secret';
const FAKE_ANTHROPIC_KEY = 'fake-anthropic-admin-key';

const USAGE_URL = 'https://api.anthropic.com/v1/organizations/usage_report/messages';
const COST_URL  = 'https://api.anthropic.com/v1/organizations/cost_report';

// ---------------------------------------------------------------------------
// MSW server — intercepts at the network boundary
// ---------------------------------------------------------------------------
const usagePayload = { data: [{ model: 'claude-sonnet-4-6', tokens: 1000 }] };
const costPayload  = { data: [{ model: 'claude-sonnet-4-6', cost: 0.50 }] };

const server = setupServer(
  http.get(USAGE_URL, () => HttpResponse.json(usagePayload)),
  http.get(COST_URL,  () => HttpResponse.json(costPayload)),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Builds a NextRequest with an Authorization header. */
function makeRequest(token: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/anthropic/usage');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---------------------------------------------------------------------------
// Env setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  process.env.DRIFTWATCH_ADMIN_SECRET = FAKE_ADMIN_SECRET;
  process.env.ANTHROPIC_ADMIN_KEY = FAKE_ANTHROPIC_KEY;
});

afterEach(() => {
  server.resetHandlers();
  delete process.env.DRIFTWATCH_ADMIN_SECRET;
  delete process.env.ANTHROPIC_ADMIN_KEY;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/admin/anthropic/usage', () => {
  describe('authentication', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/anthropic/usage');
      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/unauthorized/i);
    });

    it('returns 401 for a wrong Bearer token', async () => {
      const res = await GET(makeRequest('wrong-secret'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when DRIFTWATCH_ADMIN_SECRET is not configured', async () => {
      delete process.env.DRIFTWATCH_ADMIN_SECRET;
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(401);
    });
  });

  describe('server configuration', () => {
    it('returns available:false with reason no_admin_key when ANTHROPIC_ADMIN_KEY is missing', async () => {
      delete process.env.ANTHROPIC_ADMIN_KEY;
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
      expect(data.provider).toBe('anthropic');
      expect(data.usage).toEqual(usagePayload);
      expect(data.costs).toEqual(costPayload);
      expect(data.fetched_at).toBeTruthy();
    });

    it('sends the ANTHROPIC_ADMIN_KEY as x-api-key to Anthropic', async () => {
      let capturedKey: string | null = null;
      server.use(
        http.get(USAGE_URL, ({ request }) => {
          capturedKey = request.headers.get('x-api-key');
          return HttpResponse.json(usagePayload);
        }),
      );
      await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(capturedKey).toBe(FAKE_ANTHROPIC_KEY);
    });

    it('forwards query params to the Anthropic usage API', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get(USAGE_URL, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(usagePayload);
        }),
      );
      await GET(makeRequest(FAKE_ADMIN_SECRET, {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-31T00:00:00Z',
        bucket_width: '7d',
      }));
      expect(capturedUrl).toContain('starting_at=2024-01-01');
      expect(capturedUrl).toContain('bucket_width=7d');
    });

    it('returns costs:null when the cost endpoint fails, but still succeeds overall', async () => {
      server.use(http.get(COST_URL, () => HttpResponse.json({}, { status: 500 })));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.available).toBe(true);
      expect(data.costs).toBeNull();
    });
  });

  describe('upstream error handling', () => {
    it('forwards Anthropic API error status when usage endpoint fails', async () => {
      server.use(http.get(USAGE_URL, () => HttpResponse.json({ error: 'forbidden' }, { status: 403 })));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('api_error');
    });

    it('returns 500 with reason fetch_error when the network call throws', async () => {
      server.use(http.get(USAGE_URL, () => HttpResponse.error()));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.available).toBe(false);
      expect(data.reason).toBe('fetch_error');
    });
  });
});
