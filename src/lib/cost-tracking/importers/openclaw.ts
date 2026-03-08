import { UsageRecord } from '../types';

function inferProvider(model: string): 'anthropic' | 'openai' | 'deepseek' {
  if (/^deepseek-/.test(model)) return 'deepseek';
  if (/^(gpt-|o[134]-|o[134]$)/.test(model)) return 'openai';
  return 'anthropic';
}

export function parseOpenClawSessions(content: string): Omit<UsageRecord, 'id'>[] {
  const records: Omit<UsageRecord, 'id'>[] = [];
  const seen = new Set<string>();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }

    // Only process message entries with usage data
    if (obj.type !== 'message') continue;

    // Usage/model data lives inside the nested `message` object (assistant responses)
    const msg = obj.message as Record<string, unknown> | undefined;
    if (!msg) continue;

    const usage = msg.usage as Record<string, unknown> | undefined;
    if (!usage) continue;

    const model = msg.model as string | undefined;
    if (!model) continue;

    const cost = usage.cost as Record<string, number> | undefined;
    const input_tokens = (usage.input as number) ?? 0;
    const output_tokens = (usage.output as number) ?? 0;
    const cached_input_tokens = (usage.cacheRead as number) ?? 0;
    const cache_creation_tokens = (usage.cacheWrite as number) ?? 0;

    // Deduplicate by id + timestamp
    const dedupKey = `${obj.id}-${obj.timestamp}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    records.push({
      timestamp: (obj.timestamp as string) ?? new Date().toISOString(),
      provider: inferProvider(model),
      model,
      input_tokens,
      output_tokens,
      cached_input_tokens,
      cache_creation_tokens,
      is_batch: false,
      request_id: (obj.id as string) ?? crypto.randomUUID(),
      cost_usd: cost?.total ?? 0,
    });
  }

  return records;
}
