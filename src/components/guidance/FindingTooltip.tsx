'use client';

import { useState, useEffect, useRef } from 'react';

interface FindingTooltipProps {
  findingType: string;
  explanation: string;
}

export default function FindingTooltip({ findingType, explanation }: FindingTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span ref={containerRef} className="inline-block relative align-middle ml-1">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label={`More info about ${findingType}`}
        aria-expanded={open}
        className="text-[#7a8a9b] hover:text-[#b0bec9] transition-colors leading-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#3a4e63] rounded-sm"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 3.25a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75ZM7.25 7h1.5v4.5h-1.5V7Z" />
        </svg>
      </button>

      {open && (
        <span className="block mt-1 px-2.5 py-2 rounded-md border border-[#3a4e63] bg-[#111827] text-[#7a8a9b] text-xs leading-relaxed whitespace-normal min-w-[200px] max-w-[300px]">
          {explanation}
        </span>
      )}
    </span>
  );
}
