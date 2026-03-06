'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface ModelBreakdownProps {
  data: Array<{ model: string; cost: number; count: number; percentage: number }>;
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus': '#3b82f6',
  'claude-sonnet': '#8b5cf6',
  'claude-haiku': '#06b6d4',
  'deepseek': '#10b981',
  'gpt-4.1': '#f59e0b',
  'gpt-4o': '#ef4444',
  'o3': '#ec4899',
  'o1': '#f97316',
};

function getModelColor(model: string): string {
  const key = Object.keys(MODEL_COLORS).find(k => model.includes(k));
  return key ? MODEL_COLORS[key] : '#6b7280';
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { model: string; cost: number; percentage: number } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { model, cost, percentage } = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0a0e17] px-3 py-2 shadow-lg">
      <p className="text-xs text-[#94a3b8]">{model}</p>
      <p className="font-mono text-sm text-[#e2e8f0]">${cost.toFixed(4)}</p>
      <p className="text-xs text-[#475569]">{percentage.toFixed(1)}%</p>
    </div>
  );
}

export default function ModelBreakdown({ data }: ModelBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.cost, 0);

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
      <p className="mb-6 text-sm font-semibold text-[#e2e8f0]">Cost by Model</p>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Donut chart */}
        <div className="relative flex-1">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={getModelColor(entry.model)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-[#475569]">Total</span>
            <span className="font-mono text-xl font-bold text-[#e2e8f0]">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full shrink-0 md:w-48">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 py-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getModelColor(entry.model) }}
              />
              <span className="truncate text-xs text-[#94a3b8]">{entry.model}</span>
              <span className="ml-auto font-mono text-xs text-[#e2e8f0]">
                ${entry.cost.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
