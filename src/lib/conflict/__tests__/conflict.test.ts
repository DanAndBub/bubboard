import { describe, test, expect } from 'vitest';
import { analyzeFile } from '@/lib/config-review/analyze-file';
import { findMatches, jaccard, parseSections } from '../helpers';

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

// ── Rule stub blocks (filled in Task 2) ─────────────────────────────

describe('structural rules', () => {
  test.todo('imperative phrase in HEARTBEAT.md fires subagent visibility');
  test.todo('imperative phrase in AGENTS.md does NOT fire subagent visibility');
  test.todo('agent-action keyword in BOOTSTRAP.md fires subagent visibility');
  test.todo('compaction risk fires for imperative outside safe sections');
  test.todo('compaction risk does NOT fire inside Session Startup');
  test.todo('compaction risk does NOT fire inside Red Lines');
  test.todo('model assignment conflict fires when different models in same role');
});

describe('cross-file rules', () => {
  test.todo('conflicting escalation phrases fires cross-file conflict');
  test.todo('single file with only one side does NOT fire');
});

describe('within-file rules', () => {
  test.todo('always verbose and never verbose in different sections fires');
  test.todo('file with only always verbose does NOT fire');
});

describe('duplicate rules', () => {
  test.todo('two files with 80%+ Jaccard similar paragraphs fire duplicate finding');
  test.todo('two files with completely different content do NOT fire');
});

describe('runner', () => {
  test.todo('runConflict returns correct category counts');
  test.todo('runConflict on clean files returns totalCount 0');
});

// Ensure makeFile is used (suppress unused warning)
void makeFile;
