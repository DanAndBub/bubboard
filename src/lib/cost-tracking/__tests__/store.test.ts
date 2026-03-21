/**
 * Tests for the cost-tracking store layer (store.ts).
 *
 * The store wraps a Dexie/IndexedDB database. IndexedDB doesn't exist in Node,
 * so `fake-indexeddb/auto` is imported first — it shims the global before Dexie
 * initialises, making the real store code run unchanged in Vitest.
 *
 * Each test starts with a clean table via `beforeEach(() => db.usage.clear())`.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addUsageRecord,
  addUsageRecords,
  getUsageByDateRange,
  getUsageByModel,
  getUsageByTask,
  getDailyCostSummary,
  getModelCostBreakdown,
  getTotalCost,
  exportAsJSON,
  importFromJSON,
  clearAllData,
  getRecordCount,
} from '../store';
import type { UsageRecord } from '../types';

/** Builds a minimal valid record input (no id — store assigns that). cost_usd is optional and forwarded to addUsageRecords when provided. */
function makeRecord(overrides: Partial<Omit<UsageRecord, 'id'>> = {}): Omit<UsageRecord, 'id' | 'cost_usd'> & { cost_usd?: number } {
  return {
    timestamp: '2024-01-15T10:00:00Z',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    input_tokens: 1000,
    output_tokens: 500,
    cached_input_tokens: 0,
    cache_creation_tokens: 0,
    is_batch: false,
    request_id: 'req-default',
    ...overrides,
  };
}

beforeEach(async () => {
  await db.usage.clear();
});

describe('addUsageRecord', () => {
  it('persists a record and returns it with an id', async () => {
    const record = await addUsageRecord(makeRecord({ request_id: 'req-1' }));
    expect(record.id).toBeTruthy();
    expect(record.model).toBe('claude-sonnet-4-6');
    const count = await db.usage.count();
    expect(count).toBe(1);
  });

  it('calculates cost_usd for known models', async () => {
    const record = await addUsageRecord(makeRecord({ request_id: 'req-2' }));
    expect(record.cost_usd).toBeGreaterThan(0);
  });

  it('defaults cost_usd to 0 for unknown models', async () => {
    const record = await addUsageRecord(makeRecord({ model: 'unknown-model-xyz', request_id: 'req-3' }));
    expect(record.cost_usd).toBe(0);
  });
});

describe('addUsageRecords', () => {
  it('adds multiple records and reports the count', async () => {
    const result = await addUsageRecords([
      makeRecord({ request_id: 'req-a' }),
      makeRecord({ request_id: 'req-b' }),
    ]);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);
    expect(await db.usage.count()).toBe(2);
  });

  it('skips records whose request_id already exists', async () => {
    await addUsageRecords([makeRecord({ request_id: 'req-dup' })]);
    const result = await addUsageRecords([
      makeRecord({ request_id: 'req-dup' }),
      makeRecord({ request_id: 'req-new' }),
    ]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(await db.usage.count()).toBe(2);
  });

  it('returns the unique set of models added', async () => {
    const result = await addUsageRecords([
      makeRecord({ request_id: 'req-x', model: 'claude-sonnet-4-6' }),
      makeRecord({ request_id: 'req-y', model: 'claude-opus-4-6' }),
    ]);
    expect(result.models).toContain('claude-sonnet-4-6');
    expect(result.models).toContain('claude-opus-4-6');
  });

  it('uses source cost_usd when provided and non-zero', async () => {
    const result = await addUsageRecords([makeRecord({ request_id: 'req-cost', cost_usd: 9.99 })]);
    expect(result.added).toBe(1);
    const [saved] = await db.usage.toArray();
    expect(saved.cost_usd).toBe(9.99);
  });

  it('returns added:0 for an empty input array', async () => {
    const result = await addUsageRecords([]);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
  });
});

describe('getUsageByDateRange', () => {
  beforeEach(async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', timestamp: '2024-01-10T00:00:00.000Z' }),
      makeRecord({ request_id: 'r2', timestamp: '2024-01-15T00:00:00.000Z' }),
      makeRecord({ request_id: 'r3', timestamp: '2024-01-20T00:00:00.000Z' }),
    ]);
  });

  it('returns records within the date range', async () => {
    const results = await getUsageByDateRange(new Date('2024-01-12'), new Date('2024-01-18'));
    expect(results).toHaveLength(1);
    expect(results[0].request_id).toBe('r2');
  });

  it('includes records on the boundary dates', async () => {
    const results = await getUsageByDateRange(new Date('2024-01-10'), new Date('2024-01-20'));
    expect(results).toHaveLength(3);
  });

  it('returns empty array when no records fall in range', async () => {
    const results = await getUsageByDateRange(new Date('2024-02-01'), new Date('2024-02-28'));
    expect(results).toHaveLength(0);
  });
});

describe('getUsageByModel', () => {
  beforeEach(async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', model: 'claude-sonnet-4-6' }),
      makeRecord({ request_id: 'r2', model: 'claude-opus-4-6', timestamp: '2024-01-15T10:00:00Z' }),
      makeRecord({ request_id: 'r3', model: 'claude-sonnet-4-6', timestamp: '2024-01-20T10:00:00Z' }),
    ]);
  });

  it('returns all records for a model without a date range', async () => {
    const results = await getUsageByModel('claude-sonnet-4-6');
    expect(results).toHaveLength(2);
  });

  it('filters by model and date range when both provided', async () => {
    const results = await getUsageByModel('claude-sonnet-4-6', [
      new Date('2024-01-16'),
      new Date('2024-01-25'),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].request_id).toBe('r3');
  });

  it('returns empty array for a model not in the db', async () => {
    const results = await getUsageByModel('gpt-4.1');
    expect(results).toHaveLength(0);
  });
});

describe('getUsageByTask', () => {
  it('returns records matching the given task_id', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', task_id: 'task-a' }),
      makeRecord({ request_id: 'r2', task_id: 'task-b' }),
    ]);
    const results = await getUsageByTask('task-a');
    expect(results).toHaveLength(1);
    expect(results[0].request_id).toBe('r1');
  });
});

describe('getDailyCostSummary', () => {
  it('groups costs by date within the range', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', timestamp: '2024-01-15T08:00:00.000Z', cost_usd: 0.10 }),
      makeRecord({ request_id: 'r2', timestamp: '2024-01-15T18:00:00.000Z', cost_usd: 0.20 }),
      makeRecord({ request_id: 'r3', timestamp: '2024-01-16T10:00:00.000Z', cost_usd: 0.05 }),
    ]);

    const summary = await getDailyCostSummary([new Date('2024-01-15'), new Date('2024-01-17')]);
    expect(summary).toHaveLength(2);

    const jan15 = summary.find(s => s.date === '2024-01-15')!;
    expect(jan15.count).toBe(2);
    expect(jan15.cost).toBeCloseTo(0.30);

    const jan16 = summary.find(s => s.date === '2024-01-16')!;
    expect(jan16.count).toBe(1);
    expect(jan16.cost).toBeCloseTo(0.05);
  });

  it('returns results sorted by date ascending', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', timestamp: '2024-01-16T00:00:00.000Z', cost_usd: 0.01 }),
      makeRecord({ request_id: 'r2', timestamp: '2024-01-15T00:00:00.000Z', cost_usd: 0.01 }),
    ]);
    const summary = await getDailyCostSummary([new Date('2024-01-15'), new Date('2024-01-17')]);
    expect(summary[0].date).toBe('2024-01-15');
    expect(summary[1].date).toBe('2024-01-16');
  });

  it('returns empty array when no records in range', async () => {
    const summary = await getDailyCostSummary([new Date('2024-03-01'), new Date('2024-03-31')]);
    expect(summary).toHaveLength(0);
  });
});

describe('getModelCostBreakdown', () => {
  it('groups costs by normalised model name', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', model: 'claude-sonnet-4-6', cost_usd: 1.00 }),
      makeRecord({ request_id: 'r2', model: 'claude-sonnet-4-6', cost_usd: 2.00 }),
      makeRecord({ request_id: 'r3', model: 'claude-opus-4-6', cost_usd: 5.00 }),
    ]);
    const range: [Date, Date] = [new Date('2024-01-01'), new Date('2024-12-31')];
    const breakdown = await getModelCostBreakdown(range);

    const sonnet = breakdown.find(b => b.model === 'claude-sonnet-4-6')!;
    expect(sonnet.cost).toBeCloseTo(3.00);
    expect(sonnet.count).toBe(2);
    expect(sonnet.percentage).toBeCloseTo(37.5);
  });

  it('sorts by cost descending', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', model: 'claude-sonnet-4-6', cost_usd: 1.00 }),
      makeRecord({ request_id: 'r2', model: 'claude-opus-4-6', cost_usd: 5.00 }),
    ]);
    const range: [Date, Date] = [new Date('2024-01-01'), new Date('2024-12-31')];
    const breakdown = await getModelCostBreakdown(range);
    expect(breakdown[0].model).toBe('claude-opus-4-6');
  });
});

describe('getTotalCost', () => {
  it('sums cost_usd for all records in the date range', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1', timestamp: '2024-01-15T00:00:00Z', cost_usd: 0.50 }),
      makeRecord({ request_id: 'r2', timestamp: '2024-01-15T00:00:00Z', cost_usd: 1.50 }),
      makeRecord({ request_id: 'r3', timestamp: '2024-02-01T00:00:00Z', cost_usd: 99.00 }),
    ]);
    const total = await getTotalCost([new Date('2024-01-01'), new Date('2024-01-31')]);
    expect(total).toBeCloseTo(2.00);
  });

  it('returns 0 when no records are in range', async () => {
    const total = await getTotalCost([new Date('2024-06-01'), new Date('2024-06-30')]);
    expect(total).toBe(0);
  });
});

describe('exportAsJSON / importFromJSON', () => {
  it('exports all records', async () => {
    await addUsageRecords([
      makeRecord({ request_id: 'r1' }),
      makeRecord({ request_id: 'r2' }),
    ]);
    const exported = await exportAsJSON();
    expect(exported).toHaveLength(2);
  });

  it('importFromJSON adds new records and returns count', async () => {
    const existing = await addUsageRecord(makeRecord({ request_id: 'existing' }));
    const toImport: UsageRecord[] = [
      { ...existing, request_id: 'existing' }, // duplicate — should be skipped
      { ...existing, id: 'new-id', request_id: 'brand-new' },
    ];
    const added = await importFromJSON(toImport);
    expect(added).toBe(1);
    expect(await getRecordCount()).toBe(2);
  });

  it('importFromJSON regenerates IDs to avoid primary key collisions', async () => {
    const original = await addUsageRecord(makeRecord({ request_id: 'r-orig' }));
    const toImport: UsageRecord[] = [{ ...original, request_id: 'r-import' }];
    await importFromJSON(toImport);
    const all = await exportAsJSON();
    const imported = all.find(r => r.request_id === 'r-import')!;
    expect(imported.id).not.toBe(original.id);
  });
});

describe('clearAllData / getRecordCount', () => {
  it('getRecordCount returns the number of stored records', async () => {
    await addUsageRecords([makeRecord({ request_id: 'r1' }), makeRecord({ request_id: 'r2' })]);
    expect(await getRecordCount()).toBe(2);
  });

  it('clearAllData removes all records', async () => {
    await addUsageRecords([makeRecord({ request_id: 'r1' })]);
    await clearAllData();
    expect(await getRecordCount()).toBe(0);
  });
});
