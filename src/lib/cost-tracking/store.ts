import { db } from './db';
import { UsageRecord } from './types';
import { calculateCost } from './calculator';

export async function addUsageRecord(
  record: Omit<UsageRecord, 'id' | 'cost_usd'>
): Promise<UsageRecord> {
  const id = crypto.randomUUID();
  const breakdown = calculateCost({ ...record, id, cost_usd: 0 });
  const cost_usd = breakdown ? breakdown.total_cost : 0;
  const fullRecord: UsageRecord = { ...record, id, cost_usd };
  await db.usage.put(fullRecord);
  return fullRecord;
}

export async function addUsageRecords(
  records: Omit<UsageRecord, 'id' | 'cost_usd'>[]
): Promise<number> {
  const fullRecords: UsageRecord[] = records.map((record) => {
    const id = crypto.randomUUID();
    const breakdown = calculateCost({ ...record, id, cost_usd: 0 });
    const cost_usd = breakdown ? breakdown.total_cost : 0;
    return { ...record, id, cost_usd };
  });
  await db.usage.bulkPut(fullRecords);
  return fullRecords.length;
}

export async function getUsageByDateRange(start: Date, end: Date): Promise<UsageRecord[]> {
  return db.usage
    .where('timestamp')
    .between(start.toISOString(), end.toISOString(), true, true)
    .toArray();
}

export async function getUsageByModel(
  model: string,
  dateRange?: [Date, Date]
): Promise<UsageRecord[]> {
  if (dateRange) {
    const [start, end] = dateRange;
    return db.usage
      .where('timestamp')
      .between(start.toISOString(), end.toISOString(), true, true)
      .filter((r) => r.model === model)
      .toArray();
  }
  return db.usage.where('model').equals(model).toArray();
}

export async function getUsageByTask(taskId: string): Promise<UsageRecord[]> {
  return db.usage.where('task_id').equals(taskId).toArray();
}

export async function getDailyCostSummary(
  dateRange: [Date, Date]
): Promise<Array<{ date: string; cost: number; count: number }>> {
  const [start, end] = dateRange;

  const acc: Record<string, { cost: number; count: number }> = {};
  await db.usage
    .where('timestamp')
    .between(start.toISOString(), end.toISOString(), true, true)
    .each((record) => {
      const date = record.timestamp.slice(0, 10);
      if (!acc[date]) acc[date] = { cost: 0, count: 0 };
      acc[date].cost += record.cost_usd;
      acc[date].count += 1;
    });

  return Object.entries(acc)
    .map(([date, { cost, count }]) => ({ date, cost, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getModelCostBreakdown(
  dateRange: [Date, Date]
): Promise<Array<{ model: string; cost: number; count: number; percentage: number }>> {
  const [start, end] = dateRange;
  // Normalize versioned model names to display names
  const normalizeModel = (model: string): string => {
    if (model.startsWith('claude-opus-4-6')) return 'claude-opus-4-6';
    if (model.startsWith('claude-opus-4-5')) return 'claude-opus-4-5';
    if (model.startsWith('claude-sonnet-4-6')) return 'claude-sonnet-4-6';
    if (model.startsWith('claude-sonnet-4-5') || model === 'claude-sonnet-4-20250514') return 'claude-sonnet-4-5';
    if (model.startsWith('claude-haiku-4-5')) return 'claude-haiku-4-5';
    if (model.startsWith('claude-haiku-3-5')) return 'claude-haiku-3-5';
    return model;
  };

  const acc: Record<string, { cost: number; count: number }> = {};
  await db.usage
    .where('timestamp')
    .between(start.toISOString(), end.toISOString(), true, true)
    .each((record) => {
      const displayModel = normalizeModel(record.model);
      if (displayModel === 'delivery-mirror') return; // internal routing, not real usage
      if (!acc[displayModel]) acc[displayModel] = { cost: 0, count: 0 };
      acc[displayModel].cost += record.cost_usd;
      acc[displayModel].count += 1;
    });

  const total = Object.values(acc).reduce((sum, { cost }) => sum + cost, 0);
  return Object.entries(acc)
    .map(([model, { cost, count }]) => ({
      model,
      cost,
      count,
      percentage: total > 0 ? (cost / total) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export async function getTotalCost(dateRange: [Date, Date]): Promise<number> {
  const [start, end] = dateRange;
  let total = 0;
  await db.usage
    .where('timestamp')
    .between(start.toISOString(), end.toISOString(), true, true)
    .each((record) => {
      total += record.cost_usd;
    });
  return total;
}

export async function exportAsJSON(): Promise<UsageRecord[]> {
  return db.usage.toArray();
}

export async function importFromJSON(data: UsageRecord[]): Promise<number> {
  const existingRequestIds = new Set<string>();
  await db.usage
    .where('request_id')
    .anyOf(data.map((r) => r.request_id))
    .each((r) => existingRequestIds.add(r.request_id));

  const newRecords = data
    .filter((r) => !existingRequestIds.has(r.request_id))
    // Regenerate IDs so imported records never collide with existing primary keys
    .map((r) => ({ ...r, id: crypto.randomUUID() }));
  if (newRecords.length > 0) {
    await db.usage.bulkPut(newRecords);
  }
  return newRecords.length;
}

export async function clearAllData(): Promise<void> {
  await db.usage.clear();
}

export async function getRecordCount(): Promise<number> {
  return db.usage.count();
}
