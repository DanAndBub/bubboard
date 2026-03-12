'use client';

import { AgentInfo } from '@/lib/types';

interface AgentsViewProps {
  agents: AgentInfo[];
}

function deriveProvider(model?: string): 'anthropic' | 'ollama' | 'other' {
  if (!model) return 'other';
  const m = model.toLowerCase();
  if (m.startsWith('claude')) return 'anthropic';
  if (m.includes('llama') || m.includes('mistral') || m.includes('ollama') || m.includes('gemma') || m.includes('phi')) return 'ollama';
  return 'other';
}

function ProviderBadge({ model }: { model?: string }) {
  const provider = deriveProvider(model);
  if (provider === 'anthropic') {
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{ background: 'rgba(125,184,252,0.10)', color: '#7db8fc' }}
      >
        Anthropic
      </span>
    );
  }
  if (provider === 'ollama') {
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399' }}
      >
        Local
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: 'rgba(255,255,255,0.06)', color: '#b0bec9' }}
    >
      {model ? model.split('/')[0] : 'Unknown'}
    </span>
  );
}

export default function AgentsView({ agents }: AgentsViewProps) {
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-[22px] font-semibold text-white">Agents</h1>
        <span className="font-mono text-[13px]" style={{ color: '#7a8a9b' }}>
          {agents.length} detected
        </span>
      </div>

      {/* Agent rows */}
      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="grid items-center rounded-[10px] transition-colors"
            style={{
              gridTemplateColumns: '140px 1fr 120px 100px',
              background: '#111827',
              border: '1px solid #3a4e63',
              padding: '14px 20px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#506880';
              (e.currentTarget as HTMLDivElement).style.background = '#172033';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#3a4e63';
              (e.currentTarget as HTMLDivElement).style.background = '#111827';
            }}
          >
            {/* Col 1: dot + agent id */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="shrink-0 w-2 h-2 rounded-full"
                style={{ background: '#a78bfa' }}
              />
              <span className="font-semibold text-[14px] text-white truncate">
                {agent.id}
              </span>
            </div>

            {/* Col 2: model */}
            <div className="font-mono text-[12px] truncate" style={{ color: '#b0bec9' }}>
              {agent.model ?? '—'}
            </div>

            {/* Col 3: provider badge */}
            <div>
              <ProviderBadge model={agent.model} />
            </div>

            {/* Col 4: reports-to */}
            <div className="text-right text-[12px]" style={{ color: '#34d399' }}>
              root
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <p className="text-[13px] py-4 text-center" style={{ color: '#7a8a9b' }}>
            No agents detected
          </p>
        )}
      </div>

      {/* Hierarchy card */}
      <div
        className="rounded-xl mt-3.5"
        style={{
          background: '#111827',
          border: '1px solid #3a4e63',
          padding: '22px',
        }}
      >
        <p
          className="uppercase text-[12px] tracking-widest mb-3.5"
          style={{ color: '#7a8a9b' }}
        >
          Hierarchy
        </p>

        {agents.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#7a8a9b' }}>No agents</p>
        ) : (
          <div className="flex flex-col gap-1">
            {/* All agents are roots since AgentInfo has no reportsTo field */}
            {agents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-2">
                {i === 0 ? (
                  /* First agent shown as primary root */
                  <>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: '#34d399' }}
                    />
                    <span className="font-semibold text-[13px] text-white">
                      {agent.id}
                    </span>
                    {agent.role && (
                      <span className="text-[11px] font-mono" style={{ color: '#7a8a9b' }}>
                        {agent.role}
                      </span>
                    )}
                  </>
                ) : (
                  /* Remaining agents indented as siblings */
                  <div className="flex items-center gap-2 ml-6 pl-4" style={{ borderLeft: '1px solid #3a4e63' }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: '#7db8fc' }}
                    />
                    <span className="text-[13px]" style={{ color: '#b0bec9' }}>
                      {agent.id}
                    </span>
                    {agent.role && (
                      <span className="text-[11px] font-mono" style={{ color: '#7a8a9b' }}>
                        {agent.role}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
