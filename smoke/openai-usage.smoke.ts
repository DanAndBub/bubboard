/**
 * Smoke test — GET /api/admin/openai/usage
 *
 * Confirms the OpenAI Admin API integration is alive.
 *
 * Run with: npm run test:smoke
 * Requires: DRIFTWATCH_ADMIN_SECRET in .env.local
 * Optional: OPENAI_ADMIN_KEY — suite is skipped if not set
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { requireEnv } from './helpers/env';
import { adminGet } from './helpers/request';

const skip = !process.env.SMOKE || !process.env.OPENAI_ADMIN_KEY;

describe.skipIf(skip)('GET /api/admin/openai/usage [smoke]', () => {
  let adminSecret: string;

  beforeAll(() => {
    adminSecret = requireEnv('DRIFTWATCH_ADMIN_SECRET');
  });

  it('returns HTTP 200', async () => {
    const res = await adminGet('/api/admin/openai/usage', adminSecret);
    expect(res.status).toBe(200);
  });

  it('returns available:true with provider openai', async () => {
    const res = await adminGet('/api/admin/openai/usage', adminSecret);
    const data = await res.json();
    expect(data.available).toBe(true);
    expect(data.provider).toBe('openai');
  });

  it('returns a usage object with a data array', async () => {
    const res = await adminGet('/api/admin/openai/usage', adminSecret);
    const data = await res.json();
    expect(data.usage).toBeDefined();
    expect(Array.isArray((data.usage as Record<string, unknown>)?.data)).toBe(true);
  });

  it('returns a fetched_at ISO timestamp', async () => {
    const res = await adminGet('/api/admin/openai/usage', adminSecret);
    const data = await res.json();
    expect(typeof data.fetched_at).toBe('string');
    expect(new Date(data.fetched_at).toISOString()).toBe(data.fetched_at);
  });

  it('returns 401 for a wrong Bearer token', async () => {
    const res = await adminGet('/api/admin/openai/usage', 'wrong-secret');
    expect(res.status).toBe(401);
  });
});
