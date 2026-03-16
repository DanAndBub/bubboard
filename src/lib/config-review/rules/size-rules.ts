import { ReviewRule, ReviewFinding, FileAnalysis } from '../types';
import { getFileThreshold, BUDGET_WARNING, BUDGET_CRITICAL, SOUL_MIN_CHARS } from '../thresholds';
import { calculateBudget } from '../budget';

function sizeCheck(
  file: FileAnalysis,
  severity: 'warning' | 'critical',
  threshold: number,
): ReviewFinding | null {
  if (file.charCount <= threshold) return null;
  const over = file.charCount - threshold;
  const tokens = Math.ceil(over / 4);
  return {
    ruleId: `SIZE_${file.path.split('/').pop()?.replace('.', '_').toUpperCase()}_${severity.toUpperCase()}`,
    severity,
    category: 'size',
    file: file.path,
    message: `${file.path} is ${file.charCount.toLocaleString()} characters — ${over.toLocaleString()} over the ${threshold.toLocaleString()}-character ${severity === 'critical' ? 'critical' : 'recommended'} limit. That's ~${tokens.toLocaleString()} extra tokens injected every message.`,
    recommendation: severity === 'critical'
      ? `This file is critically large. Audit every section — remove anything that doesn't change agent behavior. Target under ${getFileThreshold(file.path).recommended.toLocaleString()} characters.`
      : `Review and trim. Every line in bootstrap files costs tokens on every message. Target under ${getFileThreshold(file.path).recommended.toLocaleString()} characters.`,
    charCount: file.charCount,
    threshold,
  };
}

export const sizeRules: ReviewRule[] = [
  {
    id: 'SIZE_FILE_WARN',
    name: 'File size warning',
    description: 'File exceeds recommended size',
    targetFiles: '*',
    severity: 'warning',
    category: 'size',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const t = getFileThreshold(f.path);
        const finding = sizeCheck(f, 'warning', t.warning);
        if (finding) {
          // Only emit warning if not also critical
          if (f.charCount <= t.critical) findings.push(finding);
        }
      }
      return findings;
    },
  },
  {
    id: 'SIZE_FILE_CRIT',
    name: 'File size critical',
    description: 'File exceeds critical size threshold',
    targetFiles: '*',
    severity: 'critical',
    category: 'size',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const t = getFileThreshold(f.path);
        const finding = sizeCheck(f, 'critical', t.critical);
        if (finding) findings.push(finding);
      }
      return findings;
    },
  },
  {
    id: 'SIZE_SOUL_SHORT',
    name: 'SOUL.md too short',
    description: 'SOUL.md exists but is very short — may lack substance',
    targetFiles: ['SOUL.md'],
    severity: 'info',
    category: 'size',
    check(files) {
      const soul = files.find(f => f.path.toUpperCase().endsWith('SOUL.MD'));
      if (!soul || soul.charCount >= SOUL_MIN_CHARS) return [];
      return [{
        ruleId: 'SIZE_SOUL_SHORT',
        severity: 'info',
        category: 'size',
        file: soul.path,
        message: `SOUL.md is only ${soul.charCount} characters. A well-defined personality typically needs at least ${SOUL_MIN_CHARS} characters to meaningfully shape agent behavior.`,
        recommendation: 'Add voice, tone, anti-patterns, and behavioral guidelines. A thin SOUL.md means your agent defaults to generic assistant behavior.',
        charCount: soul.charCount,
        threshold: SOUL_MIN_CHARS,
      }];
    },
  },
  {
    id: 'BUDGET_CHECK',
    name: 'Bootstrap budget',
    description: 'Total bootstrap file size vs recommended budget',
    targetFiles: '*',
    severity: 'warning',
    category: 'size',
    check(files) {
      const budget = calculateBudget(files);
      const findings: ReviewFinding[] = [];

      if (budget.totalChars > BUDGET_CRITICAL) {
        findings.push({
          ruleId: 'BUDGET_CRIT',
          severity: 'critical',
          category: 'size',
          file: '(all bootstrap files)',
          message: `Total bootstrap size is ${budget.totalChars.toLocaleString()} characters — ${budget.overBudgetBy.toLocaleString()} over the ${BUDGET_CRITICAL.toLocaleString()}-character critical limit. That's ~${Math.ceil(budget.totalChars / 4).toLocaleString()} tokens injected per message.`,
          recommendation: 'Aggressively trim all bootstrap files. Consider moving reference material to on-demand files that aren\'t auto-loaded.',
          charCount: budget.totalChars,
          threshold: BUDGET_CRITICAL,
        });
      } else if (budget.totalChars > BUDGET_WARNING) {
        findings.push({
          ruleId: 'BUDGET_WARN',
          severity: 'warning',
          category: 'size',
          file: '(all bootstrap files)',
          message: `Total bootstrap size is ${budget.totalChars.toLocaleString()} characters — ${budget.overBudgetBy.toLocaleString()} over the ${BUDGET_WARNING.toLocaleString()}-character recommended limit. CodeAlive recommends keeping total bootstrap under 15KB.`,
          recommendation: 'Review the largest files and trim where possible.',
          charCount: budget.totalChars,
          threshold: BUDGET_WARNING,
        });
      }

      return findings;
    },
  },
];
