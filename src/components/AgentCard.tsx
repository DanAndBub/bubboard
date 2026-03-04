import type { AgentInfo } from '@/lib/types';

interface AgentCardProps {
  agent: AgentInfo;
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus': '#3b82f6',
  'claude-sonnet': '#8b5cf6',
  'claude-haiku': '#06b6d4',
  'deepseek': '#10b981',
  'gpt': '#f59e0b',
  'gemini': '#ef4444',
};

function getModelColor(model?: string): string {
  if (!model || typeof model !== 'string') return '#475569';
  const modelLower = model.toLowerCase();
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (modelLower.includes(key)) return color;
  }
  return '#6b7280';
}

function getModelBadgeLabel(model?: string): string {
  if (!model || typeof model !== 'string') return 'Unknown';
  if (model.includes('opus')) return 'Opus';
  if (model.includes('sonnet')) return 'Sonnet';
  if (model.includes('haiku')) return 'Haiku';
  if (model.includes('deepseek')) return 'DeepSeek';
  if (model.includes('gpt-4')) return 'GPT-4';
  if (model.includes('gpt-3')) return 'GPT-3.5';
  if (model.includes('gemini')) return 'Gemini';
  return model.split('-').slice(0, 2).join('-');
}

export default function AgentCard({ agent }: AgentCardProps) {
  const color = getModelColor(agent.model);
  const badge = getModelBadgeLabel(agent.model);

  return (
    <div
      className="relative flex flex-col p-4 rounded-xl border border-[#1e293b] bg-[#111827] card-hover overflow-hidden"
    >
      {/* Color accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />

      {/* Status indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}60`,
            }}
          />
          <span className="font-semibold text-[#e2e8f0] text-sm">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {agent.hasProtocol ? (
            <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400">
              ✓ Protocol
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
              ⚠ No protocol
            </span>
          )}
        </div>
      </div>

      {/* Model */}
      {agent.model && (
        <div className="flex items-center gap-2 mb-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-mono font-medium"
            style={{
              color,
              backgroundColor: `${color}18`,
              border: `1px solid ${color}30`,
            }}
          >
            {badge}
          </span>
          <span className="font-mono text-xs text-[#475569] truncate">{agent.model}</span>
        </div>
      )}

      {/* Role */}
      {agent.role && (
        <div className="mt-auto pt-2">
          <span className="text-xs text-[#94a3b8]">{agent.role}</span>
        </div>
      )}

      {/* Agent ID */}
      <div className="mt-2 font-mono text-xs text-[#475569]">
        ID: {agent.id}
      </div>
    </div>
  );
}
