'use client';

import { useState } from 'react';

interface ViewContextHeaderProps {
  viewId: string;
  oneLiner: string;
  expandedDetail: string;
}

export default function ViewContextHeader({ viewId, oneLiner, expandedDetail }: ViewContextHeaderProps) {
  const storageKey = `dw-hint-${viewId}-dismissed`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === 'true';
  });
  const [expanded, setExpanded] = useState(() => !dismissed);

  function handleDismiss() {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
    setExpanded(false);
  }

  function handleInfoClick() {
    setExpanded(prev => !prev);
  }

  return (
    <div className="mb-4 rounded-lg border border-[#1e3a52] bg-[#0d1f2d] text-sm overflow-hidden">
      {/* Collapsed bar — always visible */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={handleInfoClick}
          aria-label={expanded ? 'Collapse hint' : 'Expand hint'}
          className="flex-shrink-0 w-4 h-4 text-[#7a8a9b] hover:text-[#b0bec9] transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.25a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75ZM7.25 7h1.5v4.5h-1.5V7Z" />
          </svg>
        </button>
        <span className="flex-1 text-[#b0bec9]">{oneLiner}</span>
        {!dismissed && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss hint"
            className="flex-shrink-0 text-[#7a8a9b] hover:text-[#b0bec9] transition-colors leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Expandable detail */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms ease',
        }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0 text-[#7a8a9b] border-t border-[#1e3a52] mt-0 leading-relaxed">
            <div className="pt-2">{expandedDetail}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
