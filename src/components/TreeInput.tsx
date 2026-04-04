'use client';

import { useState } from 'react';
import { DEMO_TREE } from '@/lib/demo-data';

interface TreeInputProps {
  onSubmit: (tree: string) => void;
  isLoading?: boolean;
}

const PLACEHOLDER = `~/.openclaw/
├── openclaw.json
├── workspace/
│   ├── SOUL.md
│   ├── AGENTS.md
│   ├── MEMORY.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── USER.md
│   ├── IDENTITY.md
│   ├── memory/
│   │   ├── 2026-02-24.md
│   │   └── ...
│   └── subagents/
│       ├── SONNET_PROTOCOL.md
│       └── ...
└── agents/
    ├── main/
    ├── sonnet/
    └── coder/`;

export default function TreeInput({ onSubmit, isLoading }: TreeInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  const loadDemo = () => {
    setValue(DEMO_TREE);
  };

  return (
    <div className="rounded-xl border border-[#1e2a38] bg-[#111820] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2a38] bg-[#0d1520]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f87171]/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]/40" />
          </div>
          <span className="font-mono text-xs text-[#506880]">tree ~/.openclaw/</span>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          className="text-xs text-[#3b82f6] hover:text-blue-300 transition-colors px-2 py-1 rounded border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/10"
        >
          Load example
        </button>
      </div>

      {/* Textarea */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={16}
          className="w-full px-4 py-4 bg-transparent text-[#e2e8f0] placeholder-[#2d3f5a] font-mono text-xs leading-relaxed resize-none"
          spellCheck={false}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2a38] bg-[#0d1520]">
          <div className="text-xs text-[#506880]">
            {value.trim()
              ? `${value.split('\n').filter(l => l.trim()).length} lines`
              : 'Paste your directory tree above'}
          </div>
          <div className="flex gap-2">
            {value.trim() && (
              <button
                type="button"
                onClick={() => setValue('')}
                className="px-3 py-1.5 text-xs text-[#506880] hover:text-[#94a3b8] border border-[#1e2a38] rounded-lg hover:border-[#2d3f5a] transition-all"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={!value.trim() || isLoading}
              className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: value.trim() ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none',
              }}
            >
              {isLoading ? 'Generating...' : 'Generate Map →'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
