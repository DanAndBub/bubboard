'use client';

import { useState, useEffect, useRef } from 'react';

interface ResetDialogProps {
  open: boolean;
  onClose: () => void;
  onReset: (options: { clearCosts: boolean; clearSnapshots: boolean }) => void;
  costRecordCount: number;
  snapshotCount: number;
}

export default function ResetDialog({ open, onClose, onReset, costRecordCount, snapshotCount }: ResetDialogProps) {
  const [clearCosts, setClearCosts] = useState(false);
  const [clearSnapshots, setClearSnapshots] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Reset checkboxes when opening
  useEffect(() => {
    if (open) { setClearCosts(false); setClearSnapshots(false); }
  }, [open]);

  if (!open) return null;

  const hasDestructive = clearCosts || clearSnapshots;

  return (
    <>
      {/* Invisible backdrop to block content bleed-through */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={ref} className="absolute top-full right-0 mt-1 w-72 rounded-lg border border-[#506880] bg-[#0f1724] z-50 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.3)' }}>
      <div className="p-3 space-y-2.5">
        <p className="text-xs font-medium text-[#f1f5f9]">Reset map</p>

        {/* Always-on: map data */}
        <label className="flex items-center gap-2.5 text-xs cursor-default">
          <input type="checkbox" checked disabled className="accent-[#7db8fc] rounded" />
          <span className="text-[#b0bec9]">Reset map &amp; config data</span>
        </label>

        {/* Optional: costs */}
        <label className="flex items-center gap-2.5 text-xs cursor-pointer group">
          <input
            type="checkbox"
            checked={clearCosts}
            onChange={e => setClearCosts(e.target.checked)}
            className="accent-[#7db8fc] rounded"
          />
          <span className="text-[#b0bec9] group-hover:text-[#f1f5f9] transition-colors">
            Clear cost data
            {costRecordCount > 0 && (
              <span className="text-[#7a8a9b] ml-1">({costRecordCount.toLocaleString()} records)</span>
            )}
          </span>
        </label>

        {/* Optional: snapshots */}
        {snapshotCount > 0 && (
          <label className="flex items-center gap-2.5 text-xs cursor-pointer group">
            <input
              type="checkbox"
              checked={clearSnapshots}
              onChange={e => setClearSnapshots(e.target.checked)}
              className="accent-[#7db8fc] rounded"
            />
            <span className="text-[#b0bec9] group-hover:text-[#f1f5f9] transition-colors">
              Clear drift snapshots
              <span className="text-[#7a8a9b] ml-1">({snapshotCount})</span>
            </span>
          </label>
        )}

        {/* Warning */}
        {hasDestructive && (
          <p className="text-[10px] text-[#f87171] px-0.5">
            This cannot be undone.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { onReset({ clearCosts, clearSnapshots }); onClose(); }}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hasDestructive
                ? 'bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30 hover:bg-[#f87171]/30'
                : 'bg-[#7db8fc]/10 text-[#7db8fc] border border-[#7db8fc]/30 hover:bg-[#7db8fc]/20'
            }`}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-[#7a8a9b] border border-[#506880] hover:text-[#b0bec9] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
