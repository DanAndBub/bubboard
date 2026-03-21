'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DemoBannerProps {
  isDemo: boolean;
}

export default function DemoBanner({ isDemo }: DemoBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDemo) return;
    const dismissed = sessionStorage.getItem('dw-demo-banner-dismissed') === 'true';
    setVisible(!dismissed);
  }, [isDemo]);

  if (!isDemo || !visible) return null;

  function handleDismiss() {
    sessionStorage.setItem('dw-demo-banner-dismissed', 'true');
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 px-3 py-1.5 mb-3 rounded-md border border-[#2a3a4a] bg-[#0d1a26] text-xs text-[#7a8a9b]"
    >
      <svg
        className="flex-shrink-0 w-3.5 h-3.5 text-[#4a6a8a]"
        fill="none"
        viewBox="0 0 16 16"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path strokeLinecap="round" d="M8 5.5v.5m0 2v3" />
      </svg>
      <span className="flex-1">
        You are viewing demo data. Scan your own workspace to see your real config.{' '}
        <Link
          href="/map"
          className="text-[#5a8aaa] hover:text-[#7aaac8] underline underline-offset-2 transition-colors"
        >
          Scan yours →
        </Link>
      </span>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss demo banner"
        className="flex-shrink-0 text-[#4a5a6a] hover:text-[#7a8a9b] transition-colors leading-none ml-1"
      >
        ×
      </button>
    </div>
  );
}
