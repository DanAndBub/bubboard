'use client';

import { useState } from 'react';

interface FileContentInputProps {
  onFileContent: (fileName: string, content: string) => void;
  providedFiles: string[];
}

const KEY_FILES = [
  { name: 'AGENTS.md', description: 'Operating manual — extracts delegation rules' },
  { name: 'openclaw.json', description: 'Main config — extracts agent models and channels' },
  { name: 'HEARTBEAT.md', description: 'Background tasks — extracts schedule and model' },
  { name: 'SOUL.md', description: 'Agent personality file' },
];

export default function FileContentInput({ onFileContent, providedFiles }: FileContentInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (activeFile && content.trim()) {
      onFileContent(activeFile, content.trim());
      setContent('');
      setActiveFile(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1a2235] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-[#475569] transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-[#94a3b8]">Add file contents</span>
          <span className="text-xs text-[#475569]">for deeper analysis (optional)</span>
        </div>
        {providedFiles.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
            {providedFiles.length} file{providedFiles.length !== 1 ? 's' : ''} added
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#1e293b] p-4 space-y-4">
          {/* File selector */}
          <div className="grid grid-cols-2 gap-2">
            {KEY_FILES.map(file => {
              const isProvided = providedFiles.includes(file.name);
              const isActive = activeFile === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => {
                    setActiveFile(isActive ? null : file.name);
                    if (!isActive) setContent('');
                  }}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : isProvided
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-[#1e293b] hover:border-[#2d3f5a] hover:bg-[#1a2235]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isProvided && (
                      <span className="text-green-400 text-xs">✓</span>
                    )}
                    <span className="font-mono text-xs font-medium text-[#e2e8f0]">{file.name}</span>
                  </div>
                  <p className="text-xs text-[#475569] leading-tight">{file.description}</p>
                </button>
              );
            })}
          </div>

          {/* Content input */}
          {activeFile && (
            <div className="space-y-2">
              <div className="text-xs text-[#94a3b8] font-mono">
                Paste contents of <span className="text-blue-400">{activeFile}</span>:
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={`Paste your ${activeFile} contents here...`}
                rows={8}
                className="w-full px-3 py-2.5 rounded-lg border border-[#1e293b] bg-[#0d1520] text-[#e2e8f0] placeholder-[#2d3f5a] font-mono text-xs leading-relaxed resize-none transition-all"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setActiveFile(null); setContent(''); }}
                  className="px-3 py-1.5 text-xs text-[#475569] hover:text-[#94a3b8] border border-[#1e293b] rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!content.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Add {activeFile}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
