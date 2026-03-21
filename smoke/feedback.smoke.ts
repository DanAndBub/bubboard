/**
 * Smoke test — POST /api/feedback
 *
 * Uses the invalid-payload strategy: deliberately sends a bad request and
 * asserts HTTP 400. This confirms the route is reachable and Airtable env
 * vars are configured (a misconfigured server returns 500, not 400).
 *
 * No data is written to Airtable — zero side effects.
 *
 * Run with: npm run test:smoke
 * Requires: AIRTABLE_BASE_ID, AIRTABLE_API_KEY in .env.local (server-side)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { requireEnv } from './helpers/env';
import { publicPost } from './helpers/request';

describe.skipIf(!process.env.SMOKE)('POST /api/feedback [smoke]', () => {
  beforeAll(() => {
    requireEnv('AIRTABLE_BASE_ID');
    requireEnv('AIRTABLE_API_KEY');
  });

  it('route is reachable and env vars are configured (returns 400 for missing fields, not 500)', async () => {
    const res = await publicPost('/api/feedback', { message: 'hello' }); // missing type
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing required fields/i);
  });

  it('returns 400 for an invalid type', async () => {
    const res = await publicPost('/api/feedback', { type: 'spam', message: 'hello' });
    expect(res.status).toBe(400);
  });
});
