import type { AgentInfo } from '@/lib/types';

interface AgentCardProps {
  agent: AgentInfo;
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus': '#3b82f6',
  'claude-sonnet': '#a78bfa',
  'claude-haiku': '#06b6d4',
  'deepseek': '#34d399',
  'gpt': '#fbbf24',
  'gemini': '#f87171',
};

function getModelColor(model?: string): string {
  if (!model || typeof model !== 'string') return '#7a8a9b';
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
      className="relative flex flex-col p-4 rounded-xl border border-[#506880] bg-[#111827] card-hover overflow-hidden"
    >
      {/* Color accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />

      {/* Status indicator */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}60`,
            }}
          />
          <span className="font-semibold text-[#f1f5f9] text-sm truncate">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {agent.hasProtocol ? (
            <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-[#34d399] whitespace-nowrap">
              ✓ Protocol
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-[#fbbf24] whitespace-nowrap">
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
          <span className="font-mono text-xs text-[#7a8a9b] truncate">{agent.model}</span>
        </div>
      )}

      {/* Role */}
      {agent.role && (
        <div className="mt-auto pt-2">
          <span className="text-xs text-[#b0bec9]">{agent.role}</span>
        </div>
      )}

      {/* Agent ID */}
      <div className="mt-2 font-mono text-xs text-[#7a8a9b]">
        ID: {agent.id}
      </div>
    </div>
  );
}
