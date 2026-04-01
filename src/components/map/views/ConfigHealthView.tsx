'use client';

import type { FileAnalysis, BootstrapBudget } from '@/lib/config-review/types';
import { calculateTruncation } from '@/lib/config-review/truncation';
import { BOOTSTRAP_MAX_CHARS_DEFAULT, BOOTSTRAP_TOTAL_MAX_CHARS, BOOTSTRAP_FILE_ORDER } from '@/lib/config-review/thresholds';

interface ConfigHealthViewProps {
  analyzedFiles: FileAnalysis[];
  budget: BootstrapBudget | null;
}

// ADR-0057 "typical" tier — used for the first tick mark position
const TYPICAL_THRESHOLDS: Record<string, number> = {
  'AGENTS.md': 5_000,
  'SOUL.md': 6_000,
  'TOOLS.md': 3_000,
  'IDENTITY.md': 3_000,
  'USER.md': 4_000,
  'HEARTBEAT.md': 7_000,
  'BOOTSTRAP.md': 8_000,
  'MEMORY.md': 8_000,
};
const DEFAULT_TYPICAL = 5_000;

function getTypicalThreshold(filename: string): number {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  for (const [key, val] of Object.entries(TYPICAL_THRESHOLDS)) {
    if (base === key.toUpperCase()) return val;
  }
  return DEFAULT_TYPICAL;
}

function formatK(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

const STRIPE_BG =
  'repeating-linear-gradient(135deg, #da3633, #da3633 4px, #8b1a18 4px, #8b1a18 8px)';

const PER_FILE_MAX = BOOTSTRAP_MAX_CHARS_DEFAULT; // 20_000

export default function ConfigHealthView({ analyzedFiles, budget }: ConfigHealthViewProps) {
  // Empty state
  if (analyzedFiles.length === 0) {
    return (
      <div
        style={{
          background: '#111827',
          border: '1px solid #3a4e63',
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: '#7a8a9b' }}>
          Scan your workspace to see config health
        </p>
      </div>
    );
  }

  // Sort files by BOOTSTRAP_FILE_ORDER
  const orderIndex = (path: string) => {
    const base = path.split('/').pop()?.toUpperCase() ?? '';
    const idx = BOOTSTRAP_FILE_ORDER.findIndex(f => f.toUpperCase() === base);
    return idx === -1 ? 999 : idx;
  };
  const sortedFiles = [...analyzedFiles].sort((a, b) => orderIndex(a.path) - orderIndex(b.path));

  // Summary card counts
  let healthyCount = 0;
  let warningCount = 0;
  let dangerCount = 0;
  let truncatedCount = 0;
  for (const file of sortedFiles) {
    const typical = getTypicalThreshold(file.path);
    if (file.charCount >= 20_000) truncatedCount++;
    else if (file.charCount >= 18_000) dangerCount++;
    else if (file.charCount > typical) warningCount++;
    else healthyCount++;
  }

  const summaryCards = [
    { label: 'Healthy', count: healthyCount, color: '#2ea043' },
    { label: 'Warning', count: warningCount, color: '#d29922' },
    { label: 'Danger', count: dangerCount, color: '#f85149' },
    { label: 'Truncated', count: truncatedCount, color: '#f85149' },
  ];

  return (
    <div>
      {/* 1. Summary cards row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {summaryCards.map(({ label, count, color }) => (
          <div
            key={label}
            style={{
              background: '#111827',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
            }}
          >
            {label === 'Truncated' ? (
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                <span style={{
                  background: 'repeating-linear-gradient(135deg, #da3633, #da3633 3px, #8b1a18 3px, #8b1a18 6px)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {count}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{count}</div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 2. Section header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
          Bootstrap File Size Analysis
        </div>
        <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
          Each file is injected into your agent&apos;s context on every turn. Files over 20K
          characters are silently truncated.
        </div>
      </div>

      {/* 3. Per-file progress bars */}
      <div>
        {sortedFiles.map((file, idx) => {
          const isLast = idx === sortedFiles.length - 1;
          const displayName = file.path.split('/').pop() ?? file.path;
          const typical = getTypicalThreshold(file.path);
          const charCount = file.charCount;
          const pct = PER_FILE_MAX > 0 ? Math.min(100, (charCount / PER_FILE_MAX) * 100) : 0;
          const typicalPct = (typical / PER_FILE_MAX) * 100;
          const isTruncated = charCount >= 20_000;
          const isDanger = !isTruncated && charCount >= 18_000;
          const isWarning = !isTruncated && !isDanger && charCount > typical;

          const trunc = isTruncated ? calculateTruncation(charCount) : null;
          const hiddenChars = trunc?.hiddenChars ?? 0;

          const statText = `${charCount.toLocaleString()} / 20K (${Math.round(pct)}%)`;

          let fillColor = '#2ea043';
          if (isDanger) fillColor = '#f85149';
          else if (isWarning) fillColor = '#d29922';

          return (
            <div
              key={file.path}
              style={
                !isLast
                  ? { borderBottom: '1px solid #30363d', paddingBottom: 12, marginBottom: 12 }
                  : {}
              }
            >
              {/* Top line: filename + stats */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#f1f5f9',
                    fontSize: '0.9rem',
                  }}
                >
                  {displayName}
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: isTruncated ? '#f85149' : '#8b949e',
                    fontWeight: isTruncated ? 700 : 400,
                  }}
                >
                  {statText}
                </span>
              </div>

              {isTruncated ? (
                /* Truncation overlay */
                <div
                  style={{
                    height: 22,
                    background: '#1c2028',
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: '25%',
                      background: '#484f58',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                      HEAD 14K
                    </span>
                  </div>
                  <div
                    style={{
                      width: '55%',
                      background: STRIPE_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#fff',
                        textShadow: '0 0 4px rgba(0,0,0,0.6)',
                      }}
                    >
                      ✂ {hiddenChars.toLocaleString()} CUT
                    </span>
                  </div>
                  <div
                    style={{
                      width: '20%',
                      background: '#484f58',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                      TAIL 4K
                    </span>
                  </div>
                </div>
              ) : (
                /* Normal bar with tick marks */
                <div
                  style={{
                    height: 20,
                    background: '#30363d',
                    borderRadius: 4,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: fillColor,
                      borderRadius: 4,
                    }}
                  />
                  {/* Tick 1: typical threshold */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${typicalPct}%`,
                      width: 1.5,
                      height: '100%',
                      background: 'rgba(255,255,255,0.5)',
                      zIndex: 3,
                    }}
                  />
                  {/* Tick 2: 18K danger at 90% */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '90%',
                      width: 1.5,
                      height: '100%',
                      background: 'rgba(255,255,255,0.5)',
                      zIndex: 3,
                    }}
                  />
                </div>
              )}

              {/* Tick labels (only for non-truncated bars) */}
              {!isTruncated && (
                <div style={{ position: 'relative', height: 12, marginTop: 1 }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: `${typicalPct}%`,
                      transform: 'translateX(-50%)',
                      fontSize: 9,
                      color: '#8b949e',
                    }}
                  >
                    {formatK(typical)}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      left: '90%',
                      transform: 'translateX(-50%)',
                      fontSize: 9,
                      color: '#f85149',
                    }}
                  >
                    18K
                  </span>
                </div>
              )}

              {/* Callout text */}
              {isWarning && (
                <div style={{ fontSize: 10, color: '#d29922', marginTop: 3 }}>
                  Larger than typical — review for unnecessary content
                </div>
              )}
              {isDanger && (
                <div style={{ fontSize: 10, color: '#f85149', marginTop: 3 }}>
                  Approaching truncation — trim now to avoid data loss
                </div>
              )}
              {isTruncated && (
                <div style={{ fontSize: 10, color: '#f85149', marginTop: 3 }}>
                  {hiddenChars.toLocaleString()} chars hidden from your agent right now
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4 & 5. Aggregate separator + bar */}
      {budget !== null && (
        <div style={{ borderTop: '2px solid #30363d', paddingTop: 12, marginTop: 12 }}>
          {/* Aggregate header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color: '#f1f5f9',
                fontSize: '0.9rem',
              }}
            >
              All Bootstrap Files
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                color: budget.totalChars >= BOOTSTRAP_TOTAL_MAX_CHARS ? '#f85149' : '#8b949e',
                fontWeight: budget.totalChars >= BOOTSTRAP_TOTAL_MAX_CHARS ? 700 : 400,
              }}
            >
              {budget.totalChars.toLocaleString()} / 150K (
              {Math.round((budget.totalChars / BOOTSTRAP_TOTAL_MAX_CHARS) * 100)}%)
            </span>
          </div>

          {budget.totalChars >= BOOTSTRAP_TOTAL_MAX_CHARS ? (
            /* Two-zone truncation overlay for aggregate */
            (() => {
              const overflow = budget.totalChars - BOOTSTRAP_TOTAL_MAX_CHARS;
              const loadedPct = (BOOTSTRAP_TOTAL_MAX_CHARS / budget.totalChars) * 100;
              const cutPct = 100 - loadedPct;
              return (
                <div
                  style={{
                    height: 22,
                    background: '#1c2028',
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${loadedPct}%`,
                      background: '#484f58',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
                    >
                      150,000 loaded
                    </span>
                  </div>
                  <div
                    style={{
                      width: `${cutPct}%`,
                      background: STRIPE_BG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#fff',
                        textShadow: '0 0 4px rgba(0,0,0,0.6)',
                      }}
                    >
                      ✂ {overflow.toLocaleString()} not loaded
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            /* Normal aggregate bar */
            (() => {
              const aggPct = Math.min(100, (budget.totalChars / BOOTSTRAP_TOTAL_MAX_CHARS) * 100);
              let aggFill = '#2ea043';
              if (budget.totalChars >= 120_000) aggFill = '#f85149';
              else if (budget.totalChars > 45_000) aggFill = '#d29922';
              return (
                <>
                  <div
                    style={{
                      height: 20,
                      background: '#30363d',
                      borderRadius: 4,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${aggPct}%`,
                        height: '100%',
                        background: aggFill,
                        borderRadius: 4,
                      }}
                    />
                    {/* Tick at 30% = 45K/150K */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '30%',
                        width: 1.5,
                        height: '100%',
                        background: 'rgba(255,255,255,0.5)',
                        zIndex: 3,
                      }}
                    />
                    {/* Tick at 80% = 120K/150K */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '80%',
                        width: 1.5,
                        height: '100%',
                        background: 'rgba(255,255,255,0.5)',
                        zIndex: 3,
                      }}
                    />
                  </div>
                  <div style={{ position: 'relative', height: 12, marginTop: 1 }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '30%',
                        transform: 'translateX(-50%)',
                        fontSize: 9,
                        color: '#8b949e',
                      }}
                    >
                      45K
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        left: '80%',
                        transform: 'translateX(-50%)',
                        fontSize: 9,
                        color: '#f85149',
                      }}
                    >
                      120K
                    </span>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {/* 6. Attribution footer */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #1c2028',
          fontSize: 11,
          color: '#506880',
          textAlign: 'center',
        }}
      >
        Thresholds based on OpenClaw source code and community best practices
      </div>
    </div>
  );
}
