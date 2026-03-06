import { UsageRecord } from '../types';

function inferProvider(model: string): 'anthropic' | 'openai' {
  if (/gpt|o1|o3|o4/.test(model)) return 'openai';
  return 'anthropic';
}

export function parseClaudeCodeJSONL(content: string): Omit<UsageRecord, 'id' | 'cost_usd'>[] {
  const records: Omit<UsageRecord, 'id' | 'cost_usd'>[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const type = obj.type;
    if (type !== 'result' && type !== 'assistant') continue;

    // usage may be nested under message for assistant type
    const usage =
      (obj.usage as Record<string, unknown> | undefined) ??
      ((obj.message as Record<string, unknown> | undefined)?.usage as Record<string, unknown> | undefined);

    if (!usage) continue;

    const model = (
      (obj.model as string | undefined) ??
      ((obj.message as Record<string, unknown> | undefined)?.model as string | undefined)
    );
    if (!model) continue;

    const input_tokens = usage.input_tokens as number | undefined;
    const output_tokens = usage.output_tokens as number | undefined;
    if (input_tokens === undefined || output_tokens === undefined) continue;

    records.push({
      timestamp: (obj.timestamp as string | undefined) ?? new Date().toISOString(),
      provider: inferProvider(model),
      model,
      input_tokens,
      output_tokens,
      cached_input_tokens: (usage.cache_read_input_tokens as number | undefined) ?? 0,
      cache_creation_tokens: (usage.cache_creation_input_tokens as number | undefined) ?? 0,
      is_batch: false,
      request_id: (obj.request_id as string | undefined) ?? crypto.randomUUID(),
    });
  }

  return records;
}
