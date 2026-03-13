'use client';

import { WorkspaceFiles } from '@/lib/types';
import { FileAnalysis, BootstrapBudget } from '@/lib/config-review/types';

interface FilesViewProps {
  workspace: WorkspaceFiles;
  fileContents: Record<string, string>;
  analyzedFiles: FileAnalysis[];
  budget: BootstrapBudget | null;
}

const CORE_IDENTITY_FILES = ['SOUL.md', 'IDENTITY.md', 'USER.md'];
const OPERATIONS_FILES = ['AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md', 'MEMORY.md'];

interface Thresholds {
  warn: number;
  crit: number;
}

const FILE_THRESHOLDS: Record<string, Thresholds> = {
  'AGENTS.md': { warn: 2048, crit: 5120 },
  'SOUL.md': { warn: 3072, crit: 8192 },
  'MEMORY.md': { warn: 2048, crit: 5120 },
  'TOOLS.md': { warn: 4096, crit: 8192 },
};

const DEFAULT_THRESHOLDS: Thresholds = { warn: 4096, crit: 8192 };

function getThresholds(filename: string): Thresholds {
  return FILE_THRESHOLDS[filename] ?? DEFAULT_THRESHOLDS;
}

function basename(path: string): string {
  return path.split('/').pop() ?? path;
}

type BadgeVariant = 'ok' | 'warn' | 'crit';

function StatusBadge({ variant }: { variant: BadgeVariant }) {
  if (variant === 'crit') {
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-medium"
        style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}
      >
        ⚠ Over
      </span>
    );
  }
  if (variant === 'warn') {
    return (
      <span
        className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-medium"
        style={{ background: 'rgba(251,191,36,0.10)', color: '#fbbf24' }}
      >
        ~ Watch
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-medium"
      style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399' }}
    >
      ✓ OK
    </span>
  );
}

function FileRow({
  filename,
  present,
  analysis,
}: {
  filename: string;
  present: boolean;
  analysis: FileAnalysis | undefined;
}) {
  const thresholds = getThresholds(filename);

  let badgeVariant: BadgeVariant = 'ok';
  let charCountColor = '#7a8a9b';

  if (analysis) {
    if (analysis.charCount > thresholds.crit) {
      badgeVariant = 'crit';
      charCountColor = '#f87171';
    } else if (analysis.charCount > thresholds.warn) {
      badgeVariant = 'warn';
      charCountColor = '#fbbf24';
    }
  }

  if (!present && !analysis) {
    return (
      <div
        className="grid items-center rounded-[7px] mb-1"
        style={{
          gridTemplateColumns: '1fr 100px 80px',
          background: '#111827',
          border: '1px solid rgba(58,78,99,0.3)',
          padding: '9px 16px',
          opacity: 0.45,
        }}
      >
        <span className="font-mono text-[13px] font-medium" style={{ color: '#f1f5f9' }}>
          {filename}
        </span>
        <span />
        <span className="font-mono text-[11px] text-right" style={{ color: '#7a8a9b' }}>
          missing
        </span>
      </div>
    );
  }

  return (
    <div
      className="grid items-center rounded-[7px] mb-1 cursor-default"
      style={{
        gridTemplateColumns: '1fr 100px 80px',
        background: '#111827',
        border: '1px solid rgba(58,78,99,0.3)',
        padding: '9px 16px',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#506880';
        (e.currentTarget as HTMLDivElement).style.background = '#172033';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(58,78,99,0.3)';
        (e.currentTarget as HTMLDivElement).style.background = '#111827';
      }}
    >
      <span className="font-mono text-[13px] font-medium" style={{ color: '#f1f5f9' }}>
        {filename}
      </span>
      <span className="font-mono text-[11px] text-right" style={{ color: charCountColor }}>
        {analysis ? `${analysis.charCount.toLocaleString()} ch` : ''}
      </span>
      <div className="flex justify-end">
        <StatusBadge variant={badgeVariant} />
      </div>
    </div>
  );
}

function GroupHeader({ dotColor, label, topMargin = true }: { dotColor: string; label: string; topMargin?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${topMargin ? 'mt-5' : ''}`}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
      <span className="uppercase text-[11px] tracking-widest font-medium" style={{ color: '#7a8a9b' }}>
        {label}
      </span>
    </div>
  );
}

export default function FilesView({ workspace, fileContents: _fileContents, analyzedFiles, budget }: FilesViewProps) {
  const coreFileNames = new Set(workspace.coreFiles.map(basename));
  const customFileNames = new Set(workspace.customFiles.map(basename));

  const analysisMap = new Map<string, FileAnalysis>();
  for (const fa of analyzedFiles) {
    analysisMap.set(basename(fa.path), fa);
  }

  const knownFiles = new Set([...CORE_IDENTITY_FILES, ...OPERATIONS_FILES]);
  const customFiles = workspace.customFiles.map(basename).filter((f) => !knownFiles.has(f));

  const totalFiles =
    workspace.coreFiles.length + workspace.customFiles.length + workspace.memoryFiles.length;

  const sortedMemory = [...workspace.memoryFiles].sort();
  const memFirst = sortedMemory.length > 0 ? basename(sortedMemory[0]) : null;
  const memLast = sortedMemory.length > 0 ? basename(sortedMemory[sortedMemory.length - 1]) : null;

  const budgetPct = budget
    ? Math.round((budget.totalChars / budget.budgetLimit) * 100)
    : 0;
  const budgetBarWidth = Math.min(100, budgetPct);
  const budgetColor =
    budgetPct >= 100 ? '#f87171' : budgetPct >= 75 ? '#fbbf24' : '#34d399';
  const budgetBarGradient = budgetPct >= 100
    ? 'linear-gradient(90deg, #f87171, #ef4444)'
    : budgetPct >= 75
      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
      : 'linear-gradient(90deg, #34d399, #7db8fc)';

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[22px] font-semibold text-white">Workspace Files</h1>
        <span
          className="font-mono text-[13px] rounded-full px-2.5 py-0.5"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#7a8a9b' }}
        >
          {totalFiles}
        </span>
      </div>

      {/* Core Identity */}
      <GroupHeader dotColor="#34d399" label="Core Identity" topMargin={false} />
      {CORE_IDENTITY_FILES.map((filename) => (
        <FileRow
          key={filename}
          filename={filename}
          present={coreFileNames.has(filename)}
          analysis={analysisMap.get(filename)}
        />
      ))}

      {/* Operations */}
      <GroupHeader dotColor="#7db8fc" label="Operations" />
      {OPERATIONS_FILES.map((filename) => (
        <FileRow
          key={filename}
          filename={filename}
          present={coreFileNames.has(filename)}
          analysis={analysisMap.get(filename)}
        />
      ))}

      {/* Custom */}
      {customFiles.length > 0 && (
        <>
          <GroupHeader dotColor="#7a8a9b" label="Custom" />
          {customFiles.map((filename) => (
            <FileRow
              key={filename}
              filename={filename}
              present={customFileNames.has(filename)}
              analysis={analysisMap.get(filename)}
            />
          ))}
        </>
      )}

      {/* Memory Logs */}
      <GroupHeader dotColor="#7a8a9b" label="Memory Logs" />
      {workspace.memoryFiles.length === 0 ? (
        <p className="text-[13px] py-2" style={{ color: '#7a8a9b' }}>
          No memory files
        </p>
      ) : (
        <div
          className="grid items-center rounded-[7px] mb-1 cursor-default"
          style={{
            gridTemplateColumns: '1fr auto',
            background: '#111827',
            border: '1px solid rgba(58,78,99,0.3)',
            padding: '9px 16px',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = '#506880';
            (e.currentTarget as HTMLDivElement).style.background = '#172033';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(58,78,99,0.3)';
            (e.currentTarget as HTMLDivElement).style.background = '#111827';
          }}
        >
          <span className="font-mono text-[13px] font-medium" style={{ color: '#f1f5f9' }}>
            {memFirst === memLast ? memFirst : `${memFirst} → ${memLast}`}
          </span>
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#34d399' }}>✓</span>
            <span className="font-mono text-[11px]" style={{ color: '#7a8a9b' }}>
              {workspace.memoryFiles.length} files
            </span>
          </div>
        </div>
      )}

      {/* Budget bar */}
      {budget && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span
              className="uppercase text-[11px] tracking-widest font-medium"
              style={{ color: '#7a8a9b' }}
            >
              Bootstrap Budget
            </span>
            <span className="font-mono text-[12px]" style={{ color: '#7a8a9b' }}>
              {budget.totalChars.toLocaleString()} / {budget.budgetLimit.toLocaleString()} chars
              <span className="ml-2" style={{ color: budgetColor }}>
                {budgetPct}%
              </span>
            </span>
          </div>
          <div
            className="w-full overflow-hidden rounded-full"
            style={{ height: '7px', background: '#1c2637', border: '1px solid #3a4e63' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${budgetBarWidth}%`,
                background: budgetBarGradient,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
