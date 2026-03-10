// ── Per-File Size Thresholds (characters) ────────────────────────────
// Source: OpenClaw docs, CodeAlive best practices, community standards

export interface FileThreshold {
  recommended: number;
  warning: number;
  critical: number;
  hardLimit: number; // bootstrapMaxChars default — file truncated beyond this
}

export const FILE_THRESHOLDS: Record<string, FileThreshold> = {
  'AGENTS.md':    { recommended: 2_048, warning: 2_048, critical: 5_120,  hardLimit: 20_000 },
  'SOUL.md':      { recommended: 3_072, warning: 3_072, critical: 8_192,  hardLimit: 20_000 },
  'USER.md':      { recommended: 1_536, warning: 1_536, critical: 3_072,  hardLimit: 20_000 },
  'MEMORY.md':    { recommended: 5_120, warning: 5_120, critical: 10_240, hardLimit: 20_000 },
  'HEARTBEAT.md': { recommended: 4_096, warning: 4_096, critical: 8_192,  hardLimit: 20_000 },
  'IDENTITY.md':  { recommended: 1_024, warning: 1_024, critical: 2_048,  hardLimit: 20_000 },
  'TOOLS.md':     { recommended: 1_024, warning: 1_024, critical: 2_048,  hardLimit: 20_000 },
};

// Generic threshold for any .md file not in the list above
export const GENERIC_FILE_THRESHOLD: FileThreshold = {
  recommended: 10_240,
  warning: 10_240,
  critical: 20_000,
  hardLimit: 20_000,
};

// ── Aggregate Bootstrap Budget (characters) ──────────────────────────

export const BUDGET_RECOMMENDED = 15_360;  // CodeAlive recommends 15KB
export const BUDGET_WARNING     = 15_360;
export const BUDGET_CRITICAL    = 20_480;
export const BUDGET_TOTAL_MAX   = 150_000; // OpenClaw default bootstrapTotalMaxChars

// ── Truncation ───────────────────────────────────────────────────────

export const BOOTSTRAP_MAX_CHARS_DEFAULT = 20_000;
export const TRUNCATION_APPROACHING_PCT  = 0.80; // warn at 80% of limit

// ── SOUL.md minimum (too-short warning) ──────────────────────────────

export const SOUL_MIN_CHARS = 200;

// ── Helper ───────────────────────────────────────────────────────────

export function getFileThreshold(filename: string): FileThreshold {
  // Match by basename (case-insensitive)
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  for (const [key, threshold] of Object.entries(FILE_THRESHOLDS)) {
    if (base === key.toUpperCase()) return threshold;
  }
  return GENERIC_FILE_THRESHOLD;
}
