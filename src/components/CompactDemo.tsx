'use client';

import { getDemoAgentMap } from '@/lib/demo-data';
import { calculateHealthScore } from '@/lib/scoring';

const MODEL_COLORS: Record<string, string> = {
  opus: '#3b82f6',
  sonnet: '#8b5cf6',
  deepseek: '#10b981',
};

function getModelInfo(model: string): { label: string; color: string } {
  if (model.includes('opus')) return { label: 'Opus', color: MODEL_COLORS.opus };
  if (model.includes('sonnet')) return { label: 'Sonnet', color: MODEL_COLORS.sonnet };
  return { label: 'DeepSeek', color: MODEL_COLORS.deepseek };
}

const WORKSPACE_FILES = [
  { name: 'SOUL.md', present: true },
  { name: 'AGENTS.md', present: true },
  { name: 'MEMORY.md', present: true },
  { name: 'TOOLS.md', present: true },
  { name: 'HEARTBEAT.md', present: true },
  { name: 'USER.md', present: true },
  { name: 'IDENTITY.md', present: true },
  { name: 'BOOTSTRAP.md', present: false },
];

export default function CompactDemo() {
  const map = getDemoAgentMap();
  const health = calculateHealthScore(map);

  const totalFiles =
    map.workspace.coreFiles.length +
    map.workspace.customFiles.length +
    map.workspace.memoryFiles.length +
    map.workspace.subagentProtocols.length;

  const stats = [
    { label: 'Files', value: totalFiles, color: 'text-blue-400' },
    { label: 'Agents', value: map.agents.length, color: 'text-purple-400' },
    { label: 'Memory', value: map.workspace.memoryFiles.length, color: 'text-green-400' },
    { label: 'Skills', value: map.skillCount, color: 'text-amber-400' },
    {
      label: 'Score',
      value: health.score,
      color: health.score >= 8 ? 'text-green-400' : 'text-amber-400',
    },
  ];

  return (
    <div className="w-full" style={{ color: '#e2e8f0' }}>
      {/* Stats Row */}
      <div
        className="grid grid-cols-5 gap-1 rounded-lg border py-2"
        style={{ background: '#111827', borderColor: '#1e293b' }}
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`font-mono text-sm font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px]" style={{ color: '#475569' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Agent List */}
      <div className="mt-3">
        <div
          className="mb-1.5 text-[10px] font-medium uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Agent Fleet
        </div>
        <div className="space-y-1">
          {map.agents.map((agent) => {
            const { label, color } = getModelInfo(agent.model ?? '');
            return (
              <div
                key={agent.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                style={{ background: '#0a0e17', borderColor: '#1e293b' }}
              >
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                  {agent.name}
                </span>
                <span
                  className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]"
                  style={{
                    color,
                    background: color + '18',
                    border: `1px solid ${color}30`,
                  }}
                >
                  {label}
                </span>
                <span className="shrink-0 text-[10px]">
                  {agent.hasProtocol ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-amber-400">⚠</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Files Section */}
      <div className="mt-3">
        <div
          className="mb-1.5 text-[10px] font-medium uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Workspace Files
        </div>
        <div className="flex flex-wrap gap-1">
          {WORKSPACE_FILES.map((file) => (
            <span
              key={file.name}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px]"
              style={{ background: '#0a0e17', borderColor: '#1e293b', color: '#94a3b8' }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ background: file.present ? '#22c55e' : '#ef4444' }}
              />
              {file.name}
            </span>
          ))}
          <span
            className="inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] text-green-400"
            style={{
              background: 'rgba(34,197,94,0.1)',
              borderColor: 'rgba(34,197,94,0.2)',
            }}
          >
            {map.workspace.memoryFiles.length} memory files
          </span>
        </div>
      </div>

      {/* Health Score */}
      <div
        className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2"
        style={{
          background: 'rgba(34,197,94,0.05)',
          borderColor: 'rgba(34,197,94,0.2)',
        }}
      >
        <span className="text-xs" style={{ color: '#94a3b8' }}>
          Health Score
        </span>
        <span className="font-mono text-sm font-bold text-green-400">
          {health.score}/{health.maxScore}
        </span>
      </div>
    </div>
  );
}
