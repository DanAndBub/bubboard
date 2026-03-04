'use client';
import type { AgentMap } from '@/lib/types';

interface RelationshipPanelProps {
  map: AgentMap;
}

type AgentNode = {
  id: string;
  model: string;
  role: string;
  children: AgentNode[];
};

function getModelTier(model: string): number {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 0;
  if (m.includes('sonnet')) return 1;
  if (m.includes('deepseek')) return 2;
  return 3;
}

function defaultRole(tier: number): string {
  if (tier === 0) return 'Orchestrator';
  if (tier === 1) return 'Senior Lead';
  if (tier === 2) return 'Junior Dev';
  return 'Agent';
}

function modelBadgeClass(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
  if (m.includes('sonnet')) return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
  if (m.includes('deepseek')) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-[#1e293b] bg-[#0d1520] text-[#94a3b8]';
}

function modelLabel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'Opus';
  if (m.includes('sonnet')) return 'Sonnet';
  if (m.includes('deepseek')) return 'DeepSeek';
  return model.split('/').pop()?.split('-')[0] ?? model;
}

function buildHierarchyTree(map: AgentMap): AgentNode[] | null {
  const agentList: { id: string; model: string; role: string }[] = [];

  if (map.config?.agents && map.config.agents.length > 0) {
    map.config.agents.forEach(ca => {
      const mapAgent = map.agents.find(a => a.id === ca.id);
      agentList.push({ id: ca.id, model: ca.model, role: ca.role ?? mapAgent?.role ?? '' });
    });
  } else {
    map.agents.forEach(a => {
      agentList.push({ id: a.id, model: a.model ?? '', role: a.role ?? '' });
    });
  }

  if (agentList.length === 0) return null;

  const opus = agentList.filter(a => getModelTier(a.model) === 0);
  const sonnet = agentList.filter(a => getModelTier(a.model) === 1);
  const deepseek = agentList.filter(a => getModelTier(a.model) === 2);
  const other = agentList.filter(a => getModelTier(a.model) === 3);

  // Need at least one tier-classified agent to build a meaningful tree
  if (opus.length === 0 && sonnet.length === 0 && deepseek.length === 0) return null;

  const deepseekNodes: AgentNode[] = deepseek.map(a => ({
    id: a.id, model: a.model, role: a.role || defaultRole(2), children: [],
  }));

  // Distribute deepseek under sonnet agents round-robin
  const sonnetNodes: AgentNode[] = sonnet.map((a, i) => ({
    id: a.id,
    model: a.model,
    role: a.role || defaultRole(1),
    children: sonnet.length > 0
      ? deepseekNodes.filter((_, di) => di % sonnet.length === i)
      : [],
  }));

  const opusChildren: AgentNode[] = sonnet.length > 0 ? sonnetNodes : deepseekNodes;
  const otherNodes: AgentNode[] = other.map(a => ({
    id: a.id, model: a.model, role: a.role || defaultRole(3), children: [],
  }));

  const opusNodes: AgentNode[] = opus.map(a => ({
    id: a.id,
    model: a.model,
    role: a.role || defaultRole(0),
    children: [...opusChildren, ...otherNodes],
  }));

  return opusNodes.length > 0 ? opusNodes : [...sonnetNodes, ...otherNodes];
}

function TreeNode({ node, prefix, isLast, isRoot }: { node: AgentNode; prefix: string; isLast: boolean; isRoot?: boolean }) {
  const connector = isLast ? '└─' : '├─';
  const childPrefix = prefix + (isLast ? '      ' : '│     ');
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 text-sm font-mono leading-relaxed py-1 whitespace-nowrap">
        <span className="text-[#475569] whitespace-pre select-none">{prefix}{connector} </span>
        <span className="text-[#e2e8f0]">{node.id}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${modelBadgeClass(node.model)}`}>
          {modelLabel(node.model)}
        </span>
        {node.role && <span className="text-[#475569]">— {node.role}</span>}
      </div>
      {node.children.length > 0 && (
        <div className={isRoot ? 'mt-4' : undefined}>
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              prefix={childPrefix}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RelationshipPanel({ map }: RelationshipPanelProps) {
  const hierarchyTree = buildHierarchyTree(map);

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e293b]">
        <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm8 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zm-4 0h.01M15 6h.01" />
        </svg>
        <h3 className="font-semibold text-[#e2e8f0] text-sm">Agent Hierarchy</h3>
      </div>

      <div className="p-8 overflow-x-auto">
        {hierarchyTree ? (
          <div className="space-y-0.5">
            {hierarchyTree.map((node, i) => (
              <TreeNode
                key={node.id}
                node={node}
                prefix=""
                isLast={i === hierarchyTree.length - 1}
                isRoot
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#475569]">
            Upload your openclaw.json to see your agent hierarchy
          </p>
        )}
      </div>
    </div>
  );
}
