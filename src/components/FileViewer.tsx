'use client';

import { useEffect } from 'react';

interface FileViewerProps {
  fileName: string;
  content?: string;
  onClose: () => void;
}

export default function FileViewer({ fileName, content, onClose }: FileViewerProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0d1520] border-l border-[#1e2a38] z-50 slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2a38] shrink-0">
          <div className="w-8 h-8 rounded-lg border border-[#1e2a38] bg-[#3b82f6]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="font-mono text-sm font-medium text-[#e2e8f0]">{fileName}</div>
            <div className="text-xs text-[#506880]">
              {content ? `${content.split('\n').length} lines` : 'No content provided'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-lg border border-[#1e2a38] hover:border-[#2d3f5a] hover:bg-[#1a2235] flex items-center justify-center text-[#506880] hover:text-[#94a3b8] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {content ? (
            <pre className="font-mono text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-full border border-[#1e2a38] bg-[#111820] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#506880]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#506880] mb-1">File contents not provided</p>
                <p className="text-xs text-[#506880] opacity-60">
                  Paste file contents in the &quot;Add file contents&quot; section to view them here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-[#1e2a38] flex items-center justify-between">
          <span className="text-xs text-[#506880] font-mono">{fileName}</span>
          <button
            onClick={onClose}
            className="text-xs text-[#506880] hover:text-[#94a3b8] transition-colors"
          >
            Press Esc to close
          </button>
        </div>
      </div>
    </>
  );
}
