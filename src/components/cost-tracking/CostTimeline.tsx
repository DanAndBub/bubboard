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
  deepseek_cost: number;
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
    OpenAI: { label: 'OpenAI', color: '#34d399' },
    DeepSeek: { label: 'DeepSeek', color: '#fbbf24' },
  };

  return (
    <div
      style={{ backgroundColor: '#0a0e17', border: '1px solid #506880' }}
      className="rounded-lg p-3"
    >
      <p className="text-xs text-[#b0bec9] mb-2">{label}</p>
      {payload.map((entry) => {
        const config = seriesConfig[entry.name] ?? { label: entry.name, color: entry.color };
        return (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs mb-1 last:mb-0">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-[#b0bec9]">{config.label}</span>
            <span className="text-[#f1f5f9] ml-auto pl-3">${entry.value.toFixed(2)}</span>
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
    <div className="flex h-full flex-col rounded-xl border border-[#506880] bg-[#111827] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <span className="text-sm font-semibold text-[#f1f5f9] shrink-0">Cost Over Time</span>
        <div className="flex flex-wrap gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[#7a8a9b]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6]" />
            Total
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#7a8a9b]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#06b6d4]" />
            Anthropic
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#7a8a9b]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#34d399]" />
            OpenAI
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#7a8a9b]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#fbbf24]" />
            DeepSeek
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a4e63" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#7a8a9b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#3a4e63' }}
            tickFormatter={formatDate}
          />
          <YAxis
            tick={{ fill: '#7a8a9b', fontSize: 11 }}
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
            stroke="#34d399"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            name="OpenAI"
          />
          <Area
            dataKey="deepseek_cost"
            stroke="#fbbf24"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            name="DeepSeek"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
