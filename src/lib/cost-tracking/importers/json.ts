import { UsageRecord } from '../types';

function mapRecord(item: unknown): Omit<UsageRecord, 'id' | 'cost_usd'> | null {
  if (typeof item !== 'object' || item === null) return null;
  const r = item as Record<string, unknown>;

  const { timestamp, provider, model, input_tokens, output_tokens } = r;
  if (!timestamp || !provider || !model || input_tokens === undefined || output_tokens === undefined) return null;

  return {
    timestamp: timestamp as string,
    provider: provider as 'anthropic' | 'openai' | 'deepseek',
    model: model as string,
    input_tokens: Number(input_tokens),
    output_tokens: Number(output_tokens),
    cached_input_tokens: Number(r.cached_input_tokens ?? 0),
    cache_creation_tokens: Number(r.cache_creation_tokens ?? 0),
    is_batch: Boolean(r.is_batch ?? false),
    request_id: (r.request_id as string | undefined) ?? crypto.randomUUID(),
    ...(r.task_id ? { task_id: r.task_id as string } : {}),
  };
}

export function parseJSON(content: string): Omit<UsageRecord, 'id' | 'cost_usd'>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const found = obj.records ?? obj.data ?? obj.usage;
    if (!Array.isArray(found)) return [];
    items = found;
  } else {
    return [];
  }

  return items.flatMap(item => {
    const record = mapRecord(item);
    return record ? [record] : [];
  });
}
