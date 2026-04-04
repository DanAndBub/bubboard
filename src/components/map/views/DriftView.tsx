'use client';

import type { DriftReport } from '@/lib/drift/types';
import DriftReportPanel from '@/components/drift/DriftReport';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';

interface DriftViewProps {
  driftReport: DriftReport | null;
}

export default function DriftView({ driftReport }: DriftViewProps) {
  return (
    <div className="max-w-[960px] mx-auto">
      <ViewContextHeader
        viewId="drift"
        oneLiner="How your config files changed between scans."
        expandedDetail="Snapshot your workspace, come back later, and compare. Drift detection tracks character count changes and section-level shifts across your bootstrap files. Catch unreviewed agent edits, creeping file growth, and content that quietly crossed a truncation threshold."
      />
      <h1 className="text-xl font-semibold text-[#e2e8f0] mb-6">Drift Report</h1>

      {driftReport === null ? (
        <div className="flex justify-center">
          <div
            className="bg-[#111820] border border-[#1e2a38] rounded-xl text-center"
            style={{ padding: '56px 20px' }}
          >
            <div className="text-[30px] opacity-25 mb-4">◈</div>
            <p className="text-[15px] text-[#94a3b8] mb-2">No previous snapshot loaded</p>
            <p className="text-[13px] text-[#506880] max-w-[340px] mx-auto leading-relaxed">
              Download today&apos;s snapshot, come back later, and upload it to see exactly what changed in your workspace.
            </p>
          </div>
        </div>
      ) : (
        <DriftReportPanel report={driftReport} />
      )}
    </div>
  );
}
