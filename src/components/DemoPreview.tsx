'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DemoPreview() {
  const router = useRouter();

  const agents = [
    { name: 'Bub', model: 'claude-opus-4-6', role: 'Orchestrator', color: '#3b82f6' },
    { name: 'Sonnet', model: 'claude-sonnet-4-6', role: 'Lead Engineer', color: '#8b5cf6' },
    { name: 'Coder', model: 'deepseek-chat', role: 'Dev', color: '#10b981' },
    { name: 'Analyst', model: 'deepseek-chat', role: 'Analysis', color: '#f59e0b' },
    { name: 'Local', model: 'deepseek-chat', role: 'Local tasks', color: '#6b7280' },
  ];

  const files = [
    { name: 'SOUL.md', cat: 'core', ok: true },
    { name: 'AGENTS.md', cat: 'ops', ok: true },
    { name: 'MEMORY.md', cat: 'ops', ok: true },
    { name: 'TOOLS.md', cat: 'ops', ok: true },
    { name: 'HEARTBEAT.md', cat: 'ops', ok: true },
    { name: 'USER.md', cat: 'core', ok: true },
    { name: 'IDENTITY.md', cat: 'core', ok: true },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#1e293b] bg-[#111827] text-sm text-[#94a3b8] mb-4">
              <span className="w-1 h-1 rounded-full bg-green-400" />
              Live demo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#e2e8f0] mb-2">
              Bub&apos;s Agent Map
            </h2>
            <p className="text-[#94a3b8]">
              A real OpenClaw setup — 5 agents, 50+ skills, 10 memory entries
            </p>
          </div>
          <button
            onClick={() => router.push('/map?demo=true')}
            className="shrink-0 px-6 py-3 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400 transition-all font-medium"
          >
            Open Full Map →
          </button>
        </div>

        {/* Preview card */}
        <div
          className="relative rounded-2xl border border-[#1e293b] bg-[#111827] overflow-hidden"
          style={{ boxShadow: '0 0 80px rgba(59, 130, 246, 0.08), 0 8px 40px rgba(0,0,0,0.6)' }}
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b] bg-[#0d1520]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]/60" />
              <div className="w-3 h-3 rounded-full bg-[#10b981]/60" />
            </div>
            <span className="font-mono text-xs text-[#475569]">bubboard — ~/.openclaw/workspace/</span>
            <div className="ml-auto flex items-center gap-2 text-xs text-[#475569]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-dot-ok" />
              Score: 10/10
            </div>
          </div>

          {/* Stats bar preview */}
          <div className="grid grid-cols-5 divide-x divide-[#1e293b] border-b border-[#1e293b]">
            {[
              { label: 'Files', value: '21' },
              { label: 'Agents', value: '5' },
              { label: 'Memory', value: '10' },
              { label: 'Skills', value: '50+' },
              { label: 'Score', value: '10/10' },
            ].map(stat => (
              <div key={stat.label} className="py-3 px-4 text-center">
                <div className="font-mono text-sm font-bold text-blue-400">{stat.value}</div>
                <div className="text-xs text-[#475569] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Content preview */}
          <div className="p-6 grid md:grid-cols-2 gap-6">
            {/* Agent fleet preview */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#475569] font-medium mb-3">
                Agent Fleet
              </h3>
              <div className="space-y-2">
                {agents.map(agent => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#1e293b] bg-[#0d1520]"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: agent.color, boxShadow: `0 0 6px ${agent.color}80` }}
                    />
                    <span className="font-semibold text-sm text-[#e2e8f0]">{agent.name}</span>
                    <span className="font-mono text-xs text-[#475569] truncate">{agent.model}</span>
                    <span className="ml-auto text-xs text-[#94a3b8] shrink-0">{agent.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workspace files preview */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#475569] font-medium mb-3">
                Workspace Files
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {files.map(f => (
                  <div
                    key={f.name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1e293b] bg-[#0d1520]"
                  >
                    <span className="text-green-400 text-xs">✓</span>
                    <span className="font-mono text-xs text-[#94a3b8]">{f.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-500/20 bg-green-500/5">
                  <span className="text-green-400 text-xs">✓</span>
                  <span className="font-mono text-xs text-green-400">10 memory files</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overlay CTA */}
          <div className="border-t border-[#1e293b] p-4 flex items-center justify-between bg-[#0d1520]/50">
            <span className="text-sm text-[#475569]">
              8 subagent protocols · 50+ skills installed · Heartbeat: deepseek-chat
            </span>
            <button
              onClick={() => router.push('/map?demo=true')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Explore full map →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
