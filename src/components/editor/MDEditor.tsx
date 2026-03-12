'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getFileThreshold } from '@/lib/config-review/thresholds';

interface MDEditorProps {
  path: string;
  content: string;
  fileHandle?: FileSystemFileHandle | null;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  onRescan?: () => void;
}

const API_KEY_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]{10,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ANTHROPIC_API_KEY\s*=\s*\S{10,}/,
  /OPENAI_API_KEY\s*=\s*\S{10,}/,
];

function detectApiKeys(text: string): boolean {
  return API_KEY_PATTERNS.some(p => p.test(text));
}

export default function MDEditor({ path, content, fileHandle, onSave, onCancel, onRescan }: MDEditorProps) {
  const [value, setValue] = useState(content);
  const [backup] = useState(content); // pre-edit backup
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const threshold = getFileThreshold(path);
  const charCount = value.length;
  const delta = charCount - content.length;
  const pct = Math.round((charCount / threshold.hardLimit) * 100);
  const hasApiKey = detectApiKeys(value);
  const canSaveToFS = !!fileHandle;

  const barColor = charCount > threshold.critical ? 'bg-red-500'
    : charCount > threshold.warning ? 'bg-amber-500' : 'bg-[#7db8fc]';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (fileHandle) {
        // File System Access API — write back to filesystem
        const writable = await fileHandle.createWritable();
        await writable.write(value);
        await writable.close();
      }
      onSave(value);
      setSaved(true);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}. Your content is preserved — copy it to clipboard as a backup.`);
    } finally {
      setSaving(false);
    }
  }, [value, fileHandle, onSave]);

  const handleRevert = useCallback(() => {
    setValue(backup);
    setError(null);
    setSaved(false);
  }, [backup]);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value);
  }, [value]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#506880] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-[#f1f5f9] truncate">{path}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7db8fc]/10 text-[#7db8fc] border border-[#7db8fc]/20">
            editing
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRevert}
            disabled={value === backup}
            className="text-xs px-2.5 py-1 rounded border border-[#506880] text-[#7a8a9b] hover:text-[#b0bec9] disabled:opacity-30 transition-all"
          >
            Revert
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="text-xs px-2.5 py-1 rounded border border-[#506880] text-[#7a8a9b] hover:text-[#b0bec9] transition-all"
          >
            Copy
          </button>
          {canSaveToFS ? (
            <button
              onClick={handleSave}
              disabled={saving || value === content}
              className="text-xs px-2.5 py-1 rounded border border-green-500/30 bg-green-500/10 text-[#34d399] hover:bg-green-500/20 disabled:opacity-30 transition-all"
            >
              {saving ? 'Saving…' : 'Save to File'}
            </button>
          ) : (
            <button
              onClick={() => { onSave(value); setSaved(true); }}
              disabled={value === content}
              className="text-xs px-2.5 py-1 rounded border border-green-500/30 bg-green-500/10 text-[#34d399] hover:bg-green-500/20 disabled:opacity-30 transition-all"
              title="File System Access not available — saves to session only"
            >
              Apply Changes
            </button>
          )}
          <button onClick={onCancel} className="text-xs px-2 py-1 text-[#7a8a9b] hover:text-[#b0bec9] transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-b border-[#506880] shrink-0 space-y-1.5">
        {/* Char count + delta */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#b0bec9]">
            {charCount.toLocaleString()} chars
            {delta !== 0 && (
              <span className={delta > 0 ? 'text-[#fbbf24] ml-1.5' : 'text-[#34d399] ml-1.5'}>
                ({delta > 0 ? '+' : ''}{delta.toLocaleString()})
              </span>
            )}
          </span>
          <span className="text-[9px] text-[#7a8a9b]">
            Limit: {threshold.hardLimit.toLocaleString()} · Recommended: &lt;{threshold.recommended.toLocaleString()}
          </span>
        </div>
        {/* Size bar */}
        <div className="h-1 rounded-full bg-[#0a0e17] overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>

        {/* Warnings */}
        {hasApiKey && (
          <p className="text-[10px] text-[#f87171] flex items-center gap-1">
            ⚠️ API key pattern detected — be careful not to expose secrets in snapshots or exports.
          </p>
        )}
        {!canSaveToFS && (
          <p className="text-[10px] text-[#7a8a9b]">
            💡 File System Access not available in this browser. Changes apply to this session only. Use "Copy" to save content manually.
          </p>
        )}
        {error && (
          <p className="text-[10px] text-[#f87171]">{error}</p>
        )}
      </div>

      {/* Post-save re-scan prompt */}
      {saved && onRescan && (
        <div className="px-4 py-2 border-b border-[#506880] bg-green-500/5 flex items-center justify-between shrink-0">
          <span className="text-xs text-[#34d399]">✓ Saved. Re-scan to update findings?</span>
          <div className="flex items-center gap-2">
            <button onClick={onRescan} className="text-xs px-2.5 py-1 rounded bg-green-500/10 text-[#34d399] border border-green-500/20 hover:bg-green-500/20 transition-all">
              Re-scan
            </button>
            <button onClick={() => setSaved(false)} className="text-xs text-[#7a8a9b] hover:text-[#b0bec9]">
              Later
            </button>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); setError(null); }}
          spellCheck={false}
          className="w-full min-h-full bg-transparent text-xs font-mono text-[#b0bec9] leading-relaxed px-4 py-3 resize-none outline-none"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
