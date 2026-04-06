import { describe, test, expect } from 'vitest';
import { analyzeFile } from '@/lib/config-review/analyze-file';
import { findMatches, jaccard, parseSections } from '../helpers';
import { runConflict } from '../runner';

// ── Helpers ──────────────────────────────────────────────────────────

function makeFile(path: string, content: string) {
  return analyzeFile(path, content);
}

// ── Helper function tests ────────────────────────────────────────────

describe('helpers', () => {
  describe('findMatches', () => {
    test('returns matching keywords found in content', () => {
      expect(findMatches('Always ask before acting', ['always', 'never'])).toEqual(['always']);
    });

    test('returns empty array when no keywords match', () => {
      expect(findMatches('nothing here', ['always', 'never'])).toEqual([]);
    });

    test('is case-insensitive', () => {
      expect(findMatches('ALWAYS ASK', ['always'])).toEqual(['always']);
    });
  });

  describe('jaccard', () => {
    test('returns 0.5 for 50% overlap', () => {
      expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(0.5);
    });

    test('returns 1.0 for identical sets', () => {
      expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1.0);
    });

    test('returns 0 for empty sets', () => {
      expect(jaccard(new Set(), new Set())).toBe(0);
    });
  });

  describe('parseSections', () => {
    test('parses headings into sections', () => {
      const sections = parseSections('# Heading1\nline1\n## Heading2\nline2');
      expect(sections.has('Heading1')).toBe(true);
      expect(sections.has('Heading2')).toBe(true);
    });

    test('preamble contains lines before first heading', () => {
      const sections = parseSections('preamble line\n# Heading1\nline1');
      expect(sections.get('__preamble__')).toContain('preamble line');
    });

    test('section content under Heading1 contains line1', () => {
      const sections = parseSections('# Heading1\nline1\n## Heading2\nline2');
      expect(sections.get('Heading1')).toContain('line1');
    });

    test('section content under Heading2 contains line2', () => {
      const sections = parseSections('# Heading1\nline1\n## Heading2\nline2');
      expect(sections.get('Heading2')).toContain('line2');
    });
  });
});

// ── Structural rules ─────────────────────────────────────────────────

describe('structural rules — subagent visibility', () => {
  test('imperative phrase in HEARTBEAT.md fires subagent visibility finding', () => {
    const files = [makeFile('HEARTBEAT.md', '## Rules\nAlways route code tasks to sonnet.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'structural' && f.ruleId === 'STRUCT_SUBAGENT_VISIBILITY');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('imperative phrase in AGENTS.md does NOT fire subagent visibility', () => {
    const files = [makeFile('AGENTS.md', '## Delegation\nAlways delegate code tasks to sonnet.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_SUBAGENT_VISIBILITY');
    expect(findings).toHaveLength(0);
  });

  test('agent-action keyword delegate in BOOTSTRAP.md fires subagent visibility', () => {
    const files = [makeFile('BOOTSTRAP.md', '## Config\nDelegate all tasks to the correct model.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_SUBAGENT_VISIBILITY');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

describe('structural rules — compaction survival', () => {
  test('imperative must under ## Workflow in AGENTS.md fires compaction risk', () => {
    const files = [makeFile('AGENTS.md', '## Session Startup\nDo setup here.\n## Workflow\nMust always check tests before committing.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_COMPACTION_RISK');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('imperative under ## Session Startup in AGENTS.md does NOT fire compaction risk', () => {
    const files = [makeFile('AGENTS.md', '## Session Startup\nAlways read MEMORY.md first.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_COMPACTION_RISK');
    expect(findings).toHaveLength(0);
  });

  test('imperative under ## Red Lines in AGENTS.md does NOT fire compaction risk (case-insensitive)', () => {
    const files = [makeFile('AGENTS.md', '## Red Lines\nNever push to main branch.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_COMPACTION_RISK');
    expect(findings).toHaveLength(0);
  });
});

describe('structural rules — model assignment conflicts', () => {
  test('different models assigned to orchestrator across files fires model conflict', () => {
    const files = [
      makeFile('AGENTS.md', '## Models\n| orchestrator | claude-opus |'),
      makeFile('SOUL.md', '## Models\n| orchestrator | claude-sonnet |'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.ruleId === 'STRUCT_MODEL_ASSIGNMENT');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Cross-file rules ─────────────────────────────────────────────────

describe('cross-file rules', () => {
  test('conflicting escalation instructions across files fires cross-file conflict', () => {
    const files = [
      makeFile('SOUL.md', '## Rules\nAlways ask before taking action.'),
      makeFile('AGENTS.md', '## Protocol\nResolve independently without asking.'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'cross-file');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('single file with only side A keywords does NOT fire cross-file conflict', () => {
    const files = [
      makeFile('SOUL.md', '## Rules\nAlways ask before taking action.'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'cross-file');
    expect(findings).toHaveLength(0);
  });
});

// ── Within-file rules ────────────────────────────────────────────────

describe('within-file rules', () => {
  test('always verbose and never verbose in different sections fires within-file conflict', () => {
    const files = [
      makeFile('SOUL.md', '## Communication\nAlways verbose and always explain everything.\n## Style\nBe concise and never verbose.'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'within-file');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('file with only always verbose does NOT fire within-file conflict', () => {
    const files = [
      makeFile('SOUL.md', '## Communication\nAlways verbose and always explain everything in detail.'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'within-file');
    expect(findings).toHaveLength(0);
  });
});

// ── Duplicate rules ──────────────────────────────────────────────────

describe('duplicate rules', () => {
  test('two files with 80%+ Jaccard similar paragraphs fire duplicate finding', () => {
    const shared = 'This is a substantial paragraph that contains enough words to be meaningful and should trigger duplicate detection when it appears in multiple files with very similar content.';
    const files = [
      makeFile('SOUL.md', `# Soul\n\n${shared}\n\n## More\nUnique content here.`),
      makeFile('AGENTS.md', `# Agents\n\n${shared}\n\n## Protocol\nDifferent content.`),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'duplicate');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('two files with completely different content do NOT fire duplicate finding', () => {
    const files = [
      makeFile('SOUL.md', 'Completely original content about personality and voice.'),
      makeFile('AGENTS.md', 'Delegation rules and routing instructions for tasks.'),
    ];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'duplicate');
    expect(findings).toHaveLength(0);
  });
});

// ── Runner ───────────────────────────────────────────────────────────

describe('runner', () => {
  test('runConflict returns correct category counts matching findings array', () => {
    const shared = 'This is a substantial paragraph that contains enough words to be meaningful and should trigger duplicate detection when it appears in multiple bootstrap files.';
    const files = [
      makeFile('SOUL.md', `# Soul\n\n${shared}`),
      makeFile('AGENTS.md', `# Agents\n\n${shared}`),
    ];
    const result = runConflict(files);
    const dupCount = result.findings.filter(f => f.category === 'duplicate').length;
    expect(result.duplicateCount).toBe(dupCount);
    expect(result.totalCount).toBe(result.findings.length);
  });

  test('runConflict on clean files returns totalCount 0', () => {
    const files = [
      makeFile('SOUL.md', '# Soul\n\n## Voice\nDirect and professional.'),
      makeFile('AGENTS.md', '# Agents\n\n## Session Startup\nRead MEMORY.md first.'),
    ];
    const result = runConflict(files);
    expect(result.totalCount).toBe(0);
  });
});
