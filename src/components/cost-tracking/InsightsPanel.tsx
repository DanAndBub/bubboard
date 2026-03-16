'use client';

interface Anomaly {
  index: number;
  date: string;
  cost: number;
  type: string;
  severity: number;
  detail: string;
}

interface Forecast {
  model: string;
  r2: number;
  predictions: Array<{ day: number; date: string; predicted_cost: number }>;
  projected_weekly: number;
  projected_monthly: number;
  confidence: string;
}

interface QuickStats {
  mostExpensiveModel: string;
  avgCostPerRequest: number;
  busiestDay: string;
  cacheHitRate: number;
}

interface InsightsPanelProps {
  anomalies: Anomaly[];
  forecast: Forecast | null;
  quickStats: QuickStats;
}

export default function InsightsPanel({ anomalies, forecast, quickStats }: InsightsPanelProps) {
  const visibleAnomalies = anomalies.slice(0, 5);
  const extraCount = anomalies.length - 5;

  const confidenceColors: Record<string, string> = {
    high: 'bg-green-500/10 text-[#34d399] border border-green-500/20',
    medium: 'bg-amber-500/10 text-[#fbbf24] border border-amber-500/20',
    low: 'bg-red-500/10 text-[#f87171] border border-red-500/20',
  };

  return (
    <div className="rounded-xl border border-[#506880] bg-[#111827] p-6">
      <div className="flex items-center gap-2 mb-6">
        <svg className="w-4 h-4 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="text-sm font-semibold text-[#f1f5f9]">Insights</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Section A — Anomaly Alerts */}
        <div>
          <p className="text-xs font-medium text-[#b0bec9] mb-1">Anomaly Alerts</p>
          <p className="text-[10px] text-[#7a8a9b] mb-3">Days where spending significantly deviated from your average</p>
          {anomalies.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[#7a8a9b]">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No anomalies detected
            </div>
          ) : (
            <>
              {visibleAnomalies.map((anomaly) => {
                const isHigh = anomaly.severity >= 3;
                return (
                  <div
                    key={anomaly.index}
                    className={`px-3 py-2 rounded-lg mb-2 border ${
                      isHigh
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          isHigh ? 'bg-red-500' : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <p className="text-xs text-[#b0bec9]">{anomaly.detail}</p>
                        <p className="text-[10px] font-mono text-[#7a8a9b] mt-0.5">{anomaly.date}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {extraCount > 0 && (
                <button className="text-xs text-[#7db8fc] hover:text-blue-300 transition-colors">
                  + {extraCount} more
                </button>
              )}
            </>
          )}
        </div>

        {/* Section B — Forecast */}
        <div>
          <p className="text-xs font-medium text-[#b0bec9] mb-3">Forecast</p>
          {!forecast ? (
            <p className="text-xs text-[#7a8a9b]">
              Not enough data for forecasting (need 7+ days)
            </p>
          ) : (
            <>
              <p className="text-xs text-[#7a8a9b]">Projected spend next 7 days</p>
              <p className="font-mono text-xl font-bold text-[#f1f5f9] mt-1">
                ${forecast.projected_weekly.toFixed(2)}
              </p>
              <p className="text-xs text-[#b0bec9] mt-1">
                Projected monthly: ${forecast.projected_monthly.toFixed(2)}
              </p>
              <span
                className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-2 ${
                  confidenceColors[forecast.confidence] ?? confidenceColors.low
                }`}
              >
                {forecast.confidence.charAt(0).toUpperCase() + forecast.confidence.slice(1)} confidence (R²={forecast.r2.toFixed(2)})
              </span>
              <p className="text-[10px] text-[#7a8a9b] mt-1.5">
                Using {forecast.model} regression
              </p>
            </>
          )}
        </div>

        {/* Section C — Quick Stats */}
        <div>
          <p className="text-xs font-medium text-[#b0bec9] mb-3">Quick Stats</p>
          <div>
            <div className="flex justify-between py-1.5 border-b border-[#506880]/50">
              <span className="text-xs text-[#7a8a9b]">Most Expensive Model</span>
              <span className="text-xs font-mono text-[#f1f5f9]">{quickStats.mostExpensiveModel}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#506880]/50">
              <span className="text-xs text-[#7a8a9b]">Avg Cost / Request</span>
              <span className="text-xs font-mono text-[#f1f5f9]">${quickStats.avgCostPerRequest.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#506880]/50">
              <span className="text-xs text-[#7a8a9b]">Busiest Day</span>
              <span className="text-xs font-mono text-[#f1f5f9]">{quickStats.busiestDay}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-[#7a8a9b]">Cache Hit Rate</span>
              <span className="text-xs font-mono text-[#f1f5f9]">{(quickStats.cacheHitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
