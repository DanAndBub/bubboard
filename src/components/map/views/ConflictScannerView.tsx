'use client';

import { useState } from 'react';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';
import type { ConflictResult, ConflictCategory } from '@/lib/conflict/types';

interface ConflictScannerViewProps {
  conflictResult: ConflictResult | null;
}

const CATEGORY_ORDER: ConflictCategory[] = ['structural', 'cross-file', 'within-file', 'duplicate'];

const CATEGORY_LABELS: Record<ConflictCategory, string> = {
  structural: 'Structural Issues',
  'cross-file': 'Cross-File Conflicts',
  'within-file': 'Within-File Conflicts',
  duplicate: 'Duplicates',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#da3633',
  warning: '#d97706',
  info: '#506880',
};

function getCategoryCount(result: ConflictResult, category: ConflictCategory): number {
  switch (category) {
    case 'structural': return result.structuralCount;
    case 'cross-file': return result.crossFileCount;
    case 'within-file': return result.withinFileCount;
    case 'duplicate': return result.duplicateCount;
  }
}

function getHighestSeverityColor(findings: Array<{ severity: string }>): string {
  if (findings.some(f => f.severity === 'critical')) return SEVERITY_COLORS.critical;
  if (findings.some(f => f.severity === 'warning')) return SEVERITY_COLORS.warning;
  return SEVERITY_COLORS.info;
}

function CategorySection({
  category,
  findings,
  count,
}: {
  category: ConflictCategory;
  findings: ConflictResult['findings'];
  count: number;
}) {
  const [open, setOpen] = useState(true);
  const badgeColor = getHighestSeverityColor(findings);

  return (
    <div className="border-t border-[#1e2a38]">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[#0d1520] transition-colors"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold font-mono text-[#e2e8f0] flex-1">
          {CATEGORY_LABELS[category]}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{ backgroundColor: badgeColor + '33', color: badgeColor, border: `1px solid ${badgeColor}66` }}
        >
          {count}
        </span>
        <svg
          className="w-3 h-3 text-[#506880] transition-transform flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms ease',
        }}
      >
        <div className="overflow-hidden">
          {findings.map((finding, idx) => {
            const isLast = idx === findings.length - 1;
            const severityColor = SEVERITY_COLORS[finding.severity] ?? SEVERITY_COLORS.info;

            return (
              <div
                key={finding.ruleId}
                className={`px-4 py-3 ${!isLast ? 'border-b border-[#1e2a38]' : ''}`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: severityColor + '22',
                      color: severityColor,
                      border: `1px solid ${severityColor}44`,
                    }}
                  >
                    {finding.severity}
                  </span>
                  <p className="text-sm text-[#e2e8f0] leading-snug">{finding.message}</p>
                </div>

                {/* Affected files */}
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {finding.files.map(file => (
                    <span
                      key={file}
                      className="text-xs font-mono text-[#94a3b8] bg-[#0d1520] px-1.5 py-0.5 rounded"
                    >
                      {file}
                    </span>
                  ))}
                </div>

                {/* Conflicting phrases */}
                {finding.conflictingPhrases && finding.conflictingPhrases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {finding.conflictingPhrases.map(phrase => (
                      <code
                        key={phrase}
                        className="bg-[#111820] px-1.5 py-0.5 rounded text-[12px] font-mono text-[#94a3b8]"
                      >
                        {phrase}
                      </code>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                <p className="text-xs text-[#506880] italic">{finding.recommendation}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ConflictScannerView({ conflictResult }: ConflictScannerViewProps) {
  const isEmpty = !conflictResult || conflictResult.totalCount === 0;

  return (
    <div className="max-w-[960px] mx-auto">
      <ViewContextHeader
        viewId="conflict"
        oneLiner="Detects contradicting instructions, structural risks, and duplicated content across your bootstrap files."
        expandedDetail="Cross-file conflicts happen when one file says 'always escalate' and another says 'figure it out.' Structural issues flag instructions in files your subagents can't see, or critical content at risk of being lost during context compaction. Duplicates waste tokens and tend to drift apart over time."
      />

      {isEmpty ? (
        <div className="rounded-xl border border-[#1e2a38] bg-[#111820] p-10 text-center">
          <p className="text-sm font-medium text-[#e2e8f0] mb-1">No conflicts detected</p>
          <p className="text-xs text-[#506880]">Your bootstrap files look consistent.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1e2a38] bg-[#111820]">
          {/* Summary bar */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[#506880] font-mono">
              {conflictResult.totalCount} finding{conflictResult.totalCount !== 1 ? 's' : ''} across {conflictResult.filesAnalyzed} files
            </span>
            <span className="text-xs text-[#1e2a38]">|</span>
            <span className="text-xs text-[#506880] font-mono">
              {conflictResult.rulesExecuted} rules executed
            </span>
          </div>

          {/* Category sections */}
          {CATEGORY_ORDER.map(category => {
            const count = getCategoryCount(conflictResult, category);
            if (count === 0) return null;
            const findings = conflictResult.findings.filter(f => f.category === category);
            return (
              <CategorySection
                key={category}
                category={category}
                findings={findings}
                count={count}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
