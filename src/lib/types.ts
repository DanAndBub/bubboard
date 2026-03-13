export interface AgentInfo {
  id: string;
  name: string;
  model?: string;
  role?: string;
  hasProtocol?: boolean;
  reportsTo?: string;
}

export interface WorkspaceFiles {
  coreFiles: string[];
  missingRecommended: string[];
  memoryFiles: string[];
  subagentProtocols: string[];
  customFiles: string[];
  projectDirs: string[];
}

export interface ConfigInfo {
  models: { id: string; provider: string; alias?: string }[];
  agents: { id: string; model: string; role?: string; provider?: string }[];
  heartbeat: { enabled: boolean; model?: string; interval?: string };
  channels: string[];
}

export interface AgentsMdInfo {
  delegationRules: string[];
  referencedSkills: string[];
  referencedAgents: string[];
}

export interface AgentMap {
  hasConfig: boolean;
  workspace: WorkspaceFiles;
  agents: AgentInfo[];
  skills: string[];
  skillCount: number;
  config?: ConfigInfo;
  agentsMd?: AgentsMdInfo;
  rawTree?: string;
}

export interface HealthItem {
  id: string;
  label: string;
  description: string;
  status: 'ok' | 'missing' | 'warning';
  recommendation?: string;
}

export interface HealthReport {
  items: HealthItem[];
  score: number;
  maxScore: number;
}

export interface FileCardData {
  name: string;
  category: 'core' | 'operations' | 'protocols' | 'memory' | 'custom';
  present: boolean;
  content?: string;
}

export interface StatsData {
  totalFiles: number;
  agentCount: number;
  memoryEntries: number;
  skillCount: number;
  score: number;
  maxScore: number;
}
