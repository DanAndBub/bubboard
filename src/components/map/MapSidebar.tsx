'use client';

type View = 'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift';

interface MapSidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  setupScore: number;
  maxScore: number;
  agentCount: number;
  fileCount: number;
  hasFindings: boolean;
  onDownloadSnapshot: () => void;
  onUploadSnapshot: () => void;
  onDownloadNotes: () => void;
}

function scoreColor(score: number): string {
  if (score >= 8) return '#34d399';
  if (score >= 5) return '#fbbf24';
  return '#f87171';
}

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
  alertDot?: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, badge, alertDot, onClick }: NavItemProps) {
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
      {alertDot && (
        <span
          className="ml-auto rounded-full shrink-0"
          style={{
            width: 7,
            height: 7,
            background: '#f87171',
            boxShadow: '0 0 6px rgba(248,113,113,0.5)',
          }}
          aria-label="has findings"
        />
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

export default function MapSidebar({
  activeView,
  onViewChange,
  setupScore,
  maxScore,
  agentCount,
  fileCount,
  hasFindings,
  onDownloadSnapshot,
  onUploadSnapshot,
  onDownloadNotes,
}: MapSidebarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-col overflow-y-auto"
      style={{
        background: '#080c14',
        borderRight: '1px solid #3a4e63',
        padding: '16px 0',
      }}
    >
      {/* Setup Score card */}
      <div
        className="text-center rounded-[10px]"
        style={{
          margin: '0 12px 16px',
          padding: '18px 16px',
          background: '#111827',
          border: '1px solid #3a4e63',
        }}
      >
        <div
          className="font-bold leading-none"
          style={{
            fontSize: 34,
            letterSpacing: '-1.5px',
            color: scoreColor(setupScore),
          }}
        >
          {setupScore}
          <span style={{ fontSize: 16, color: '#7a8a9b', fontWeight: 400 }}>
            /{maxScore}
          </span>
        </div>
        <div
          className="font-medium uppercase mt-1.5"
          style={{ fontSize: 11, letterSpacing: '1.5px', color: '#7a8a9b' }}
        >
          Setup Score
        </div>
      </div>

      {/* Views section */}
      <div style={{ padding: '0 12px', marginBottom: 20 }}>
        <SectionLabel>Views</SectionLabel>
        <NavItem icon="◉" label="Overview" active={activeView === 'overview'} onClick={() => onViewChange('overview')} />
        <NavItem icon="⬡" label="Agents" active={activeView === 'agents'} badge={agentCount} onClick={() => onViewChange('agents')} />
        <NavItem icon="▤" label="Files" active={activeView === 'files'} badge={fileCount} onClick={() => onViewChange('files')} />
        <NavItem icon="◎" label="Cost Tracking" active={activeView === 'costs'} onClick={() => onViewChange('costs')} />
      </div>

      <Divider />

      {/* Intelligence section */}
      <div style={{ padding: '0 12px', marginBottom: 20 }}>
        <SectionLabel>Intelligence</SectionLabel>
        <NavItem icon="⚑" label="Config Review" active={activeView === 'review'} alertDot={hasFindings} onClick={() => onViewChange('review')} />
        <NavItem icon="↔" label="Drift Report" active={activeView === 'drift'} onClick={() => onViewChange('drift')} />
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
    </nav>
  );
}
