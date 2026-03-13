'use client';

import { AgentInfo } from '@/lib/types';

interface AgentsViewProps {
  agents: AgentInfo[];
}

function deriveProvider(model?: string): 'anthropic' | 'deepseek' | 'openai' | 'other' {
  if (!model) return 'other';
  const m = model.toLowerCase();
  if (m.includes('claude') || m.includes('anthropic')) return 'anthropic';
  if (m.includes('deepseek')) return 'deepseek';
  if (m.includes('gpt') || m.includes('openai')) return 'openai';
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
  if (provider === 'deepseek') {
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399' }}
      >
        DeepSeek
      </span>
    );
  }
  if (provider === 'openai') {
    return (
      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
        style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa' }}
      >
        OpenAI
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: 'rgba(122,138,155,0.10)', color: '#7a8a9b' }}
    >
      {model ? model.split('/')[0] : 'Unknown'}
    </span>
  );
}

/**
 * Build a nested hierarchy tree from a flat list of agents using reportsTo.
 * Returns an array of root agents, each with a `children` array (recursive).
 */
interface AgentNode extends AgentInfo {
  children: AgentNode[];
}

function buildHierarchy(agents: AgentInfo[]): AgentNode[] {
  const nodeMap = new Map<string, AgentNode>();
  for (const agent of agents) {
    nodeMap.set(agent.id, { ...agent, children: [] });
  }
  const roots: AgentNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.reportsTo && nodeMap.has(node.reportsTo)) {
      nodeMap.get(node.reportsTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function HierarchyNode({ node, depth }: { node: AgentNode; depth: number }) {
  const isRoot = depth === 0;
  const indent = depth * 24; // px per level

  return (
    <>
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${indent}px` }}
      >
        {!isRoot && (
          <span style={{ color: '#3a4e63', marginRight: 2 }}>└</span>
        )}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: isRoot ? '#34d399' : '#7db8fc' }}
        />
        <span
          className={`font-semibold text-[13px] ${isRoot ? 'text-white' : ''}`}
          style={isRoot ? {} : { color: '#b0bec9' }}
        >
          {node.id}
        </span>
        {node.role && (
          <span className="text-[11px] font-mono" style={{ color: '#7a8a9b' }}>
            {node.role}
          </span>
        )}
      </div>
      {node.children.map(child => (
        <HierarchyNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default function AgentsView({ agents }: AgentsViewProps) {
  const hierarchyRoots = buildHierarchy(agents);

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
            <div className="text-right text-[12px]">
              {agent.reportsTo ? (
                <span style={{ color: '#7a8a9b' }}>→ {agent.reportsTo}</span>
              ) : (
                <span style={{ color: '#34d399' }}>root</span>
              )}
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
            {hierarchyRoots.map(root => (
              <HierarchyNode key={root.id} node={root} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
