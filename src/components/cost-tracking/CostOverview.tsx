'use client';

interface CostOverviewProps {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  projectedMonthly: number;
  recordCount: number;
  previousWeekCost?: number;
  previousMonthCost?: number;
}

function formatUSD(value: number): string {
  if (value < 0.01) return '$' + value.toFixed(4);
  return '$' + value.toFixed(2);
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = Math.abs((current - previous) / previous * 100).toFixed(1);
  if (current > previous) {
    return <span className="text-xs text-red-400 mt-1 block">↑ {pct}%</span>;
  }
  if (current < previous) {
    return <span className="text-xs text-green-400 mt-1 block">↓ {pct}%</span>;
  }
  return null;
}

export default function CostOverview({
  todayCost,
  weekCost,
  monthCost,
  projectedMonthly,
  recordCount,
  previousWeekCost,
  previousMonthCost,
}: CostOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Today */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="text-xs text-[#475569] uppercase tracking-wider font-medium">Today</div>
        <div className="font-mono text-2xl font-bold mt-1 text-blue-400">{formatUSD(todayCost)}</div>
      </div>

      {/* This Week */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="text-xs text-[#475569] uppercase tracking-wider font-medium">This Week</div>
        <div className="font-mono text-2xl font-bold mt-1 text-blue-400">{formatUSD(weekCost)}</div>
        {previousWeekCost !== undefined && (
          <TrendArrow current={weekCost} previous={previousWeekCost} />
        )}
      </div>

      {/* This Month */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="text-xs text-[#475569] uppercase tracking-wider font-medium">This Month</div>
        <div className="font-mono text-2xl font-bold mt-1 text-blue-400">{formatUSD(monthCost)}</div>
        {previousMonthCost !== undefined && (
          <TrendArrow current={monthCost} previous={previousMonthCost} />
        )}
      </div>

      {/* Projected Monthly */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#475569] uppercase tracking-wider font-medium">Projected Monthly</span>
          <span className="text-[10px] text-amber-400/60">est.</span>
        </div>
        <div className="font-mono text-2xl font-bold mt-1 text-amber-400">{formatUSD(projectedMonthly)}</div>
      </div>

      {/* Records Tracked */}
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4">
        <div className="text-xs text-[#475569] uppercase tracking-wider font-medium">Records Tracked</div>
        <div className="font-mono text-2xl font-bold mt-1 text-[#94a3b8]">{recordCount.toLocaleString()}</div>
      </div>
    </div>
  );
}
