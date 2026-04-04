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

const REDACTED_PATTERNS = [
  /sk-ant-/,
  /sk-proj-/,
  /\[REDACTED\]/,
  /\bREDACTED\b/,
];

const REAL_KEY_PATTERNS = [
  /sk-ant-[a-zA-Z0-9_-]{10,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /ANTHROPIC_API_KEY\s*=\s*\S{10,}/,
  /OPENAI_API_KEY\s*=\s*\S{10,}/,
];

function detectSensitiveContent(text: string): boolean {
  return REDACTED_PATTERNS.some(p => p.test(text)) || REAL_KEY_PATTERNS.some(p => p.test(text));
}

interface SaveDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function SaveDialog({ onConfirm, onCancel }: SaveDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111820] border border-[#1e2a38] rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <h2 className="text-sm font-semibold text-[#e2e8f0] mb-2">Save Changes?</h2>
        <p className="text-xs text-[#506880] mb-5">
          Remember: Driftwatch edits are only in browser. Copy this content and paste it into your local file for changes to take effect.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded border border-[#1e2a38] text-[#506880] hover:text-[#94a3b8] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-xs px-3 py-1.5 rounded border border-green-500/30 bg-green-500/10 text-[#34d399] hover:bg-green-500/20 transition-all"
          >
            Save &amp; Copy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MDEditor({ path, content, fileHandle, onSave, onCancel, onRescan }: MDEditorProps) {
  const [value, setValue] = useState(content);
  const [backup] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const threshold = getFileThreshold(path);
  const charCount = value.length;
  const delta = charCount - content.length;
  const pct = Math.round((charCount / threshold.hardLimit) * 100);
  const hasSensitiveContent = detectSensitiveContent(value);
  const canSaveToFS = !!fileHandle;

  const barColor = charCount > threshold.critical ? 'bg-red-500'
    : charCount > threshold.warning ? 'bg-amber-500' : 'bg-[#3b82f6]';

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
        const writable = await fileHandle.createWritable();
        await writable.write(value);
        await writable.close();
      }
      await navigator.clipboard.writeText(value).catch(() => {/* ignore clipboard errors */});
      onSave(value);
      setSaved(true);
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}. Your content is preserved — copy it to clipboard as a backup.`);
    } finally {
      setSaving(false);
    }
  }, [value, fileHandle, onSave]);

  const handleSaveRequest = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleApplyChanges = useCallback(async () => {
    await navigator.clipboard.writeText(value).catch(() => {/* ignore */});
    onSave(value);
    setSaved(true);
  }, [value, onSave]);

  const handleApplyRequest = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleRevert = useCallback(() => {
    setValue(backup);
    setError(null);
    setSaved(false);
  }, [backup]);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value);
  }, [value]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* FIX 2 — Redacted key warning banner */}
      {hasSensitiveContent && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/30 shrink-0 flex items-start gap-2">
          <span className="text-[#fbbf24] shrink-0 mt-px">⚠</span>
          <p className="text-xs text-[#fbbf24]">
            This content may contain redacted API keys. When pasting this content back into your files, ensure you restore your actual API keys.
          </p>
        </div>
      )}

      {/* Header — title row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2a38]/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-[#e2e8f0] truncate">{path}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
            editing
          </span>
        </div>
        <button onClick={onCancel} className="text-xs px-2 py-1 text-[#506880] hover:text-[#94a3b8] transition-colors shrink-0">
          ✕
        </button>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e2a38] shrink-0">
        <button
          onClick={handleRevert}
          disabled={value === backup}
          className="text-xs px-2.5 py-1 rounded border border-[#1e2a38] text-[#506880] hover:text-[#94a3b8] disabled:opacity-30 transition-all"
        >
          Revert
        </button>
        <button
          onClick={handleCopyToClipboard}
          className="text-xs px-2.5 py-1 rounded border border-[#1e2a38] text-[#506880] hover:text-[#94a3b8] transition-all"
        >
          Copy
        </button>
        {canSaveToFS ? (
          <button
            onClick={handleSaveRequest}
            disabled={saving || value === content}
            className="text-xs px-2.5 py-1 rounded border border-green-500/30 bg-green-500/10 text-[#34d399] hover:bg-green-500/20 disabled:opacity-30 transition-all"
          >
            {saving ? 'Saving…' : 'Save to File'}
          </button>
        ) : (
          <button
            onClick={handleApplyRequest}
            disabled={value === content}
            className="text-xs px-2.5 py-1 rounded border border-green-500/30 bg-green-500/10 text-[#34d399] hover:bg-green-500/20 disabled:opacity-30 transition-all"
            title="File System Access not available — saves to session only"
          >
            Apply Changes
          </button>
        )}
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-b border-[#1e2a38] shrink-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#94a3b8]">
            {charCount.toLocaleString()} chars
            {delta !== 0 && (
              <span className={delta > 0 ? 'text-[#fbbf24] ml-1.5' : 'text-[#34d399] ml-1.5'}>
                ({delta > 0 ? '+' : ''}{delta.toLocaleString()})
              </span>
            )}
          </span>
          <span className="text-[9px] text-[#506880]">
            Limit: {threshold.hardLimit.toLocaleString()} · Recommended: &lt;{threshold.recommended.toLocaleString()}
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#0b1017] overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        {!canSaveToFS && (
          <p className="text-[10px] text-[#506880]">
            💡 File System Access not available in this browser. Changes apply to this session only. Use &quot;Copy&quot; to save content manually.
          </p>
        )}
        {error && (
          <p className="text-[10px] text-[#f87171]">{error}</p>
        )}
      </div>

      {/* FIX 4 — Post-save re-scan prompt */}
      {saved && (
        <div className="px-4 py-2 border-b border-[#1e2a38] bg-green-500/5 flex items-center justify-between shrink-0">
          <span className="text-xs text-[#34d399]">Content updated. Re-scan to see updated findings?</span>
          <div className="flex items-center gap-2">
            {onRescan && (
              <button onClick={onRescan} className="text-xs px-2.5 py-1 rounded bg-green-500/10 text-[#34d399] border border-green-500/20 hover:bg-green-500/20 transition-all">
                Re-scan
              </button>
            )}
            <button onClick={() => setSaved(false)} className="text-xs text-[#506880] hover:text-[#94a3b8]">
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
          className="w-full min-h-full bg-transparent text-xs font-mono text-[#94a3b8] leading-relaxed px-4 py-3 resize-none outline-none"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* FIX 3 — Save confirmation dialog */}
      {showSaveDialog && (
        <SaveDialog
          onConfirm={() => {
            setShowSaveDialog(false);
            if (canSaveToFS) {
              handleSave();
            } else {
              handleApplyChanges();
            }
          }}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
