import type { ReviewFinding } from '@/lib/config-review/types';

// ── Snapshot Schema ──────────────────────────────────────────────────

export const SNAPSHOT_SCHEMA_VERSION = 1;

export interface SnapshotFile {
  path: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  headingCount: number;
  headings: string[];
  contentHash: string; // SHA-256 of REDACTED content
}

export interface SnapshotAgent {
  id: string;
  model?: string;
  reportsTo?: string;
}

export interface Snapshot {
  schemaVersion: number;
  timestamp: string; // ISO-8601
  driftwatchVersion: string;
  workspaceSummary: {
    totalFiles: number;
    totalChars: number;
    bootstrapBudgetUsed: number;
    bootstrapBudgetLimit: number;
  };
  files: SnapshotFile[];
  healthScore: number;
  reviewFindings: ReviewFinding[];
  agents: SnapshotAgent[];
  architectureSummary: string;
}

// ── Drift Report ─────────────────────────────────────────────────────

export interface FileChange {
  path: string;
  charCountDelta: number;
  percentGrowth: number;
  headingsAdded: string[];
  headingsRemoved: string[];
  contentHashChanged: boolean;
}

export interface DriftReport {
  previousTimestamp: string;
  currentTimestamp: string;
  daysBetween: number;
  filesChanged: FileChange[];
  totalCharsDelta: number;
}
