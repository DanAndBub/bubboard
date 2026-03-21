/**
 * Thin fetch wrappers for smoke tests.
 *
 * adminGet() and publicPost() handle the auth header and base URL so
 * individual test files stay focused on assertions.
 */
import { BASE_URL } from './env';

/** GET request with the admin Bearer token. */
export async function adminGet(
  path: string,
  adminSecret: string,
  params: Record<string, string> = {},
): Promise<Response> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url.toString(), {
    headers: { Authorization: `Bearer ${adminSecret}` },
  });
}

/** POST request with a JSON body — no auth (public routes). */
export async function publicPost(
  path: string,
  body: unknown,
): Promise<Response> {
  return fetch(new URL(path, BASE_URL).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
