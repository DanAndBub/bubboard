'use client';

import { useState } from 'react';
import WaitlistForm from '@/components/WaitlistForm';

type View = 'overview' | 'review' | 'drift';

interface MapSidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  hasFindings: boolean;
  onDownloadSnapshot: () => void;
  onUploadSnapshot: () => void;
  onDownloadNotes: () => void;
}

// ── Mobile bottom tab item ───────────────────────────────────────────────────

const TABS: { view: View; icon: string; label: string }[] = [
  { view: 'overview', icon: '◉', label: 'Overview' },
  { view: 'review', icon: '⚑', label: 'Config' },
  { view: 'drift', icon: '↔', label: 'Drift' },
];

// ── Waitlist modal ───────────────────────────────────────────────────────────

function WaitlistModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', color: '#7a8a9b' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#7a8a9b';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
          }}
        >
          ✕
        </button>
        <WaitlistForm />
      </div>
    </div>
  );
}

// ── Desktop sidebar components ───────────────────────────────────────────────

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  alertDot?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, badge, alertDot: _alertDot, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-[10px] w-full rounded-md text-[13px] transition-all duration-[120ms] border-none text-left"
      style={{
        padding: '9px 12px',
        background: active ? 'rgba(125,184,252,0.10)' : 'transparent',
        color: active ? '#7db8fc' : '#b0bec9',
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(125,184,252,0.06)';
          (e.currentTarget as HTMLButtonElement).style.color = '#f1f5f9';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#b0bec9';
        }
      }}
    >
      <span className="w-[18px] text-center text-[13px] shrink-0">{icon}</span>
      <span>{label}</span>
      {badge !== undefined && (
        <span
          className="ml-auto text-[11px] font-mono rounded-lg"
          style={{
            padding: '2px 8px',
            background: active ? 'rgba(125,184,252,0.12)' : '#1c2637',
            color: active ? '#7db8fc' : '#7a8a9b',
          }}
        >
          {badge}
        </span>
      )}

    </button>
  );
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full rounded-[5px] text-[12px] text-left transition-all duration-[120ms] border-none"
      style={{ padding: '7px 12px', color: '#7a8a9b', background: 'transparent' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#b0bec9';
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.color = '#7a8a9b';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span className="w-[18px] text-center text-[13px] shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      className="font-semibold uppercase"
      style={{
        fontSize: 10,
        letterSpacing: '1.5px',
        color: '#7a8a9b',
        padding: '0 12px',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: '#3a4e63',
        margin: '4px 24px 16px',
      }}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MapSidebar({
  activeView,
  onViewChange,
  hasFindings,
  onDownloadSnapshot,
  onUploadSnapshot,
  onDownloadNotes,
}: MapSidebarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {modalOpen && <WaitlistModal onClose={() => setModalOpen(false)} />}

      {/* ── Mobile bottom tab bar ── */}
      <nav
        aria-label="Main navigation"
        className="lg:hidden flex items-center justify-around border-t"
        style={{
          background: '#080c14',
          borderTopColor: '#3a4e63',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {TABS.map(({ view, icon, label }) => {
          const active = activeView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 transition-colors"
              style={{ color: active ? '#7db8fc' : '#7a8a9b' }}
            >
              <span className="text-[15px] leading-none">{icon}</span>
              <span className="text-[10px] font-medium truncate max-w-[52px]">
                {label}
              </span>

            </button>
          );
        })}
        <button
          onClick={() => setModalOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 transition-colors"
          style={{ color: '#fbbf24' }}
        >
          <span className="text-[15px] leading-none">✦</span>
          <span className="text-[10px] font-medium truncate max-w-[52px]">More</span>
        </button>
      </nav>

      {/* ── Desktop vertical sidebar ── */}
      <nav
        aria-label="Main navigation"
        className="hidden lg:flex flex-col overflow-y-auto h-full"
        style={{
          background: '#080c14',
          borderRight: '1px solid #3a4e63',
          padding: '16px 0',
        }}
      >
        {/* Views section */}
        <div style={{ padding: '0 12px', marginBottom: 20 }}>
          <SectionLabel>Views</SectionLabel>
          <NavItem icon="◉" label="Overview" active={activeView === 'overview'} onClick={() => onViewChange('overview')} />
        </div>

        <Divider />

        {/* Intelligence section */}
        <div style={{ padding: '0 12px', marginBottom: 20 }}>
          <SectionLabel>Intelligence</SectionLabel>
          <NavItem icon="⚑" label="Config Review" active={activeView === 'review'} alertDot={hasFindings} onClick={() => onViewChange('review')} />
          <NavItem icon="↔" label="Drift Report" active={activeView === 'drift'} onClick={() => onViewChange('drift')} />
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-[10px] w-full rounded-md text-[13px] transition-all duration-[120ms] border-none text-left"
            style={{ padding: '9px 12px', background: 'transparent', color: '#fbbf24', fontWeight: 400 }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,191,36,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fde68a';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#fbbf24';
            }}
          >
            <span className="w-[18px] text-center text-[13px] shrink-0">✦</span>
            <span>More is Coming</span>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        <Divider />

        {/* Actions section */}
        <div style={{ padding: '0 12px' }}>
          <ActionButton icon="📥" label="Download Snapshot" onClick={onDownloadSnapshot} />
          <ActionButton icon="📤" label="Upload Snapshot" onClick={onUploadSnapshot} />
          <ActionButton icon="📝" label="Session Notes" onClick={onDownloadNotes} />
        </div>

        {/* Social links */}
        <div style={{ height: 1, background: '#3a4e63', margin: '12px 24px 8px' }} />
        <div style={{ padding: '0 16px 4px', display: 'flex', gap: 4 }}>
          <a
            href="https://github.com/DanAndBub/bubboard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="flex items-center justify-center rounded-md transition-colors duration-[120ms]"
            style={{ width: 32, height: 32, color: '#7a8a9b' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#b0bec9';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#7a8a9b';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@DanJmonk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="flex items-center justify-center rounded-md transition-colors duration-[120ms]"
            style={{ width: 32, height: 32, color: '#7a8a9b' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#b0bec9';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.color = '#7a8a9b';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
            </svg>
          </a>
        </div>
      </nav>
    </>
  );
}
