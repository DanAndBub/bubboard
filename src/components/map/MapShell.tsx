'use client';

import React from 'react';

interface MapShellProps {
  topBar: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MapShell({ topBar, sidebar, children }: MapShellProps) {
  return (
    <div
      className="bg-[#0a0e17] overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: '252px 1fr',
        gridTemplateRows: '52px 1fr',
        height: '100vh',
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:top-2 focus:left-2 focus:rounded"
      >
        Skip to main content
      </a>

      {/* Top bar — spans both columns */}
      <div style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        {topBar}
      </div>

      {/* Sidebar — column 1, row 2 */}
      <div style={{ gridColumn: '1', gridRow: '2' }}>
        {sidebar}
      </div>

      {/* Main content — column 2, row 2 */}
      <main
        id="main-content"
        className="overflow-y-auto"
        style={{ gridColumn: '2', gridRow: '2', padding: '28px 36px 40px' }}
      >
        {children}
      </main>
    </div>
  );
}
