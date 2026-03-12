'use client';

import type { ReviewResult } from '@/lib/config-review/runner';
import type { FileAnalysis } from '@/lib/config-review/types';
import ReviewPanel from '@/components/config-review/ReviewPanel';

interface ReviewViewProps {
  reviewResult: ReviewResult | null;
  analyzedFiles: FileAnalysis[];
  onOpenFile: (path: string) => void;
}

export default function ReviewView({ reviewResult, analyzedFiles, onOpenFile }: ReviewViewProps) {
  return (
    <div>
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
