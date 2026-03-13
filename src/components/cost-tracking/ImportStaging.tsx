'use client';

import { useState, useRef } from 'react';

interface StagedFile {
  file: File;
  source: string;
  size: string;
}

interface ImportStagingProps {
  onImport: (files: File[]) => Promise<void>;
  loading: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ImportStaging({ onImport, loading }: ImportStagingProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null, source: string) {
    if (!files) return;
    const newFiles: StagedFile[] = [];
    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase();
      // Accept known extensions + any file that might be a renamed JSONL/JSON/CSV
      const isKnown = name.endsWith('.jsonl') || name.endsWith('.json') || name.endsWith('.csv');
      const mightBeData = name.includes('.jsonl') || name.includes('.json') || name.includes('.csv');
      if (isKnown || mightBeData) {
        // Avoid duplicates by name+size
        const isDup = staged.some(s => s.file.name === file.name && s.file.size === file.size);
        if (!isDup) {
          newFiles.push({ file, source, size: formatSize(file.size) });
        }
      }
    }
    if (newFiles.length > 0) {
      setStaged(prev => [...prev, ...newFiles]);
      setOpen(true);
    }
  }

  function removeFile(index: number) {
    setStaged(prev => prev.filter((_, i) => i !== index));
  }

  async function handleImport() {
    if (staged.length === 0) return;
    await onImport(staged.map(s => s.file));
    setStaged([]);
    setOpen(false);
  }

  return (
    <>
      {/* Hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".csv,.json,.jsonl,*"
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, 'files'); e.target.value = ''; }}
      />
      <input
        ref={folderRef}
        type="file"
        // @ts-expect-error webkitdirectory is not in React types
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, 'folder'); e.target.value = ''; }}
      />

      {/* Import button */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          disabled={loading}
          className="border border-[#7db8fc]/30 bg-[#7db8fc]/10 px-4 py-2 rounded-lg text-sm text-[#7db8fc] hover:bg-[#7db8fc]/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <>
              <span>Import{staged.length > 0 ? ` (${staged.length})` : ''}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {open && (
          <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 sm:left-auto mt-1 sm:w-80 rounded-lg border border-[#506880] bg-[#111827] shadow-xl z-50">
            {/* Add files options */}
            <div className="p-3 space-y-2">
              <p className="text-xs text-[#7a8a9b] font-medium mb-2">Add files to import</p>
              <button
                onClick={() => folderRef.current?.click()}
                className="w-full text-left px-3 py-2 text-sm text-[#f1f5f9] hover:bg-[#1c2637]/50 rounded-lg border border-[#506880] transition-colors"
              >
                📂 Select Folder
                <span className="block text-[10px] text-[#7a8a9b] mt-0.5">Scans folder for .jsonl, .json, and .csv files (other files ignored)</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full text-left px-3 py-2 text-sm text-[#f1f5f9] hover:bg-[#1c2637]/50 rounded-lg border border-[#506880] transition-colors"
              >
                📄 Select Files
                <span className="block text-[10px] text-[#7a8a9b] mt-0.5">Pick individual .jsonl, .json, or .csv files</span>
              </button>
              <p className="text-[10px] text-[#7a8a9b] px-1">Selecting more files adds to the list below. Duplicates are skipped automatically.</p>
            </div>

            {/* Staged files list */}
            {staged.length > 0 && (
              <>
                <div className="border-t border-[#506880]" />
                <div className="p-3">
                  <p className="text-xs text-[#7a8a9b] font-medium mb-2">
                    {staged.length} file{staged.length !== 1 ? 's' : ''} ready
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {staged.map((s, i) => (
                      <div key={`${s.file.name}-${i}`} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-[#1c2637]/30 group">
                        <span className="text-[#7a8a9b]">
                          {s.file.name.endsWith('.jsonl') ? '📄' : s.file.name.endsWith('.csv') ? '📊' : '📋'}
                        </span>
                        <span className="text-[#b0bec9] truncate flex-1" title={s.file.name}>
                          {s.file.name}
                        </span>
                        <span className="text-[#7a8a9b] shrink-0">{s.size}</span>
                        <button
                          onClick={() => removeFile(i)}
                          className="text-[#7a8a9b] hover:text-[#f87171] transition-colors shrink-0"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleImport}
                      disabled={loading}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm text-[#7db8fc] border border-[#7db8fc]/30 bg-[#7db8fc]/10 hover:bg-[#7db8fc]/20 disabled:opacity-50 transition-colors"
                    >
                      Import {staged.length} file{staged.length !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => { setStaged([]); }}
                      className="px-3 py-1.5 rounded-lg text-sm text-[#7a8a9b] border border-[#506880] hover:text-[#b0bec9] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </>
            )}

            {staged.length === 0 && (
              <div className="px-3 pb-3">
                <p className="text-[10px] text-[#7a8a9b]">
                  Select folders or files to stage them. Import all at once when ready.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
