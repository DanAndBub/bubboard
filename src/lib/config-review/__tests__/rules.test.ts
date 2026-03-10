import { describe, test, expect } from 'vitest';
import { analyzeFile, analyzeFiles } from '../analyze-file';
import { calculateTruncation } from '../truncation';
import { calculateBudget } from '../budget';
import { runReview } from '../runner';
import type { FileAnalysis } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────

function makeFile(path: string, charCount: number, content?: string): FileAnalysis {
  const c = content ?? 'x'.repeat(charCount);
  return analyzeFile(path, c);
}

// ── analyzeFile ──────────────────────────────────────────────────────

describe('analyzeFile', () => {
  test('counts characters, words, lines, headings', () => {
    const result = analyzeFile('SOUL.md', '# Title\n\nHello world\n\n## Section\n\nMore text');
    expect(result.charCount).toBe(43);
    expect(result.wordCount).toBe(8);
    expect(result.lineCount).toBe(7);
    expect(result.headings).toEqual(['Title', 'Section']);
    expect(result.sectionCount).toBe(2);
  });
});

// ── Truncation Calculator ────────────────────────────────────────────

describe('calculateTruncation', () => {
  test('no truncation when under limit', () => {
    const t = calculateTruncation(15000, 20000);
    expect(t.hiddenChars).toBe(0);
    expect(t.hiddenRange).toBeNull();
  });

  test('correct 70/20/10 split at 25000 chars', () => {
    const t = calculateTruncation(25000, 20000);
    expect(t.headChars).toBe(14000);
    expect(t.tailChars).toBe(4000);
    expect(t.hiddenChars).toBe(7000); // 25000 - 14000 - 4000
    expect(t.hiddenRange).toEqual({ start: 14001, end: 21000 });
  });

  test('exact limit — no truncation', () => {
    const t = calculateTruncation(20000, 20000);
    expect(t.hiddenChars).toBe(0);
    expect(t.hiddenRange).toBeNull();
  });
});

// ── Budget Calculator ────────────────────────────────────────────────

describe('calculateBudget', () => {
  test('under budget', () => {
    const files = [makeFile('SOUL.md', 2000), makeFile('AGENTS.md', 3000)];
    const b = calculateBudget(files, 15360);
    expect(b.totalChars).toBe(5000);
    expect(b.overBudgetBy).toBe(0);
  });

  test('over budget', () => {
    const files = [makeFile('SOUL.md', 8000), makeFile('AGENTS.md', 10000)];
    const b = calculateBudget(files, 15360);
    expect(b.totalChars).toBe(18000);
    expect(b.overBudgetBy).toBe(2640);
  });

  test('per-file breakdown sorted by size', () => {
    const files = [makeFile('USER.md', 500), makeFile('MEMORY.md', 5000), makeFile('AGENTS.md', 2000)];
    const b = calculateBudget(files);
    expect(b.perFileBreakdown[0].path).toBe('MEMORY.md');
    expect(b.perFileBreakdown[2].path).toBe('USER.md');
  });
});

// ── Size Rules ───────────────────────────────────────────────────────

describe('size rules', () => {
  test('AGENTS.md at 1000 chars — no findings', () => {
    const files = [makeFile('AGENTS.md', 1000)];
    const result = runReview(files);
    const sizeFindings = result.findings.filter(f => f.category === 'size' && f.file === 'AGENTS.md');
    expect(sizeFindings).toHaveLength(0);
  });

  test('AGENTS.md at 3000 chars — warning', () => {
    const files = [makeFile('AGENTS.md', 3000)];
    const result = runReview(files);
    const warnings = result.findings.filter(f => f.severity === 'warning' && f.file === 'AGENTS.md' && f.category === 'size');
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  test('AGENTS.md at 6000 chars — critical', () => {
    const files = [makeFile('AGENTS.md', 6000)];
    const result = runReview(files);
    const crits = result.findings.filter(f => f.severity === 'critical' && f.file === 'AGENTS.md' && f.category === 'size');
    expect(crits.length).toBeGreaterThanOrEqual(1);
  });

  test('SOUL.md at 100 chars — too short info', () => {
    const files = [makeFile('SOUL.md', 100)];
    const result = runReview(files);
    const short = result.findings.filter(f => f.ruleId === 'SIZE_SOUL_SHORT');
    expect(short).toHaveLength(1);
  });

  test('budget at 21000 — critical', () => {
    const files = [makeFile('AGENTS.md', 10000), makeFile('SOUL.md', 11000)];
    const result = runReview(files);
    const budgetCrit = result.findings.filter(f => f.ruleId === 'BUDGET_CRIT');
    expect(budgetCrit).toHaveLength(1);
  });
});

// ── Truncation Rules ─────────────────────────────────────────────────

describe('truncation rules', () => {
  test('file at 16000 chars — approaching warning', () => {
    const files = [makeFile('MEMORY.md', 16500)];
    const result = runReview(files);
    const approaching = result.findings.filter(f => f.ruleId === 'TRUNCATION_APPROACHING');
    expect(approaching.length).toBeGreaterThanOrEqual(1);
  });

  test('file at 21000 chars — active truncation critical', () => {
    const files = [makeFile('AGENTS.md', 21000)];
    const result = runReview(files);
    const active = result.findings.filter(f => f.ruleId === 'TRUNCATION_ACTIVE');
    expect(active).toHaveLength(1);
  });

  test('file at 10000 chars — no truncation findings', () => {
    const files = [makeFile('AGENTS.md', 10000)];
    const result = runReview(files);
    const truncFindings = result.findings.filter(f => f.category === 'truncation');
    expect(truncFindings).toHaveLength(0);
  });
});

// ── Contradiction Rules ──────────────────────────────────────────────

describe('contradiction rules', () => {
  test('conflicting escalation phrases fires', () => {
    const files = [
      analyzeFile('SOUL.md', '## Rules\nAlways ask before taking action.'),
      analyzeFile('AGENTS.md', '## Protocol\nBe resourceful before asking. Figure it out.'),
    ];
    const result = runReview(files);
    const contras = result.findings.filter(f => f.ruleId === 'CONTRA_ESCALATION');
    expect(contras).toHaveLength(1);
  });

  test('no conflict — no false positive', () => {
    const files = [
      analyzeFile('SOUL.md', '## Voice\nDirect and concise.'),
      analyzeFile('AGENTS.md', '## Delegation\nDelegate code tasks to sonnet.'),
    ];
    const result = runReview(files);
    const contras = result.findings.filter(f => f.category === 'contradiction');
    expect(contras).toHaveLength(0);
  });

  test('duplicate paragraph across files fires', () => {
    const shared = 'This is a substantial paragraph that contains enough words to be meaningful and should trigger duplicate detection when it appears in multiple files.';
    const files = [
      analyzeFile('SOUL.md', `# Soul\n\n${shared}\n\n## More\nUnique content here.`),
      analyzeFile('AGENTS.md', `# Agents\n\n${shared}\n\n## Protocol\nDifferent content.`),
    ];
    const result = runReview(files);
    const dupes = result.findings.filter(f => f.ruleId === 'CONTRA_DUPLICATE_RULES');
    expect(dupes.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Health Score ─────────────────────────────────────────────────────

describe('health score', () => {
  test('clean workspace — 100', () => {
    const files = [
      analyzeFile('SOUL.md', '# Soul\n\n## Voice & Tone\nDirect. Personality defined. Anti-patterns listed.\n\n## Behavior\nNever do X. Always do Y.'),
      analyzeFile('AGENTS.md', '# Agents\n\n## Delegation\nDelegate to sonnet.\n\n## Memory\nUse MEMORY.md.'),
    ];
    const result = runReview(files);
    expect(result.healthScore).toBe(100);
  });

  test('critical findings lower score significantly', () => {
    const files = [makeFile('AGENTS.md', 25000)]; // triggers critical size + truncation
    const result = runReview(files);
    expect(result.healthScore).toBeLessThan(80);
  });
});
