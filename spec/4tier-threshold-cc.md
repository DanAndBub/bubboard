# CC SPEC: 4-Tier Threshold Data Layer Migration

## Goal
Replace the 3-tier threshold system (`recommended` / `warning` / `critical`) with a 4-tier system (`compact` / `typical` / `heavy` / `truncation`) plus `hardLimit`. This spec covers types, threshold values, all consumer code, and severity enum — everything below the UI layer. After this spec completes, the app should build clean and look identical in the browser (no visual changes yet).

## Context
- Project: driftwatch (read `projects/driftwatch.md` for full context)
- Branch: feature/phase-3 (or current working branch)
- Key files:
  - `src/lib/config-review/types.ts` — `FileThreshold` interface, `ReviewFinding` severity
  - `src/lib/config-review/thresholds.ts` — current threshold definitions
  - `src/lib/config-review/thresholds-new.ts` — may exist with new tier values (staging file)
  - `src/lib/config-review/rules/` — all rule files comparing against threshold fields
  - `src/lib/config-review/runner.ts` — may map severities
- Dependencies: None

## Constraints
- Do NOT change any UI components (`src/components/`)
- Do NOT change colors, styles, or visual rendering anywhere
- Do NOT modify the snapshot schema or diff engine
- Do NOT touch landing page, demo mode, navigation, or cost tracking
- Do NOT invent new rules or add "typical"-tier logic to existing rules — this is a name migration, not a behavior change
- Do NOT add new npm dependencies
- Old snapshots store severity as strings — those display paths must handle legacy values gracefully (fallback mapping, not migration)

## Steps

### Step 1: Replace FileThreshold interface and threshold values

1. Read `src/lib/config-review/thresholds-new.ts`. If it exists with 4-tier values, those are the source of truth. If it doesn't exist, STOP (see ⛔ below).
2. Update `FileThreshold` in `src/lib/config-review/types.ts`:

```typescript
interface FileThreshold {
  compact: number;      // community best practice target
  typical: number;      // normal for production setups
  heavy: number;        // review — content could move to SKILL.md
  truncation: number;   // content at risk of silent truncation
  hardLimit: number;    // 20,000 — OpenClaw's bootstrapMaxChars default
}
```

3. Replace `thresholds.ts` content with `thresholds-new.ts` values. Delete `thresholds-new.ts`.
4. Update the severity type in `ReviewFinding` (string union or enum):
   - Remove: `"recommended"` | `"warning"` | `"critical"`
   - Add: `"compact"` | `"typical"` | `"heavy"` | `"truncation"`
   - Keep `"info"` if it exists

**Gate:** `npx tsc --noEmit` — expect errors (consumers still reference old field names). If zero errors, something is wrong.

### Step 2: Update all threshold consumers

Fix every file the TypeScript compiler flags. Use this mapping:

| Old reference | New reference | Rationale |
|---|---|---|
| `threshold.recommended` | `threshold.compact` | Community best practice |
| `threshold.warning` | `threshold.heavy` | Conservative — don't suddenly fire on typical configs |
| `threshold.critical` | `threshold.truncation` | Content being cut |
| severity `"recommended"` | `"compact"` | |
| severity `"warning"` | `"heavy"` | |
| severity `"critical"` | `"truncation"` | |

For rules that compare `chars > threshold.warning`: default to `.heavy` unless the rule is specifically about truncation risk, in which case use `.truncation`. Do not add new rules that fire at the `.typical` tier — that's new behavior, out of scope.

If test files assert against old tier names, update the assertions to match.

**Gate:** `npx tsc --noEmit` passes with 0 errors.

### Step 3: Add legacy severity fallback mapping

Wherever severity strings map to display properties (colors, labels, icons), add a fallback so old snapshot findings with `"warning"`/`"critical"`/`"recommended"` still render. Something like:

```typescript
const LEGACY_SEVERITY_MAP: Record<string, string> = {
  recommended: 'compact',
  warning: 'heavy',
  critical: 'truncation',
};

function normalizeSeverity(severity: string): string {
  return LEGACY_SEVERITY_MAP[severity] ?? severity;
}
```

Place this next to whatever code resolves severity → display. If severity resolution happens in multiple places, extract to a shared util.

**Gate:** `npx tsc --noEmit` passes. `grep -rn '"recommended"\|"warning"\|"critical"' src/lib/config-review/` returns only the legacy mapping definition and test fixtures — no live logic references.

### Step 4: Verify

Run full verification:

**Gate:** `npx tsc --noEmit && npm run build && npm run test` — all pass, zero errors, zero warnings that weren't there before.

## ⛔ STOP conditions
- `thresholds-new.ts` doesn't exist and no tier values are available — need Dan's input
- `FileThreshold` interface has a fundamentally different shape than expected (not a simple field rename)
- `ReviewFinding` severity is a numeric enum rather than string union — mapping still works but verify the enum definition approach before proceeding
- Any find-and-replace target string doesn't match the actual file contents

## Acceptance Criteria
- [ ] `FileThreshold` has 5 fields: `compact`, `typical`, `heavy`, `truncation`, `hardLimit`
- [ ] `thresholds.ts` has per-file values for all 5 tiers
- [ ] `thresholds-new.ts` deleted
- [ ] `ReviewFinding` severity uses new tier names
- [ ] Legacy severity fallback mapping exists for old snapshot compatibility
- [ ] `grep -rn '"recommended"\|"warning"\|"critical"' src/lib/config-review/` — no live logic references remain (only legacy map + test fixtures)
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — clean
- [ ] `npm run test` — all pass
- [ ] NEEDS DAN: Confirm app loads in browser with no visual regressions (should look identical)

## Edge Cases
⚠️ `thresholds-new.ts` might have different field names than this spec expects → read the file and adapt; the values matter more than the variable names in the staging file.
⚠️ Some test files might hard-code old tier names in snapshot assertions → update those assertions, don't skip the tests.
⚠️ `runner.ts` might not exist or might not map severities → skip if no severity mapping logic found there.
