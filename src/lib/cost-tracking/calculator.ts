import { CostBreakdown, ModelPricing, UsageRecord } from './types';
import { lookupPricing } from './pricing';

export function calculateCostWithPricing(usage: UsageRecord, pricing: ModelPricing): CostBreakdown {
  const uncachedInput = Math.max(0, usage.input_tokens - usage.cached_input_tokens);
  const cachedInput = usage.cached_input_tokens;
  const cacheWrite = usage.cache_creation_tokens;
  const output = usage.output_tokens;
  const batchMultiplier = usage.is_batch ? pricing.batch_discount : 1.0;
  // Confirmed: Anthropic batch API applies 50% discount uniformly to all token
  // types including cache read/write. Applying batch_discount to all components.

  const input_cost = (uncachedInput / 1_000_000) * pricing.input_per_mtok * batchMultiplier;
  const output_cost = (output / 1_000_000) * pricing.output_per_mtok * batchMultiplier;
  const cache_read_cost = (cachedInput / 1_000_000) * pricing.cache_read_per_mtok * batchMultiplier;
  const cache_write_cost = (cacheWrite / 1_000_000) * pricing.cache_write_per_mtok * batchMultiplier;
  const total_cost = input_cost + output_cost + cache_read_cost + cache_write_cost;

  return { input_cost, output_cost, cache_read_cost, cache_write_cost, total_cost };
}

export function calculateCost(usage: UsageRecord): CostBreakdown | null {
  const pricing = lookupPricing(usage.model);
  if (!pricing) return null;
  return calculateCostWithPricing(usage, pricing);
}
