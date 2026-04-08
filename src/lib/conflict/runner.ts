import type { FileAnalysis } from '@/lib/config-review/types';
import type { ConflictFinding, ConflictResult, ConflictRule } from './types';
import { structuralRules } from './rules/structural-rules';
import { crossFileRules } from './rules/cross-file-rules';
import { withinFileRules } from './rules/within-file-rules';
import { duplicateRules } from './rules/duplicate-rules';

// ── Rule Registry ─────────────────────────────────────────────────────

const ALL_RULES: ConflictRule[] = [
  ...structuralRules,
  ...crossFileRules,
  ...withinFileRules,
  ...duplicateRules,
];

// ── Runner ────────────────────────────────────────────────────────────

export function runConflict(files: FileAnalysis[]): ConflictResult {
  const findings: ConflictFinding[] = [];
  let rulesExecuted = 0;

  for (const rule of ALL_RULES) {
    rulesExecuted++;
    try {
      const results = rule.check(files);
      findings.push(...results);
    } catch {
      // Rule failed — skip silently, don't crash the scan
    }
  }

  // Sort: critical first, then warning, then info
  const order: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const structuralCount = findings.filter(f => f.category === 'structural').length;
  const crossFileCount = findings.filter(f => f.category === 'cross-file').length;
  const withinFileCount = findings.filter(f => f.category === 'within-file').length;
  const duplicateCount = findings.filter(f => f.category === 'duplicate').length;

  return {
    findings,
    structuralCount,
    crossFileCount,
    withinFileCount,
    duplicateCount,
    totalCount: findings.length,
    filesAnalyzed: files.length,
    rulesExecuted,
  };
}
