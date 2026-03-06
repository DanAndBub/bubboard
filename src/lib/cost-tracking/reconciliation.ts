import { getTotalCost, getModelCostBreakdown } from './store';

export interface ReconciliationResult {
  period: { start: Date; end: Date };
  local_total_cost: number;
  admin_total_cost: number;
  difference: number;
  difference_pct: number;
  per_model_comparison: Array<{
    model: string;
    local_cost: number;
    admin_cost: number;
    difference: number;
  }>;
  status: 'matched' | 'minor_discrepancy' | 'major_discrepancy' | 'no_admin_data';
}

interface AdminResponse {
  available: boolean;
  usage?: unknown;
  costs?: unknown;
}

async function fetchAnthropicAdmin(start: Date, end: Date): Promise<AdminResponse> {
  try {
    const params = new URLSearchParams({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    const res = await fetch(`/api/admin/anthropic/usage?${params}`, {
      headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}` },
    });
    return await res.json();
  } catch {
    return { available: false };
  }
}

async function fetchOpenAIAdmin(start: Date, end: Date): Promise<AdminResponse> {
  try {
    const params = new URLSearchParams({
      start_time: String(Math.floor(start.getTime() / 1000)),
      end_time: String(Math.floor(end.getTime() / 1000)),
    });
    const res = await fetch(`/api/admin/openai/usage?${params}`, {
      headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}` },
    });
    return await res.json();
  } catch {
    return { available: false };
  }
}

// TODO: The exact shape of costs/usage responses needs to be verified against
// real API responses. The Anthropic cost_report and OpenAI organization/costs
// endpoints have not been confirmed in production.
function extractTotalCost(response: AdminResponse): number {
  if (!response.available || !response.costs) return 0;

  const costs = response.costs as Record<string, unknown>;

  // Try top-level total fields
  if (typeof costs.total === 'number') return costs.total;
  if (typeof costs.total_cost === 'number') return costs.total_cost;
  if (typeof costs.amount === 'number') return costs.amount;

  // Try summing an array of line items (e.g. Anthropic cost_report may return
  // { data: [{ total_cost: number, ... }] } or OpenAI { data: [{ amount: { value: number } }] })
  if (Array.isArray(costs.data)) {
    return costs.data.reduce((sum: number, item: unknown) => {
      const entry = item as Record<string, unknown>;
      if (typeof entry.total_cost === 'number') return sum + entry.total_cost;
      if (typeof entry.cost === 'number') return sum + entry.cost;
      const amount = entry.amount as Record<string, unknown> | undefined;
      if (amount && typeof amount.value === 'number') return sum + amount.value;
      return sum;
    }, 0);
  }

  return 0;
}

// TODO: Same caveat as extractTotalCost — model breakdown shape is unverified.
function extractPerModelCosts(response: AdminResponse): Map<string, number> {
  const map = new Map<string, number>();
  if (!response.available) return map;

  // Try usage grouped by model first (more reliable than cost_report breakdown)
  const source = (response.usage ?? response.costs) as Record<string, unknown> | undefined;
  if (!source) return map;

  if (Array.isArray(source.data)) {
    for (const item of source.data as Record<string, unknown>[]) {
      const model = typeof item.model === 'string' ? item.model : null;
      if (!model) continue;

      let cost = 0;
      if (typeof item.total_cost === 'number') cost = item.total_cost;
      else if (typeof item.cost === 'number') cost = item.cost;
      else {
        const amount = item.amount as Record<string, unknown> | undefined;
        if (amount && typeof amount.value === 'number') cost = amount.value;
      }

      map.set(model, (map.get(model) ?? 0) + cost);
    }
  }

  return map;
}

export async function reconcile(dateRange: [Date, Date]): Promise<ReconciliationResult> {
  const [start, end] = dateRange;

  const [localTotal, localBreakdown, anthropicData, openaiData] = await Promise.all([
    getTotalCost(dateRange),
    getModelCostBreakdown(dateRange),
    fetchAnthropicAdmin(start, end),
    fetchOpenAIAdmin(start, end),
  ]);

  const neitherAvailable = !anthropicData.available && !openaiData.available;
  if (neitherAvailable) {
    return {
      period: { start, end },
      local_total_cost: localTotal,
      admin_total_cost: 0,
      difference: 0,
      difference_pct: 0,
      per_model_comparison: localBreakdown.map(({ model, cost }) => ({
        model,
        local_cost: cost,
        admin_cost: 0,
        difference: -cost,
      })),
      status: 'no_admin_data',
    };
  }

  const adminTotal =
    extractTotalCost(anthropicData) + extractTotalCost(openaiData);

  const difference = adminTotal - localTotal;
  const difference_pct = adminTotal > 0 ? (Math.abs(difference) / adminTotal) * 100 : 0;

  let status: ReconciliationResult['status'];
  if (difference_pct < 1) status = 'matched';
  else if (difference_pct < 5) status = 'minor_discrepancy';
  else status = 'major_discrepancy';

  // Merge per-model admin costs from both providers
  const adminModelCosts = new Map<string, number>();
  for (const [model, cost] of extractPerModelCosts(anthropicData)) {
    adminModelCosts.set(model, (adminModelCosts.get(model) ?? 0) + cost);
  }
  for (const [model, cost] of extractPerModelCosts(openaiData)) {
    adminModelCosts.set(model, (adminModelCosts.get(model) ?? 0) + cost);
  }

  // Build comparison — include all models seen in either source
  const allModels = new Set<string>([
    ...localBreakdown.map((r) => r.model),
    ...adminModelCosts.keys(),
  ]);

  const localByModel = new Map(localBreakdown.map((r) => [r.model, r.cost]));

  const per_model_comparison = Array.from(allModels).map((model) => {
    const local_cost = localByModel.get(model) ?? 0;
    const admin_cost = adminModelCosts.get(model) ?? 0;
    return { model, local_cost, admin_cost, difference: admin_cost - local_cost };
  });

  return {
    period: { start, end },
    local_total_cost: localTotal,
    admin_total_cost: adminTotal,
    difference,
    difference_pct,
    per_model_comparison,
    status,
  };
}

export async function checkAdminAvailability(): Promise<{
  anthropic: boolean;
  openai: boolean;
}> {
  const [anthropicData, openaiData] = await Promise.all([
    fetchAnthropicAdmin(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
    fetchOpenAIAdmin(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()),
  ]);
  return {
    anthropic: anthropicData.available,
    openai: openaiData.available,
  };
}
