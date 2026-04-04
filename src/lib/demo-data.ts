import type { AgentMap } from './types';
import { parseAgentTree } from './parser';
import { AGENTS_CONTENT, SOUL_CONTENT, HEARTBEAT_CONTENT } from './phase3-demo-data';

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
│   └── biz-ops/
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

export function getDemoFileContents(): Record<string, string> {
  return {
    'AGENTS.md': AGENTS_CONTENT,
    'openclaw.json': JSON.stringify({
      models: {
        providers: {
          anthropic: { models: [
            { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
            { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
          ]},
          deepseek: { models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
          ]},
        },
      },
      agents: {
        defaults: { model: { primary: 'anthropic/claude-sonnet-4-6' } },
        list: [
          { id: 'main', model: { primary: 'anthropic/claude-opus-4-6' } },
          { id: 'sonnet', model: { primary: 'anthropic/claude-sonnet-4-6' } },
          { id: 'coder', model: { primary: 'deepseek/deepseek-chat' } },
          { id: 'analyst', model: { primary: 'deepseek/deepseek-chat' } },
          { id: 'local', model: { primary: 'deepseek/deepseek-chat' } },
        ],
      },
      heartbeat: { model: 'deepseek-chat', every: '15m' },
      channels: { telegram: { enabled: true } },
    }, null, 2),
    'HEARTBEAT.md': HEARTBEAT_CONTENT,
    'SOUL.md': SOUL_CONTENT,
    'MEMORY.md': '# MEMORY.md - Long-Term Memory\n\n## Critical Rules\n- Never delete bootstrap files\n- Always verify schema before config changes\n- Delegate execution, never iterate on failures\n\n## Architecture\n| Role | Model | Cost/1M |\n|------|-------|---------|\n| Main | Opus 4.6 | $5/$25 |\n| Sonnet | Sonnet 4.6 | $3/$15 |\n| Coder | DeepSeek | $0.14/$0.28 |\n\n## Lessons Learned\n1. Cost crisis: 78K token context = $30/day. Fix: slim workspace.\n2. Scraper spiral: 5+ Opus turns = $1-2. Delegate instead.\n3. Double-responding: compaction wipes memory. Keep responses short.',
    'TOOLS.md': '# TOOLS.md — Toolkit\n\n## GitHub (via gh CLI)\nAuthenticated. Common workflows: gh pr create, gh issue list.\n\n## Google Workspace (via gog CLI)\nGmail, Calendar, Drive, Contacts, Sheets, Docs.\n\n## Web Scraping\nApify for Instagram. BeautifulSoup for direct scraping.\n\n## Search & Research\nBrave Search API built into OpenClaw.',
    'USER.md': '# USER.md\n\n- **Name:** Dan\n- **Timezone:** PST\n- **Notes:** Business partner, direct communicator. Values efficiency and clear communication.',
    'IDENTITY.md': '# IDENTITY.md — Bub\n\n## The Basics\n- **Name:** Bub\n- **Role:** AI Business Partner & Operations Director\n- **Tagline:** Orchestrate, automate, ship\n\n## Who I Am\nI\'m Dan\'s AI co-founder. I run operations, manage sub-agents, build data pipelines, and keep projects moving.',
  };
}
