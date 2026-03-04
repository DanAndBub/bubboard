import type { AgentMap, AgentInfo, WorkspaceFiles } from './types';

// Recommended files every OpenClaw agent should have
export const RECOMMENDED_FILES = [
  'SOUL.md',
  'AGENTS.md',
  'MEMORY.md',
  'TOOLS.md',
  'HEARTBEAT.md',
  'USER.md',
  'IDENTITY.md',
];

const CORE_FILES = ['SOUL.md', 'IDENTITY.md', 'USER.md'];
const OPS_FILES = ['AGENTS.md', 'HEARTBEAT.md', 'TOOLS.md', 'MEMORY.md'];

/**
 * Cleans a raw file/dir name from a tree line.
 * Handles trailing comments like "skills/ (50+ installed)"
 */
function cleanName(raw: string): string {
  return raw
    .replace(/^[├└│─\s]+/, '')   // strip tree drawing chars
    .replace(/\s*\(.*?\)\s*$/, '') // strip trailing comments like (50+ installed)
    .replace(/\s+$/, '')
    .trim();
}

/**
 * Determines indentation level from a tree line.
 * Each level in tree output is 4 characters: "│   " or "    " or "└── " etc.
 * We find the position of ├ or └ and divide by 4 to get the depth.
 */
function getDepth(line: string): number {
  // Find the position of the first ├ or └ character
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    // ├ = 9500, └ = 9492
    if (code === 9500 || code === 9492) {
      // Each tree level is 4 characters wide
      return Math.round(i / 4);
    }
  }
  // No branch marker found — might be a plain indented line
  // Count leading spaces / 4
  let spaces = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ') spaces++;
    else break;
  }
  return Math.floor(spaces / 4);
}

interface TreeNode {
  name: string;
  isDir: boolean;
  depth: number;
  parent?: string;
  path: string;
}

/**
 * Parse a directory tree string (from `tree` command or similar) into
 * a flat list of nodes with path information.
 */
export function parseTreeString(input: string): TreeNode[] {
  const lines = input.split('\n').filter(l => l.trim().length > 0);
  const nodes: TreeNode[] = [];
  const pathStack: string[] = [];

  for (const line of lines) {
    // Skip the root line (e.g., "~/.openclaw/" or "/home/user/")
    const isRootLine = !line.includes('├') && !line.includes('└') && !line.includes('│');
    if (isRootLine && nodes.length === 0) {
      // This is the root — we'll use it as context but not add as a node
      continue;
    }

    const depth = getDepth(line);
    const rawName = line.replace(/^[│\s]*(├──|└──)\s*/, '').trim();
    const name = cleanName(rawName);

    if (!name) continue;

    const isDir = rawName.endsWith('/') || rawName.replace(/\s*\(.*?\)/, '').trim().endsWith('/');
    const cleanedName = name.replace(/\/$/, ''); // strip trailing slash for path building

    // Maintain path stack
    pathStack.splice(depth);
    const parentPath = pathStack.length > 0 ? pathStack[pathStack.length - 1] : '';
    const path = parentPath ? `${parentPath}/${cleanedName}` : cleanedName;

    if (isDir) {
      pathStack.push(path);
    }

    nodes.push({
      name: cleanedName,
      isDir,
      depth,
      parent: parentPath || undefined,
      path,
    });
  }

  return nodes;
}

/**
 * Extract skill count from a line like "skills/ (50+ installed)"
 */
function extractSkillCount(line: string): number {
  const match = line.match(/skills\/.*?\((\d+)\+?\s*installed\)/i);
  if (match) return parseInt(match[1], 10);
  return 0;
}

/**
 * Main parser: takes a raw directory tree string and returns an AgentMap.
 */
export function parseAgentTree(treeInput: string): AgentMap {
  const nodes = parseTreeString(treeInput);

  const workspace: WorkspaceFiles = {
    coreFiles: [],
    missingRecommended: [],
    memoryFiles: [],
    subagentProtocols: [],
    customFiles: [],
    projectDirs: [],
  };

  const agentIds: string[] = [];
  const skills: string[] = [];
  let hasConfig = false;
  let skillCount = 0;

  // Check for skill count in raw line
  const skillLine = treeInput.split('\n').find(l => /skills\//.test(l));
  if (skillLine) {
    skillCount = extractSkillCount(skillLine);
  }

  for (const node of nodes) {
    const { name, isDir, parent, path } = node;
    const nameLower = name.toLowerCase();
    const parentLower = (parent || '').toLowerCase();

    // openclaw.json
    if (nameLower === 'openclaw.json' && !parent) {
      hasConfig = true;
      continue;
    }
    if (nameLower === 'openclaw.json') {
      hasConfig = true;
      continue;
    }

    // Agents directory entries — direct children of agents/
    const cleanPath = path.toLowerCase().replace(/\/$/g, '');
    if (
      (parentLower === 'agents' || parentLower.endsWith('/agents') ||
       cleanPath.match(/^agents\/[^/]+$/) || cleanPath.match(/.*\/agents\/[^/]+$/)) &&
      isDir && nameLower.replace(/\/$/, '') !== 'agents'
    ) {
      agentIds.push(name.replace(/\/$/, ''));
      continue;
    }
    // Skip the agents directory itself and anything deeper inside agent subdirs
    if (nameLower.replace(/\/$/, '') === 'agents' && isDir) continue;
    if (cleanPath.match(/agents\/[^/]+\/.+/)) continue;

    // Skills
    if (name === 'skills' && isDir) {
      if (skillCount === 0) skillCount = 0; // will be updated from raw line
      continue;
    }
    if (parentLower.endsWith('skills') || parentLower.endsWith('skills/')) {
      if (isDir) skills.push(name);
      continue;
    }

    // Workspace files — check if file is inside workspace/ at any depth
    const inWorkspace =
      parentLower === 'workspace' ||
      parentLower.endsWith('/workspace') ||
      path.toLowerCase().startsWith('workspace/') ||
      path.toLowerCase().includes('/workspace/') ||
      parent === undefined; // top-level after root

    const pathLower = path.toLowerCase();

    const inMemory =
      parentLower.endsWith('memory') ||
      parentLower.endsWith('memory/') ||
      pathLower.includes('/memory/') ||
      pathLower.startsWith('memory/');

    const inSubagents =
      parentLower.endsWith('subagents') ||
      parentLower.endsWith('subagents/') ||
      pathLower.includes('/subagents/') ||
      pathLower.startsWith('subagents/');

    if (inMemory && !isDir && nameLower.endsWith('.md')) {
      workspace.memoryFiles.push(name);
      continue;
    }

    if (inSubagents && !isDir && nameLower.endsWith('.md')) {
      workspace.subagentProtocols.push(name);
      continue;
    }

    if (inWorkspace && !isDir) {
      const upper = name.toUpperCase();
      if (CORE_FILES.includes(upper) || CORE_FILES.includes(name)) {
        workspace.coreFiles.push(name);
      } else if (OPS_FILES.includes(upper) || OPS_FILES.includes(name)) {
        workspace.coreFiles.push(name); // still add to coreFiles for health check tracking
      } else if (RECOMMENDED_FILES.includes(upper) || RECOMMENDED_FILES.includes(name)) {
        workspace.coreFiles.push(name);
      } else {
        workspace.customFiles.push(name);
      }
    }

    if (inWorkspace && isDir) {
      const skip = ['memory', 'subagents', 'agents', 'skills'];
      if (!skip.includes(nameLower.replace('/', ''))) {
        workspace.projectDirs.push(name);
      }
    }
  }

  // Determine missing recommended files
  const foundUpper = workspace.coreFiles.map(f => f.toUpperCase().replace('/', ''));
  workspace.missingRecommended = RECOMMENDED_FILES.filter(
    r => !foundUpper.includes(r.toUpperCase())
  );

  // Build agent objects
  const agents: AgentInfo[] = agentIds.map(id => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    hasProtocol: workspace.subagentProtocols.some(p =>
      p.toLowerCase().includes(id.toLowerCase())
    ),
  }));

  return {
    hasConfig,
    workspace,
    agents,
    skills,
    skillCount: skillCount || skills.length,
    rawTree: treeInput,
  };
}
