'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  date: string;
  cost: number;
  anthropic_cost: number;
  openai_cost: number;
}

interface CostTimelineProps {
  data: DataPoint[];
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const seriesConfig: Record<string, { label: string; color: string }> = {
    Total: { label: 'Total', color: '#3b82f6' },
    Anthropic: { label: 'Anthropic', color: '#06b6d4' },
    OpenAI: { label: 'OpenAI', color: '#10b981' },
  };

  return (
    <div
      style={{ backgroundColor: '#0a0e17', border: '1px solid #1e293b' }}
      className="rounded-lg p-3"
    >
      <p className="text-xs text-[#94a3b8] mb-2">{label}</p>
      {payload.map((entry) => {
        const config = seriesConfig[entry.name] ?? { label: entry.name, color: entry.color };
        return (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs mb-1 last:mb-0">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-[#94a3b8]">{config.label}</span>
            <span className="text-[#e2e8f0] ml-auto pl-3">${entry.value.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}

export default function CostTimeline({ data }: CostTimelineProps) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-semibold text-[#e2e8f0]">Cost Over Time</span>
        <div className="inline-flex gap-4">
          <span className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
            Total
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#06b6d4]" />
            Anthropic
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#475569]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#10b981]" />
            OpenAI
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
            tickFormatter={formatDate}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="cost"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.1}
            strokeWidth={2}
            name="Total"
          />
          <Area
            dataKey="anthropic_cost"
            stroke="#06b6d4"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            name="Anthropic"
          />
          <Area
            dataKey="openai_cost"
            stroke="#10b981"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            name="OpenAI"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
