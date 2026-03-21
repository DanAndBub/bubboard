'use client';

import type { ReviewResult } from '@/lib/config-review/runner';
import type { FileAnalysis, ReviewFinding } from '@/lib/config-review/types';
import ReviewPanel from '@/components/config-review/ReviewPanel';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';

interface ReviewViewProps {
  reviewResult: ReviewResult | null;
  analyzedFiles: FileAnalysis[];
  onOpenFile: (path: string, finding?: ReviewFinding) => void;
}

export default function ReviewView({ reviewResult, analyzedFiles, onOpenFile }: ReviewViewProps) {
  return (
    <div>
      <ViewContextHeader
        viewId="review"
        oneLiner="Structural issues in your config files."
        expandedDetail="Config Review runs rule-based analysis across your workspace files. It checks for oversized files, truncation risks, contradictory instructions between files, duplicate content, and signs of unreviewed agent edits. Each finding has a severity (info, warning, critical) and a specific recommendation."
      />
      <h1 className="text-xl font-semibold text-[#f1f5f9] mb-4">Config Review</h1>
      {reviewResult === null ? (
        <div className="bg-[#111827] border border-[#3a4e63] rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-[#7a8a9b]">Scan your workspace to see config review findings</p>
        </div>
      ) : (
        <ReviewPanel result={reviewResult} files={analyzedFiles} onOpenFile={onOpenFile} />
      )}
    </div>
  );
}
