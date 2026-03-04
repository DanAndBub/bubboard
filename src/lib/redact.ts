const SENSITIVE_KEYS = /^(key|token|secret|password|apikey|api_key)$/i;

function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactObject);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redactObject(v);
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
