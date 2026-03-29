# Thresholds.ts Review — Analysis & Discrepancies

**Reviewed by:** Bub  
**Date:** 2026-03-28  
**Scope:** `src/lib/config-review/thresholds.ts` cross-referenced against OpenClaw source code (`pi-embedded-helpers/bootstrap.ts`, `workspace.ts`, `bootstrap-budget.ts`) and the Driftwatch skill (`references/constants.py`, `scripts/truncation.py`)

---

## Summary

The file is well-structured and the sourcing key (`[SOURCE]`, `[COMMUNITY]`, `[DRIFTWATCH]`) is a strong pattern. No critical errors. Several discrepancies and gaps worth addressing before this becomes the canonical reference.

---

## Discrepancies Found

### 1. Missing `bootstrapTotalMaxChars` (150,000) — SIGNIFICANT

**thresholds.ts** has no constant for the aggregate hard limit from OpenClaw source. The `BUDGET_RECOMMENDED` (15,360) and `BUDGET_CRITICAL` (20,480) are Driftwatch editorial thresholds, but the actual source-enforced aggregate cap is `150,000` characters.

**Source:** `pi-embedded-helpers/bootstrap.ts` line 86:
```ts
export const DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS = 150_000;
```

**Impact:** The file conflates two different things — our editorial budget recommendations (15K–20K) and OpenClaw's enforced aggregate limit (150K). These serve different purposes. A user could read `BUDGET_CRITICAL = 20,480` and think OpenClaw truncates at 20K total. It doesn't — it truncates at 150K total.

**Suggestion:** Add `BOOTSTRAP_TOTAL_MAX_CHARS = 150_000` as a `[SOURCE]` constant, then clarify that `BUDGET_*` values are `[DRIFTWATCH]` editorial recommendations well below the hard ceiling.

### 2. Truncation split ratios not in thresholds.ts

**truncation.ts** hardcodes `0.70` and `0.20` locally instead of importing from thresholds.ts. The source of truth file should own these values.

**Source:** `pi-embedded-helpers/bootstrap.ts` lines 90–91:
```ts
const BOOTSTRAP_HEAD_RATIO = 0.7;
const BOOTSTRAP_TAIL_RATIO = 0.2;
```

**Suggestion:** Add `TRUNCATION_HEAD_RATIO = 0.70` and `TRUNCATION_TAIL_RATIO = 0.20` as `[SOURCE]` constants to thresholds.ts. Have truncation.ts import them.

### 3. Near-limit ratio mismatch

**thresholds.ts:** `TRUNCATION_APPROACHING_PCT = 0.80` (80%)  
**OpenClaw source:** `DEFAULT_BOOTSTRAP_NEAR_LIMIT_RATIO = 0.85` (85%) in `bootstrap-budget.ts` line 4

These serve slightly different purposes (ours is a UI threshold, theirs triggers internal warnings), but the gap should be documented. We're flagging 5% earlier than OpenClaw does internally, which is arguably the right call — but it should be explicit that we're intentionally more conservative.

**Suggestion:** Add a comment explaining the deliberate divergence from the source's 85%.

### 4. Subagent/cron session bootstrap allowlist not represented

OpenClaw filters bootstrap files for subagent and cron sessions. Only 5 of 8 files are injected:

**Source:** `workspace.ts` lines 549–554:
```ts
const MINIMAL_BOOTSTRAP_ALLOWLIST = new Set([
  DEFAULT_AGENTS_FILENAME,   // AGENTS.md
  DEFAULT_TOOLS_FILENAME,    // TOOLS.md
  DEFAULT_SOUL_FILENAME,     // SOUL.md
  DEFAULT_IDENTITY_FILENAME, // IDENTITY.md
  DEFAULT_USER_FILENAME,     // USER.md
]);
```

HEARTBEAT.md, BOOTSTRAP.md, and MEMORY.md are **not injected** in subagent/cron sessions.

**Impact:** Budget calculations should account for this. A user's subagent budget is effectively capped at 5 files × 20K = 100K max (not 8 × 20K). This matters for the budget check rule.

**Suggestion:** Add this as a documented constant or note. May not need separate thresholds, but the source-of-truth doc should acknowledge it.

### 5. `recommended` and `warning` are always identical

Every entry in `FILE_THRESHOLDS` has `recommended === warning`. The interface defines both, but they're never different. Either collapse them into one tier, or document why both exist (e.g., future plan to separate "ideal target" from "first alert").

### 6. File injection order not captured

OpenClaw injects files sequentially and deducts from a running aggregate budget. The order matters — MEMORY.md is last and gets starved first if the budget is tight.

**Source:** `workspace.ts` `loadWorkspaceBootstrapFiles()` — the `entries` array defines order:
1. AGENTS.md → 2. SOUL.md → 3. TOOLS.md → 4. IDENTITY.md → 5. USER.md → 6. HEARTBEAT.md → 7. BOOTSTRAP.md → 8. MEMORY.md

The Driftwatch skill's `constants.py` captures this correctly. thresholds.ts does not.

**Suggestion:** Add `BOOTSTRAP_FILE_ORDER` array (tagged `[SOURCE]`) so the budget calculation can model sequential starvation.

### 7. `MIN_BOOTSTRAP_FILE_BUDGET_CHARS` (64) not captured

OpenClaw skips a file entirely if remaining budget drops below 64 chars.

**Source:** `pi-embedded-helpers/bootstrap.ts` line 89:
```ts
const MIN_BOOTSTRAP_FILE_BUDGET_CHARS = 64;
```

**Suggestion:** Add as `[SOURCE]` constant. Relevant for edge-case starvation analysis.

---

## What's Correct and Solid

| Item | Status | Notes |
|------|--------|-------|
| `BOOTSTRAP_MAX_CHARS_DEFAULT = 20_000` | ✅ Matches source | `bootstrap.ts` line 85 |
| `SOUL_MIN_CHARS = 200` | ✅ Clean `[DRIFTWATCH]` editorial | No source equivalent — correctly tagged |
| `TRUNCATION_APPROACHING_PCT = 0.80` | ✅ Intentionally conservative | See note #3 about documenting the 85% divergence |
| Per-file `hardLimit: 20_000` | ✅ Correct | Same across all file types in source |
| Sourcing key pattern | ✅ Excellent | Clear provenance for every number |
| `GENERIC_FILE_THRESHOLD` | ✅ Reasonable default | For extra/custom bootstrap files |
| `getFileThreshold()` helper | ✅ Correct | Case-insensitive, falls back to generic |

---

## Alignment with Driftwatch Skill

The skill's `references/constants.py` is more complete than thresholds.ts — it captures injection order, truncation ratios, aggregate limit, min budget chars, and the version stamp. **thresholds.ts should be brought to parity** or the two will drift apart and we'll have conflicting sources of truth.

| Constant | thresholds.ts | constants.py | Source |
|----------|--------------|--------------|--------|
| Per-file max chars | ✅ 20,000 | ✅ 20,000 | bootstrap.ts:85 |
| Aggregate max chars | ❌ Missing | ✅ 150,000 | bootstrap.ts:86 |
| Head ratio | ❌ In truncation.ts | ✅ 0.70 | bootstrap.ts:90 |
| Tail ratio | ❌ In truncation.ts | ✅ 0.20 | bootstrap.ts:91 |
| Min file budget | ❌ Missing | ✅ 64 | bootstrap.ts:89 |
| File injection order | ❌ Missing | ✅ Present | workspace.ts |
| Near-limit ratio | 0.80 (editorial) | N/A | Source uses 0.85 |
| Version stamp | ❌ Missing | ✅ 2026.03 | — |

---

## Recommendations

1. **Add all source-verified constants** from the table above. thresholds.ts should be the single source of truth for the website — it currently delegates some to truncation.ts and omits others entirely.
2. **Clearly separate the three tiers** of numbers: `[SOURCE]` hard limits → `[COMMUNITY]` best practices → `[DRIFTWATCH]` editorial alerts. The current file does this well conceptually but the aggregate section blurs the line.
3. **Add a version stamp** (`OPENCLAW_VERSION_TAG`) so we can track which source version these were verified against.
4. **Document the recommended/warning collapse** — either merge them or note the planned divergence.
5. **Consider importing from a shared constants file** that both thresholds.ts and the skill's constants.py derive from, to prevent drift between the two codebases.
