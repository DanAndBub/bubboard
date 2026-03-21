/**
 * Smoke test — GET /api/admin/anthropic/history
 *
 * Uses a narrow 7-day window to keep response size predictable and
 * avoid triggering multi-page pagination.
 *
 * Run with: npm run test:smoke
 * Requires: DRIFTWATCH_ADMIN_SECRET, ANTHROPIC_ADMIN_KEY in .env.local
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { requireEnv } from './helpers/env';
import { adminGet } from './helpers/request';

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
const today = new Date().toISOString().slice(0, 10);

describe.skipIf(!process.env.SMOKE)('GET /api/admin/anthropic/history [smoke]', () => {
  let adminSecret: string;

  beforeAll(() => {
    adminSecret = requireEnv('DRIFTWATCH_ADMIN_SECRET');
    requireEnv('ANTHROPIC_ADMIN_KEY');
  });

  it('returns HTTP 200', async () => {
    const res = await adminGet('/api/admin/anthropic/history', adminSecret, {
      start: sevenDaysAgo,
      end: today,
    });
    expect(res.status).toBe(200);
  });

  it('returns days array and total_days', async () => {
    const res = await adminGet('/api/admin/anthropic/history', adminSecret, {
      start: sevenDaysAgo,
      end: today,
    });
    const data = await res.json();
    expect(Array.isArray(data.days)).toBe(true);
    expect(typeof data.total_days).toBe('number');
    expect(data.total_days).toBe(data.days.length);
  });

  it('each day entry has a valid YYYY-MM-DD date', async () => {
    const res = await adminGet('/api/admin/anthropic/history', adminSecret, {
      start: sevenDaysAgo,
      end: today,
    });
    const data = await res.json();
    for (const day of data.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns 401 for a wrong Bearer token', async () => {
    const res = await adminGet('/api/admin/anthropic/history', 'wrong-secret');
    expect(res.status).toBe(401);
  });
});
