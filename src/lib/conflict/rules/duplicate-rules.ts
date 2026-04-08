import { jaccard } from '../helpers';
import type { ConflictRule, ConflictFinding, FileAnalysis } from '../types';

// ── Near-duplicate paragraph detection ───────────────────────────────

const MIN_CHARS = 30;
const SIMILARITY_THRESHOLD = 0.80;

function findNearDuplicates(files: FileAnalysis[]): ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  // Collect all paragraphs across files
  const paragraphs: { file: string; text: string; words: Set<string> }[] = [];
  for (const f of files) {
    const blocks = f.content
      .split(/\n\s*\n/)
      .map(b => b.trim())
      .filter(b => b.length >= MIN_CHARS);
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
        const preview =
          paragraphs[i].text.slice(0, 80) + (paragraphs[i].text.length > 80 ? '…' : '');
        findings.push({
          ruleId: 'DUP_NEAR_IDENTICAL',
          severity: 'info',
          category: 'duplicate',
          files: [paragraphs[i].file, paragraphs[j].file],
          message: `Near-duplicate content (${Math.round(sim * 100)}% similar) across files: "${preview}"`,
          conflictingPhrases: [preview],
          recommendation: `Duplicated instructions waste tokens and can drift apart over time. Keep the canonical version in one file and reference it from others.`,
        });
      }
    }
  }

  return findings;
}

// ── Export ────────────────────────────────────────────────────────────

export const duplicateRules: ConflictRule[] = [
  {
    id: 'DUP_NEAR_IDENTICAL',
    name: 'Near-duplicate content across files',
    description: 'Similar paragraphs in different bootstrap files (Jaccard >= 0.80)',
    category: 'duplicate',
    severity: 'info',
    check: findNearDuplicates,
  },
];
