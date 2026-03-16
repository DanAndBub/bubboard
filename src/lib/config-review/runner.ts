import { FileAnalysis, ReviewFinding, ReviewRule } from './types';
import { sizeRules } from './rules/size-rules';
import { truncationRules } from './rules/truncation-rules';
import { structureRules } from './rules/structure-rules';
import { contradictionRules } from './rules/contradiction-rules';
import { agentEditRules } from './rules/agent-edit-rules';

// ── Registry ─────────────────────────────────────────────────────────

const ALL_RULES: ReviewRule[] = [
  ...sizeRules,
  ...truncationRules,
  ...structureRules,
  ...contradictionRules,
  ...agentEditRules,
];

// ── Review Result ────────────────────────────────────────────────────

export interface ReviewResult {
  findings: ReviewFinding[];
  healthScore: number; // 0-100
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  filesAnalyzed: number;
  rulesExecuted: number;
}

// ── Health Score ──────────────────────────────────────────────────────

const PENALTY = {
  critical: 15,
  warning: 5,
  info: 0, // info findings don't penalize
} as const;

function calculateHealthScore(findings: ReviewFinding[]): number {
  let score = 100;
  for (const f of findings) {
    score -= PENALTY[f.severity];
  }
  return Math.max(0, Math.min(100, score));
}

// ── Runner ───────────────────────────────────────────────────────────

export function runReview(files: FileAnalysis[]): ReviewResult {
  const findings: ReviewFinding[] = [];
  let rulesExecuted = 0;

  for (const rule of ALL_RULES) {
    rulesExecuted++;
    try {
      const results = rule.check(files);
      findings.push(...results);
    } catch {
      // Rule failed — skip silently (don't crash the review)
    }
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    findings,
    healthScore: calculateHealthScore(findings),
    criticalCount: findings.filter(f => f.severity === 'critical').length,
    warningCount: findings.filter(f => f.severity === 'warning').length,
    infoCount: findings.filter(f => f.severity === 'info').length,
    filesAnalyzed: files.length,
    rulesExecuted,
  };
}
