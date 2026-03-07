'use client';

import { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ModelBreakdownProps {
  data: Array<{ model: string; cost: number; count: number; percentage: number }>;
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus': '#3b82f6',
  'claude-sonnet': '#8b5cf6',
  'claude-haiku': '#06b6d4',
  'deepseek-chat': '#10b981',
  'deepseek-reasoner': '#34d399',
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

export default function ModelBreakdown({ data }: ModelBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.cost, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredEntry = hovered !== null ? data[hovered] : null;

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#1e293b] bg-[#111827] p-6">
      <p className="mb-6 text-sm font-semibold text-[#e2e8f0]">Cost by Model</p>
      <div className="flex flex-1 flex-col gap-6 md:flex-row">
        {/* Donut chart */}
        <div className="relative flex-1 min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={2}
                stroke="none"
                onMouseLeave={() => setHovered(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={getModelColor(entry.model)}
                    opacity={hovered !== null && hovered !== index ? 0.4 : 1}
                    onMouseEnter={() => setHovered(index)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label — shows hovered model or total */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {hoveredEntry ? (
              <>
                <span className="max-w-[120px] truncate text-xs text-[#94a3b8]">{hoveredEntry.model}</span>
                <span className="font-mono text-xl font-bold text-[#e2e8f0]">
                  ${hoveredEntry.cost.toFixed(2)}
                </span>
                <span className="text-xs text-[#475569]">{hoveredEntry.percentage.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <span className="text-xs text-[#475569]">Total</span>
                <span className="font-mono text-xl font-bold text-[#e2e8f0]">
                  ${total.toFixed(2)}
                </span>
              </>
            )}
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
