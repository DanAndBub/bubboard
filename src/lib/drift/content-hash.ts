/**
 * SHA-256 hash via Web Crypto API. No dependencies.
 * Input should be REDACTED content (no raw API keys).
 */
export async function contentHash(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
