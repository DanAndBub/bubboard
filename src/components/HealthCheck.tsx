import type { HealthReport } from '@/lib/types';

interface HealthCheckProps {
  report: HealthReport;
}

export default function HealthCheck({ report }: HealthCheckProps) {
  const scorePercent = Math.round((report.score / report.maxScore) * 100);
  const scoreColor =
    report.score >= 8 ? '#10b981' : report.score >= 5 ? '#f59e0b' : '#ef4444';
  const scoreLabel =
    report.score >= 8 ? 'Excellent' : report.score >= 5 ? 'Good' : 'Needs Work';

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h3 className="font-semibold text-[#e2e8f0] text-sm">Health Check</h3>
        </div>
        {/* Score */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-mono text-xl font-bold" style={{ color: scoreColor }}>
              {report.score}/{report.maxScore}
            </div>
            <div className="text-xs text-[#475569]">{scoreLabel}</div>
          </div>
          {/* Score ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={scoreColor}
                strokeWidth="3"
                strokeDasharray={`${(scorePercent / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${scoreColor}60)` }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-[#1e293b]">
        {report.items.map(item => (
          <div key={item.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#1a2235] transition-colors group">
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
              {item.status === 'ok' ? (
                <div className="w-5 h-5 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : item.status === 'warning' ? (
                <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-[#e2e8f0]">{item.label}</span>
                <span className="text-xs text-[#475569]">—</span>
                <span className="text-xs text-[#94a3b8] truncate">{item.description}</span>
              </div>
              {item.status !== 'ok' && item.recommendation && (
                <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                  💡 {item.recommendation}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
