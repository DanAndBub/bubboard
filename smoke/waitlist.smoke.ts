/**
 * Smoke test — POST /api/waitlist
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

describe.skipIf(!process.env.SMOKE)('POST /api/waitlist [smoke]', () => {
  beforeAll(() => {
    // These are consumed server-side — we validate they exist here so the
    // test fails fast with a clear message rather than an unexpected 500.
    requireEnv('AIRTABLE_BASE_ID');
    requireEnv('AIRTABLE_API_KEY');
  });

  it('route is reachable and env vars are configured (returns 400 for missing email, not 500)', async () => {
    const res = await publicPost('/api/waitlist', {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/email is required/i);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await publicPost('/api/waitlist', { email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});
