'use client';

import { AgentMap, StatsData } from '@/lib/types';
import { ReviewFinding, BootstrapBudget } from '@/lib/config-review/types';

export interface OverviewViewProps {
  agentMap: AgentMap;
  stats: StatsData;
  reviewFindings: ReviewFinding[];
  healthScore: number;
  budget: BootstrapBudget | null;
  onNavigate: (view: 'agents' | 'files' | 'costs' | 'review' | 'drift') => void;
  isDemo?: boolean;
}

function shortName(path: string): string {
  return path.split('/').pop() ?? path;
}

interface SummaryCardProps {
  onClick?: () => void;
  'aria-label'?: string;
  role?: string;
  children: React.ReactNode;
}

function SummaryCard({ onClick, 'aria-label': ariaLabel, role, children }: SummaryCardProps) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={role ?? (clickable ? 'link' : 'region')}
      tabIndex={clickable ? 0 : undefined}
      aria-label={ariaLabel}
      className="rounded-xl transition-all duration-[120ms]"
      style={{
        background: '#111827',
        border: '1px solid #3a4e63',
        padding: 22,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={clickable ? e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#506880';
      } : undefined}
      onMouseLeave={clickable ? e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#3a4e63';
      } : undefined}
      onKeyDown={clickable && onClick ? e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      } : undefined}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
      <span
        className="font-bold uppercase"
        style={{ fontSize: 11, letterSpacing: '1.2px', color: '#b0bec9' }}
      >
        {title}
      </span>
      {action && (
        <span style={{ fontSize: 12, color: '#7db8fc' }}>{action}</span>
      )}
    </div>
  );
}

export default function OverviewView({
  agentMap,
  stats,
  reviewFindings,
  budget,
  onNavigate,
  isDemo,
}: OverviewViewProps) {
  const title = isDemo ? "Bub's Agent Architecture" : 'Your Agent Architecture';
  const agentCount = agentMap.agents.length;
  const topAgents = agentMap.agents.slice(0, 5);
  const topFindings = reviewFindings.slice(0, 3);
  const budgetPct = budget
    ? Math.min(100, Math.round((budget.totalChars / budget.budgetLimit) * 100))
    : 0;
  const topBudgetFiles = budget ? budget.perFileBreakdown.slice(0, 3) : [];
  const coreFiles = agentMap.workspace.coreFiles.slice(0, 5);
  const memoryFileCount = agentMap.workspace.memoryFiles.length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      {/* Page header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-[10px]">
          <span
            className="rounded-full shrink-0 animate-pulse"
            style={{
              width: 8,
              height: 8,
              background: '#34d399',
              boxShadow: '0 0 8px rgba(52,211,153,0.6)',
            }}
            aria-hidden="true"
          />
          <h1 className="font-semibold" style={{ fontSize: 17, color: '#f1f5f9', margin: 0 }}>
            {title}
          </h1>
          <span style={{ fontSize: 13, color: '#7a8a9b' }}>
            {agentCount} agent{agentCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 11, color: '#7a8a9b' }}>
          Generated in &lt;500ms
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-[14px]" style={{ marginBottom: 24 }}>
        {([
          { label: 'Total Files',     value: stats.totalFiles,     color: '#7db8fc' },
          { label: 'Agents',          value: stats.agentCount,     color: '#a78bfa' },
          { label: 'Memory Entries',  value: stats.memoryEntries,  color: '#34d399' },
          { label: 'Skills',          value: stats.skillCount,     color: '#fbbf24' },
        ] as const).map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-[10px]"
            style={{ background: '#111827', border: '1px solid #3a4e63', padding: '18px 20px' }}
          >
            <div className="font-bold leading-none" style={{ fontSize: 28, color, marginBottom: 6 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: '#7a8a9b' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Overview grid */}
      <div className="grid grid-cols-2 gap-[14px]">
        {/* Agent Fleet */}
        <SummaryCard onClick={() => onNavigate('agents')} aria-label="View all agents">
          <CardHeader title="Agent Fleet" action="View all →" />
          {topAgents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#7a8a9b', margin: 0 }}>No agents detected.</p>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {topAgents.map(agent => (
                <div key={agent.id} className="flex items-center gap-[8px]">
                  <span
                    className="rounded-full shrink-0"
                    style={{ width: 6, height: 6, background: '#a78bfa' }}
                    aria-hidden="true"
                  />
                  <span className="font-semibold flex-1 truncate" style={{ fontSize: 13, color: '#f1f5f9' }}>
                    {agent.name}
                  </span>
                  <span className="font-mono shrink-0" style={{ fontSize: 11, color: '#7a8a9b' }}>
                    {agent.model ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SummaryCard>

        {/* Config Review */}
        <SummaryCard onClick={() => onNavigate('review')} aria-label="View config review">
          <CardHeader title="Config Review" action="View all →" />
          {topFindings.length === 0 ? (
            <p style={{ fontSize: 13, color: '#34d399', margin: 0 }}>No findings — looks good!</p>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {topFindings.map((f, i) => (
                <div key={`${f.ruleId}-${i}`} className="flex items-start gap-[8px]">
                  <span
                    className="rounded-full shrink-0"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 3,
                      background: f.severity === 'critical' ? '#f87171' : '#fbbf24',
                    }}
                    aria-label={f.severity}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono truncate" style={{ fontSize: 11, color: '#b0bec9' }}>
                      {shortName(f.file)}
                    </div>
                    <div className="truncate" style={{ fontSize: 12, color: '#7a8a9b' }}>
                      {f.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SummaryCard>

        {/* Bootstrap Budget */}
        <SummaryCard aria-label="Bootstrap budget">
          <CardHeader title="Bootstrap Budget" />
          {budget === null ? (
            <p style={{ fontSize: 13, color: '#7a8a9b', margin: 0 }}>
              Scan workspace to calculate budget.
            </p>
          ) : (
            <>
              <div
                role="progressbar"
                aria-valuenow={budgetPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${budgetPct}% of bootstrap budget used`}
                style={{
                  height: 7,
                  background: '#1c2637',
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${budgetPct}%`,
                    background: 'linear-gradient(90deg, #34d399, #7db8fc)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <span className="font-mono" style={{ fontSize: 11, color: '#7a8a9b' }}>
                  {budget.totalChars.toLocaleString()} / {budget.budgetLimit.toLocaleString()} chars
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    color: budgetPct >= 100 ? '#f87171' : budgetPct >= 80 ? '#fbbf24' : '#7a8a9b',
                  }}
                >
                  {budgetPct}%
                </span>
              </div>
              <div className="flex flex-col gap-[6px]">
                {topBudgetFiles.map(f => (
                  <div key={f.path} className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: '#b0bec9' }}>{shortName(f.path)}</span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 11,
                        color: f.charCount > 5000 ? '#fbbf24' : '#7a8a9b',
                      }}
                    >
                      {f.charCount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SummaryCard>

        {/* File Health */}
        <SummaryCard onClick={() => onNavigate('files')} aria-label="View workspace files">
          <CardHeader title="File Health" action="View all →" />
          {coreFiles.length === 0 ? (
            <p style={{ fontSize: 13, color: '#7a8a9b', margin: 0 }}>No core files found.</p>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {coreFiles.map(file => (
                <div key={file} className="flex items-center justify-between">
                  <span style={{ fontSize: 13, color: '#b0bec9' }}>{shortName(file)}</span>
                  <span style={{ fontSize: 13, color: '#34d399' }} aria-label="Present">✓</span>
                </div>
              ))}
            </div>
          )}
          {(memoryFileCount > 0 || stats.memoryEntries > 0) && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid rgba(58,78,99,0.3)',
              }}
            >
              <div
                className="font-bold uppercase"
                style={{ fontSize: 11, letterSpacing: '1.2px', color: '#7a8a9b', marginBottom: 6 }}
              >
                Memory
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono" style={{ fontSize: 11, color: '#7a8a9b' }}>
                  {memoryFileCount} file{memoryFileCount !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 12, color: '#34d399' }}>
                  ✓ {stats.memoryEntries} entr{stats.memoryEntries !== 1 ? 'ies' : 'y'}
                </span>
              </div>
            </div>
          )}
        </SummaryCard>
      </div>
    </div>
  );
}
