# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts` (unit tests), `smoke/vitest.smoke.config.ts` (smoke tests)
- `vitest.config.mts` also present (duplicate config with no path alias — `vitest.config.ts` is the authoritative one)

**Assertion Library:**
- Vitest built-in (`expect`)

**Run Commands:**
```bash
npm run test              # Run all unit tests (vitest run)
npm run test:smoke        # Run smoke tests against live server
```

**Coverage:** No coverage tooling configured. No `--coverage` flag in scripts.

## Test File Organization

**Location:** Co-located in `__tests__/` subdirectory relative to source module.

**Naming:** `<subject>.test.ts` — matches source filename without the module path. All test files end in `.test.ts`.

**Structure:**
```
src/
├── lib/
│   ├── __tests__/
│   │   ├── analyzer.test.ts       # tests for ../analyzer.ts
│   │   └── redact.test.ts         # tests for ../redact.ts
│   ├── drift/
│   │   └── __tests__/
│   │       └── diff-engine.test.ts
│   └── config-review/
│       └── __tests__/
│           └── rules.test.ts      # tests for entire rules/ subsystem
└── app/
    └── api/
        ├── health/__tests__/route.test.ts
        ├── waitlist/__tests__/route.test.ts
        └── feedback/__tests__/route.test.ts
```

**Smoke tests** live separately in `/smoke/` at project root:
- `smoke/waitlist.smoke.ts`
- `smoke/feedback.smoke.ts`
- `smoke/vitest.smoke.config.ts`
- `smoke/helpers/` — shared utilities (`env.ts`, `request.ts`)

## Test Structure

**Suite Organization:**
```typescript
// Imports from vitest — always explicitly named
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Factory function for reusable test data
function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { /* defaults */ ...overrides };
}

describe('computeDrift', () => {
  test('identical snapshots — no changes', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ timestamp: '...' });
    const drift = computeDrift(prev, curr);
    expect(drift.filesChanged).toHaveLength(0);
  });
});
```

**Patterns:**
- Both `test()` and `it()` used — `test()` in drift/config tests, `it()` in analyzer/API tests
- No nesting beyond two levels (`describe` → `describe` → `it` for API route tests)
- Descriptive test names use em dash: `'identical snapshots — no changes'`
- Setup: `beforeEach` sets `process.env` vars; teardown: `afterEach` restores with `vi.restoreAllMocks()` and `delete process.env.*`

## Mocking

**Framework:** Vitest built-in (`vi`)

**Patterns — fetch stubbing for API routes:**
```typescript
// Simple stub — just care about route response, not payload
function mockFetch(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}
vi.stubGlobal('fetch', mockFetch(200));

// Payload capture — inspect what was sent to external API
const calls: Array<{ url: string; body: string }> = [];
vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string, init: RequestInit) => {
  calls.push({ url, body: init.body as string });
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
}));
```

**Environment variable management:**
```typescript
beforeEach(() => {
  process.env.AIRTABLE_BASE_ID = 'fake-base-id';
  process.env.AIRTABLE_API_KEY = 'fake-api-key';
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AIRTABLE_BASE_ID;
  delete process.env.AIRTABLE_API_KEY;
});
```

**What to Mock:**
- `fetch` via `vi.stubGlobal` for all external HTTP calls (Airtable)
- Environment variables via `process.env` directly

**What NOT to Mock:**
- Library functions under test — always imported directly
- Next.js `NextRequest` / `NextResponse` — used as real constructors

## Fixtures and Factories

**Test Data — factory functions (preferred pattern):**
```typescript
// Returns a complete valid object with overridable fields
function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    timestamp: '2026-03-01T00:00:00.000Z',
    // ... all required fields with sensible defaults
    ...overrides,
  };
}

// For API route tests
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

**Shared valid bodies:**
```typescript
// Module-level const for reuse across related tests
const validBody = { type: 'bug', message: 'Something broke' };
```

**Location:** Factories are defined inline at the top of each test file. No shared fixture files.

## Coverage

**Requirements:** None enforced. No coverage threshold in config.

**View Coverage:**
```bash
# Not configured — would need: npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Pure library functions tested in isolation (`diff-engine`, `analyzer`, `redact`, `analyze-file`, `budget`, `truncation`, `runner`)
- No mocking needed — pure functions with no side effects
- Location: `src/**/__tests__/*.test.ts`

**Integration Tests (API route tests):**
- Next.js API route handlers imported and called directly (no HTTP layer)
- `fetch` mocked via `vi.stubGlobal` to isolate from Airtable
- Tests validate HTTP status codes, response shapes, and payload construction
- Location: `src/app/api/**/__tests__/route.test.ts`

**Smoke Tests:**
- Run against a live server (requires `SMOKE` env var to be set)
- Use `describe.skipIf(!process.env.SMOKE)(...)` guard to prevent accidental execution
- Strategy: send deliberately invalid payloads to assert `400`, confirming the route is live and env vars are configured — zero writes to external services
- Location: `smoke/*.smoke.ts`
- Config: `smoke/vitest.smoke.config.ts` with `fileParallelism: false` and 30s timeout

## Common Patterns

**Async Testing:**
```typescript
// All API route tests are async — await the handler directly
it('returns 200', async () => {
  const res = await GET();
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.status).toBe('ok');
});
```

**Error Testing:**
```typescript
// Assert error response shape
it('returns 400 when email is missing', async () => {
  const res = await POST(makeRequest({}));
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.ok).toBe(false);
  expect(data.error).toMatch(/email is required/i);  // case-insensitive regex
});

// Assert non-throw
it('handles empty content without throwing', () => {
  expect(() => analyzeHeartbeat('', baseMap())).not.toThrow();
});
```

**Rule-based testing (config-review):**
```typescript
// Run the full rule engine then filter findings by ruleId
const result = runReview(files);
const crits = result.findings.filter(f => f.severity === 'critical' && f.file === 'AGENTS.md' && f.category === 'size');
expect(crits.length).toBeGreaterThanOrEqual(1);
```

---

*Testing analysis: 2026-04-05*
