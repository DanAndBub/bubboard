'use client';

import { useState } from 'react';
import { redactSensitiveValues } from '@/lib/redact';

// ─── Types ────────────────────────────────────────────────────────────────────

type Bucket = 'config' | 'workspace' | 'agents' | 'memory' | 'subagents' | 'skills' | 'cron';

interface ScannedItem {
  path: string;
  bucket: Bucket;
  selected: boolean;
}

type ScanState = 'idle' | 'scanning' | 'review';

interface Props {
  onConfirm: (
    paths: string[],
    meta: { manifestVersion: string; fileContents: Record<string, string> }
  ) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET_LABELS: Record<Bucket, string> = {
  config:    'Config',
  workspace: 'Workspace',
  agents:    'Agents',
  memory:    'Memory',
  subagents: 'Subagents',
  skills:    'Skills',
  cron:      'Cron',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGear() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconRobot() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="10" width="16" height="11" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v3M8 14h.01M16 14h.01M8 17h.01M16 17h.01" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 3" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function BucketIcon({ bucket }: { bucket: Bucket }) {
  return (
    <span className="text-blue-400 flex items-center">
      {bucket === 'config'    && <IconGear />}
      {bucket === 'workspace' && <IconDoc />}
      {bucket === 'agents'    && <IconRobot />}
      {bucket === 'memory'    && <span className="text-sm leading-none">🧠</span>}
      {bucket === 'subagents' && <IconLink />}
      {bucket === 'skills'    && <IconBolt />}
      {bucket === 'cron'      && <IconClock />}
    </span>
  );
}

// ─── Path classification ──────────────────────────────────────────────────────

function classifyRelativePath(relPath: string): Bucket | null {
  const p = relPath.replace(/\\/g, '/');
  if (p === 'openclaw.json') return 'config';
  if (p === 'cron/jobs.json') return 'cron';
  if (/^workspace\/[^/]+\.md$/.test(p)) return 'workspace';
  if (/^workspace\/memory\/[^/]+\.md$/.test(p)) return 'memory';
  if (/^workspace\/subagents\/[^/]+\.md$/.test(p)) return 'subagents';
  if (/^agents\/[^/]+(\/)?$/.test(p)) return 'agents';
  if (/^skills\/[^/]+(\/)?$/.test(p)) return 'skills';
  return null;
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
): Promise<{ items: ScannedItem[]; fileContents: Record<string, string> }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const root = await (window as any).showDirectoryPicker({ mode: 'read' }) as FSDirHandle;
  const items: ScannedItem[] = [];
  const fileContents: Record<string, string> = {};

  // openclaw.json
  onProgress('Checking openclaw.json…');
  const configText = await tryGetFile(root, 'openclaw.json');
  if (configText !== null) {
    items.push({ path: 'openclaw.json', bucket: 'config', selected: true });
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
        items.push({ path: relPath, bucket: 'workspace', selected: true });
      }
    }

    // workspace/memory/*.md — names only
    onProgress('Scanning memory…');
    const memoryDir = await tryGetDir(workspaceDir, 'memory');
    if (memoryDir) {
      for await (const [name, handle] of memoryDir.entries()) {
        if (handle.kind === 'file' && name.endsWith('.md')) {
          items.push({ path: `workspace/memory/${name}`, bucket: 'memory', selected: true });
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
          items.push({ path: relPath, bucket: 'subagents', selected: true });
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
        items.push({ path: `agents/${name}/`, bucket: 'agents', selected: true });
      }
    }
  }

  // skills/* — subdirectory names only
  onProgress('Scanning skills…');
  const skillsDir = await tryGetDir(root, 'skills');
  if (skillsDir) {
    for await (const [name, handle] of skillsDir.entries()) {
      if (handle.kind === 'directory') {
        items.push({ path: `skills/${name}/`, bucket: 'skills', selected: true });
      }
    }
  }

  // cron/jobs.json — name only
  onProgress('Checking cron…');
  const cronDir = await tryGetDir(root, 'cron');
  if (cronDir) {
    try {
      await cronDir.getFileHandle('jobs.json');
      items.push({ path: 'cron/jobs.json', bucket: 'cron', selected: true });
    } catch { /* not present */ }
  }

  return { items, fileContents };
}

// ─── Paste fallback ───────────────────────────────────────────────────────────

const PASTE_LS_COMMAND = `ls openclaw.json 2>/dev/null
ls cron/jobs.json 2>/dev/null
ls workspace/*.md 2>/dev/null
ls workspace/memory/*.md 2>/dev/null
ls workspace/subagents/*.md 2>/dev/null
ls agents/ 2>/dev/null
ls skills/ 2>/dev/null`;

function parsePastedOutput(text: string): ScannedItem[] {
  const seen = new Set<string>();
  const items: ScannedItem[] = [];
  for (const line of text.split('\n')) {
    const rel = line.trim().replace(/^\.\//, '');
    if (!rel) continue;
    const bucket = classifyRelativePath(rel);
    if (bucket && !seen.has(rel)) {
      seen.add(rel);
      items.push({ path: rel, bucket, selected: true });
    }
  }
  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectoryScanner({ onConfirm }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [includeContents, setIncludeContents] = useState(false);
  const [copied, setCopied] = useState(false);

  const supportsDirectoryPicker =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Scan handlers ──────────────────────────────────────────────────────────

  async function handleDirectoryPicker() {
    setError(null);
    setScanState('scanning');
    setProgressMsg('Opening folder picker…');
    try {
      const { items: found, fileContents: contents } = await scanWithDirectoryPicker(setProgressMsg);
      setItems(found);
      setFileContents(contents);
      setScanState('review');
    } catch (e: unknown) {
      setScanState('idle');
      if (e instanceof Error && e.name !== 'AbortError') {
        setError(e.message);
      }
    }
  }

  function handlePasteSubmit() {
    setItems(parsePastedOutput(pasteText));
    setFileContents({});
    setScanState('review');
  }

  function handleReset() {
    setScanState('idle');
    setItems([]);
    setFileContents({});
    setPasteMode(false);
    setPasteText('');
    setError(null);
  }

  // ── Item toggles ───────────────────────────────────────────────────────────

  function toggleItem(path: string) {
    setItems(prev => prev.map(i => i.path === path ? { ...i, selected: !i.selected } : i));
  }

  function toggleBucket(bucket: Bucket, value: boolean) {
    setItems(prev => prev.map(i => i.bucket === bucket ? { ...i, selected: value } : i));
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  function handleConfirm() {
    const selected = items.filter(i => i.selected);
    const paths = selected.map(i => i.path);
    const filteredContents: Record<string, string> = {};
    if (includeContents) {
      for (const path of paths) {
        if (fileContents[path] !== undefined) filteredContents[path] = fileContents[path];
      }
    }
    onConfirm(paths, { manifestVersion: '3.0', fileContents: filteredContents });
  }

  // ── Grouped buckets ────────────────────────────────────────────────────────

  const BUCKET_ORDER: Bucket[] = ['config', 'workspace', 'agents', 'memory', 'subagents', 'skills', 'cron'];
  const grouped = BUCKET_ORDER
    .map(bucket => ({ bucket, items: items.filter(i => i.bucket === bucket) }))
    .filter(g => g.items.length > 0);
  const selectedCount = items.filter(i => i.selected).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-6 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-white tracking-wide">Scan Workspace</h2>
        <span className="text-xs text-slate-500 text-right">
          🔒 File contents stay in your browser. Nothing is uploaded.
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/40 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* ── IDLE: picker buttons ── */}
      {scanState === 'idle' && !pasteMode && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 mb-1">
            Only known locations are checked — no full crawl.
          </p>

          <button
            onClick={supportsDirectoryPicker ? handleDirectoryPicker : undefined}
            disabled={!supportsDirectoryPicker}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              supportsDirectoryPicker
                ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                : 'bg-[#111827] border border-[#1e293b] text-[#475569] cursor-not-allowed opacity-60'
            }`}
          >
            <IconDoc />
            Select Workspace Folder
            <span className={`ml-auto text-xs font-normal ${supportsDirectoryPicker ? 'text-blue-200' : 'text-[#475569]'}`}>
              {supportsDirectoryPicker ? 'Chrome / Edge' : 'Requires Chrome or Edge'}
            </span>
          </button>

          <button
            onClick={() => setPasteMode(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors ${
              supportsDirectoryPicker
                ? 'border border-[#1e293b] bg-[#0a0e17] hover:border-blue-500/40 text-slate-400'
                : 'bg-blue-500 hover:bg-blue-600 font-medium text-white'
            }`}
          >
            <span className="text-base leading-none">📋</span>
            Paste ls output
            <span className={`ml-auto text-xs font-normal ${supportsDirectoryPicker ? 'text-slate-600' : 'text-blue-200'}`}>Any browser</span>
          </button>

          <p className="text-xs text-[#475569] text-center pl-1 mt-1">
            🔒 Your files stay in your browser. No API keys, tokens, or sensitive data are uploaded to any server.
          </p>
        </div>
      )}

      {/* ── IDLE: paste mode ── */}
      {scanState === 'idle' && pasteMode && (
        <div className="flex flex-col gap-3">
          <div className="relative rounded-lg border border-[#1e293b] bg-[#0a0e17] p-3">
            <p className="text-xs text-slate-400 mb-2 font-medium">
              Run these commands from your workspace root and paste the combined output:
            </p>
            <pre className="text-xs text-blue-300 whitespace-pre font-mono leading-relaxed">
              {PASTE_LS_COMMAND}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(PASTE_LS_COMMAND);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute top-2 right-2 flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              {copied ? 'Copied!' : <><IconClipboard /><span>copy</span></>}
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste output here…"
            rows={6}
            className="rounded-lg border border-[#1e293b] bg-[#0a0e17] px-3 py-2 text-xs text-slate-300 placeholder-slate-600 font-mono resize-none focus:outline-none focus:border-blue-500/60"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
              className="flex-1 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Parse Output
            </button>
            <button
              onClick={() => { setPasteMode(false); setPasteText(''); }}
              className="rounded-lg border border-[#1e293b] px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
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
        <div className="flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No matching OpenClaw files found.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Found <span className="text-blue-400 font-medium">{items.length}</span> items.
                Deselect anything you&apos;d rather exclude.
              </p>

              {/* Contents toggle */}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-[#1e293b] bg-[#0a0e17] px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-slate-200">Read file contents</span>
                  <span className="text-xs text-slate-500">
                    {includeContents
                      ? 'File contents will be read to populate your map with relationships, config details, and agent roles.'
                      : 'Only filenames will be scanned — faster and more private.'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeContents}
                  onClick={() => setIncludeContents(v => !v)}
                  className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${includeContents ? 'bg-blue-500' : 'bg-slate-600'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeContents ? 'translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {grouped.map(({ bucket, items: bucketItems }) => {
                  const allSelected = bucketItems.every(i => i.selected);
                  const noneSelected = bucketItems.every(i => !i.selected);
                  return (
                    <div key={bucket} className="rounded-lg border border-[#1e293b] bg-[#0a0e17] overflow-hidden">
                      {/* Bucket header */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e293b] bg-[#111827]/50">
                        <BucketIcon bucket={bucket} />
                        <span className="text-xs font-semibold text-slate-300">
                          {BUCKET_LABELS[bucket]}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {bucketItems.filter(i => i.selected).length}/{bucketItems.length}
                          </span>
                          {!allSelected && (
                            <button
                              onClick={() => toggleBucket(bucket, true)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              all
                            </button>
                          )}
                          {!noneSelected && (
                            <button
                              onClick={() => toggleBucket(bucket, false)}
                              className="text-xs text-slate-500 hover:text-slate-300"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Items */}
                      <div className="divide-y divide-[#1e293b]">
                        {bucketItems.map(item => (
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
                            <span className="text-xs text-slate-300 font-mono break-all">
                              {item.path}
                            </span>
                            {includeContents && fileContents[item.path] !== undefined && (
                              <span className="ml-auto flex-shrink-0 text-xs text-emerald-500/70">
                                read
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="flex-1 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Confirm {selectedCount} item{selectedCount !== 1 ? 's' : ''}
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-[#1e293b] px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Rescan
            </button>
          </div>
          <p className="text-xs text-[#475569] text-center">
            🔒 Nothing leaves your browser.
          </p>
        </div>
      )}
    </div>
  );
}
