/**
 * Tests for POST /api/feedback
 *
 * The feedback route accepts a `type` ("bug" | "suggestion" | "review"),
 * a required `message` (max 2000 chars), and an optional `email` string.
 * Valid submissions are forwarded to an Airtable "Feedback" table.
 * It requires AIRTABLE_BASE_ID and AIRTABLE_API_KEY to be set.
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

/** Builds a NextRequest with a JSON body for the feedback endpoint. */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/feedback', {
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

const validBody = { type: 'bug', message: 'Something broke' };

beforeEach(() => {
  process.env.AIRTABLE_BASE_ID = 'fake-base-id';
  process.env.AIRTABLE_API_KEY = 'fake-api-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AIRTABLE_BASE_ID;
  delete process.env.AIRTABLE_API_KEY;
});

describe('POST /api/feedback', () => {
  describe('validation — required fields', () => {
    it('returns 400 when body is missing type', async () => {
      const res = await POST(makeRequest({ message: 'hello' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when body is missing message', async () => {
      const res = await POST(makeRequest({ type: 'bug' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/missing required fields/i);
    });

    it('returns 400 for null body', async () => {
      const res = await POST(makeRequest(null));
      expect(res.status).toBe(400);
    });
  });

  describe('validation — type field', () => {
    it('accepts type "bug"', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ type: 'bug', message: 'a bug' }));
      expect(res.status).toBe(200);
    });

    it('accepts type "suggestion"', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ type: 'suggestion', message: 'an idea' }));
      expect(res.status).toBe(200);
    });

    it('accepts type "review"', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ type: 'review', message: 'great app' }));
      expect(res.status).toBe(200);
    });

    it('returns 400 for an invalid type', async () => {
      const res = await POST(makeRequest({ type: 'spam', message: 'hello' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/invalid type/i);
    });
  });

  describe('validation — message field', () => {
    it('returns 400 for an empty message', async () => {
      const res = await POST(makeRequest({ type: 'bug', message: '' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/message is required/i);
    });

    it('returns 400 when message is not a string', async () => {
      const res = await POST(makeRequest({ type: 'bug', message: 42 }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when message exceeds 2000 characters', async () => {
      const res = await POST(makeRequest({ type: 'bug', message: 'a'.repeat(2001) }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/2000/);
    });

    it('accepts a message of exactly 2000 characters', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ type: 'bug', message: 'a'.repeat(2000) }));
      expect(res.status).toBe(200);
    });
  });

  describe('validation — email field (optional)', () => {
    it('accepts request without email', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
    });

    it('accepts request with a valid email string', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest({ ...validBody, email: 'user@example.com' }));
      expect(res.status).toBe(200);
    });

    it('returns 400 when email is provided but not a string', async () => {
      const res = await POST(makeRequest({ ...validBody, email: 99 }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/email must be a string/i);
    });
  });

  describe('server configuration', () => {
    it('returns 500 when AIRTABLE_BASE_ID is missing', async () => {
      delete process.env.AIRTABLE_BASE_ID;
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toMatch(/misconfiguration/i);
    });

    it('returns 500 when AIRTABLE_API_KEY is missing', async () => {
      delete process.env.AIRTABLE_API_KEY;
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(500);
    });
  });

  describe('Airtable integration', () => {
    it('returns 200 with ok:true on success', async () => {
      vi.stubGlobal('fetch', mockFetch(200));
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('sends type and message to the correct Airtable table', async () => {
      const calls: Array<{ url: string; fields: Record<string, string> }> = [];
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init: RequestInit) => {
        calls.push({ url, fields: JSON.parse(init.body as string).records[0].fields });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }));
      await POST(makeRequest({ type: 'suggestion', message: 'Add dark mode' }));
      expect(calls[0].url).toContain('/Feedback');
      expect(calls[0].fields['Type']).toBe('suggestion');
      expect(calls[0].fields['Message']).toBe('Add dark mode');
    });

    it('includes trimmed email in Airtable payload when provided', async () => {
      const calls: Array<Record<string, string>> = [];
      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        calls.push(JSON.parse(init.body as string).records[0].fields);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }));
      await POST(makeRequest({ ...validBody, email: '  user@example.com  ' }));
      expect(calls[0]['Email']).toBe('user@example.com');
    });

    it('omits email from Airtable payload when not provided', async () => {
      const calls: Array<Record<string, string>> = [];
      vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        calls.push(JSON.parse(init.body as string).records[0].fields);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }));
      await POST(makeRequest(validBody));
      expect(calls[0]['Email']).toBeUndefined();
    });

    it('forwards Airtable error status and message', async () => {
      vi.stubGlobal('fetch', mockFetch(422, { error: { message: 'INVALID_VALUE_FOR_COLUMN' } }));
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toBe('INVALID_VALUE_FOR_COLUMN');
    });

    it('falls back to generic message when Airtable error body is empty', async () => {
      vi.stubGlobal('fetch', mockFetch(503, {}));
      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toMatch(/airtable error/i);
    });
  });
});
