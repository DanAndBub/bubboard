'use client';

import { useState } from 'react';
import type { DriftReport } from '@/lib/drift/types';

interface DriftReportProps {
  report: DriftReport;
}

export default function DriftReportPanel({ report }: DriftReportProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  function toggleFile(path: string) {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  const prevDate = new Date(report.previousTimestamp).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const totalChanges = report.filesAdded.length + report.filesRemoved.length + report.filesChanged.length;

  return (
    <div className="rounded-xl border border-[#506880] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#506880]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-[#f1f5f9]">Drift Report</span>
            <p className="text-xs text-[#7a8a9b] mt-0.5">
              Changes since {prevDate} ({report.daysBetween} day{report.daysBetween !== 1 ? 's' : ''})
            </p>
          </div>
          {/* Health delta */}
          {report.healthScoreDelta !== 0 && (
            <span className={`text-sm font-mono font-bold ${report.healthScoreDelta > 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {report.healthScoreDelta > 0 ? '+' : ''}{report.healthScoreDelta} pts
            </span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-5 py-3 border-b border-[#506880] flex flex-wrap gap-3 text-xs">
        <span className="text-[#b0bec9]">
          📁 <span className="font-mono">{report.filesChanged.length}</span> changed
        </span>
        {report.filesAdded.length > 0 && (
          <span className="text-[#34d399]">
            + <span className="font-mono">{report.filesAdded.length}</span> added
          </span>
        )}
        {report.filesRemoved.length > 0 && (
          <span className="text-[#f87171]">
            − <span className="font-mono">{report.filesRemoved.length}</span> removed
          </span>
        )}
        {report.budgetDelta !== 0 && (
          <span className={report.budgetDelta > 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'}>
            Budget: {report.budgetDelta > 0 ? '+' : ''}{report.budgetDelta.toLocaleString()} chars
          </span>
        )}
        {report.agentTopologyChanges.added.length > 0 && (
          <span className="text-[#34d399]">
            🤖 +{report.agentTopologyChanges.added.join(', ')}
          </span>
        )}
        {report.agentTopologyChanges.removed.length > 0 && (
          <span className="text-[#f87171]">
            🤖 −{report.agentTopologyChanges.removed.join(', ')}
          </span>
        )}
      </div>

      {/* File changes */}
      <div className="divide-y divide-[#506880]/50">
        {totalChanges === 0 && (
          <div className="px-5 py-6 text-center">
            <span className="text-sm text-[#34d399]">✓ No changes detected</span>
            <p className="text-[10px] text-[#7a8a9b] mt-1">Your configuration is identical to the previous snapshot.</p>
          </div>
        )}

        {/* Added files */}
        {report.filesAdded.map(path => (
          <div key={`add-${path}`} className="px-5 py-2 flex items-center gap-2">
            <span className="text-xs text-[#34d399] font-mono shrink-0">+</span>
            <span className="text-xs font-mono text-[#f1f5f9]">{path}</span>
            <span className="text-[10px] text-[#34d399]">new file</span>
          </div>
        ))}

        {/* Removed files */}
        {report.filesRemoved.map(path => (
          <div key={`rm-${path}`} className="px-5 py-2 flex items-center gap-2">
            <span className="text-xs text-[#f87171] font-mono shrink-0">−</span>
            <span className="text-xs font-mono text-[#b0bec9] line-through">{path}</span>
            <span className="text-[10px] text-[#f87171]">deleted</span>
          </div>
        ))}

        {/* Changed files */}
        {report.filesChanged.map(fc => {
          const isExpanded = expandedFiles.has(fc.path);
          const isBloat = fc.percentGrowth > 50;
          const isSignificant = fc.percentGrowth > 30;
          return (
            <div key={`chg-${fc.path}`}>
              <button
                onClick={() => toggleFile(fc.path)}
                className="w-full px-5 py-2 flex items-center gap-2 hover:bg-[#0a0e17]/40 transition-colors text-left"
              >
                <span className="text-[10px] text-[#7a8a9b]">{isExpanded ? '▾' : '▸'}</span>
                <span className="text-xs font-mono text-[#f1f5f9] flex-1 truncate">{fc.path}</span>
                <span className={`text-xs font-mono ${fc.charCountDelta >= 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'}`}>
                  {fc.charCountDelta >= 0 ? '+' : ''}{fc.charCountDelta.toLocaleString()}
                </span>
                <span className={`text-[10px] font-mono ${
                  isBloat ? 'text-[#f87171]' : isSignificant ? 'text-[#fbbf24]' : 'text-[#7a8a9b]'
                }`}>
                  {fc.percentGrowth >= 0 ? '+' : ''}{fc.percentGrowth.toFixed(1)}%
                </span>
                {isBloat && <span className="text-[10px]" title="Possible agent bloat (>50% growth)">⚠️</span>}
              </button>
              {isExpanded && (
                <div className="px-9 pb-2 space-y-1 text-[11px]">
                  {fc.headingsAdded.length > 0 && (
                    <p className="text-[#34d399]">+ Sections added: {fc.headingsAdded.join(', ')}</p>
                  )}
                  {fc.headingsRemoved.length > 0 && (
                    <p className="text-[#f87171]">− Sections removed: {fc.headingsRemoved.join(', ')}</p>
                  )}
                  {fc.headingsAdded.length === 0 && fc.headingsRemoved.length === 0 && (
                    <p className="text-[#7a8a9b]">Content changed but section structure unchanged.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finding changes */}
      {(report.newFindings.length > 0 || report.resolvedFindings.length > 0) && (
        <div className="px-5 py-3 border-t border-[#506880]">
          <p className="text-[10px] uppercase tracking-wider text-[#7a8a9b] font-medium mb-2">Finding Changes</p>
          {report.resolvedFindings.length > 0 && (
            <p className="text-xs text-[#34d399] mb-1">
              ✓ {report.resolvedFindings.length} resolved
            </p>
          )}
          {report.newFindings.length > 0 && (
            <p className="text-xs text-[#fbbf24]">
              + {report.newFindings.length} new finding{report.newFindings.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-[#506880] text-[10px] text-[#7a8a9b]">
        {report.filesUnchanged.length} file{report.filesUnchanged.length !== 1 ? 's' : ''} unchanged
      </div>
    </div>
  );
}
