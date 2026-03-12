'use client';

interface CostOverviewProps {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  recordCount: number;
  previousWeekCost?: number;
  previousMonthCost?: number;
}

function formatUSD(value: number): string {
  if (value < 0.01 && value > 0) return '$' + value.toFixed(4);
  return '$' + value.toFixed(2);
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = Math.abs((current - previous) / previous * 100).toFixed(1);
  if (current > previous) {
    return <span className="text-xs text-[#f87171] mt-1 block">↑ {pct}%</span>;
  }
  if (current < previous) {
    return <span className="text-xs text-[#34d399] mt-1 block">↓ {pct}%</span>;
  }
  return null;
}

export default function CostOverview({
  todayCost,
  weekCost,
  monthCost,
  recordCount,
  previousWeekCost,
  previousMonthCost,
}: CostOverviewProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-xl border border-[#506880] bg-[#111827] p-4">
        <div className="text-xs text-[#7a8a9b] uppercase tracking-wider font-medium">Today</div>
        <div className="font-mono text-2xl font-bold mt-1 text-[#7db8fc]">{formatUSD(todayCost)}</div>
      </div>

      <div className="rounded-xl border border-[#506880] bg-[#111827] p-4">
        <div className="text-xs text-[#7a8a9b] uppercase tracking-wider font-medium">This Week</div>
        <div className="font-mono text-2xl font-bold mt-1 text-[#7db8fc]">{formatUSD(weekCost)}</div>
        {previousWeekCost !== undefined && (
          <TrendArrow current={weekCost} previous={previousWeekCost} />
        )}
      </div>

      <div className="rounded-xl border border-[#506880] bg-[#111827] p-4">
        <div className="text-xs text-[#7a8a9b] uppercase tracking-wider font-medium">This Month</div>
        <div className="font-mono text-2xl font-bold mt-1 text-[#7db8fc]">{formatUSD(monthCost)}</div>
        {previousMonthCost !== undefined && (
          <TrendArrow current={monthCost} previous={previousMonthCost} />
        )}
      </div>

      <div className="rounded-xl border border-[#506880] bg-[#111827] p-4">
        <div className="text-xs text-[#7a8a9b] uppercase tracking-wider font-medium">Records Tracked</div>
        <div className="font-mono text-2xl font-bold mt-1 text-[#b0bec9]">{recordCount.toLocaleString()}</div>
      </div>
    </div>
  );
}
