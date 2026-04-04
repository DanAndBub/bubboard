'use client';

import { useState } from 'react';
import { redactSensitiveValues } from '@/lib/redact';
import { BOOTSTRAP_FILE_ORDER } from '@/lib/config-review/thresholds';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScannedItem {
  path: string;
  selected: boolean;
}

type ScanState = 'idle' | 'scanning' | 'review';

interface Props {
  onConfirm: (
    paths: string[],
    meta: { manifestVersion: string; fileContents: Record<string, string> }
  ) => void;
}

// ─── Bootstrap filter ─────────────────────────────────────────────────────────

const BOOTSTRAP_NAMES = new Set(BOOTSTRAP_FILE_ORDER.map(f => f.toUpperCase()));

function isBootstrapFile(relPath: string): boolean {
  const base = relPath.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
}

// ─── FileSystem Access API scan ───────────────────────────────────────────────

type FSDirHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, FileSystemHandle]>;
};

async function tryGetFile(dir: FSDirHandle, name: string): Promise<string | null> {
  try {
    const fh = await dir.getFileHandle(name);
    return await (await fh.getFile()).text();
  } catch {
    return null;
  }
}

async function tryGetDir(dir: FSDirHandle, name: string): Promise<FSDirHandle | null> {
  try {
    return await dir.getDirectoryHandle(name) as FSDirHandle;
  } catch {
    return null;
  }
}

async function scanWithDirectoryPicker(
  onProgress: (msg: string) => void
): Promise<{ items: ScannedItem[]; fileContents: Record<string, string>; folderName: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = await (window as any).showDirectoryPicker({ mode: 'read' }) as FSDirHandle;
  const folderName = root.name;
  const items: ScannedItem[] = [];
  const fileContents: Record<string, string> = {};

  // openclaw.json
  onProgress('Checking openclaw.json…');
  const configText = await tryGetFile(root, 'openclaw.json');
  if (configText !== null) {
    items.push({ path: 'openclaw.json', selected: true });
    fileContents['openclaw.json'] = redactSensitiveValues(configText);
  }

  // workspace/*.md — read contents
  onProgress('Scanning workspace files…');
  const workspaceDir = await tryGetDir(root, 'workspace');
  if (workspaceDir) {
    for await (const [name, handle] of workspaceDir.entries()) {
      if (handle.kind === 'file' && name.endsWith('.md')) {
        const relPath = `workspace/${name}`;
        const file = await (handle as FileSystemFileHandle).getFile();
        fileContents[relPath] = await file.text();
        items.push({ path: relPath, selected: true });
      }
    }

    // workspace/memory/*.md — names only
    onProgress('Scanning memory…');
    const memoryDir = await tryGetDir(workspaceDir, 'memory');
    if (memoryDir) {
      for await (const [name, handle] of memoryDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          items.push({ path: `workspace/memory/${name}`, selected: true });
        }
      }
    }

    // workspace/subagents/*.md — names only
    onProgress('Scanning subagents…');
    const subagentsDir = await tryGetDir(workspaceDir, 'subagents');
    if (subagentsDir) {
      for await (const [name, handle] of subagentsDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          const relPath = `workspace/subagents/${name}`;
          items.push({ path: relPath, selected: true });
          try {
            const file = await (handle as FileSystemFileHandle).getFile();
            fileContents[relPath] = await file.text();
          } catch { /* skip unreadable */ }
        }
      }
    }
  }

  // agents/* — subdirectory names only
  onProgress('Scanning agents…');
  const agentsDir = await tryGetDir(root, 'agents');
  if (agentsDir) {
    for await (const [name, handle] of agentsDir.entries()) {
      if (handle.kind === 'directory') {
        items.push({ path: `agents/${name}/`, selected: true });
      }
    }
  }

  // skills/* — subdirectory names only
  onProgress('Scanning skills…');
  const skillsDir = await tryGetDir(root, 'skills');
  if (skillsDir) {
    for await (const [name, handle] of skillsDir.entries()) {
      if (handle.kind === 'directory') {
        items.push({ path: `skills/${name}/`, selected: true });
      }
    }
  }

  // cron/jobs.json — name only
  onProgress('Checking cron…');
  const cronDir = await tryGetDir(root, 'cron');
  if (cronDir) {
    try {
      await cronDir.getFileHandle('jobs.json');
      items.push({ path: 'cron/jobs.json', selected: true });
    } catch { /* not present */ }
  }

  return { items, fileContents, folderName };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectoryScanner({ onConfirm }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supportsDirectoryPicker =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Scan handlers ──────────────────────────────────────────────────────────

  async function handleDirectoryPicker() {
    setError(null);
    setScanState('scanning');
    setProgressMsg('Opening folder picker…');
    try {
      const { items: found, fileContents: contents, folderName: name } =
        await scanWithDirectoryPicker(setProgressMsg);
      setItems(found);
      setFileContents(contents);
      setFolderName(name);
      setScanState('review');
    } catch (e: unknown) {
      setScanState('idle');
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message);
      }
    }
  }

  function handleReset() {
    setScanState('idle');
    setItems([]);
    setFileContents({});
    setFolderName('');
    setError(null);
  }

  // ── Item toggles ───────────────────────────────────────────────────────────

  function toggleItem(path: string) {
    setItems(prev => prev.map(i => i.path === path ? { ...i, selected: !i.selected } : i));
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  function handleConfirm() {
    // All items are included in paths (bootstrap + non-bootstrap)
    const paths = items.filter(i => i.selected).map(i => i.path);
    const filteredContents: Record<string, string> = {};
    for (const path of paths) {
      if (fileContents[path] !== undefined) filteredContents[path] = fileContents[path];
    }
    onConfirm(paths, { manifestVersion: '3.0', fileContents: filteredContents });
  }

  // ── Bootstrap items for display ────────────────────────────────────────────

  const bootstrapItems = items.filter(item => isBootstrapFile(item.path));
  const selectedBootstrapCount = bootstrapItems.filter(i => i.selected).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/40 px-4 py-2 text-xs text-[#f87171]">
          {error}
        </div>
      )}

      {/* ── IDLE ── */}
      {scanState === 'idle' && (
        <>
          {/* Mobile */}
          <div className="md:hidden rounded-lg border border-[#1e2a38] bg-[#111820] px-4 py-3 text-center">
            <p className="text-sm text-[#94a3b8]">
              Config review requires Chrome or Edge on desktop.
            </p>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            {supportsDirectoryPicker ? (
              <button
                onClick={handleDirectoryPicker}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-mono font-medium transition-colors bg-[#3b82f6] hover:bg-[#2563eb] border border-[#3b82f6] text-white cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                Select workspace folder
              </button>
            ) : (
              <p className="rounded-lg border border-[#1e2a38] bg-[#0b1017] px-4 py-3 text-sm text-[#94a3b8] leading-relaxed text-center">
                Config review requires Chrome or Edge to read file contents. Open Driftwatch in Chrome or Edge to scan your workspace.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── SCANNING ── */}
      {scanState === 'scanning' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-6 h-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">{progressMsg}</p>
        </div>
      )}

      {/* ── REVIEW ── */}
      {scanState === 'review' && (
        <div className="flex flex-col gap-3">
          {/* Folder path bar */}
          <div className="flex items-center justify-between rounded-lg border border-[#1e2a38] bg-[#111820] px-3 py-2">
            <span className="text-xs font-mono text-[#8b949e]">~/{folderName}</span>
            <button
              onClick={() => { handleReset(); handleDirectoryPicker(); }}
              className="text-xs text-[#506880] hover:text-[#94a3b8] transition-colors"
            >
              Rescan
            </button>
          </div>

          {/* File list */}
          {bootstrapItems.length === 0 ? (
            <p className="text-xs text-[#506880] text-center py-4">
              No bootstrap files found in this directory.
            </p>
          ) : (
            <div className="rounded-lg border border-[#1e2a38] bg-[#111820] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2a38]">
                <span className="text-xs text-[#8b949e]">
                  Found <span className="text-[#e2e8f0] font-medium">{bootstrapItems.length}</span> bootstrap files
                </span>
                <span className="text-xs text-[#506880]">
                  {selectedBootstrapCount} selected
                </span>
              </div>
              <div className="divide-y divide-[#1e2a38]">
                {bootstrapItems.map(item => {
                  const displayName = item.path.split('/').pop() ?? item.path;
                  return (
                    <label
                      key={item.path}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItem(item.path)}
                        className="w-3.5 h-3.5 flex-shrink-0 accent-blue-500"
                      />
                      <span className="text-xs text-[#94a3b8] font-mono">{displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleConfirm}
            disabled={selectedBootstrapCount === 0 && bootstrapItems.length > 0}
            className="w-full rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 px-4 py-2.5 text-[13px] font-mono font-medium text-white transition-colors cursor-pointer"
          >
            Analyze {selectedBootstrapCount} file{selectedBootstrapCount !== 1 ? 's' : ''}
          </button>

          {/* Privacy note */}
          <p className="text-[11px] text-[#506880] text-center">
            File contents stay in your browser.
          </p>
        </div>
      )}
    </div>
  );
}
