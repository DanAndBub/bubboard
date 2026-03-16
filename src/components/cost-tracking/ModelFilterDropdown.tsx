'use client';

import { useState, useRef, useEffect } from 'react';
import { getModelColor } from './ModelBreakdown';

interface ModelEntry {
  model: string;
  cost: number;
  count: number;
  percentage: number;
}

interface ModelFilterDropdownProps {
  models: ModelEntry[];
  selectedModels: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

export default function ModelFilterDropdown({
  models,
  selectedModels,
  onSelectionChange,
}: ModelFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = selectedModels.size;
  const allSelected = activeCount === 0; // empty set = show all

  function toggleModel(model: string) {
    const next = new Set(selectedModels);
    if (next.has(model)) {
      next.delete(model);
    } else {
      next.add(model);
    }
    onSelectionChange(next);
  }

  function selectAll() {
    onSelectionChange(new Set());
  }

  function deselectAll() {
    onSelectionChange(new Set(['__none__'])); // empty filter = nothing matches
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
          activeCount > 0
            ? 'bg-[#7db8fc]/15 text-[#7db8fc] border-[#7db8fc]/30'
            : 'text-[#b0bec9] border-[#506880] hover:text-[#f1f5f9]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Models
        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#7db8fc]/20 text-[10px] font-medium">
            {activeCount}
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-lg border border-[#506880] bg-[#111827] shadow-2xl overflow-hidden">
          {/* Header actions */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#506880]/50">
            <span className="text-[10px] uppercase tracking-wider text-[#7a8a9b] font-medium">Filter by model</span>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className={`text-[10px] transition-colors ${allSelected ? 'text-[#7db8fc]' : 'text-[#7a8a9b] hover:text-[#b0bec9]'}`}
              >
                All
              </button>
              <button
                onClick={deselectAll}
                className="text-[10px] text-[#7a8a9b] hover:text-[#b0bec9] transition-colors"
              >
                None
              </button>
            </div>
          </div>

          {/* Model list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {models.map((entry) => {
              const color = getModelColor(entry.model);
              const checked = allSelected || selectedModels.has(entry.model);

              return (
                <button
                  key={entry.model}
                  onClick={() => {
                    if (allSelected) {
                      // Switching from "all" to specific: select all except this one
                      const next = new Set(models.map(m => m.model));
                      next.delete(entry.model);
                      onSelectionChange(next);
                    } else {
                      toggleModel(entry.model);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#0a0e17]/60 transition-colors text-left"
                >
                  {/* Checkbox */}
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      checked
                        ? 'border-[#7db8fc] bg-[#7db8fc]/20'
                        : 'border-[#506880]'
                    }`}
                  >
                    {checked && (
                      <svg className="w-2.5 h-2.5 text-[#7db8fc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>

                  {/* Color dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: color.main, boxShadow: `0 0 4px ${color.glow}` }}
                  />

                  {/* Model name */}
                  <span className="text-xs text-[#b0bec9] flex-1 truncate">{entry.model}</span>

                  {/* Cost */}
                  <span className="text-[10px] font-mono text-[#7a8a9b] shrink-0">
                    ${entry.cost.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
