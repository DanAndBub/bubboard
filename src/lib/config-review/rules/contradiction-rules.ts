import { ReviewRule, ReviewFinding, FileAnalysis } from '../types';

/**
 * Contradiction detection via keyword pair matching.
 * Each rule looks for BOTH sides of a potential conflict across files.
 * Conservative: requires strong evidence on both sides.
 */

interface ConflictPattern {
  id: string;
  name: string;
  description: string;
  sideA: { keywords: string[]; label: string };
  sideB: { keywords: string[]; label: string };
}

const CONFLICT_PATTERNS: ConflictPattern[] = [
  {
    id: 'CONTRA_ESCALATION',
    name: 'Conflicting escalation instructions',
    description: 'One file says to escalate/ask, another says to resolve independently',
    sideA: { keywords: ['always ask', 'always escalate', 'never self-resolve', 'stop and ask', 'ask before'], label: 'escalate/ask' },
    sideB: { keywords: ['resolve independently', 'don\'t ask', 'handle it yourself', 'never ask', 'figure it out', 'resourceful before asking'], label: 'self-resolve' },
  },
  {
    id: 'CONTRA_DELEGATION_THRESHOLD',
    name: 'Conflicting delegation thresholds',
    description: 'Different files give different rules for when to delegate vs do directly',
    sideA: { keywords: ['always delegate', 'never code directly', 'never write code'], label: 'always delegate' },
    sideB: { keywords: ['do it yourself', 'bub direct', 'handle directly', 'don\'t delegate'], label: 'do directly' },
  },
  {
    id: 'CONTRA_ALWAYS_NEVER',
    name: 'Contradicting always/never instructions',
    description: 'Same action described as both required and forbidden',
    sideA: { keywords: ['always verbose', 'always explain', 'always narrate'], label: 'always verbose' },
    sideB: { keywords: ['never verbose', 'never explain', 'never narrate', 'concise', 'don\'t narrate'], label: 'never verbose' },
  },
];

function findMatches(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()));
}

function checkConflictPattern(
  files: FileAnalysis[],
  pattern: ConflictPattern,
): ReviewFinding | null {
  const sideAMatches: { file: string; keywords: string[] }[] = [];
  const sideBMatches: { file: string; keywords: string[] }[] = [];

  for (const f of files) {
    const aHits = findMatches(f.content, pattern.sideA.keywords);
    const bHits = findMatches(f.content, pattern.sideB.keywords);
    if (aHits.length > 0) sideAMatches.push({ file: f.path, keywords: aHits });
    if (bHits.length > 0) sideBMatches.push({ file: f.path, keywords: bHits });
  }

  // Only fire if both sides found (can be same or different files)
  if (sideAMatches.length === 0 || sideBMatches.length === 0) return null;

  const aFiles = sideAMatches.map(m => m.file).join(', ');
  const bFiles = sideBMatches.map(m => m.file).join(', ');
  const aKeyword = sideAMatches[0].keywords[0];
  const bKeyword = sideBMatches[0].keywords[0];

  return {
    ruleId: pattern.id,
    severity: 'warning',
    category: 'contradiction',
    file: `${aFiles} ↔ ${bFiles}`,
    message: `Potential contradiction: "${aKeyword}" (${pattern.sideA.label}, in ${aFiles}) conflicts with "${bKeyword}" (${pattern.sideB.label}, in ${bFiles}).`,
    recommendation: `Review both instructions. Your agent sees all bootstrap files together — contradictions cause unpredictable behavior. Pick one approach and remove the other.`,
  };
}

// ── Duplicate rule detection ─────────────────────────────────────────

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function findDuplicateParagraphs(files: FileAnalysis[]): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const MIN_CHARS = 30;
  const SIMILARITY_THRESHOLD = 0.80;

  // Collect all paragraphs across files
  const paragraphs: { file: string; text: string; words: Set<string> }[] = [];
  for (const f of files) {
    const blocks = f.content.split(/\n\s*\n/).map(b => b.trim()).filter(b => b.length >= MIN_CHARS);
    for (const block of blocks) {
      paragraphs.push({
        file: f.path,
        text: block,
        words: new Set(block.toLowerCase().split(/\s+/)),
      });
    }
  }

  // Compare across different files only
  const seen = new Set<string>();
  for (let i = 0; i < paragraphs.length; i++) {
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (paragraphs[i].file === paragraphs[j].file) continue;
      const key = `${i}-${j}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const sim = jaccard(paragraphs[i].words, paragraphs[j].words);
      if (sim >= SIMILARITY_THRESHOLD) {
        const preview = paragraphs[i].text.slice(0, 80) + (paragraphs[i].text.length > 80 ? '…' : '');
        findings.push({
          ruleId: 'CONTRA_DUPLICATE_RULES',
          severity: 'info',
          category: 'duplication',
          file: `${paragraphs[i].file} ↔ ${paragraphs[j].file}`,
          message: `Near-duplicate content (${Math.round(sim * 100)}% similar) found across files: "${preview}"`,
          recommendation: 'Duplicated instructions waste tokens and can drift apart over time. Keep the canonical version in one file and reference it from others.',
        });
      }
    }
  }

  return findings;
}

export const contradictionRules: ReviewRule[] = [
  ...CONFLICT_PATTERNS.map((pattern): ReviewRule => ({
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    targetFiles: '*',
    severity: 'warning',
    category: 'contradiction',
    check(files) {
      const finding = checkConflictPattern(files, pattern);
      return finding ? [finding] : [];
    },
  })),
  {
    id: 'CONTRA_DUPLICATE_RULES',
    name: 'Duplicate content across files',
    description: 'Similar paragraphs in different bootstrap files waste tokens',
    targetFiles: '*',
    severity: 'info',
    category: 'duplication',
    check: findDuplicateParagraphs,
  },
];
