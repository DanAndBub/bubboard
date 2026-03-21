'use client';

import type { DriftReport } from '@/lib/drift/types';
import DriftReportPanel from '@/components/drift/DriftReport';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';

interface DriftViewProps {
  driftReport: DriftReport | null;
}

export default function DriftView({ driftReport }: DriftViewProps) {
  return (
    <div>
      <ViewContextHeader
        viewId="drift"
        oneLiner="What changed since your last scan."
        expandedDetail="Take a snapshot of your workspace, then compare it to a previous one. Drift detection shows added, removed, and modified files with line-level diffs. Useful for catching unintended changes from agent edits or for auditing what evolved between reviews."
      />
      <h1 className="text-xl font-semibold text-[#f1f5f9] mb-6">Drift Report</h1>

      {driftReport === null ? (
        <div className="flex justify-center">
          <div
            className="bg-[#111827] border border-[#3a4e63] rounded-xl text-center"
            style={{ padding: '56px 20px' }}
          >
            <div className="text-[30px] opacity-25 mb-4">◈</div>
            <p className="text-[15px] text-[#b0bec9] mb-2">No previous snapshot loaded</p>
            <p className="text-[13px] text-[#7a8a9b] max-w-[340px] mx-auto leading-relaxed">
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
