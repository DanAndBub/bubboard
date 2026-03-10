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
  onOpenFile?: (path: string) => void;
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500/20 bg-red-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  info: 'border-blue-500/20 bg-blue-500/5',
};

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ReviewPanel({ result, files, onOpenFile }: ReviewPanelProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

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

  function toggleFinding(id: string) {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#e2e8f0]">Configuration Review</span>
          <div className="flex items-center gap-1.5 text-xs">
            {result.criticalCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                {result.criticalCount} critical
              </span>
            )}
            {result.warningCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {result.warningCount} warning
              </span>
            )}
            {result.infoCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {result.infoCount} info
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg font-bold ${scoreColor(result.healthScore)}`}>
            {result.healthScore}
          </span>
          <span className="text-[10px] text-[#475569]">/ 100</span>
        </div>
      </div>

      {/* Health Score Bar */}
      <div className="px-5 py-3 border-b border-[#1e293b]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#475569] font-medium">Config Health</span>
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
      </div>

      {/* Bootstrap Budget Bar */}
      <div className="px-5 py-3 border-b border-[#1e293b]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#475569] font-medium">Bootstrap Budget</span>
          <span className="text-xs font-mono text-[#94a3b8]">
            {budget.totalChars.toLocaleString()} / {budget.budgetLimit.toLocaleString()} chars
            <span className="text-[#475569] ml-1.5">~{budgetTokens.toLocaleString()} tokens/msg</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#0a0e17] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPct > 100 ? 'bg-red-500' : budgetPct > 80 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, budgetPct)}%` }}
          />
        </div>
        {budget.overBudgetBy > 0 && (
          <p className="text-[10px] text-red-400 mt-1">
            {budget.overBudgetBy.toLocaleString()} characters over budget
          </p>
        )}
      </div>

      {/* Findings grouped by file */}
      <div className="divide-y divide-[#1e293b]/50">
        {result.findings.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <span className="text-sm text-green-400">✓ No issues found</span>
            <p className="text-[10px] text-[#475569] mt-1">{result.rulesExecuted} rules checked across {result.filesAnalyzed} files</p>
          </div>
        ) : (
          [...grouped.entries()].map(([file, findings]) => {
            const isExpanded = expandedFiles.has(file);
            const fileAnalysis = files.find(f => f.path === file);
            const critCount = findings.filter(f => f.severity === 'critical').length;
            const warnCount = findings.filter(f => f.severity === 'warning').length;

            return (
              <div key={file}>
                {/* File header */}
                <button
                  onClick={() => toggleFile(file)}
                  className="w-full px-5 py-2.5 flex items-center gap-2 hover:bg-[#0a0e17]/40 transition-colors text-left"
                >
                  <span className="text-[10px] text-[#475569]">{isExpanded ? '▾' : '▸'}</span>
                  <span className="text-xs font-mono text-[#e2e8f0] flex-1 truncate">{file}</span>
                  {fileAnalysis && (
                    <span className="text-[10px] font-mono text-[#475569]">
                      {fileAnalysis.charCount.toLocaleString()} chars
                    </span>
                  )}
                  <span className="text-[10px] text-[#475569]">
                    {findings.length} finding{findings.length !== 1 ? 's' : ''}
                  </span>
                  {critCount > 0 && <span className="text-[10px]">🔴 {critCount}</span>}
                  {warnCount > 0 && <span className="text-[10px]">🟡 {warnCount}</span>}
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
                            className={`w-full text-left px-3 py-2 rounded-lg border ${SEVERITY_COLORS[finding.severity]} transition-colors`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xs shrink-0">{SEVERITY_ICON[finding.severity]}</span>
                              <span className="text-xs text-[#94a3b8] leading-relaxed">{finding.message}</span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="ml-7 mt-1.5 mb-1 px-3 py-2 rounded-lg bg-[#0a0e17] border border-[#1e293b]/50">
                              <p className="text-xs text-[#e2e8f0]">{finding.recommendation}</p>
                              {truncation && truncation.hiddenRange && (
                                <TruncationDiagram analysis={truncation} />
                              )}
                              {onOpenFile && !finding.file.includes('↔') && !finding.file.startsWith('(') && (
                                <button
                                  onClick={() => onOpenFile(finding.file)}
                                  className="mt-2 text-[10px] px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-all"
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
      <div className="px-5 py-2.5 border-t border-[#1e293b] text-[10px] text-[#475569]">
        {result.rulesExecuted} rules · {result.filesAnalyzed} files analyzed
      </div>
    </div>
  );
}
