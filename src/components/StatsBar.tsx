import type { StatsData } from '@/lib/types';

interface StatsBarProps {
  stats: StatsData;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const scoreColor =
    stats.score >= 8 ? '#10b981' : stats.score >= 5 ? '#f59e0b' : '#ef4444';

  const items = [
    {
      label: 'Total Files',
      value: stats.totalFiles.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: '#3b82f6',
    },
    {
      label: 'Agents',
      value: stats.agentCount.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: '#8b5cf6',
    },
    {
      label: 'Memory Entries',
      value: stats.memoryEntries.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: '#10b981',
    },
    {
      label: 'Skills',
      value: stats.skillCount > 0 ? `${stats.skillCount}+` : '0',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: '#f59e0b',
    },
    {
      label: 'Setup Score',
      value: `${stats.score}/${stats.maxScore}`,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: scoreColor,
    },
  ];

  return (
    <div className="border border-[#1e293b] rounded-xl bg-[#111827] overflow-hidden">
      <div className="grid grid-cols-5 divide-x divide-[#1e293b]">
        {items.map(item => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center py-4 px-2 gap-1 hover:bg-[#1a2235] transition-colors"
          >
            <div style={{ color: item.color }} className="mb-1">
              {item.icon}
            </div>
            <div
              className="font-mono text-xl font-bold leading-none"
              style={{ color: item.color }}
            >
              {item.value}
            </div>
            <div className="text-xs text-[#475569] text-center">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
