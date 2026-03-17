/**
 * Matches sensitive key names including:
 * - Exact matches: key, token, secret, password, api_key, apikey
 * - Compound keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, GITHUB_TOKEN, webhook_secret, etc.
 */
const SENSITIVE_KEYS_REGEX = /^(key|token|secret|password|apikey|api_key|.*_key|.*_token|.*_secret|.*_password)$/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS_REGEX.test(key);
}

function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactObject);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = isSensitiveKey(k) ? '[REDACTED]' : redactObject(v);
    }
    return result;
  }
  return value;
}

export function redactSensitiveValues(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(redactObject(parsed), null, 2);
  } catch {
    return jsonString;
  }
}
