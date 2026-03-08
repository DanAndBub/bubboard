'use client';

import { useState } from 'react';

interface ReconciliationBadgeProps {
  status: 'matched' | 'minor_discrepancy' | 'major_discrepancy' | 'no_admin_data' | 'loading';
  localTotal?: number;
  adminTotal?: number;
  differencePct?: number;
}

const fmt = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function ReconciliationBadge({
  status,
  localTotal,
  adminTotal,
  differencePct,
}: ReconciliationBadgeProps) {
  const [hovered, setHovered] = useState(false);

  const config = {
    matched: {
      classes: 'border-green-500/30 bg-green-500/10 text-green-400',
      icon: <span>✓</span>,
      label: localTotal !== undefined ? `Verified ${fmt(localTotal)}` : 'Verified',
    },
    minor_discrepancy: {
      classes: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      icon: <span>⚠</span>,
      label: `Minor gap (${differencePct !== undefined ? pct(differencePct) : '?'})`,
    },
    major_discrepancy: {
      classes: 'border-red-500/30 bg-red-500/10 text-red-400',
      icon: <span>✗</span>,
      label: `Discrepancy (${differencePct !== undefined ? pct(differencePct) : '?'})`,
    },
    no_admin_data: {
      classes: 'border-[#1e293b] bg-[#111827] text-[#475569]',
      icon: <span>—</span>,
      label: 'No admin key',
    },
    loading: {
      classes: 'border-[#1e293b] bg-[#111827] text-[#475569]',
      icon: (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ),
      label: 'Checking...',
    },
  } as const;

  const { classes, icon, label } = config[status];

  const hasTooltip =
    localTotal !== undefined || adminTotal !== undefined || differencePct !== undefined;

  const tooltipParts = [
    localTotal !== undefined ? `Local: ${fmt(localTotal)}` : null,
    adminTotal !== undefined ? `Admin: ${fmt(adminTotal)}` : null,
    differencePct !== undefined ? `Diff: ${pct(differencePct)}` : null,
  ].filter(Boolean);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${classes}`}
      >
        {icon}
        {label}
      </span>

      {hovered && hasTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-md border border-[#1e293b] bg-[#0a0e17] px-2.5 py-1.5 text-xs text-[#94a3b8] shadow-lg pointer-events-none">
          {tooltipParts.join(' / ')}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]" />
        </div>
      )}
    </div>
  );
}
