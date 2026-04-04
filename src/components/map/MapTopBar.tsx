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
      className="flex items-center justify-between h-[48px] px-3 sm:px-6 border-b"
      style={{
        background: '#0b1017',
        borderBottomColor: '#1e2a38',
      }}
    >
      {/* Left side */}
      <div className="flex items-center gap-2.5">
        <div
          className="grid place-items-center rounded-[5px]"
          style={{
            width: 22,
            height: 22,
            border: '1.5px solid #3b82f6',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <span className="font-mono font-medium text-[15px] text-[#e2e8f0]">Driftwatch</span>
        {isDemo && (
          <span className="hidden sm:inline ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-900/40 text-blue-400 border border-blue-800/50">
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
            className="text-[12px] font-mono px-3.5 py-1.5 rounded-md transition-colors cursor-pointer"
            style={{ border: '1px solid #1e2a38', color: '#94a3b8' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#2d3f5a';
              (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e2a38';
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
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
