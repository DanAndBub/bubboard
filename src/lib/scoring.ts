import type { AgentMap, HealthReport, HealthItem } from './types';

/**
 * Calculate setup health score for an OpenClaw agent.
 * Returns a HealthReport with per-item status and overall score out of 10.
 */
export function calculateHealthScore(map: AgentMap): HealthReport {
  const items: HealthItem[] = [];

  const foundFiles = [
    ...map.workspace.coreFiles,
    ...map.workspace.customFiles,
  ].map(f => f.toUpperCase());

  function hasFile(name: string): boolean {
    return foundFiles.includes(name.toUpperCase());
  }

  // 1. SOUL.md
  items.push({
    id: 'soul',
    label: 'SOUL.md',
    description: 'Agent personality and voice',
    status: hasFile('SOUL.md') ? 'ok' : 'missing',
    recommendation: 'Defines your agent\'s personality, tone, and behavioral guidelines',
  });

  // 2. AGENTS.md
  items.push({
    id: 'agents',
    label: 'AGENTS.md',
    description: 'Operating manual',
    status: hasFile('AGENTS.md') ? 'ok' : 'missing',
    recommendation: 'The primary operating manual — how your agent behaves and makes decisions',
  });

  // 3. MEMORY.md
  items.push({
    id: 'memory_md',
    label: 'MEMORY.md',
    description: 'Long-term memory index',
    status: hasFile('MEMORY.md') ? 'ok' : 'missing',
    recommendation: 'Loaded into every conversation — a persistent summary of key knowledge',
  });

  // 4. TOOLS.md
  items.push({
    id: 'tools',
    label: 'TOOLS.md',
    description: 'Tool documentation',
    status: hasFile('TOOLS.md') ? 'ok' : 'missing',
    recommendation: 'Documents what tools are available and how to use them effectively',
  });

  // 5. HEARTBEAT.md
  items.push({
    id: 'heartbeat',
    label: 'HEARTBEAT.md',
    description: 'Background task config',
    status: hasFile('HEARTBEAT.md') ? 'ok' : 'missing',
    recommendation: 'Configures autonomous background tasks your agent runs on a schedule',
  });

  // 6. USER.md
  items.push({
    id: 'user',
    label: 'USER.md',
    description: 'Human context file',
    status: hasFile('USER.md') ? 'ok' : 'missing',
    recommendation: 'Provides context about the human the agent works with',
  });

  // 7. IDENTITY.md
  items.push({
    id: 'identity',
    label: 'IDENTITY.md',
    description: 'Agent identity',
    status: hasFile('IDENTITY.md') ? 'ok' : 'missing',
    recommendation: 'Defines the agent\'s self-concept, goals, and values',
  });

  // 8. Memory entries (at least 1)
  const hasMemoryEntries = map.workspace.memoryFiles.length > 0;
  items.push({
    id: 'memory_entries',
    label: 'Memory entries',
    description: `Persistent daily notes (${map.workspace.memoryFiles.length} found)`,
    status: hasMemoryEntries ? 'ok' : 'warning',
    recommendation: 'Daily memory files in memory/ give your agent context about recent work',
  });

  // 9. openclaw.json
  items.push({
    id: 'config',
    label: 'openclaw.json',
    description: 'Main configuration file',
    status: map.hasConfig ? 'ok' : 'missing',
    recommendation: 'The main config file — defines agents, models, channels, and heartbeat',
  });

  // 10. Subagent protocols (if multi-agent)
  const hasProtocols = map.workspace.subagentProtocols.length > 0;
  const hasMultipleAgents = map.agents.length > 1;
  items.push({
    id: 'protocols',
    label: 'Subagent protocols',
    description: hasProtocols
      ? `${map.workspace.subagentProtocols.length} protocol files found`
      : 'No subagent protocols found',
    status: hasProtocols
      ? 'ok'
      : hasMultipleAgents
      ? 'warning'
      : 'warning',
    recommendation: 'Protocol files in subagents/ improve delegation quality for multi-agent setups',
  });

  const okCount = items.filter(i => i.status === 'ok').length;
  const score = okCount;
  const maxScore = items.length;

  return { items, score, maxScore };
}
