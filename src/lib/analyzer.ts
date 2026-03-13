import type { AgentMap, ConfigInfo, AgentsMdInfo } from './types';

function extractModelString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'primary' in val) return String((val as Record<string, unknown>).primary);
  return 'unknown';
}

/**
 * Parse openclaw.json content and enrich the AgentMap
 */
export function analyzeOpenClawConfig(jsonContent: string, map: AgentMap): AgentMap {
  try {
    const config = JSON.parse(jsonContent);
    const configInfo: ConfigInfo = {
      models: [],
      agents: [],
      heartbeat: { enabled: false },
      channels: [],
    };

    // Extract models
    if (config.models && typeof config.models === 'object') {
      for (const [id, info] of Object.entries(config.models)) {
        const m = info as Record<string, string>;
        configInfo.models.push({
          id,
          provider: m.provider || 'unknown',
          alias: m.alias,
        });
      }
    }

    // Extract agents — handle both flat format and { defaults, list } format
    if (config.agents && typeof config.agents === 'object') {
      const agentEntries: Array<[string, Record<string, unknown>]> = [];

      if (Array.isArray(config.agents.list)) {
        // OpenClaw format: agents.list is an array of { id, model, ... }
        for (const entry of config.agents.list) {
          if (entry && typeof entry === 'object' && entry.id) {
            agentEntries.push([entry.id as string, entry as Record<string, unknown>]);
          }
        }
      } else {
        // Flat format: agents is { main: {...}, sonnet: {...}, ... }
        for (const [id, info] of Object.entries(config.agents)) {
          if (id === 'defaults' || id === 'list') continue;
          if (info && typeof info === 'object') {
            agentEntries.push([id, info as Record<string, unknown>]);
          }
        }
      }

      for (const [id, a] of agentEntries) {
        const modelStr = extractModelString(a.model);
        // Extract provider from "provider/model-name" format
        const providerFromModel = modelStr.includes('/') ? modelStr.split('/')[0] : undefined;
        configInfo.agents.push({
          id,
          model: modelStr,
          role: a.role as string | undefined,
          provider: (a.provider as string | undefined) || providerFromModel,
        });
      }
    }

    // Derive reportsTo hierarchy from agent ids.
    // Heuristic based on delegation rules (AGENTS.md):
    //   main → no reportsTo (root)
    //   coder → sonnet
    //   analyst → main
    //   all others → main
    function deriveReportsTo(id: string, allIds: string[]): string | undefined {
      if (id === 'main') return undefined;
      if (id === 'coder' && allIds.includes('sonnet')) return 'sonnet';
      return 'main';
    }

    // Merge agent roles into our agent list
    if (configInfo.agents.length > 0) {
      const allConfigIds = configInfo.agents.map(a => a.id);
      const enriched = map.agents.map(agent => {
        const found = configInfo.agents.find(a => a.id === agent.id);
        if (found) {
          return {
            ...agent,
            model: found.model,
            role: found.role || agent.role,
            reportsTo: deriveReportsTo(agent.id, allConfigIds),
          };
        }
        return agent;
      });

      // Add any config agents not in directory listing
      for (const ca of configInfo.agents) {
        if (!enriched.find(a => a.id === ca.id)) {
          enriched.push({
            id: ca.id,
            name: ca.id.charAt(0).toUpperCase() + ca.id.slice(1),
            model: ca.model,
            role: ca.role,
            reportsTo: deriveReportsTo(ca.id, allConfigIds),
          });
        }
      }
      map = { ...map, agents: enriched };
    }

    // Heartbeat
    if (config.heartbeat) {
      configInfo.heartbeat = {
        enabled: true,
        model: extractModelString(config.heartbeat.model),
        interval: config.heartbeat.interval,
      };
    }

    // Channels
    if (config.channels && Array.isArray(config.channels)) {
      configInfo.channels = config.channels;
    }

    return { ...map, config: configInfo };
  } catch {
    return map;
  }
}

/**
 * Parse AGENTS.md content and extract relationships
 */
export function analyzeAgentsMd(content: string, map: AgentMap): AgentMap {
  const agentsMd: AgentsMdInfo = {
    delegationRules: [],
    referencedSkills: [],
    referencedAgents: [],
  };

  const lines = content.split('\n');

  // Look for agent mentions (words that match known agent names)
  const agentNames = map.agents.map(a => a.id.toLowerCase());
  const agentMentions = new Set<string>();

  // Look for skill references
  const skillMentions = new Set<string>();

  // Delegation patterns: "delegate to X", "use X for", "ask X to", etc.
  const delegationPatterns = [
    /delegate\s+(?:to\s+)?([a-z0-9-]+)/gi,
    /use\s+([a-z0-9-]+)\s+(?:agent\s+)?for/gi,
    /ask\s+([a-z0-9-]+)\s+to/gi,
    /hand(?:le|off)\s+(?:to\s+)?([a-z0-9-]+)/gi,
  ];

  // Skip lines inside code blocks
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const lineLower = line.toLowerCase();

    // Check for agent name mentions
    for (const agentId of agentNames) {
      if (lineLower.includes(agentId)) {
        agentMentions.add(agentId);
      }
    }

    // Delegation rules — only from bullet points or plain text, not templates
    for (const pattern of delegationPatterns) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (agentNames.includes(match[1].toLowerCase())) {
          const cleanLine = line.trim().replace(/^[-*]\s*/, '').replace(/^#+\s*/, '').substring(0, 100);
          if (cleanLine.length > 10) {
            agentsMd.delegationRules.push(cleanLine);
          }
        }
      }
    }

    // Skill references: look for common skill patterns
    const skillMatch = line.match(/skill[s]?\s*[:]\s*([a-zA-Z0-9-,\s]+)/i);
    if (skillMatch) {
      const skills = skillMatch[1].split(/[,\s]+/).filter(s => s.length > 2);
      skills.forEach(s => skillMentions.add(s.toLowerCase()));
    }
  }

  agentsMd.referencedAgents = [...agentMentions];
  agentsMd.referencedSkills = [...skillMentions].slice(0, 10);

  // Extract delegation rules from section headings and bullet points
  const delegationSection = content.match(/##\s*delegation[^#]*/i);
  if (delegationSection) {
    const sectionLines = delegationSection[0].split('\n');
    let inBlock = false;
    for (const line of sectionLines) {
      if (line.trimStart().startsWith('```')) { inBlock = !inBlock; continue; }
      if (inBlock) continue;
      if (line.startsWith('-') || line.startsWith('*')) {
        const rule = line.replace(/^[-*]\s*/, '').trim();
        if (rule.length > 10 && !agentsMd.delegationRules.includes(rule)) {
          agentsMd.delegationRules.push(rule);
        }
      }
    }
  }

  return { ...map, agentsMd };
}

/**
 * Analyze HEARTBEAT.md to extract heartbeat config
 */
export function analyzeHeartbeat(content: string, map: AgentMap): AgentMap {
  if (!map.config) {
    map = {
      ...map,
      config: {
        models: [],
        agents: [],
        heartbeat: { enabled: false },
        channels: [],
      },
    };
  }

  const modelMatch = content.match(/model\s*[:=]\s*([a-zA-Z0-9_.-]+)/i);
  const intervalMatch = content.match(/interval\s*[:=]\s*([0-9a-z\s]+)/i);

  return {
    ...map,
    config: {
      ...map.config!,
      heartbeat: {
        enabled: true,
        model: modelMatch?.[1],
        interval: intervalMatch?.[1]?.trim(),
      },
    },
  };
}
