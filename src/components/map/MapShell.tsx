'use client';

import React from 'react';
import DemoBanner from '@/components/guidance/DemoBanner';

interface MapShellProps {
  topBar: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  isDemo?: boolean;
  onScanYours?: () => void;
}

export default function MapShell({ topBar, sidebar, children, isDemo = false, onScanYours }: MapShellProps) {
  const hasSidebar = sidebar !== null && sidebar !== undefined;
  return (
    <div className={`bg-[#0b1017] h-dvh flex flex-col overflow-hidden${hasSidebar ? ' lg:grid lg:grid-cols-[252px_1fr] lg:grid-rows-[48px_1fr]' : ''}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:top-2 focus:left-2 focus:rounded"
      >
        Skip to main content
      </a>

      {/* Top bar — spans both columns on desktop */}
      <div className="shrink-0 lg:col-span-2">
        {topBar}
      </div>

      {/* Sidebar — hidden on mobile (bottom bar rendered separately), visible on lg: */}
      {hasSidebar && (
        <div className="hidden lg:block lg:overflow-y-auto">
          {sidebar}
        </div>
      )}

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-7 pb-20 lg:pb-7"
      >
        <DemoBanner isDemo={isDemo} onScanYours={onScanYours} />
        {children}
      </main>

      {/* Mobile bottom bar — only shown when a scan is loaded */}
      {hasSidebar && (
        <div className="lg:hidden shrink-0">
          {sidebar}
        </div>
      )}
    </div>
  );
}
