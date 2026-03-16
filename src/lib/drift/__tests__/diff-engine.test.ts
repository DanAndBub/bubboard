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
    expect(drift.filesAdded).toHaveLength(0);
    expect(drift.filesRemoved).toHaveLength(0);
    expect(drift.filesChanged).toHaveLength(0);
    expect(drift.filesUnchanged).toHaveLength(2);
    expect(drift.healthScoreDelta).toBe(0);
    expect(drift.daysBetween).toBe(7);
  });

  test('file added', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [
        ...prev.files,
        { path: 'MEMORY.md', charCount: 1000, wordCount: 200, lineCount: 30, headingCount: 1, headings: ['Facts'], contentHash: 'ghi789' },
      ],
    });
    const drift = computeDrift(prev, curr);
    expect(drift.filesAdded).toEqual(['MEMORY.md']);
  });

  test('file removed', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [prev.files[0]], // only SOUL.md
    });
    const drift = computeDrift(prev, curr);
    expect(drift.filesRemoved).toEqual(['AGENTS.md']);
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

  test('>30% growth flagged as significant', () => {
    const prev = makeSnapshot();
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      files: [
        { ...prev.files[0], charCount: 3200, contentHash: 'changed' }, // +60%
        prev.files[1],
      ],
    });
    const drift = computeDrift(prev, curr);
    expect(drift.significantGrowth).toHaveLength(1);
    expect(drift.possibleAgentBloat).toHaveLength(1); // also >50%
  });

  test('health score delta', () => {
    const prev = makeSnapshot({ healthScore: 85 });
    const curr = makeSnapshot({ timestamp: '2026-03-08T00:00:00.000Z', healthScore: 70 });
    const drift = computeDrift(prev, curr);
    expect(drift.healthScoreDelta).toBe(-15);
  });

  test('new and resolved findings', () => {
    const prev = makeSnapshot({
      reviewFindings: [
        { ruleId: 'SIZE_WARN', severity: 'warning', category: 'size', file: 'SOUL.md', message: 'too big', recommendation: 'trim' },
      ],
    });
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      reviewFindings: [
        { ruleId: 'STRUCT_NO_HEADINGS', severity: 'info', category: 'structure', file: 'USER.md', message: 'no headings', recommendation: 'add headings' },
      ],
    });
    const drift = computeDrift(prev, curr);
    expect(drift.newFindings).toHaveLength(1);
    expect(drift.newFindings[0].ruleId).toBe('STRUCT_NO_HEADINGS');
    expect(drift.resolvedFindings).toHaveLength(1);
    expect(drift.resolvedFindings[0].ruleId).toBe('SIZE_WARN');
  });

  test('agent topology changes', () => {
    const prev = makeSnapshot({
      agents: [{ id: 'main' }, { id: 'sonnet' }],
    });
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      agents: [{ id: 'main' }, { id: 'coder' }],
    });
    const drift = computeDrift(prev, curr);
    expect(drift.agentTopologyChanges.added).toEqual(['coder']);
    expect(drift.agentTopologyChanges.removed).toEqual(['sonnet']);
  });

  test('budget delta', () => {
    const prev = makeSnapshot({
      workspaceSummary: { totalFiles: 2, totalChars: 5000, bootstrapBudgetUsed: 5000, bootstrapBudgetLimit: 15360 },
    });
    const curr = makeSnapshot({
      timestamp: '2026-03-08T00:00:00.000Z',
      workspaceSummary: { totalFiles: 3, totalChars: 8000, bootstrapBudgetUsed: 8000, bootstrapBudgetLimit: 15360 },
    });
    const drift = computeDrift(prev, curr);
    expect(drift.budgetDelta).toBe(3000);
  });
});
