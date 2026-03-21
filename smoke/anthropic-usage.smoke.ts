/**
 * Smoke test — GET /api/admin/anthropic/usage
 *
 * Confirms the Anthropic Admin API integration is alive:
 * credentials are valid, the endpoint responds, and the response
 * shape matches what the app expects.
 *
 * Run with: npm run test:smoke
 * Requires: DRIFTWATCH_ADMIN_SECRET, ANTHROPIC_ADMIN_KEY in .env.local
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { requireEnv } from './helpers/env';
import { adminGet } from './helpers/request';

// Skip entire suite if SMOKE flag is not explicitly set — prevents
// accidental runs in CI where credentials are not available.
describe.skipIf(!process.env.SMOKE)('GET /api/admin/anthropic/usage [smoke]', () => {
  let adminSecret: string;

  beforeAll(() => {
    adminSecret = requireEnv('DRIFTWATCH_ADMIN_SECRET');
    requireEnv('ANTHROPIC_ADMIN_KEY'); // consumed server-side; validated here to fail fast
  });

  it('returns HTTP 200', async () => {
    const res = await adminGet('/api/admin/anthropic/usage', adminSecret);
    expect(res.status).toBe(200);
  });

  it('returns available:true with provider anthropic', async () => {
    const res = await adminGet('/api/admin/anthropic/usage', adminSecret);
    const data = await res.json();
    expect(data.available).toBe(true);
    expect(data.provider).toBe('anthropic');
  });

  it('returns a usage object with a data array', async () => {
    const res = await adminGet('/api/admin/anthropic/usage', adminSecret);
    const data = await res.json();
    expect(data.usage).toBeDefined();
    expect(Array.isArray((data.usage as Record<string, unknown>)?.data)).toBe(true);
  });

  it('returns a fetched_at ISO timestamp', async () => {
    const res = await adminGet('/api/admin/anthropic/usage', adminSecret);
    const data = await res.json();
    expect(typeof data.fetched_at).toBe('string');
    expect(new Date(data.fetched_at).toISOString()).toBe(data.fetched_at);
  });

  it('returns 401 for a wrong Bearer token', async () => {
    const res = await adminGet('/api/admin/anthropic/usage', 'wrong-secret');
    expect(res.status).toBe(401);
  });
});
