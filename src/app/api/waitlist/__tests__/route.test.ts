/**
 * Tests for POST /api/waitlist
 *
 * The waitlist route accepts an email address, validates it, and forwards it
 * to an Airtable "Waitlist" table. It requires AIRTABLE_BASE_ID and
 * AIRTABLE_API_KEY environment variables to be set.
 *
 * Test strategy:
 * - Airtable is never called for real — `fetch` is stubbed via `vi.stubGlobal`.
 * - Env vars are set/torn down around each test via beforeEach/afterEach.
 * - Payload inspection tests use a `mockImplementation` that captures call args
 *   directly, since Next.js passes `(url, init)` to the underlying fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

/** Builds a NextRequest with a JSON body for the waitlist endpoint. */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Returns a vi mock that resolves to a minimal fetch-like response.
 * Use this when the test only cares about the route's response, not the
 * payload sent to Airtable.
 */
function mockFetch(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  process.env.AIRTABLE_BASE_ID = 'fake-base-id';
  process.env.AIRTABLE_API_KEY = 'fake-api-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AIRTABLE_BASE_ID;
  delete process.env.AIRTABLE_API_KEY;
});

describe('POST /api/waitlist', () => {
  describe('validation', () => {
    it('returns 400 when email is missing', async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/email is required/i);
    });

    it('returns 400 when email is not a string', async () => {
      const res = await POST(makeRequest({ email: 123 }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
    });

    it('returns 400 for an invalid email format', async () => {
      const res = await POST(makeRequest({ email: 'not-an-email' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/invalid email/i);
    });

    it('returns 400 for email missing domain', async () => {
      const res = await POST(makeRequest({ email: 'user@' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for email missing @', async () => {
      const res = await POST(makeRequest({ email: 'userdomain.com' }));
      expect(res.status).toBe(400);
    });
  });

  describe('server configuration', () => {
    it('returns 500 when AIRTABLE_BASE_ID is missing', async () => {
      delete process.env.AIRTABLE_BASE_ID;
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ email: 'user@example.com' }));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/misconfiguration/i);
    });

    it('returns 500 when AIRTABLE_API_KEY is missing', async () => {
      delete process.env.AIRTABLE_API_KEY;
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ email: 'user@example.com' }));
      expect(res.status).toBe(500);
    });
  });

  describe('Airtable integration', () => {
    it('returns 200 on success', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ email: 'user@example.com' }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('lowercases the email before sending to Airtable', async () => {
      const calls: Array<{ url: string; body: string }> = [];
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init: RequestInit) => {
        calls.push({ url, body: init.body as string });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }));
      await POST(makeRequest({ email: 'User@Example.COM' }));
      expect(calls).toHaveLength(1);
      const sentBody = JSON.parse(calls[0].body);
      expect(sentBody.records[0].fields['Email']).toBe('user@example.com');
    });

    it('sends to the correct Airtable table', async () => {
      const calls: string[] = [];
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
        calls.push(url);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }));
      await POST(makeRequest({ email: 'user@example.com' }));
      expect(calls[0]).toContain('/Waitlist');
    });

    it('forwards Airtable error status and message', async () => {
      vi.stubGlobal('fetch', mockFetch(422, { error: { message: 'INVALID_VALUE_FOR_COLUMN' } }));
      const res = await POST(makeRequest({ email: 'user@example.com' }));
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toBe('INVALID_VALUE_FOR_COLUMN');
    });

    it('falls back to generic message when Airtable error has no message', async () => {
      vi.stubGlobal('fetch', mockFetch(500, {}));
      const res = await POST(makeRequest({ email: 'user@example.com' }));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/airtable error/i);
    });
  });
});
