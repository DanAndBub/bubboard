import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns status ok', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('returns a valid ISO timestamp', async () => {
    const res = await GET();
    const data = await res.json();
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it('returns version 0.1.0', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.version).toBe('0.1.0');
  });
});
