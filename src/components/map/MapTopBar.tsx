'use client';

import { useState, useRef } from 'react';
import ResetDialog from './ResetDialog';

interface MapTopBarProps {
  isDemo?: boolean;
  onNewMap: (options: { clearSnapshots: boolean }) => void;
  showNewMap: boolean;
  snapshotCount: number;
}

export default function MapTopBar({ isDemo, onNewMap, showNewMap, snapshotCount }: MapTopBarProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const newMapBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="flex items-center justify-between h-[52px] px-3 sm:px-6 border-b"
      style={{
        background: 'rgba(8,12,20,0.92)',
        backdropFilter: 'blur(8px)',
        borderBottomColor: '#3a4e63',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2.5">
        <div
          className="grid place-items-center rounded-[5px]"
          style={{
            width: 26,
            height: 26,
            border: '1.5px solid #7db8fc',
            color: '#7db8fc',
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ◈
        </div>
        <span className="font-semibold text-sm text-[#f1f5f9]">Driftwatch</span>
        {isDemo && (
          <span className="hidden sm:inline ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-900/60 text-blue-300 border border-blue-700/50">
            Demo
          </span>
        )}
      </div>

      {/* Right side */}
      {showNewMap && (
        <div className="relative">
          <button
            ref={newMapBtnRef}
            onClick={() => setResetOpen(!resetOpen)}
            className="text-[12px] px-3.5 py-1.5 rounded-md transition-colors"
            style={{ border: '1px solid #506880', color: '#b0bec9' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#7db8fc';
              (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#506880';
              (e.currentTarget as HTMLButtonElement).style.color = '#b0bec9';
            }}
          >
            New scan
          </button>
          <ResetDialog
            open={resetOpen}
            onClose={() => setResetOpen(false)}
            onReset={onNewMap}
            snapshotCount={snapshotCount}
            anchorRef={newMapBtnRef}
          />
        </div>
      )}
    </div>
  );
}
