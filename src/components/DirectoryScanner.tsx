'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const NOISE_DIRS = new Set([
  'node_modules', '.git', 'venv', '.venv', '__pycache__', '.next',
  'sessions', 'memory-db', 'models', 'media', '.cache', 'dist',
  'build', '.turbo', '.vercel', 'coverage',
]);

const ALLOWED_EXTS = new Set([
  '.md', '.yaml', '.yml', '.json', '.py', '.ts', '.js',
  '.toml', '.cfg', '.ini', '.txt', '.sh',
]);

const WARN_THRESHOLD = 5000;
const MAX_FILES = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

type Bucket = 'Agents' | 'Workspace' | 'Skills' | 'Cron' | 'Config' | 'Other';

const BUCKET_ORDER: Bucket[] = ['Agents', 'Workspace', 'Skills', 'Cron', 'Config', 'Other'];

interface BucketGroup {
  bucket: Bucket;
  /** Original webkitRelativePath values (with root prefix) */
  originals: string[];
  /** Display paths (root prefix stripped) */
  displayPaths: string[];
}

export interface DirectoryScannerProps {
  onConfirm: (paths: string[]) => void;
  /** Called on mount if the browser does not support webkitdirectory */
  onUnsupported?: () => void;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return '';
  return filename.slice(dot).toLowerCase();
}

function isNoisePath(path: string): boolean {
  return path.split('/').some(seg => NOISE_DIRS.has(seg));
}

function isAllowedFile(filename: string): boolean {
  return ALLOWED_EXTS.has(getExt(filename));
}

function classifyPath(strippedPath: string): Bucket {
  const parts = strippedPath.split('/');
  const topLevel = parts[0].toLowerCase();

  if (topLevel === 'agents') return 'Agents';
  if (topLevel === 'workspace') return 'Workspace';
  if (topLevel === 'skills') return 'Skills';
  if (topLevel === 'cron' || topLevel === 'cron-jobs') return 'Cron';

  // Root-level config files
  if (parts.length === 1) {
    const ext = getExt(parts[0]);
    if (['.json', '.yaml', '.yml', '.toml', '.cfg', '.ini'].includes(ext)) {
      return 'Config';
    }
  }

  return 'Other';
}

function hasOpenClawStructure(strippedPaths: string[]): boolean {
  return strippedPaths.some(p => {
    const lower = p.toLowerCase();
    return (
      lower.startsWith('agents/') ||
      lower.startsWith('workspace/') ||
      lower === 'openclaw.json' ||
      lower.endsWith('/agents.md') ||
      lower === 'agents.md' ||
      lower.endsWith('/soul.md') ||
      lower === 'soul.md'
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DirectoryScanner({
  onConfirm,
  onUnsupported,
  isLoading,
}: DirectoryScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep a stable ref to the callback so we don't re-run the support-check effect
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'reviewing'>('idle');
  const [buckets, setBuckets] = useState<BucketGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noStructure, setNoStructure] = useState(false);
  const [truncated, setTruncated] = useState(false);

  // One-time browser support check on mount
  useEffect(() => {
    const probe = document.createElement('input');
    if (!('webkitdirectory' in probe)) {
      setSupported(false);
      onUnsupportedRef.current?.();
      return;
    }
    // Set the attribute on our real input
    if (inputRef.current) {
      inputRef.current.setAttribute('webkitdirectory', '');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Build path list, filter noise dirs, filter to allowed extensions
    const allPaths = files.map(f => f.webkitRelativePath || f.name);
    const noNoise = allPaths.filter(p => !isNoisePath(p));
    const filtered = noNoise.filter(p => isAllowedFile(p.split('/').pop() ?? p));

    let finalPaths = filtered;
    let wasTruncated = false;
    if (filtered.length > WARN_THRESHOLD) {
      wasTruncated = true;
      finalPaths = filtered.slice(0, MAX_FILES);
    }

    // Derive root name and stripped paths for classification / display
    const rootName = finalPaths.length > 0 ? finalPaths[0].split('/')[0] : '';
    const stripped = finalPaths.map(p =>
      p.startsWith(rootName + '/') ? p.slice(rootName.length + 1) : p
    );

    setTruncated(wasTruncated);
    setNoStructure(!hasOpenClawStructure(stripped));

    // Group into buckets
    const bucketMap = new Map<Bucket, { originals: string[]; displayPaths: string[] }>();
    for (const b of BUCKET_ORDER) bucketMap.set(b, { originals: [], displayPaths: [] });

    finalPaths.forEach((orig, idx) => {
      const bucket = classifyPath(stripped[idx]);
      bucketMap.get(bucket)!.originals.push(orig);
      bucketMap.get(bucket)!.displayPaths.push(stripped[idx]);
    });

    const groups: BucketGroup[] = BUCKET_ORDER
      .filter(b => bucketMap.get(b)!.originals.length > 0)
      .map(b => ({
        bucket: b,
        originals: bucketMap.get(b)!.originals,
        displayPaths: bucketMap.get(b)!.displayPaths,
      }));

    setBuckets(groups);
    setSelected(new Set(finalPaths)); // all pre-selected
    setPhase('reviewing');

    // Reset so the same folder can be re-selected later
    e.target.value = '';
  }, []);

  const toggleFile = (orig: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(orig)) next.delete(orig);
      else next.add(orig);
      return next;
    });
  };

  const toggleBucket = (group: BucketGroup, value: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const orig of group.originals) {
        if (value) next.add(orig);
        else next.delete(orig);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedPaths = [...selected];
    if (selectedPaths.length > 0) {
      onConfirm(selectedPaths);
    }
  };

  const resetToIdle = () => {
    setPhase('idle');
    setBuckets([]);
    setSelected(new Set());
    setNoStructure(false);
    setTruncated(false);
  };

  // If webkitdirectory isn't available, render nothing — parent shows TreeInput
  if (!supported) return null;

  // ── IDLE STATE ──────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center py-14 px-8 text-center gap-6">
          {/* Folder icon */}
          <div className="w-16 h-16 rounded-2xl border border-[#1e293b] bg-blue-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[#e2e8f0] mb-2">
              Select Your OpenClaw Directory
            </h2>
            <p className="text-sm text-[#94a3b8] max-w-sm">
              Click the button below and choose your agent root folder. We&apos;ll
              scan filenames to build your map.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-6 py-3 text-sm font-semibold text-white rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
            }}
          >
            Choose Folder
          </button>

          <p className="text-xs text-[#475569] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Nothing is uploaded. We only read filenames to build your map.
          </p>
        </div>
      </div>
    );
  }

  // ── REVIEW STATE ────────────────────────────────────────────────────────────
  const totalSelected = selected.size;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] bg-[#0d1520]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-[#e2e8f0]">Review Detected Files</span>
        </div>
        <button
          type="button"
          onClick={resetToIdle}
          className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
        >
          Choose different folder
        </button>
      </div>

      {/* Warnings */}
      {noStructure && (
        <div className="mx-4 mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-xs text-yellow-400">
            No OpenClaw structure detected. Make sure you selected your agent root directory.
          </p>
        </div>
      )}
      {truncated && (
        <div className="mx-4 mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-xs text-yellow-400">
            Large directory detected (&gt;5000 files). Showing first {MAX_FILES} relevant files only.
          </p>
        </div>
      )}

      {/* Privacy note */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs text-[#475569] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Nothing is uploaded. We only read filenames to build your map.
        </p>
      </div>

      {/* File listing by bucket */}
      <div className="px-4 py-2 max-h-80 overflow-y-auto space-y-4">
        {buckets.length === 0 && (
          <p className="text-sm text-[#475569] text-center py-8">
            No relevant files found in the selected directory.
          </p>
        )}

        {buckets.map(group => {
          const allSelected = group.originals.every(o => selected.has(o));
          const someSelected = group.originals.some(o => selected.has(o));

          return (
            <div key={group.bucket}>
              {/* Bucket header with select-all checkbox */}
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={e => toggleBucket(group, e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {group.bucket}
                </span>
                <span className="text-xs text-[#475569]">({group.originals.length})</span>
              </div>

              {/* Individual files */}
              <div className="ml-5 space-y-0.5">
                {group.originals.map((orig, idx) => (
                  <label
                    key={orig}
                    className="flex items-center gap-2 cursor-pointer py-0.5 group"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(orig)}
                      onChange={() => toggleFile(orig)}
                      className="w-3 h-3 accent-blue-500 flex-shrink-0"
                    />
                    <span
                      className="text-xs text-[#94a3b8] font-mono group-hover:text-[#e2e8f0] transition-colors truncate"
                      title={group.displayPaths[idx]}
                    >
                      {group.displayPaths[idx]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e293b] bg-[#0d1520]">
        <span className="text-xs text-[#475569]">
          {totalSelected} file{totalSelected !== 1 ? 's' : ''} selected
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={totalSelected === 0 || isLoading}
          className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: totalSelected > 0 ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
          }}
        >
          {isLoading ? 'Building...' : 'Build Map →'}
        </button>
      </div>
    </div>
  );
}
