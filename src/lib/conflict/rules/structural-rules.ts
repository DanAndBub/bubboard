import { SUBAGENT_BOOTSTRAP_FILES } from '@/lib/config-review/thresholds';
import { findMatches, parseSections } from '../helpers';
import type { ConflictRule, ConflictFinding, FileAnalysis } from '../types';

// ── Constants ─────────────────────────────────────────────────────────

const SUBAGENT_VISIBLE = new Set(SUBAGENT_BOOTSTRAP_FILES.map(f => f.toUpperCase()));

const IMPERATIVE_PHRASES = ['always', 'never', 'must', 'do not', "don't", 'should', 'shall'];
const AGENT_ACTION_KEYWORDS = ['delegate', 'route', 'assign', 'spawn', 'subagent', 'escalate', 'tool', 'model'];
const SAFE_SECTIONS = ['session startup', 'red lines'];

const MODEL_PATTERNS = ['claude-opus', 'claude-sonnet', 'claude-haiku', 'gpt-4', 'gpt-3', 'gemini', 'deepseek'];
const ASSIGNMENT_INDICATORS = ['|', '=', 'model:', 'use ', 'assigned', 'agent'];

function getFileBasename(filePath: string): string {
  return filePath.split('/').pop()?.toUpperCase() ?? '';
}

function isSubagentHidden(filePath: string): boolean {
  return !SUBAGENT_VISIBLE.has(getFileBasename(filePath));
}

// ── Rule 1: Subagent Visibility ───────────────────────────────────────

function checkSubagentVisibility(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  for (const file of files) {
    if (!isSubagentHidden(file.path)) continue;

    const lines = file.content.split('\n');
    for (const line of lines) {
      const imperativeMatches = findMatches(line, IMPERATIVE_PHRASES);
      const actionMatches = findMatches(line, AGENT_ACTION_KEYWORDS);
      const allMatches = [...imperativeMatches, ...actionMatches];

      if (allMatches.length > 0) {
        findings.push({
          ruleId: 'STRUCT_SUBAGENT_VISIBILITY',
          severity: 'warning',
          category: 'structural',
          files: [file.path],
          message: `Instruction in "${file.path}" is invisible to subagents: "${line.trim().slice(0, 80)}"`,
          conflictingPhrases: allMatches,
          recommendation: `This file is not injected in subagent sessions. Move agent-critical instructions to a subagent-visible file (AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, or USER.md).`,
        });
      }
    }
  }

  return findings;
}

// ── Rule 2: Compaction Survival Risk ─────────────────────────────────

function checkCompactionRisk(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const agentsFile = files.find(f => getFileBasename(f.path) === 'AGENTS.MD');
  if (!agentsFile) return findings;

  const sections = parseSections(agentsFile.content);

  for (const [sectionName, sectionContent] of sections) {
    if (sectionName === '__preamble__') continue;
    if (SAFE_SECTIONS.includes(sectionName.toLowerCase())) continue;

    const lines = sectionContent.split('\n');
    for (const line of lines) {
      const matches = findMatches(line, IMPERATIVE_PHRASES);
      if (matches.length > 0 && line.trim().length > 0) {
        findings.push({
          ruleId: 'STRUCT_COMPACTION_RISK',
          severity: 'warning',
          category: 'structural',
          files: [agentsFile.path],
          message: `Imperative instruction in AGENTS.md section "## ${sectionName}" risks being lost during context compaction: "${line.trim().slice(0, 80)}"`,
          conflictingPhrases: matches,
          recommendation: `Move critical imperatives to "## Session Startup" or "## Red Lines" — these sections survive compaction. Content in other sections may be summarized away.`,
        });
      }
    }
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

  // Group by section context, find conflicts (different models in the same role context)
  const byContext = new Map<string, ModelAssignment[]>();
  for (const a of assignments) {
    const existing = byContext.get(a.sectionContext) ?? [];
    existing.push(a);
    byContext.set(a.sectionContext, existing);
  }

  for (const [context, group] of byContext) {
    const models = new Set(group.map(a => a.model));
    if (models.size <= 1) continue;

    // Multiple different models assigned in the same role context across files
    const fileSet = [...new Set(group.map(a => a.file))];
    if (fileSet.length < 2) continue; // same file contradicting itself — skip (that's within-file)

    findings.push({
      ruleId: 'STRUCT_MODEL_ASSIGNMENT',
      severity: 'warning',
      category: 'structural',
      files: fileSet,
      message: `Conflicting model assignments in section context "${context}": ${[...models].join(' vs ')}`,
      conflictingPhrases: [...models],
      recommendation: `Different files assign different models to the same role. Standardize the model assignment in one canonical file to prevent agent misconfiguration.`,
    });
  }

  return findings;
}

// ── Export ────────────────────────────────────────────────────────────

export const structuralRules: ConflictRule[] = [
  {
    id: 'STRUCT_SUBAGENT_VISIBILITY',
    name: 'Subagent visibility gap',
    description: 'Agent-critical instructions in files not visible to subagents',
    category: 'structural',
    severity: 'warning',
    check: checkSubagentVisibility,
  },
  {
    id: 'STRUCT_COMPACTION_RISK',
    name: 'Compaction survival risk',
    description: 'Imperative instructions in AGENTS.md outside safe sections',
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
