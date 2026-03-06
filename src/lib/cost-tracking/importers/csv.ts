import { UsageRecord } from '../types';

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCSV(content: string): Omit<UsageRecord, 'id' | 'cost_usd'>[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const idx = (name: string) => headers.indexOf(name);

  const records: Omit<UsageRecord, 'id' | 'cost_usd'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const get = (name: string) => (cols[idx(name)] ?? '').trim();

    const provider = get('provider') as 'anthropic' | 'openai';
    const model = get('model');
    const timestamp = get('timestamp');
    const input_tokens = parseInt(get('input_tokens'), 10);
    const output_tokens = parseInt(get('output_tokens'), 10);

    if (!timestamp || !provider || !model || isNaN(input_tokens) || isNaN(output_tokens)) continue;

    const isBatchRaw = get('is_batch');
    const task_id = get('task_id') || undefined;
    const request_id = get('request_id') || crypto.randomUUID();

    records.push({
      timestamp,
      provider,
      model,
      input_tokens,
      output_tokens,
      cached_input_tokens: parseInt(get('cached_input_tokens'), 10) || 0,
      cache_creation_tokens: parseInt(get('cache_creation_tokens'), 10) || 0,
      is_batch: isBatchRaw === 'true' || isBatchRaw === '1',
      request_id,
      ...(task_id ? { task_id } : {}),
    });
  }

  return records;
}
