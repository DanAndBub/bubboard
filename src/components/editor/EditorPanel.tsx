'use client';

import { useState } from 'react';
import type { ReviewFinding } from '@/lib/config-review/types';
import MDViewer from './MDViewer';
import MDEditor from './MDEditor';

interface EditorPanelProps {
  path: string;
  content: string;
  fileHandle?: FileSystemFileHandle | null;
  finding?: ReviewFinding | null;
  onClose: () => void;
  onContentChange: (path: string, newContent: string) => void;
  onRescan?: () => void;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-400 border-red-500/30 bg-red-500/5',
  warning: 'text-[#fbbf24] border-amber-500/30 bg-amber-500/5',
  info: 'text-[#7db8fc] border-[#7db8fc]/30 bg-[#7db8fc]/5',
  resolved: 'text-[#34d399] border-green-500/30 bg-green-500/5',
};

function FindingContextCard({ finding }: { finding: ReviewFinding }) {
  const [collapsed, setCollapsed] = useState(false);
  const colorClass = SEVERITY_COLOR[finding.severity] ?? SEVERITY_COLOR.info;

  return (
    <div className={`mx-3 mt-2 rounded-lg border text-xs ${colorClass} shrink-0`}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-medium truncate pr-2">{finding.message}</span>
        <span className="shrink-0 text-[10px] opacity-60">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 text-[11px] text-[#b0bec9] border-t border-white/10 pt-2">
          {finding.recommendation}
        </div>
      )}
    </div>
  );
}

export default function EditorPanel({ path, content, fileHandle, finding, onClose, onContentChange, onRescan }: EditorPanelProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[min(50%,640px)] min-w-[380px] bg-[#111827] border-l border-[#506880] shadow-2xl flex flex-col transition-transform duration-200">
      {finding && <FindingContextCard finding={finding} />}
      {editing ? (
        <MDEditor
          path={path}
          content={content}
          fileHandle={fileHandle}
          onSave={(newContent) => {
            onContentChange(path, newContent);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          onRescan={onRescan}
        />
      ) : (
        <MDViewer
          path={path}
          content={content}
          onEdit={() => setEditing(true)}
          onClose={onClose}
        />
      )}
    </div>
  );
}
