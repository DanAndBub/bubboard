/**
 * Helpers for reading environment variables in smoke tests.
 *
 * Call requireEnv() in a beforeAll — if a required var is missing the test
 * suite will fail fast with a clear message rather than a cryptic 401/500.
 *
 * SMOKE_BASE_URL lets you point the suite at a local dev server or a deployed
 * staging environment without changing any test code.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Smoke test requires ${name} to be set. ` +
      `Add it to .env.local and re-run with: npm run test:smoke`
    );
  }
  return value;
}

/** Base URL for all smoke test requests. Defaults to local dev server. */
export const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
