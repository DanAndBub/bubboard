import type { AgentMap } from './types';
import { parseAgentTree } from './parser';

export const DEMO_TREE = `~/.openclaw/
├── openclaw.json
├── workspace/
│   ├── SOUL.md
│   ├── AGENTS.md
│   ├── MEMORY.md
│   ├── TOOLS.md
│   ├── HEARTBEAT.md
│   ├── USER.md
│   ├── IDENTITY.md
│   ├── WORKFLOW_AUTO.md
│   ├── memory/
│   │   ├── 2026-02-15.md
│   │   ├── 2026-02-16.md
│   │   ├── 2026-02-17.md
│   │   ├── 2026-02-18.md
│   │   ├── 2026-02-19.md
│   │   ├── 2026-02-20.md
│   │   ├── 2026-02-22.md
│   │   ├── 2026-02-23.md
│   │   ├── 2026-02-24.md
│   │   └── 2026-02-25.md
│   ├── subagents/
│   │   ├── SONNET_PROTOCOL.md
│   │   ├── CODER_PROTOCOL.md
│   │   ├── ANALYST_PROTOCOL.md
│   │   ├── QA_PROTOCOL.md
│   │   ├── PROTOCOLS.md
│   │   ├── sonnet-context.md
│   │   ├── coder-context.md
│   │   └── analyst-context.md
│   └── bub-business/
│       ├── research/
│       ├── security/
│       ├── pipeline/
│       ├── strategy/
│       └── products/
├── agents/
│   ├── main/
│   ├── sonnet/
│   ├── coder/
│   ├── analyst/
│   └── local/
└── skills/ (50+ installed)`;

export const DEMO_AGENTS_OVERRIDE = [
  { id: 'main', name: 'Bub', model: 'claude-opus-4-6', role: 'Orchestration Lead' },
  { id: 'sonnet', name: 'Sonnet', model: 'claude-sonnet-4-6', role: 'Senior Lead Engineer' },
  { id: 'coder', name: 'Coder', model: 'deepseek-chat', role: 'Junior Dev' },
  { id: 'analyst', name: 'Analyst', model: 'deepseek-chat', role: 'Data Analysis' },
  { id: 'local', name: 'Local', model: 'deepseek-chat', role: 'Local tasks' },
];

export const DEMO_AGENTS_MD_CONTENT = `# AGENTS.md — Bub's Operating Manual

## Delegation Rules
- Use sonnet for complex engineering tasks and code review
- Use coder for routine development and implementation
- Use analyst for data analysis, research, and reporting
- Delegate to local for local system tasks

## Skills
Skills: github, gog, weather, tmux, coding-agent, deploy, monitor

## Heartbeat
The heartbeat runs daily tasks using deepseek-chat model.
Interval: daily at 09:00
`;

export function getDemoAgentMap(): AgentMap {
  const parsed = parseAgentTree(DEMO_TREE);

  // Override agents with known model + role data
  const agents = DEMO_AGENTS_OVERRIDE.map(override => ({
    ...override,
    hasProtocol: parsed.workspace.subagentProtocols.some(p =>
      p.toLowerCase().includes(override.id.toLowerCase())
    ),
  }));

  return {
    ...parsed,
    agents,
    skillCount: 50,
    config: {
      models: [
        { id: 'claude-opus-4-6', provider: 'anthropic', alias: 'opus' },
        { id: 'claude-sonnet-4-6', provider: 'anthropic', alias: 'sonnet' },
        { id: 'deepseek-chat', provider: 'deepseek', alias: 'deepseek' },
      ],
      agents: DEMO_AGENTS_OVERRIDE.map(a => ({ id: a.id, model: a.model, role: a.role })),
      heartbeat: {
        enabled: true,
        model: 'deepseek-chat',
        interval: 'daily at 09:00',
      },
      channels: ['telegram'],
    },
    agentsMd: {
      delegationRules: [
        'Use sonnet for complex engineering tasks and code review',
        'Use coder for routine development and implementation',
        'Use analyst for data analysis, research, and reporting',
        'Delegate to local for local system tasks',
      ],
      referencedSkills: ['github', 'gog', 'weather', 'tmux', 'coding-agent'],
      referencedAgents: ['sonnet', 'coder', 'analyst', 'local'],
    },
  };
}
