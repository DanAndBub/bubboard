import { UsageRecord } from '../types';
import { calculateCost } from '../calculator';

export const SEED_RECORD_COUNT = 900;

const MODELS: Array<{ model: string; provider: 'anthropic' | 'openai'; weight: number }> = [
  { model: 'claude-sonnet-4-6', provider: 'anthropic', weight: 40 },
  { model: 'claude-opus-4-6',   provider: 'anthropic', weight: 25 },
  { model: 'deepseek-chat',     provider: 'openai',    weight: 15 },
  { model: 'gpt-4.1',           provider: 'openai',    weight: 10 },
  { model: 'gpt-4o-mini',       provider: 'openai',    weight: 10 },
];

const TASK_IDS = ['chat', 'code-review', 'analysis', 'summarization', 'translation', 'research'];
const AGENT_NAMES = ['main', 'sonnet', 'coder', 'analyst'];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSeedData(): UsageRecord[] {
  const today = new Date('2026-03-05T00:00:00.000Z');
  const records: UsageRecord[] = [];

  for (let dayIndex = 0; dayIndex < 90; dayIndex++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (89 - dayIndex));

    // Base request count 5-15
    let baseCount = rand(5, 15);

    // Cost spike on days 43-47 (0-indexed)
    if (dayIndex >= 43 && dayIndex <= 47) {
      baseCount = Math.round(baseCount * 3);
    }

    // Gradual uptrend in last 30 days (days 60-89)
    if (dayIndex >= 60) {
      baseCount = Math.round(baseCount * (1 + (dayIndex - 60) / 60));
    }

    for (let r = 0; r < baseCount; r++) {
      const { model, provider } = pickWeighted(MODELS);
      const isAnthropic = provider === 'anthropic';

      const inputTokens = rand(500, 30000);
      const outputTokens = rand(100, 4000);

      let cachedInputTokens = 0;
      let cacheCreationTokens = 0;

      if (isAnthropic && Math.random() < 0.30) {
        const cacheFraction = 0.40 + Math.random() * 0.40; // 40-80%
        cachedInputTokens = Math.round(inputTokens * cacheFraction);

        if (Math.random() < 0.10) {
          cacheCreationTokens = rand(200, 2000);
        }
      }

      // Spread requests across the day
      const secondsInDay = 86400;
      const timestamp = new Date(date.getTime() + rand(0, secondsInDay - 1) * 1000).toISOString();

      const partial: UsageRecord = {
        id: '',
        timestamp,
        provider,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_input_tokens: cachedInputTokens,
        cache_creation_tokens: cacheCreationTokens,
        is_batch: false,
        request_id: crypto.randomUUID(),
        cost_usd: 0,
      };

      if (Math.random() < 0.60) {
        partial.task_id = pick(TASK_IDS);
      }

      if (Math.random() < 0.40) {
        partial.agent_name = pick(AGENT_NAMES);
      }

      const breakdown = calculateCost(partial);
      partial.cost_usd = breakdown ? breakdown.total_cost : 0;
      partial.id = crypto.randomUUID();

      records.push(partial);
    }
  }

  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return records;
}
