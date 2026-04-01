'use client';

import type { FileAnalysis, BootstrapBudget } from '@/lib/config-review/types';
import ConfigHealthView from './ConfigHealthView';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';

interface ReviewViewProps {
  analyzedFiles: FileAnalysis[];
  budget: BootstrapBudget | null;
}

export default function ReviewView({ analyzedFiles, budget }: ReviewViewProps) {
  return (
    <div>
      <ViewContextHeader
        viewId="review"
        oneLiner="Visual health check for your bootstrap files."
        expandedDetail="Shows each bootstrap file's size relative to OpenClaw's 20K per-file limit and 150K aggregate budget. Progress bars, threshold markers, and truncation overlays help you spot problems before your agent silently loses instructions."
      />
      <ConfigHealthView analyzedFiles={analyzedFiles} budget={budget} />
    </div>
  );
}
