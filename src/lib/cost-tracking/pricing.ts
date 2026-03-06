import { ModelPricing } from './types';

export const MODEL_PRICING_VERSION = '2026-03-05';

const anthropicEntry = (model: string, input: number, output: number, cache_write: number, cache_read: number): ModelPricing => ({
  model,
  provider: 'anthropic',
  input_per_mtok: input,
  output_per_mtok: output,
  cache_write_per_mtok: cache_write,
  cache_read_per_mtok: cache_read,
  batch_discount: 0.5,
  updated_at: MODEL_PRICING_VERSION,
});

const openaiEntry = (model: string, input: number, output: number, cache_read: number): ModelPricing => ({
  model,
  provider: 'openai',
  input_per_mtok: input,
  output_per_mtok: output,
  cache_write_per_mtok: 0,
  cache_read_per_mtok: cache_read,
  batch_discount: 0.5,
  updated_at: MODEL_PRICING_VERSION,
});

const opus46 = anthropicEntry('claude-opus-4-6', 5.00, 25.00, 6.25, 0.50);
const sonnet46 = anthropicEntry('claude-sonnet-4-6', 3.00, 15.00, 3.75, 0.30);
const sonnet4 = anthropicEntry('claude-sonnet-4-20250514', 3.00, 15.00, 3.75, 0.30);
const haiku45 = anthropicEntry('claude-haiku-4-5-20251001', 1.00, 5.00, 1.25, 0.10);
const haiku35 = anthropicEntry('claude-haiku-3-5-20241022', 0.80, 4.00, 1.00, 0.08);

export const PRICING_TABLE = new Map<string, ModelPricing>([
  // Anthropic
  ['claude-opus-4-6', opus46],
  ['claude-sonnet-4-6', sonnet46],
  ['claude-sonnet-4-20250514', sonnet4],
  ['claude-haiku-4-5-20251001', haiku45],
  ['claude-haiku-3-5-20241022', haiku35],
  // Anthropic aliases
  ['claude-3-5-sonnet-20241022', sonnet4],
  ['claude-3-5-haiku-20241022', haiku35],
  // OpenAI
  ['gpt-4.1', openaiEntry('gpt-4.1', 2.00, 8.00, 0.50)],
  ['gpt-4.1-mini', openaiEntry('gpt-4.1-mini', 0.40, 1.60, 0.10)],
  ['gpt-4.1-nano', openaiEntry('gpt-4.1-nano', 0.10, 0.40, 0.025)],
  ['gpt-4o', openaiEntry('gpt-4o', 2.50, 10.00, 1.25)],
  ['gpt-4o-mini', openaiEntry('gpt-4o-mini', 0.15, 0.60, 0.075)],
  ['o3', openaiEntry('o3', 2.00, 8.00, 1.00)],
  ['o3-mini', openaiEntry('o3-mini', 1.10, 4.40, 0.275)],
  ['o4-mini', openaiEntry('o4-mini', 1.10, 4.40, 0.275)],
  ['o1', openaiEntry('o1', 15.00, 60.00, 7.50)],
]);

export function lookupPricing(model: string): ModelPricing | null {
  const exact = PRICING_TABLE.get(model);
  if (exact) return exact;

  for (const [key, pricing] of PRICING_TABLE) {
    if (model.includes(key)) {
      return pricing;
    }
  }

  return null;
}
