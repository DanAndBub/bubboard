// ══════════════════════════════════════════════════════════════════════
// Driftwatch — OpenClaw Bootstrap File Thresholds (Free Tier)
// ══════════════════════════════════════════════════════════════════════
//
// SOURCING KEY:
//   [SOURCE]    = Verified in OpenClaw source code (bootstrap.ts, workspace.ts)
//   [COMMUNITY] = CodeAlive awesome-openclaw best practices (editorial, NOT code-enforced)
//   [DRIFTWATCH]= Our own editorial thresholds derived from the above
//

// ── Truncation Mechanics ─────────────────────────────────────────────
// [SOURCE] From bootstrap.ts — constants governing how files are truncated

/** Per-file character limit. Files exceeding this get head/tail split. */
export const BOOTSTRAP_MAX_CHARS_DEFAULT = 20_000;

// ── Per-File Size Thresholds (characters) ────────────────────────────
// hardLimit: [SOURCE] bootstrapMaxChars default — file truncated beyond this.
// warning/critical: [DRIFTWATCH] editorial thresholds derived from CodeAlive
//   community recommendations. These are NOT enforced by OpenClaw's code.

export interface FileThreshold {
  recommended: number;
  warning: number;
  critical: number;
  hardLimit: number;
}

export const FILE_THRESHOLDS: Record<string, FileThreshold> = {
  'AGENTS.md':    { recommended: 2_048, warning: 2_048,  critical: 5_120,  hardLimit: 20_000 },
  'SOUL.md':      { recommended: 3_072, warning: 3_072,  critical: 8_192,  hardLimit: 20_000 },
  'TOOLS.md':     { recommended: 1_024, warning: 1_024,  critical: 2_048,  hardLimit: 20_000 },
  'IDENTITY.md':  { recommended: 1_024, warning: 1_024,  critical: 2_048,  hardLimit: 20_000 },
  'USER.md':      { recommended: 1_536, warning: 1_536,  critical: 3_072,  hardLimit: 20_000 },
  'HEARTBEAT.md': { recommended: 4_096, warning: 4_096,  critical: 8_192,  hardLimit: 20_000 },
  'BOOTSTRAP.md': { recommended: 4_096, warning: 4_096,  critical: 10_240, hardLimit: 20_000 },
  'MEMORY.md':    { recommended: 5_120, warning: 5_120,  critical: 10_240, hardLimit: 20_000 },
};

export const GENERIC_FILE_THRESHOLD: FileThreshold = {
  recommended: 10_240,
  warning: 10_240,
  critical: 20_000,
  hardLimit: 20_000,
};

// ── Aggregate Bootstrap Budget (characters) ──────────────────────────

export const BUDGET_RECOMMENDED = 15_360;  // [COMMUNITY]
export const BUDGET_WARNING     = 15_360;  // [DRIFTWATCH]
export const BUDGET_CRITICAL    = 20_480;  // [DRIFTWATCH]

// ── Truncation Warning ───────────────────────────────────────────────

/** Warn at this percentage of any file's hardLimit (approaching truncation). */
export const TRUNCATION_APPROACHING_PCT = 0.80;  // [DRIFTWATCH]

// ── SOUL.md minimum (too-short warning) ──────────────────────────────

export const SOUL_MIN_CHARS = 200;  // [DRIFTWATCH]

// ── Helper ───────────────────────────────────────────────────────────

export function getFileThreshold(filename: string): FileThreshold {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  for (const [key, threshold] of Object.entries(FILE_THRESHOLDS)) {
    if (base === key.toUpperCase()) return threshold;
  }
  return GENERIC_FILE_THRESHOLD;
}
