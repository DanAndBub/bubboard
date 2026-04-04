import { describe, test, expect } from 'vitest';
import { computeDrift } from '../diff-engine';
import type { Snapshot } from '../types';
import { SNAPSHOT_SCHEMA_VERSION } from '../types';

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    timestamp: '2026-03-01T00:00:00.000Z',
    driftwatchVersion: '3.0.0',
    workspaceSummary: { totalFiles: 2, totalChars: 5000, bootstrapBudgetUsed: 5000, bootstrapBudgetLimit: 15360 },
    files: [
      { path: 'SOUL.md', charCount: 2000, wordCount: 400, lineCount: 50, headingCount: 3, headings: ['Voice', 'Tone', 'Behavior'], contentHash: 'abc123' },
      { path: 'AGENTS.md', charCount: 3000, wordCount: 600, lineCount: 80, headingCount: 4, headings: ['Delegation', 'Memory', 'QA', 'Safety'], contentHash: 'def456' },
    ],
    healthScore: 85,
    reviewFindings: [],
    agents: [{ id: 'main', model: 'opus-4-6' }, { id: 'sonnet', model: 'sonnet-4-6' }],
    architectureSummary: '2 agents, 2 files',
    ...overrides,
  };
}

describe('computeDrift', () => {
  test('identical snapshots — no changes', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({ timestamp: '2026-03-08T00:00:00.000Z' });
    const drift = computeDrift(prev, curr);
    expect(drift.filesChanged).toHaveLength(0);
    expect(drift.totalCharsDelta).toBe(0);
    expect(drift.daysBetween).toBe(7);
  });

  test('file added — not included in filesChanged', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [
        ...prev.files,
        { path: 'MEMORY.md', charCount: 1000, wordCount: 200, lineCount: 30, headingCount: 1, headings: ['Facts'], contentHash: 'ghi789' },
      ],
    });
    const drift = computeDrift(prev, curr);
    // Added files are silently skipped — not in filesChanged
    expect(drift.filesChanged).toHaveLength(0);
  });

  test('file removed — not included in filesChanged', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [prev.files[0]], // only SOUL.md
    });
    const drift = computeDrift(prev, curr);
    // Removed files are silently skipped — not in filesChanged
    expect(drift.filesChanged).toHaveLength(0);
  });

  test('file changed — content hash different', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [
        { ...prev.files[0], charCount: 3000, contentHash: 'changed_hash', headings: ['Voice', 'Tone', 'Behavior', 'New Section'] },
        prev.files[1],
      ],
    });
    const drift = computeDrift(prev, curr);
    expect(drift.filesChanged).toHaveLength(1);
    expect(drift.filesChanged[0].path).toBe('SOUL.md');
    expect(drift.filesChanged[0].charCountDelta).toBe(1000);
    expect(drift.filesChanged[0].percentGrowth).toBe(50);
    expect(drift.filesChanged[0].headingsAdded).toEqual(['New Section']);
    expect(drift.filesChanged[0].headingsRemoved).toEqual([]);
  });

  test('totalCharsDelta', () => {
    const prev = makeSnapshot({
      workspaceSummary: { totalFiles: 2, totalChars: 5000, bootstrapBudgetUsed: 5000, bootstrapBudgetLimit: 15360 },
    });
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      workspaceSummary: { totalFiles: 3, totalChars: 8000, bootstrapBudgetUsed: 8000, bootstrapBudgetLimit: 15360 },
    });
    const drift = computeDrift(prev, curr);
    expect(drift.totalCharsDelta).toBe(3000);
  });

  test('daysBetween', () => {
    const prev = makeSnapshot({ timestamp: '2026-03-01T00:00:00.000Z' });
    const curr = makeSnapshot({ timestamp: '2026-03-15T00:00:00.000Z' });
    const drift = computeDrift(prev, curr);
    expect(drift.daysBetween).toBe(14);
  });
});
