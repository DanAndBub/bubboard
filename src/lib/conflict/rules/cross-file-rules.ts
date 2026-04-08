import { findMatches } from '../helpers';
import type { ConflictRule, ConflictFinding, FileAnalysis } from '../types';

// ── Conflict Patterns ─────────────────────────────────────────────────

interface CrossFilePattern {
  id: string;
  name: string;
  description: string;
  sideA: { keywords: string[]; label: string };
  sideB: { keywords: string[]; label: string };
}

const CROSS_FILE_PATTERNS: CrossFilePattern[] = [
  {
    id: 'CROSS_ESCALATION',
    name: 'Conflicting escalation instructions',
    description: 'One context says to escalate/ask, another says to resolve independently',
    sideA: { keywords: ['always ask', 'always escalate', 'never self-resolve', 'stop and ask', 'ask before'], label: 'escalate/ask' },
    sideB: { keywords: ['resolve independently', "don't ask", 'handle it yourself', 'never ask', 'figure it out', 'resourceful before asking'], label: 'self-resolve' },
  },
  {
    id: 'CROSS_DELEGATION',
    name: 'Conflicting delegation thresholds',
    description: 'Different instructions for when to delegate vs do directly',
    sideA: { keywords: ['always delegate', 'never code directly', 'never write code'], label: 'always delegate' },
    sideB: { keywords: ['do it yourself', 'handle directly', "don't delegate", 'code directly'], label: 'do directly' },
  },
  {
    id: 'CROSS_VERBOSITY',
    name: 'Conflicting verbosity instructions',
    description: 'Some instructions demand verbosity, others demand conciseness',
    sideA: { keywords: ['always verbose', 'always explain', 'always narrate', 'detailed explanations'], label: 'verbose' },
    sideB: { keywords: ['never verbose', 'never explain', 'never narrate', 'concise', "don't narrate", 'brief'], label: 'concise' },
  },
  {
    id: 'CROSS_PERMISSION',
    name: 'Conflicting permission scope',
    description: 'One file grants unrestricted access, another restricts it',
    sideA: { keywords: ['full access', 'unrestricted', 'no limits', 'any file'], label: 'unrestricted' },
    sideB: { keywords: ['restricted', 'only modify', 'do not touch', 'off limits', 'never modify'], label: 'restricted' },
  },
  {
    id: 'CROSS_STYLE',
    name: 'Conflicting communication style',
    description: 'Instructions conflict on formal vs casual tone',
    sideA: { keywords: ['formal tone', 'professional language', 'no slang'], label: 'formal' },
    sideB: { keywords: ['casual tone', 'conversational', 'friendly', 'use slang'], label: 'casual' },
  },
  {
    id: 'CROSS_ERROR_HANDLING',
    name: 'Conflicting error handling',
    description: 'One instruction says stop on error, another says continue',
    sideA: { keywords: ['stop on error', 'halt on failure', 'never continue after error'], label: 'stop on error' },
    sideB: { keywords: ['continue on error', 'skip failures', 'best effort', 'ignore errors'], label: 'continue on error' },
  },
  {
    id: 'CROSS_TOOL_PREFERENCE',
    name: 'Conflicting tool preferences',
    description: 'Instructions conflict on which tools to use',
    sideA: { keywords: ['always use grep', 'prefer grep', 'use rg'], label: 'grep/rg' },
    sideB: { keywords: ['never use grep', 'avoid grep', 'use find'], label: 'avoid grep' },
  },
];

// ── Pattern Checker ───────────────────────────────────────────────────

function checkCrossFilePattern(
  files: FileAnalysis[],
  pattern: CrossFilePattern,
): ConflictFinding | null {
  const sideAMatches: { file: string; keywords: string[] }[] = [];
  const sideBMatches: { file: string; keywords: string[] }[] = [];

  for (const f of files) {
    const aHits = findMatches(f.content, pattern.sideA.keywords);
    const bHits = findMatches(f.content, pattern.sideB.keywords);
    if (aHits.length > 0) sideAMatches.push({ file: f.path, keywords: aHits });
    if (bHits.length > 0) sideBMatches.push({ file: f.path, keywords: bHits });
  }

  // Only fire if both sides found
  if (sideAMatches.length === 0 || sideBMatches.length === 0) return null;

  // If both sides are found only within the same single file, skip — that's within-file's job
  const aFileSet = new Set(sideAMatches.map(m => m.file));
  const bFileSet = new Set(sideBMatches.map(m => m.file));
  const allSameFile = [...aFileSet].every(f => bFileSet.has(f)) && aFileSet.size === 1 && bFileSet.size === 1;
  if (allSameFile) return null;

  const aFiles = [...aFileSet].join(', ');
  const bFiles = [...bFileSet].join(', ');
  const aKeyword = sideAMatches[0].keywords[0];
  const bKeyword = sideBMatches[0].keywords[0];

  const allFiles = [...new Set([...aFileSet, ...bFileSet])];

  return {
    ruleId: pattern.id,
    severity: 'warning',
    category: 'cross-file',
    files: allFiles,
    message: `Cross-file conflict: "${aKeyword}" (${pattern.sideA.label}, in ${aFiles}) conflicts with "${bKeyword}" (${pattern.sideB.label}, in ${bFiles}).`,
    conflictingPhrases: [aKeyword, bKeyword],
    recommendation: `Review both instructions. Your agent sees all bootstrap files together — contradictions cause unpredictable behavior. Pick one approach and remove the other.`,
  };
}

// ── Export ────────────────────────────────────────────────────────────

export const crossFileRules: ConflictRule[] = CROSS_FILE_PATTERNS.map(
  (pattern): ConflictRule => ({
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    category: 'cross-file',
    severity: 'warning',
    check(files: FileAnalysis[]): ConflictFinding[] {
      const finding = checkCrossFilePattern(files, pattern);
      return finding ? [finding] : [];
    },
  }),
);
