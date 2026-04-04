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
    <div className="max-w-[960px] mx-auto">
      <ViewContextHeader
        viewId="review"
        oneLiner="Your config files, checked for issues that silently break your agent."
        expandedDetail="Each finding below is something that can degrade your agent's performance without any visible error. Truncation means your agent literally cannot see parts of your instructions. Oversized files waste token budget on every single message. Structural issues like missing compaction headings mean your agent loses critical context during long conversations. Critical findings first — those are actively hurting your agent right now."
      />
      <ConfigHealthView analyzedFiles={analyzedFiles} budget={budget} />
    </div>
  );
}
