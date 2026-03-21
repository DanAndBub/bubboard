/**
 * Integration tests for GET /api/admin/anthropic/history
 *
 * The route paginates through Anthropic's usage_report API (up to 20 pages)
 * and returns flattened daily buckets. Requires a valid Bearer token and
 * ANTHROPIC_ADMIN_KEY env var.
 *
 * Test strategy:
 * - MSW intercepts outbound fetch calls at the network level.
 * - Pagination is tested by having MSW return has_more:true on the first call
 *   and has_more:false on the second.
 * - All secrets are fake placeholder strings; no real credentials are used.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { NextRequest } from 'next/server';
import { GET } from '../anthropic/history/route';

const FAKE_ADMIN_SECRET  = 'fake-driftwatch-secret';
const FAKE_ANTHROPIC_KEY = 'fake-anthropic-admin-key';
const HISTORY_URL = 'https://api.anthropic.com/v1/organizations/usage_report/messages';

// ---------------------------------------------------------------------------
// Reusable MSW server
// ---------------------------------------------------------------------------
const singlePagePayload = {
  data: [
    { starting_at: '2024-01-15T00:00:00Z', results: [{ model: 'claude-sonnet-4-6', tokens: 100 }] },
  ],
  has_more: false,
};

const server = setupServer(
  http.get(HISTORY_URL, () => HttpResponse.json(singlePagePayload)),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

function makeRequest(token: string, params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/anthropic/history');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

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
describe('GET /api/admin/anthropic/history', () => {
  describe('authentication', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost/api/admin/anthropic/history');
      const res = await GET(req);
      expect(res.status).toBe(401);
      expect((await res.json()).error).toMatch(/unauthorized/i);
    });

    it('returns 401 for a wrong Bearer token', async () => {
      const res = await GET(makeRequest('not-the-secret'));
      expect(res.status).toBe(401);
    });
  });

  describe('server configuration', () => {
    it('returns 400 when ANTHROPIC_ADMIN_KEY is missing', async () => {
      delete process.env.ANTHROPIC_ADMIN_KEY;
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/no admin key/i);
    });
  });

  describe('successful response', () => {
    it('returns days array and total_days on success', async () => {
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.days).toHaveLength(1);
      expect(data.days[0].date).toBe('2024-01-15');
      expect(data.total_days).toBe(1);
      expect(data.fetched_at).toBeTruthy();
    });

    it('sends the ANTHROPIC_ADMIN_KEY as x-api-key', async () => {
      let capturedKey: string | null = null;
      server.use(
        http.get(HISTORY_URL, ({ request }) => {
          capturedKey = request.headers.get('x-api-key');
          return HttpResponse.json(singlePagePayload);
        }),
      );
      await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(capturedKey).toBe(FAKE_ANTHROPIC_KEY);
    });

    it('skips buckets with empty results', async () => {
      server.use(
        http.get(HISTORY_URL, () => HttpResponse.json({
          data: [
            { starting_at: '2024-01-15T00:00:00Z', results: [] },
            { starting_at: '2024-01-16T00:00:00Z', results: [{ model: 'claude-opus-4-6', tokens: 50 }] },
          ],
          has_more: false,
        })),
      );
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      const data = await res.json();
      expect(data.days).toHaveLength(1);
      expect(data.days[0].date).toBe('2024-01-16');
    });
  });

  describe('pagination', () => {
    it('follows has_more and fetches subsequent pages', async () => {
      let callCount = 0;
      server.use(
        http.get(HISTORY_URL, () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({
              data: [{ starting_at: '2024-01-15T00:00:00Z', results: [{ model: 'claude-sonnet-4-6', tokens: 100 }] }],
              has_more: true,
              next_page: 'page-2-token',
            });
          }
          return HttpResponse.json({
            data: [{ starting_at: '2024-01-16T00:00:00Z', results: [{ model: 'claude-sonnet-4-6', tokens: 200 }] }],
            has_more: false,
          });
        }),
      );
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      const data = await res.json();
      expect(callCount).toBe(2);
      expect(data.days).toHaveLength(2);
      expect(data.total_days).toBe(2);
    });
  });

  describe('upstream error handling', () => {
    it('forwards Anthropic API error status', async () => {
      server.use(http.get(HISTORY_URL, () => HttpResponse.json({ error: 'rate_limited' }, { status: 429 })));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toMatch(/anthropic api error/i);
    });

    it('returns 500 when the network call throws', async () => {
      server.use(http.get(HISTORY_URL, () => HttpResponse.error()));
      const res = await GET(makeRequest(FAKE_ADMIN_SECRET));
      expect(res.status).toBe(500);
    });
  });
});
