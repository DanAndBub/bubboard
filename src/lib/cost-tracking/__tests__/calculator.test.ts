import { describe, it, expect } from 'vitest';
import { calculateCost } from '../calculator';
import { UsageRecord } from '../types';

function makeRecord(overrides: Partial<UsageRecord>): UsageRecord {
  return {
    id: 'test-1',
    timestamp: new Date().toISOString(),
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    input_tokens: 1000,
    output_tokens: 500,
    cached_input_tokens: 0,
    cache_creation_tokens: 0,
    is_batch: false,
    request_id: 'req-1',
    cost_usd: 0,
    ...overrides,
  };
}

describe('calculateCost', () => {
  it('basic Anthropic cost calc (Sonnet, 1000 input, 500 output, no cache)', () => {
    const result = calculateCost(makeRecord({}));
    expect(result).not.toBeNull();
    expect(result!.input_cost).toBeCloseTo(0.003, 6);
    expect(result!.output_cost).toBeCloseTo(0.0075, 6);
    expect(result!.cache_read_cost).toBeCloseTo(0, 6);
    expect(result!.cache_write_cost).toBeCloseTo(0, 6);
    expect(result!.total_cost).toBeCloseTo(0.0105, 6);
  });

  it('Anthropic with cache read + write', () => {
    const result = calculateCost(makeRecord({
      input_tokens: 2000,
      cached_input_tokens: 1500,
      cache_creation_tokens: 500,
      output_tokens: 300,
    }));
    expect(result).not.toBeNull();
    // uncached input = 2000 - 1500 = 500
    expect(result!.input_cost).toBeCloseTo(0.0015, 6);       // (500/1M)*3.00
    expect(result!.cache_read_cost).toBeCloseTo(0.00045, 6); // (1500/1M)*0.30
    expect(result!.cache_write_cost).toBeCloseTo(0.001875, 6); // (500/1M)*3.75
    expect(result!.output_cost).toBeCloseTo(0.0045, 6);      // (300/1M)*15.00
    expect(result!.total_cost).toBeCloseTo(0.0015 + 0.00045 + 0.001875 + 0.0045, 6);
  });

  it('OpenAI basic (GPT-4.1, standard)', () => {
    const result = calculateCost(makeRecord({
      provider: 'openai',
      model: 'gpt-4.1',
      input_tokens: 1000,
      output_tokens: 500,
    }));
    expect(result).not.toBeNull();
    expect(result!.input_cost).toBeCloseTo(0.002, 6);   // (1000/1M)*2.00
    expect(result!.output_cost).toBeCloseTo(0.004, 6);  // (500/1M)*8.00
    expect(result!.total_cost).toBeCloseTo(0.006, 6);
  });

  it('OpenAI with cached input', () => {
    const result = calculateCost(makeRecord({
      provider: 'openai',
      model: 'gpt-4.1',
      input_tokens: 2000,
      cached_input_tokens: 1500,
      output_tokens: 500,
    }));
    expect(result).not.toBeNull();
    // uncached = 2000 - 1500 = 500
    expect(result!.input_cost).toBeCloseTo(0.001, 6);      // (500/1M)*2.00
    expect(result!.cache_read_cost).toBeCloseTo(0.00075, 6); // (1500/1M)*0.50
  });

  it('Batch discount applied correctly', () => {
    const result = calculateCost(makeRecord({
      model: 'claude-sonnet-4-6',
      input_tokens: 1000,
      output_tokens: 500,
      is_batch: true,
    }));
    expect(result).not.toBeNull();
    // 50% of non-batch: 0.0105 * 0.5 = 0.00525
    expect(result!.total_cost).toBeCloseTo(0.00525, 6);
    expect(result!.input_cost).toBeCloseTo(0.0015, 6);
    expect(result!.output_cost).toBeCloseTo(0.00375, 6);
  });

  it('Unknown model returns null', () => {
    const result = calculateCost(makeRecord({ model: 'totally-fake-model-xyz' }));
    expect(result).toBeNull();
  });

  it('Opus pricing', () => {
    const result = calculateCost(makeRecord({
      model: 'claude-opus-4-6',
      input_tokens: 1000,
      output_tokens: 500,
    }));
    expect(result).not.toBeNull();
    expect(result!.input_cost).toBeCloseTo(0.005, 6);   // (1000/1M)*5.00
    expect(result!.output_cost).toBeCloseTo(0.0125, 6);  // (500/1M)*25.00
    expect(result!.total_cost).toBeCloseTo(0.0175, 6);
  });

  it('Fuzzy matching resolves versioned model strings', () => {
    const result = calculateCost(makeRecord({
      model: 'claude-sonnet-4-6-20260301',
      input_tokens: 1000,
      output_tokens: 500,
    }));
    expect(result).not.toBeNull();
    expect(result!.total_cost).toBeCloseTo(0.0105, 6); // Same as sonnet-4-6
  });

  it('Fuzzy matching does not match shorter model to longer key', () => {
    // Short model ID "o3" should NOT match "o3-mini" (removed key.includes(model))
    // But "o3" alone IS an exact key in the table, so it matches correctly.
    // The real protection is: "gpt-4" should not match "gpt-4.1" or "gpt-4o"
    // because model.includes(key) = "gpt-4".includes("gpt-4.1") = false
    const result = calculateCost(makeRecord({ provider: 'openai', model: 'gpt-4' }));
    expect(result).toBeNull();

    // A completely unknown model should also return null
    const result2 = calculateCost(makeRecord({ provider: 'openai', model: 'llama-3-70b' }));
    expect(result2).toBeNull();
  });

  it('Alias resolution for claude-3-5-sonnet-20241022', () => {
    const result = calculateCost(makeRecord({
      model: 'claude-3-5-sonnet-20241022',
      input_tokens: 1000,
      output_tokens: 500,
    }));
    expect(result).not.toBeNull();
    // Should resolve to sonnet4 pricing (same rates as sonnet-4-6)
    expect(result!.input_cost).toBeCloseTo(0.003, 6);
    expect(result!.output_cost).toBeCloseTo(0.0075, 6);
  });

  it('cached_input_tokens > input_tokens clamps to 0 uncached', () => {
    const result = calculateCost(makeRecord({
      input_tokens: 500,
      cached_input_tokens: 1000, // More cached than total — edge case
      output_tokens: 100,
    }));
    expect(result).not.toBeNull();
    expect(result!.input_cost).toBeCloseTo(0, 6); // Clamped to 0
    expect(result!.cache_read_cost).toBeCloseTo((1000 / 1_000_000) * 0.30, 6);
  });

  it('Edge case: 0 tokens', () => {
    const result = calculateCost(makeRecord({
      input_tokens: 0,
      output_tokens: 0,
      cached_input_tokens: 0,
      cache_creation_tokens: 0,
    }));
    expect(result).not.toBeNull();
    expect(result!.input_cost).toBeCloseTo(0, 6);
    expect(result!.output_cost).toBeCloseTo(0, 6);
    expect(result!.cache_read_cost).toBeCloseTo(0, 6);
    expect(result!.cache_write_cost).toBeCloseTo(0, 6);
    expect(result!.total_cost).toBeCloseTo(0, 6);
  });
});
