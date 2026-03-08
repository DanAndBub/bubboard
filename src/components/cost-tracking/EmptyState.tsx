'use client';

import { useState } from 'react';

interface EmptyStateProps {
  onImportClick: () => void;
}

export default function EmptyState({ onImportClick }: EmptyStateProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const cards = [
    {
      icon: '📄',
      title: 'Claude Code Logs',
      desc: 'Import JSONL session logs from Claude Code CLI',
      format: '.jsonl',
    },
    {
      icon: '📄',
      title: 'OpenClaw Sessions',
      desc: 'Import JSONL session logs from OpenClaw agents',
      format: '.jsonl',
    },
    {
      icon: '📄',
      title: 'CSV / JSON',
      desc: 'Import usage data from any provider export',
      format: '.csv, .json',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h2 className="text-lg font-semibold text-[#e2e8f0] mb-2">Import your usage data</h2>
      <p className="text-sm text-[#475569] mb-8">All data stays in your browser. Nothing is sent to a server.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={onImportClick}
            className="text-left rounded-xl border border-[#1e293b] bg-[#111827] p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
          >
            <span className="text-2xl">{card.icon}</span>
            <p className="text-sm font-medium text-[#e2e8f0] mt-3">{card.title}</p>
            <p className="text-xs text-[#475569] mt-1">{card.desc}</p>
            <span className="inline-block mt-3 text-xs text-blue-400 group-hover:text-blue-300">
              Upload {card.format} →
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setHelpOpen(!helpOpen)}
        className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors"
      >
        {helpOpen ? '▾' : '▸'} How do I find my log files?
      </button>

      {helpOpen && (
        <div className="mt-3 rounded-lg border border-[#1e293b] bg-[#0a0e17] p-4 text-xs text-[#94a3b8] space-y-4">
          <div>
            <p className="font-medium text-[#e2e8f0] mb-1">Claude Code CLI</p>
            <p className="text-[#475569] mb-1">Session logs are stored per-project:</p>
            <code className="block bg-[#111827] rounded px-2 py-1 text-[#94a3b8] select-all">
              ~/.claude/projects/*/&#123;session-id&#125;.jsonl
            </code>
            <p className="text-[#475569] mt-1">Each file is one session. Import all of them for complete history.</p>
          </div>

          <div>
            <p className="font-medium text-[#e2e8f0] mb-1">OpenClaw</p>
            <p className="text-[#475569] mb-1">Agent session logs per agent:</p>
            <code className="block bg-[#111827] rounded px-2 py-1 text-[#94a3b8] select-all">
              ~/.openclaw/agents/&#123;agent-name&#125;/sessions/*.jsonl
            </code>
            <p className="text-[#475569] mt-1">Each agent (main, sonnet, coder) has its own session directory.</p>
          </div>

          <div>
            <p className="font-medium text-[#e2e8f0] mb-1">CSV / JSON</p>
            <p className="text-[#475569] mb-1">CSV must have headers. Expected columns:</p>
            <code className="block bg-[#111827] rounded px-2 py-1 text-[#94a3b8]">
              timestamp, provider, model, input_tokens, output_tokens, cost_usd
            </code>
            <p className="text-[#475569] mt-1">JSON: array of objects with the same fields, or a wrapper with a records key.</p>
          </div>
        </div>
      )}
    </div>
  );
}
