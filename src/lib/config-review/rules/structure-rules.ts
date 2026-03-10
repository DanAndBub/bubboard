import { ReviewRule, ReviewFinding, FileAnalysis } from '../types';

function findFile(files: FileAnalysis[], name: string): FileAnalysis | undefined {
  return files.find(f => f.path.toUpperCase().endsWith(name.toUpperCase()));
}

function hasKeyword(content: string, keywords: string[]): boolean {
  const lower = content.toLowerCase();
  return keywords.some(k => lower.includes(k.toLowerCase()));
}

function structureCheck(
  file: FileAnalysis | undefined,
  fileName: string,
  ruleId: string,
  keywords: string[],
  sectionName: string,
): ReviewFinding | null {
  if (!file) return null;
  if (hasKeyword(file.content, keywords)) return null;
  return {
    ruleId,
    severity: 'warning',
    category: 'structure',
    file: file.path,
    message: `${fileName} is missing a ${sectionName} section. Looked for keywords: ${keywords.map(k => `"${k}"`).join(', ')}.`,
    recommendation: `Add a ${sectionName} section to ${fileName}. This helps your agent understand ${sectionName.toLowerCase()} expectations.`,
  };
}

export const structureRules: ReviewRule[] = [
  {
    id: 'STRUCT_NO_HEADINGS',
    name: 'No headings found',
    description: 'File has no markdown headings — likely unstructured',
    targetFiles: '*',
    severity: 'info',
    category: 'structure',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        if (!f.path.toLowerCase().endsWith('.md')) continue;
        if (f.charCount < 100) continue; // too short to need headings
        if (f.headings.length === 0) {
          findings.push({
            ruleId: 'STRUCT_NO_HEADINGS',
            severity: 'info',
            category: 'structure',
            file: f.path,
            message: `${f.path} has ${f.charCount.toLocaleString()} characters but no markdown headings. Unstructured files are harder for agents to navigate.`,
            recommendation: 'Add ## headings to organize the content into scannable sections.',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'STRUCT_SOUL_IDENTITY',
    name: 'SOUL.md missing identity section',
    description: 'SOUL.md should define agent voice/personality',
    targetFiles: ['SOUL.md'],
    severity: 'warning',
    category: 'structure',
    check(files) {
      const f = structureCheck(
        findFile(files, 'SOUL.md'), 'SOUL.md', 'STRUCT_SOUL_IDENTITY',
        ['voice', 'tone', 'personality', 'identity', 'who i am', 'character'],
        'identity/voice',
      );
      return f ? [f] : [];
    },
  },
  {
    id: 'STRUCT_SOUL_BEHAVIOR',
    name: 'SOUL.md missing behavioral guidelines',
    description: 'SOUL.md should define what the agent does/doesn\'t do',
    targetFiles: ['SOUL.md'],
    severity: 'warning',
    category: 'structure',
    check(files) {
      const f = structureCheck(
        findFile(files, 'SOUL.md'), 'SOUL.md', 'STRUCT_SOUL_BEHAVIOR',
        ['anti-pattern', 'never', 'always', 'don\'t', 'boundaries', 'not allowed', 'behavior'],
        'behavioral guidelines',
      );
      return f ? [f] : [];
    },
  },
  {
    id: 'STRUCT_AGENTS_DELEGATION',
    name: 'AGENTS.md missing delegation rules',
    description: 'AGENTS.md should define how tasks are delegated',
    targetFiles: ['AGENTS.md'],
    severity: 'warning',
    category: 'structure',
    check(files) {
      const f = structureCheck(
        findFile(files, 'AGENTS.md'), 'AGENTS.md', 'STRUCT_AGENTS_DELEGATION',
        ['delegat', 'route', 'assign', 'handoff', 'escalat', 'subagent', 'spawn'],
        'delegation',
      );
      return f ? [f] : [];
    },
  },
  {
    id: 'STRUCT_AGENTS_MEMORY',
    name: 'AGENTS.md missing memory protocol',
    description: 'AGENTS.md should define memory/continuity strategy',
    targetFiles: ['AGENTS.md'],
    severity: 'info',
    category: 'structure',
    check(files) {
      const f = structureCheck(
        findFile(files, 'AGENTS.md'), 'AGENTS.md', 'STRUCT_AGENTS_MEMORY',
        ['memory', 'continuity', 'state.json', 'daily note', 'MEMORY.md', 'persist'],
        'memory/continuity',
      );
      return f ? [f] : [];
    },
  },
  {
    id: 'STRUCT_HEARTBEAT_CADENCE',
    name: 'HEARTBEAT.md missing cadence',
    description: 'HEARTBEAT.md should define check-in frequency',
    targetFiles: ['HEARTBEAT.md'],
    severity: 'info',
    category: 'structure',
    check(files) {
      const f = structureCheck(
        findFile(files, 'HEARTBEAT.md'), 'HEARTBEAT.md', 'STRUCT_HEARTBEAT_CADENCE',
        ['heartbeat', 'cadence', 'schedule', 'every', 'interval', 'quiet period', 'check-in'],
        'cadence/scheduling',
      );
      return f ? [f] : [];
    },
  },
];
