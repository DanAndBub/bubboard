'use client';

import { useMemo } from 'react';
import { getFileThreshold } from '@/lib/config-review/thresholds';

interface MDViewerProps {
  path: string;
  content: string;
  onEdit?: () => void;
  onClose: () => void;
}

/** Lightweight markdown renderer — headings, bold, code, lists. No deps. */
function renderMarkdown(content: string): React.ReactNode[] {
  return content.split('\n').map((line, i) => {
    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs', 'text-xs'];
      return (
        <div key={i} className={`${sizes[level - 1]} font-semibold text-[#e2e8f0] ${level <= 2 ? 'mt-4 mb-2' : 'mt-3 mb-1'}`}>
          {text}
        </div>
      );
    }

    // Code blocks (inline)
    if (line.startsWith('```')) {
      return <div key={i} className="text-[#475569] text-[10px]">{line}</div>;
    }

    // List items
    if (/^\s*[-*]\s/.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      const text = line.replace(/^\s*[-*]\s/, '');
      return (
        <div key={i} className="text-xs text-[#94a3b8] leading-relaxed" style={{ paddingLeft: `${Math.min(indent, 8) * 6 + 12}px` }}>
          <span className="text-[#475569] mr-1">•</span>{formatInline(text)}
        </div>
      );
    }

    // Empty lines
    if (!line.trim()) return <div key={i} className="h-2" />;

    // Normal text
    return <div key={i} className="text-xs text-[#94a3b8] leading-relaxed">{formatInline(line)}</div>;
  });
}

/** Inline formatting: **bold**, `code`, *italic* */
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { idx: remaining.indexOf(boldMatch[0]), match: boldMatch, type: 'bold' as const } : null,
      codeMatch ? { idx: remaining.indexOf(codeMatch[0]), match: codeMatch, type: 'code' as const } : null,
    ].filter(Boolean).sort((a, b) => a!.idx - b!.idx);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.idx > 0) {
      parts.push(remaining.slice(0, first.idx));
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="text-[#e2e8f0] font-medium">{first.match[1]}</strong>);
    } else {
      parts.push(<code key={key++} className="bg-[#0a0e17] px-1 py-0.5 rounded text-[10px] text-[#94a3b8]">{first.match[1]}</code>);
    }

    remaining = remaining.slice(first.idx + first.match[0].length);
  }

  return <>{parts}</>;
}

export default function MDViewer({ path, content, onEdit, onClose }: MDViewerProps) {
  const threshold = useMemo(() => getFileThreshold(path), [path]);
  const charCount = content.length;
  const pct = Math.round((charCount / threshold.hardLimit) * 100);
  const barColor = charCount > threshold.critical ? 'bg-red-500' : charCount > threshold.warning ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-[#e2e8f0] truncate">{path}</span>
          <span className="text-[10px] font-mono text-[#475569] shrink-0">{charCount.toLocaleString()} chars</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button onClick={onEdit} className="text-xs px-2.5 py-1 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
              Edit
            </button>
          )}
          <button onClick={onClose} className="text-xs px-2 py-1 text-[#475569] hover:text-[#94a3b8] transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Size bar */}
      <div className="px-4 py-2 border-b border-[#1e293b] shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#475569]">
            {charCount.toLocaleString()} / {threshold.hardLimit.toLocaleString()} chars ({pct}%)
          </span>
          <span className="text-[9px] text-[#475569]">
            Recommended: &lt;{threshold.recommended.toLocaleString()}
          </span>
        </div>
        <div className="h-1 rounded-full bg-[#0a0e17] overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {renderMarkdown(content)}
      </div>
    </div>
  );
}
