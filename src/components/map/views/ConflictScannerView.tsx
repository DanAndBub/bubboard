'use client';

import { useState } from 'react';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';
import type { ConflictResult } from '@/lib/conflict/types';

type LogicalGroup = 'cross-file' | 'within-file';

function toLogicalGroup(finding: ConflictResult['findings'][number]): LogicalGroup {
  if (finding.category === 'cross-file') return 'cross-file';
  if (finding.category === 'duplicate' && finding.files.length >= 2) return 'cross-file';
  return 'within-file';
}

function groupByLogical(findings: ConflictResult['findings']): Array<{ group: LogicalGroup; label: string; findings: ConflictResult['findings'] }> {
  const crossFile = findings.filter(f => toLogicalGroup(f) === 'cross-file');
  const withinFile = findings.filter(f => toLogicalGroup(f) === 'within-file');
  const result = [];
  if (crossFile.length > 0) result.push({ group: 'cross-file' as LogicalGroup, label: 'Cross-File', findings: crossFile });
  if (withinFile.length > 0) result.push({ group: 'within-file' as LogicalGroup, label: 'Within-File', findings: withinFile });
  return result;
}

// Visual grammar:
// FilePill  — rounded-full, muted gray — signals "location/file"
// PhraseBox — square corners, left accent border — signals "matched text/evidence"

function FilePill({ name }: { name: string }) {
  return (
    <span className="text-[11px] font-mono text-[#94a3b8] bg-[#0d1824] border border-[#1e2a38] px-2 py-0.5 rounded-full inline-block truncate max-w-full">
      {name}
    </span>
  );
}

function PhraseBox({ phrase }: { phrase: string }) {
  return (
    <code
      className="text-xs font-mono text-[#f1f5f9] bg-[#0d1824] px-2 py-1 rounded block"
      style={{ borderLeft: '2px solid #3b6ea5' }}
    >
      {phrase}
    </code>
  );
}

function VsDivider() {
  return (
    <div className="text-[10px] font-mono text-[#3d5270] text-center pt-1.5 leading-none select-none flex-shrink-0">vs</div>
  );
}

function SummaryLine({ message }: { message: string }) {
  return (
    <p className="text-xs font-mono text-[#7a8fa6] leading-relaxed mt-2">{message}</p>
  );
}

function FindingCard({
  finding,
  isLast,
}: {
  finding: ConflictResult['findings'][number];
  isLast: boolean;
}) {
  const base = `px-4 py-3${!isLast ? ' border-b border-[#1e2a38]' : ''}`;

  // Cross-file / duplicate with exactly 2 files: side-by-side
  if ((finding.category === 'cross-file' || finding.category === 'duplicate') && finding.files.length === 2) {
    const [fileA, fileB] = finding.files;
    const [phraseA, phraseB] = finding.conflictingPhrases ?? [];
    return (
      <div className={base}>
        <div className="grid grid-cols-[1fr_28px_1fr] gap-x-2 items-start">
          <div className="space-y-1.5 min-w-0">
            <FilePill name={fileA} />
            {phraseA && <PhraseBox phrase={phraseA} />}
          </div>
          <VsDivider />
          <div className="space-y-1.5 min-w-0">
            <FilePill name={fileB} />
            {phraseB && <PhraseBox phrase={phraseB} />}
          </div>
        </div>
        <SummaryLine message={finding.message} />
      </div>
    );
  }

  // Cross-file / duplicate with 3+ files: vertical list (grid won't fit)
  if ((finding.category === 'cross-file' || finding.category === 'duplicate') && finding.files.length > 2) {
    return (
      <div className={base}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {finding.files.map(f => <FilePill key={f} name={f} />)}
        </div>
        {finding.conflictingPhrases && finding.conflictingPhrases.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-2">
            {finding.conflictingPhrases.map(p => <PhraseBox key={p} phrase={p} />)}
          </div>
        )}
        <SummaryLine message={finding.message} />
      </div>
    );
  }

  // Within-file: one file, two phrases side-by-side
  if (finding.category === 'within-file') {
    const fileName = finding.files[0] ?? 'Unknown';
    const [phraseA, phraseB] = finding.conflictingPhrases ?? [];
    return (
      <div className={base}>
        <div className="mb-2">
          <FilePill name={fileName} />
        </div>
        <div className="grid grid-cols-[1fr_28px_1fr] gap-x-2 items-start">
          <div>
            {phraseA
              ? <PhraseBox phrase={phraseA} />
              : <span className="text-xs font-mono text-[#3d5270]">—</span>}
          </div>
          <VsDivider />
          <div>
            {phraseB
              ? <PhraseBox phrase={phraseB} />
              : <span className="text-xs font-mono text-[#3d5270]">—</span>}
          </div>
        </div>
        <SummaryLine message={finding.message} />
      </div>
    );
  }

  // Structural (+ fallback): file name + message only
  const fileName = finding.files[0] ?? 'Unknown';
  return (
    <div className={base}>
      <div className="mb-2">
        <FilePill name={fileName} />
      </div>
      <p className="text-xs font-mono text-[#7a8fa6] leading-relaxed">{finding.message}</p>
    </div>
  );
}

function LogicalGroupSection({
  label,
  findings,
  isFirst,
}: {
  label: string;
  findings: ConflictResult['findings'];
  isFirst: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={!isFirst ? 'border-t border-[#1e2a38]' : ''}>
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#1a2235] transition-colors duration-150 border-l-2 border-[#2d4a6e]"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold font-mono text-[#e2e8f0] flex-1">{label}</span>
        <span
          className="text-xs font-mono px-2 py-1 rounded-full"
          style={{ backgroundColor: '#50688033', color: '#506880', border: '1px solid #50688066' }}
        >
          {findings.length}
        </span>
        <svg
          className="w-3 h-3 text-[#506880] transition-transform duration-200 flex-shrink-0"
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
          {findings.map((finding, idx) => (
            <FindingCard
              key={finding.ruleId}
              finding={finding}
              isLast={idx === findings.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConflictScannerView({ conflictResult }: { conflictResult: ConflictResult | null }) {
  const isEmpty = !conflictResult || conflictResult.totalCount === 0;
  const groups = isEmpty ? [] : groupByLogical(conflictResult.findings);

  return (
    <div className="max-w-[960px] mx-auto">
      <ViewContextHeader
        viewId="conflict"
        oneLiner="Detects contradicting instructions, structural risks, and duplicated content across your bootstrap files."
        expandedDetail="Cross-file conflicts happen when one file says 'always escalate' and another says 'figure it out.' Structural issues flag instructions in files your subagents can't see, or critical content at risk of being lost during context compaction. Duplicates waste tokens and tend to drift apart over time."
      />

      {isEmpty ? (
        <div className="rounded-xl border border-[#1e2a38] bg-[#111820] p-10 text-center">
          <p className="text-sm font-semibold text-[#e2e8f0] mb-1">No conflicts detected.</p>
          <p className="text-xs text-[#475569]">Your bootstrap files look consistent.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#0d1520] border border-[#1e2a38] rounded-lg py-3 px-4 mb-4">
            <p className="text-xs font-mono text-[#64748b] leading-relaxed">
              These findings are pattern-based — they flag keywords that may indicate conflicts but can&apos;t evaluate context. Review each in your editor to determine if it applies to your setup.
            </p>
          </div>

          <div className="rounded-xl border border-[#1e2a38] bg-[#111820]">
            <div className="px-4 py-3 border-b border-[#1e2a38]">
              <span className="text-xs text-[#64748b] font-mono">
                {conflictResult.totalCount} finding{conflictResult.totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            {groups.map((g, idx) => (
              <LogicalGroupSection
                key={g.group}
                label={g.label}
                findings={g.findings}
                isFirst={idx === 0}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
