import { ReviewRule, ReviewFinding } from '../types';
import { calculateTruncation } from '../truncation';
import { BOOTSTRAP_MAX_CHARS_DEFAULT, TRUNCATION_APPROACHING_PCT } from '../thresholds';

export const truncationRules: ReviewRule[] = [
  {
    id: 'TRUNCATION_ACTIVE',
    name: 'File is being truncated',
    description: 'File exceeds bootstrapMaxChars — OpenClaw silently hides the middle',
    targetFiles: '*',
    severity: 'critical',
    category: 'truncation',
    check(files) {
      const findings: ReviewFinding[] = [];
      for (const f of files) {
        const t = calculateTruncation(f.charCount, BOOTSTRAP_MAX_CHARS_DEFAULT);
        if (!t.hiddenRange) continue;
        findings.push({
          ruleId: 'TRUNCATION_ACTIVE',
          severity: 'critical',
          category: 'truncation',
          file: f.path,
          message: `${f.path} is ${f.charCount.toLocaleString()} characters — OpenClaw truncates it to ${BOOTSTRAP_MAX_CHARS_DEFAULT.toLocaleString()}. Characters ${t.hiddenRange.start.toLocaleString()}–${t.hiddenRange.end.toLocaleString()} (${t.hiddenChars.toLocaleString()} chars) are invisible to your agent. The head (70%) and tail (20%) are kept; the middle disappears.`,
          recommendation: `Your agent cannot see ${t.hiddenChars.toLocaleString()} characters in the middle of this file. Move critical rules to the top or bottom. Better: trim the file below ${BOOTSTRAP_MAX_CHARS_DEFAULT.toLocaleString()} characters.`,
          charCount: f.charCount,
          threshold: BOOTSTRAP_MAX_CHARS_DEFAULT,
        });
      }
      return findings;
    },
  },
  {
    id: 'TRUNCATION_APPROACHING',
    name: 'Approaching truncation limit',
    description: 'File is over 80% of bootstrapMaxChars',
    targetFiles: '*',
    severity: 'warning',
    category: 'truncation',
    check(files) {
      const findings: ReviewFinding[] = [];
      const approachingAt = BOOTSTRAP_MAX_CHARS_DEFAULT * TRUNCATION_APPROACHING_PCT;
      for (const f of files) {
        if (f.charCount > approachingAt && f.charCount <= BOOTSTRAP_MAX_CHARS_DEFAULT) {
          const remaining = BOOTSTRAP_MAX_CHARS_DEFAULT - f.charCount;
          findings.push({
            ruleId: 'TRUNCATION_APPROACHING',
            severity: 'warning',
            category: 'truncation',
            file: f.path,
            message: `${f.path} is ${f.charCount.toLocaleString()} characters — ${Math.round((f.charCount / BOOTSTRAP_MAX_CHARS_DEFAULT) * 100)}% of the ${BOOTSTRAP_MAX_CHARS_DEFAULT.toLocaleString()}-character truncation limit. Only ${remaining.toLocaleString()} characters of headroom remain.`,
            recommendation: `This file is close to being silently truncated. Trim it or move less-critical content to non-bootstrap files.`,
            charCount: f.charCount,
            threshold: BOOTSTRAP_MAX_CHARS_DEFAULT,
          });
        }
      }
      return findings;
    },
  },
];
