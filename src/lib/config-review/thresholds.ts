// ══════════════════════════════════════════════════════════════════════
// Driftwatch — OpenClaw Bootstrap File Thresholds (Free Tier)
// ══════════════════════════════════════════════════════════════════════
//
// SOURCING KEY:
//   [SOURCE]    = Verified in OpenClaw source code (bootstrap.ts, workspace.ts,
//                 bootstrap-budget.ts). See specs/openclaw-bootstrap-source-of-truth.md
//   [COMMUNITY] = CodeAlive awesome-openclaw best practices (editorial, NOT code-enforced)
//   [DRIFTWATCH]= Our own editorial thresholds derived from the above
//

// ── Source-Verified Constants (bootstrap.ts) ─────────────────────────

/** [SOURCE] Per-file character limit. Files exceeding this get head/tail split. */
export const BOOTSTRAP_MAX_CHARS_DEFAULT = 20_000;

/** [SOURCE] Aggregate budget across all bootstrap files. Sequential — earlier files consume first. */
export const BOOTSTRAP_TOTAL_MAX_CHARS = 150_000;

/** [SOURCE] Minimum remaining budget to process a file. Below this, the file is skipped. */
export const MIN_BOOTSTRAP_FILE_BUDGET_CHARS = 64;

// ── Truncation Split Ratios (bootstrap.ts) ───────────────────────────
// [SOURCE] Applied to the LIMIT, not the file size.
// When a file exceeds BOOTSTRAP_MAX_CHARS_DEFAULT:
//   Head = floor(limit × 0.7) = 14,000 chars from start
//   Tail = floor(limit × 0.2) = 4,000 chars from end
//   Middle gap disappears silently (marker injected in ~10% gap)

/** [SOURCE] Proportion of per-file limit kept from the start of the file. */
export const TRUNCATION_HEAD_RATIO = 0.70;

/** [SOURCE] Proportion of per-file limit kept from the end of the file. */
export const TRUNCATION_TAIL_RATIO = 0.20;

// ── Injection Order (workspace.ts → loadWorkspaceBootstrapFiles()) ───
// [SOURCE] Files are processed sequentially against the aggregate 150K budget.
// MEMORY.md is last — it gets whatever budget remains after the first 7 files.
// Subagent/cron sessions only receive the first 5 (MINIMAL_BOOTSTRAP_ALLOWLIST).

export const BOOTSTRAP_FILE_ORDER = [
  'AGENTS.md',     // position 1 — always gets full budget
  'SOUL.md',       // position 2
  'TOOLS.md',      // position 3
  'IDENTITY.md',   // position 4
  'USER.md',       // position 5
  'HEARTBEAT.md',  // position 6 — filtered out for subagents/cron
  'BOOTSTRAP.md',  // position 7 — filtered out for subagents/cron
  'MEMORY.md',     // position 8 — filtered out for subagents/cron; gets remaining budget
] as const;

/** [SOURCE] Files injected in subagent and cron sessions (workspace.ts MINIMAL_BOOTSTRAP_ALLOWLIST). */
export const SUBAGENT_BOOTSTRAP_FILES = [
  'AGENTS.md',
  'TOOLS.md',
  'SOUL.md',
  'IDENTITY.md',
  'USER.md',
] as const;

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
// NOTE: The source-enforced aggregate limit is BOOTSTRAP_TOTAL_MAX_CHARS (150,000)
// above. These BUDGET_* values are [DRIFTWATCH] editorial thresholds — we alert
// well below the hard ceiling because bloated bootstrap = wasted tokens every message.

export const BUDGET_RECOMMENDED = 15_360;  // [COMMUNITY] CodeAlive recommendation
export const BUDGET_WARNING     = 15_360;  // [DRIFTWATCH] editorial alert
export const BUDGET_CRITICAL    = 20_480;  // [DRIFTWATCH] editorial alert

// ── Truncation Warning ───────────────────────────────────────────────
// [DRIFTWATCH] We alert at 80% of per-file hardLimit. OpenClaw's internal
// near-limit detection (bootstrap-budget.ts DEFAULT_BOOTSTRAP_NEAR_LIMIT_RATIO)
// fires at 85%. We intentionally alert 5% earlier to give users more runway.

/** Warn at this percentage of any file's hardLimit (approaching truncation). */
export const TRUNCATION_APPROACHING_PCT = 0.80;  // [DRIFTWATCH] (source uses 0.85)

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
