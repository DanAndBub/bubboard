'use client';

import { useState, useMemo } from 'react';
import type { ReviewResult } from '@/lib/config-review/runner';
import type { ReviewFinding, TruncationAnalysis } from '@/lib/config-review/types';
import { calculateTruncation } from '@/lib/config-review/truncation';
import { calculateBudget } from '@/lib/config-review/budget';
import type { FileAnalysis } from '@/lib/config-review/types';
import TruncationDiagram from './TruncationDiagram';

interface ReviewPanelProps {
  result: ReviewResult;
  files: FileAnalysis[];
  onOpenFile?: (path: string, finding?: ReviewFinding) => void;
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/20 bg-red-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-[#7db8fc]/20 bg-[#7db8fc]/5',
};

function _scoreColor(score: number): string {
  if (score >= 90) return 'text-[#34d399]';
  if (score >= 70) return 'text-[#fbbf24]';
  return 'text-[#f87171]';
}

function _scoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ReviewPanel({ result, files, onOpenFile }: ReviewPanelProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(new Set(['critical', 'warning', 'info']));

  // Group findings by file
  const grouped = useMemo(() => {
    const map = new Map<string, ReviewFinding[]>();
    for (const f of result.findings) {
      const key = f.file;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [result.findings]);

  // Filtered view based on active severities
  const filteredGrouped = useMemo(() => {
    const map = new Map<string, ReviewFinding[]>();
    for (const [file, findings] of grouped.entries()) {
      const filtered = findings.filter(f => activeSeverities.has(f.severity));
      if (filtered.length > 0) map.set(file, filtered);
    }
    return map;
  }, [grouped, activeSeverities]);

  // Budget
  const budget = useMemo(() => calculateBudget(files), [files]);
  const budgetPct = Math.min(100, (budget.totalChars / budget.budgetLimit) * 100);
  const budgetTokens = Math.ceil(budget.totalChars / 4);

  function toggleFile(file: string) {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file); else next.add(file);
      return next;
    });
  }

  function toggleSeverity(sev: string) {
    setActiveSeverities(prev => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev); else next.add(sev);
      return next;
    });
  }

  const allExpanded = filteredGrouped.size > 0 && [...filteredGrouped.keys()].every(f => expandedFiles.has(f));

  function toggleAll() {
    if (allExpanded) {
      setExpandedFiles(new Set());
    } else {
      setExpandedFiles(new Set(filteredGrouped.keys()));
    }
  }

  function toggleFinding(id: string) {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-[#506880] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#506880] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#f1f5f9]">Configuration Review</span>
          <div className="flex items-center gap-1.5 text-xs">
            {result.criticalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-[#f87171] border border-red-500/20">
                {result.criticalCount} critical
              </span>
            )}
            {result.warningCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#fbbf24] border border-amber-500/20">
                {result.warningCount} warning
              </span>
            )}
            {result.infoCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-[#7db8fc]/10 text-[#7db8fc] border border-[#7db8fc]/20">
                {result.infoCount} info
              </span>
            )}
          </div>
        </div>
        {/* Health score hidden — preserved for potential future use */}
      </div>

      {/* Health Score Bar — hidden per Dan's review. Code preserved for potential future use.
      <div className="px-5 py-3 border-b border-[#506880]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#7a8a9b] font-medium">Config Health</span>
          <span className={`text-xs font-mono ${scoreColor(result.healthScore)}`}>
            {result.healthScore >= 90 ? 'Excellent' : result.healthScore >= 70 ? 'Needs attention' : 'Critical issues'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#0a0e17] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(result.healthScore)}`}
            style={{ width: `${result.healthScore}%` }}
          />
        </div>
        <p className="text-[10px] text-[#7a8a9b] mt-1.5">Score = 100 minus penalties (critical: −15, warning: −5)</p>
      </div>
      */}

      {/* Bootstrap Budget Bar */}
      <div className="px-5 py-3 border-b border-[#506880]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#7a8a9b] font-medium">Bootstrap Budget</span>
          <span className="text-xs font-mono text-[#b0bec9]">
            {budget.totalChars.toLocaleString()} / {budget.budgetLimit.toLocaleString()} chars
            <span className="text-[#7a8a9b] ml-1.5">~{budgetTokens.toLocaleString()} tokens/msg</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#0a0e17] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPct > 100 ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-[#7db8fc]'
            }`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        {budget.overBudgetBy > 0 && (
          <p className="text-[10px] text-[#f87171] mt-1">
            {budget.overBudgetBy.toLocaleString()} characters over budget
          </p>
        )}
      </div>

      {/* Severity filters + Expand All */}
      {result.findings.length > 0 && (
        <div className="px-5 py-2.5 border-b border-[#506880] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['critical', 'warning', 'info'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  activeSeverities.has(sev)
                    ? sev === 'critical' ? 'bg-red-500/10 text-[#f87171] border-red-500/20'
                      : sev === 'warning' ? 'bg-amber-500/10 text-[#fbbf24] border-amber-500/20'
                      : 'bg-[#7db8fc]/10 text-[#7db8fc] border-[#7db8fc]/20'
                    : 'bg-transparent text-[#7a8a9b] border-[#506880]/50'
                }`}
              >
                {SEVERITY_ICON[sev]} {sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={toggleAll}
            className="text-[10px] text-[#7db8fc] hover:text-[#a8d4ff] transition-colors"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      )}

      {/* Findings grouped by file */}
      <div className="divide-y divide-[#506880]/50">
        {result.findings.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <span className="text-sm text-[#34d399]">✓ No issues found</span>
            <p className="text-[10px] text-[#7a8a9b] mt-1">{result.rulesExecuted} rules checked across {result.filesAnalyzed} files</p>
          </div>
        ) : (
          [...filteredGrouped.entries()].map(([file, findings]) => {
            const isExpanded = expandedFiles.has(file);
            const _fileAnalysis = files.find(f => f.path === file);
            const critCount = findings.filter(f => f.severity === 'critical').length;
            const warnCount = findings.filter(f => f.severity === 'warning').length;

            return (
              <div key={file}>
                {/* File header */}
                <button
                  onClick={() => toggleFile(file)}
                  className="w-full px-5 py-2.5 flex items-center gap-2 hover:bg-[#0a0e17]/40 transition-colors text-left"
                >
                  <span className="text-[10px] text-[#7a8a9b]">{isExpanded ? '▾' : '▸'}</span>
                  <span className="text-xs font-mono text-[#f1f5f9] flex-1 truncate">{file}</span>
                  {critCount > 0 && <span className="text-[10px]">🔴 {critCount}</span>}
                  {warnCount > 0 && <span className="text-[10px]">🟡 {warnCount}</span>}
                  {findings.filter(f => f.severity === 'info').length > 0 && <span className="text-[10px]">🔵 {findings.filter(f => f.severity === 'info').length}</span>}
                </button>

                {/* Findings */}
                {isExpanded && (
                  <div className="px-5 pb-3 space-y-1.5">
                    {findings.map((finding, i) => {
                      const fId = `${file}-${finding.ruleId}-${i}`;
                      const isOpen = expandedFindings.has(fId);
                      const truncation: TruncationAnalysis | null =
                        finding.category === 'truncation' && finding.charCount
                          ? calculateTruncation(finding.charCount)
                          : null;

                      return (
                        <div key={fId}>
                          <button
                            onClick={() => toggleFinding(fId)}
                            className={`w-full text-left px-3 py-2 rounded-lg border ${SEVERITY_COLORS[finding.severity]} hover:brightness-110 transition-all`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-[#7a8a9b] shrink-0 mt-0.5">{isOpen ? '▾' : '▸'}</span>
                              <span className="text-xs shrink-0">{SEVERITY_ICON[finding.severity]}</span>
                              <span className="text-xs text-[#b0bec9] leading-relaxed flex-1">{finding.message}</span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="ml-7 mt-1.5 mb-1 px-3 py-2 rounded-lg bg-[#0a0e17] border border-[#506880]/50">
                              <p className="text-xs text-[#f1f5f9]">{finding.recommendation}</p>
                              {truncation && truncation.hiddenRange && (
                                <TruncationDiagram analysis={truncation} />
                              )}
                              {onOpenFile && !finding.file.includes('↔') && !finding.file.startsWith('(') && (
                                <button
                                  onClick={() => onOpenFile(finding.file, finding)}
                                  className="mt-2 text-[10px] px-2 py-0.5 rounded border border-[#7db8fc]/20 bg-[#7db8fc]/5 text-[#7db8fc] hover:bg-[#7db8fc]/10 transition-all"
                                >
                                  Fix →
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-[#506880] text-[10px] text-[#7a8a9b]">
        {result.rulesExecuted} rules · {result.filesAnalyzed} files analyzed
      </div>
    </div>
  );
}
