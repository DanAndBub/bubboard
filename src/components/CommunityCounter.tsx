'use client';

import { useEffect, useState } from 'react';

interface AggregateStats {
  totalScans: number;
  totalFilesScanned: number;
  totalCharsAnalyzed: number;
  totalTruncationsDetected: number;
  scansWithTruncation: number;
}

function abbreviateChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

// TODO: Remove threshold override after Dan's visual review
const PLACEHOLDER_STATS: AggregateStats = {
  totalScans: 127,
  totalFilesScanned: 843,
  totalCharsAnalyzed: 2_400_000,
  totalTruncationsDetected: 43,
  scansWithTruncation: 54,
};

export default function CommunityCounter() {
  const [stats, setStats] = useState<AggregateStats>(PLACEHOLDER_STATS);

  useEffect(() => {
    fetch('/api/scan-stats')
      .then(r => r.ok ? r.json() : null)
      .then((data: AggregateStats | null) => {
        // TODO: Remove threshold override after Dan's visual review
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  const truncationPct = stats.totalScans > 0
    ? Math.round((stats.scansWithTruncation / stats.totalScans) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Three stats row */}
      <div className="flex items-center justify-center w-full">
        <StatItem value={stats.totalScans.toLocaleString()} label="scans" />
        <div className="w-px h-8 bg-[#1e2a38] mx-3 flex-shrink-0" />
        <StatItem value={stats.totalTruncationsDetected.toLocaleString()} label="truncations caught" />
        <div className="w-px h-8 bg-[#1e2a38] mx-3 flex-shrink-0" />
        <StatItem value={abbreviateChars(stats.totalCharsAnalyzed)} label="chars analyzed" />
      </div>

      {/* Highlight line */}
      <p className="text-xs text-[#b0bec9] text-center">
        <span className="text-[#f1f5f9]">{truncationPct}%</span> of workspaces have at least one file being silently cut.
      </p>

      {/* Disclaimer */}
      <p className="text-[11px] text-[#506880] text-center">
        we count scans, not content.
      </p>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-sm font-mono text-[#b0bec9]">{value}</span>
      <span className="text-[10px] text-[#506880] whitespace-nowrap">{label}</span>
    </div>
  );
}
