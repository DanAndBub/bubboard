import { parseSections } from '../helpers';
import type { ConflictRule, ConflictFinding, FileAnalysis } from '../types';

// ── Constants ─────────────────────────────────────────────────────────

const AGENT_ACTION_KEYWORDS = ['delegate', 'route', 'assign', 'spawn', 'subagent', 'sub-agent', 'escalate'];

const MODEL_PATTERNS = ['claude-opus', 'claude-sonnet', 'claude-haiku', 'gpt-4', 'gpt-3', 'gemini', 'deepseek'];
const ASSIGNMENT_INDICATORS = ['|', '=', 'model:', 'use ', 'assigned', 'agent'];

function getFileBasename(filePath: string): string {
  return filePath.split('/').pop()?.toUpperCase() ?? '';
}

// ── Rule 1: Multi-agent hierarchy note ───────────────────────────────
// Emits ONE informational finding if AGENTS.md contains multi-agent indicators.
// Does NOT scan other files — the main agent reads all bootstrap files by design.

function checkSubagentVisibility(files: FileAnalysis[]): ConflictFinding[] {
  const agentsFile = files.find(f => getFileBasename(f.path) === 'AGENTS.MD');
  if (!agentsFile) return [];

  const content = agentsFile.content.toLowerCase();
  const hasMultiAgent = AGENT_ACTION_KEYWORDS.some(kw => content.includes(kw));
  if (!hasMultiAgent) return [];

  return [{
    ruleId: 'STRUCT_SUBAGENT_VISIBILITY',
    severity: 'info',
    category: 'structural',
    files: [agentsFile.path],
    message: 'Multi-agent hierarchy detected in AGENTS.md. Subagents only access certain bootstrap files — confirm you have dedicated protocol files for subagent-specific instructions.',
    conflictingPhrases: [],
    recommendation: 'Create dedicated protocol files (e.g. CODER_PROTOCOL.md, SONNET_PROTOCOL.md) to keep subagent instructions separate from main-agent bootstrap files.',
  }];
}

// ── Rule 2: Compaction Survival — Structural Position Only ────────────
// Checks that Session Startup exists (and is first) and Red Lines exists (and is last).
// Does NOT scan content for imperatives.

function checkCompactionRisk(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const agentsFile = files.find(f => getFileBasename(f.path) === 'AGENTS.MD');
  if (!agentsFile) return findings;

  // Use H2-only section names for position checks — H1 is a title, not a section
  const h2Sections = agentsFile.content
    .split('\n')
    .filter(l => /^##\s+/.test(l))
    .map(l => l.replace(/^##\s+/, '').trim());
  const sectionNames = h2Sections.length > 0 ? h2Sections : [...parseSections(agentsFile.content).keys()].filter(k => k !== '__preamble__');

  const hasSessionStartup = sectionNames.some(s => s.toLowerCase() === 'session startup');
  const hasRedLines = sectionNames.some(s => s.toLowerCase() === 'red lines');

  const firstSection = sectionNames[0];
  const lastSection = sectionNames[sectionNames.length - 1];

  if (!hasSessionStartup) {
    findings.push({
      ruleId: 'STRUCT_COMPACTION_RISK',
      severity: 'warning',
      category: 'structural',
      files: [agentsFile.path],
      message: 'AGENTS.md is missing a "## Session Startup" section. Instructions here are reliably preserved during context compaction.',
      conflictingPhrases: [],
      recommendation: 'Add "## Session Startup" as the first section in AGENTS.md.',
    });
  } else if (firstSection?.toLowerCase() !== 'session startup') {
    findings.push({
      ruleId: 'STRUCT_COMPACTION_RISK',
      severity: 'warning',
      category: 'structural',
      files: [agentsFile.path],
      message: `"## Session Startup" should be the first section in AGENTS.md but appears after "## ${firstSection}".`,
      conflictingPhrases: [],
      recommendation: 'Move "## Session Startup" to the top of AGENTS.md.',
    });
  }

  if (!hasRedLines) {
    findings.push({
      ruleId: 'STRUCT_COMPACTION_RISK',
      severity: 'warning',
      category: 'structural',
      files: [agentsFile.path],
      message: 'AGENTS.md is missing a "## Red Lines" section. This section anchors hard constraints at the end of the file.',
      conflictingPhrases: [],
      recommendation: 'Add "## Red Lines" as the last section in AGENTS.md.',
    });
  } else if (lastSection?.toLowerCase() !== 'red lines') {
    findings.push({
      ruleId: 'STRUCT_COMPACTION_RISK',
      severity: 'warning',
      category: 'structural',
      files: [agentsFile.path],
      message: `"## Red Lines" should be the last section in AGENTS.md but appears before "## ${lastSection}".`,
      conflictingPhrases: [],
      recommendation: 'Move "## Red Lines" to the end of AGENTS.md.',
    });
  }

  return findings;
}

// ── Rule 3: Model Assignment Conflicts ───────────────────────────────

interface ModelAssignment {
  file: string;
  model: string;
  line: string;
  sectionContext: string;
}

function checkModelAssignment(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const assignments: ModelAssignment[] = [];

  for (const file of files) {
    const sections = parseSections(file.content);

    for (const [sectionName, sectionContent] of sections) {
      const lines = sectionContent.split('\n');
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        const foundModel = MODEL_PATTERNS.find(m => lineLower.includes(m));
        if (!foundModel) continue;
        const hasAssignmentIndicator = ASSIGNMENT_INDICATORS.some(ind => lineLower.includes(ind));
        if (!hasAssignmentIndicator) continue;

        assignments.push({
          file: file.path,
          model: foundModel,
          line: line.trim(),
          sectionContext: sectionName.toLowerCase(),
        });
      }
    }
  }

  const byContext = new Map<string, ModelAssignment[]>();
  for (const a of assignments) {
    const existing = byContext.get(a.sectionContext) ?? [];
    existing.push(a);
    byContext.set(a.sectionContext, existing);
  }

  for (const [context, group] of byContext) {
    const models = new Set(group.map(a => a.model));
    if (models.size <= 1) continue;

    const fileSet = [...new Set(group.map(a => a.file))];
    if (fileSet.length < 2) continue;

    findings.push({
      ruleId: 'STRUCT_MODEL_ASSIGNMENT',
      severity: 'warning',
      category: 'structural',
      files: fileSet,
      message: `Conflicting model assignments in section context "${context}": ${[...models].join(' vs ')}`,
      conflictingPhrases: [...models],
      recommendation: `Different files assign different models to the same role. Standardize in one canonical file.`,
    });
  }

  return findings;
}

// ── Export ────────────────────────────────────────────────────────────

export const structuralRules: ConflictRule[] = [
  {
    id: 'STRUCT_SUBAGENT_VISIBILITY',
    name: 'Multi-agent hierarchy note',
    description: 'Single informational note when AGENTS.md contains multi-agent configuration',
    category: 'structural',
    severity: 'info',
    check: checkSubagentVisibility,
  },
  {
    id: 'STRUCT_COMPACTION_RISK',
    name: 'Compaction survival structure',
    description: 'Session Startup and Red Lines section existence and position in AGENTS.md',
    category: 'structural',
    severity: 'warning',
    check: checkCompactionRisk,
  },
  {
    id: 'STRUCT_MODEL_ASSIGNMENT',
    name: 'Model assignment conflict',
    description: 'Different model assignments for the same role across files',
    category: 'structural',
    severity: 'warning',
    check: checkModelAssignment,
  },
];
