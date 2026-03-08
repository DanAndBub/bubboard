'use client';

import { useState } from 'react';

interface EmptyStateProps {
  onLoadDemo: () => void;
  demoLoading: boolean;
}

export default function EmptyState({ onLoadDemo, demoLoading }: EmptyStateProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const steps = [
    {
      icon: '📂',
      title: '1. Find your log files',
      lines: [
        <span key="cc"><strong className="text-[#e2e8f0]">Claude Code:</strong></span>,
        <code key="cc-path" className="block bg-[#0a0e17] px-2 py-1 rounded text-[#94a3b8] text-[10px] break-all">~/.claude/projects/*/&#123;session&#125;.jsonl</code>,
        <span key="oc"><strong className="text-[#e2e8f0]">OpenClaw:</strong></span>,
        <code key="oc-path" className="block bg-[#0a0e17] px-2 py-1 rounded text-[#94a3b8] text-[10px] break-all">~/.openclaw/agents/*/sessions/*.jsonl</code>,
        <span key="csv"><strong className="text-[#e2e8f0]">Other:</strong> Any CSV or JSON with usage data</span>,
      ],
    },
    {
      icon: '⬆️',
      title: '2. Use the Import button',
      lines: [
        <span key="a">Click <strong className="text-blue-400">Import</strong> in the top-right toolbar</span>,
        <span key="b"><strong className="text-[#e2e8f0]">Select Folder</strong> — grabs all .jsonl/.json/.csv files within selected folders</span>,
        <span key="c"><strong className="text-[#e2e8f0]">Select Files</strong> — pick individual files</span>,
        <span key="d">Files enter a staging area where you can review and remove before importing</span>,
      ],
    },
    {
      icon: '📊',
      title: '3. Explore your data',
      lines: [
        <span key="a">Charts and breakdowns appear instantly</span>,
        <span key="b">Add more files anytime — duplicates are skipped</span>,
        <span key="c">All data stays in your browser, nothing leaves your machine</span>,
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-16 px-6">
      <h2 className="text-lg font-semibold text-[#e2e8f0] mb-2">Get started with Cost Tracking</h2>
      <p className="text-sm text-[#475569] mb-8">Import your AI usage logs to see where your money goes. All data stays in your browser.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-[#1e293b] bg-[#111827] p-5"
          >
            <span className="text-2xl">{step.icon}</span>
            <p className="text-sm font-medium text-[#e2e8f0] mt-3 mb-2">{step.title}</p>
            <ul className="space-y-1.5">
              {step.lines.map((line, i) => (
                <li key={i} className="text-xs text-[#475569] leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Demo button */}
      <div className="text-center">
        <button
          onClick={onLoadDemo}
          disabled={demoLoading}
          className="px-5 py-2 rounded-lg text-sm font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 disabled:opacity-50 transition-all"
        >
          {demoLoading ? 'Loading demo…' : '✨ Load demo data to see it in action'}
        </button>
        <p className="text-[10px] text-[#475569] mt-2">Generates 90 days of sample usage data</p>
      </div>

      {/* Detailed help */}
      <div className="mt-10">
        <button
          onClick={() => setHelpOpen(!helpOpen)}
          className="text-sm font-semibold text-[#e2e8f0] hover:text-white transition-colors"
        >
          {helpOpen ? '▾' : '▸'} Detailed file format guide
        </button>

        {helpOpen && (
          <div className="mt-3 rounded-lg border border-[#1e293b] bg-[#0a0e17] p-4 text-xs text-[#94a3b8] space-y-4">
            <div>
              <p className="font-medium text-[#e2e8f0] mb-1">Claude Code CLI (.jsonl)</p>
              <p className="text-[#475569]">Each file is one session. Import all of them for complete history. Token counts and model info are extracted automatically.</p>
            </div>

            <div>
              <p className="font-medium text-[#e2e8f0] mb-1">OpenClaw (.jsonl)</p>
              <p className="text-[#475569]">Each agent has its own session directory. Import from all agents (main, sonnet, coder, etc.) for a full picture.</p>
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
    </div>
  );
}
