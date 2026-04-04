'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ResetDialogProps {
  open: boolean;
  onClose: () => void;
  onReset: (options: { clearSnapshots: boolean }) => void;
  snapshotCount: number;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function ResetDialog({ open, onClose, onReset, snapshotCount, anchorRef }: ResetDialogProps) {
  const [clearSnapshots, setClearSnapshots] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Position the popover below the anchor button
  const updatePosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    // Use setTimeout to avoid the opening click triggering close
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
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

  // Reset checkboxes when dialog opens — use key-based reset instead
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (open) { setClearSnapshots(false); } }, [open]);

  if (!open || !pos) return null;

  const hasDestructive = clearSnapshots;

  const dialog = (
    <div
      ref={ref}
      className="fixed w-72 rounded-lg border border-[#1e2a38] overflow-hidden"
      style={{
        top: pos.top,
        right: pos.right,
        zIndex: 9999,
        backgroundColor: '#0f1724',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      <div className="p-3 space-y-2.5">
        <p className="text-xs font-medium text-[#e2e8f0]">Reset scan</p>

        {/* Always-on: map data */}
        <label className="flex items-center gap-2.5 text-xs cursor-default">
          <input type="checkbox" checked disabled className="accent-[#3b82f6] rounded" />
          <span className="text-[#94a3b8]">Reset config data</span>
        </label>

        {/* Optional: snapshots */}
        {snapshotCount > 0 && (
          <label className="flex items-center gap-2.5 text-xs cursor-pointer group">
            <input
              type="checkbox"
              checked={clearSnapshots}
              onChange={e => setClearSnapshots(e.target.checked)}
              className="accent-[#3b82f6] rounded"
            />
            <span className="text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors">
              Clear drift snapshots
              <span className="text-[#506880] ml-1">({snapshotCount})</span>
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
            onClick={() => { onReset({ clearSnapshots }); onClose(); }}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hasDestructive
                ? 'bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30 hover:bg-[#f87171]/30'
                : 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-[#3b82f6]/20'
            }`}
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-[#506880] border border-[#1e2a38] hover:text-[#94a3b8] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to document.body to escape any parent opacity/backdrop-filter context
  if (typeof document !== 'undefined') {
    return createPortal(dialog, document.body);
  }
  return dialog;
}
