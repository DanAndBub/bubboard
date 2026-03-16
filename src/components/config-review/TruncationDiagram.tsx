'use client';

import type { TruncationAnalysis } from '@/lib/config-review/types';

interface TruncationDiagramProps {
  analysis: TruncationAnalysis;
}

export default function TruncationDiagram({ analysis }: TruncationDiagramProps) {
  if (!analysis.hiddenRange) return null;

  const total = analysis.fileCharCount;
  const headPct = (analysis.headChars / total) * 100;
  const hiddenPct = (analysis.hiddenChars / total) * 100;
  const tailPct = (analysis.tailChars / total) * 100;

  return (
    <div className="mt-2 mb-1">
      {/* Bar */}
      <div className="flex h-6 rounded-md overflow-hidden border border-[#506880]">
        {/* Head — visible */}
        <div
          className="bg-[#7db8fc]/30 flex items-center justify-center"
          style={{ width: `${headPct}%` }}
        >
          <span className="text-[9px] font-mono text-blue-300 truncate px-1">
            Head ({analysis.headChars.toLocaleString()})
          </span>
        </div>
        {/* Hidden — the gap */}
        <div
          className="flex items-center justify-center"
          style={{
            width: `${hiddenPct}%`,
            background: 'repeating-linear-gradient(45deg, #1e293b, #1e293b 4px, #111827 4px, #111827 8px)',
          }}
        >
          <span className="text-[9px] font-mono text-[#f87171] truncate px-1">
            Hidden ({analysis.hiddenChars.toLocaleString()})
          </span>
        </div>
        {/* Tail — visible */}
        <div
          className="bg-[#7db8fc]/30 flex items-center justify-center"
          style={{ width: `${tailPct}%` }}
        >
          <span className="text-[9px] font-mono text-blue-300 truncate px-1">
            Tail ({analysis.tailChars.toLocaleString()})
          </span>
        </div>
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-1 text-[9px] font-mono text-[#7a8a9b]">
        <span>Char 1</span>
        <span className="text-[#f87171]/70">
          Chars {analysis.hiddenRange.start.toLocaleString()}–{analysis.hiddenRange.end.toLocaleString()} invisible
        </span>
        <span>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}
