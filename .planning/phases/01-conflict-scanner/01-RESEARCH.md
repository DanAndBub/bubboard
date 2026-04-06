# Phase 1: Conflict Scanner Core — Research

**Researched:** 2026-04-05
**Domain:** TypeScript rule-engine pattern / React client-side analysis view
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture**
- D-01: New `src/lib/conflict/` subsystem — parallel to `src/lib/config-review/`, not an extension of it
- D-02: Conflict scanner has its own types, runner, and rule modules
- D-03: Existing `contradiction-rules.ts` stays in `config-review/` untouched — no changes to ReviewView
- D-04: ConflictScannerView gets its own richer ruleset; the two views are independent

**Input data**
- D-05: Input is `FileAnalysis[]` from `src/lib/config-review/analyze-file.ts` — already computed when scan runs
- D-06: No new file parsing needed; conflict runner reuses the same `FileAnalysis[]` the orchestrator already has

**Detection categories (priority order)**
- D-07: Four categories, each its own rule module:
  1. Structural — subagent visibility gaps + compaction survival risks
  2. Cross-file conflicts — escalation, delegation, verbosity, permission scope, communication style, error handling, tool preferences
  3. Within-file self-conflicts
  4. Duplicates — near-identical paragraphs across files (Jaccard similarity)

**Subagent visibility detection**
- D-08: Two-layer detection in subagent-hidden files (HEARTBEAT.md, BOOTSTRAP.md, MEMORY.md): imperative phrases AND agent-action keywords
- D-09: Use `SUBAGENT_BOOTSTRAP_FILES` from thresholds.ts to determine file visibility

**Compaction survival detection**
- D-10: Parse AGENTS.md headings to detect content outside `## Session Startup` and `## Red Lines`
- D-11: Flag imperative-phrase lines in AGENTS.md sections NOT under those two headings
- D-12: Section names matched case-insensitively using `FileAnalysis.headings[]`

**Model assignment conflicts**
- D-13: Scan all files for model identifiers, flag if different files assign different models to same task type

**UI presentation**
- D-14: Group findings by category: Structural Issues → Cross-File Conflicts → Within-File Conflicts → Duplicates
- D-15: Collapsible sections with finding count badges
- D-16: Individual findings show: severity badge, affected file(s), conflicting phrases/lines, recommendation
- D-17: Empty state shows positive confirmation
- D-18: Dark aesthetic: `#0a0e17` background, `#3b82f6` accent, severity colors from ReviewView

**Demo data**
- D-19: Add conflict scanner demo data to `src/lib/phase3-demo-data.ts` or new `src/lib/conflict-demo-data.ts` — at least one finding per category
- D-20: Demo mode wires through same path as real scans

**Testing**
- D-21: Unit tests in `src/lib/conflict/__tests__/`
- D-22: Each detection type: positive (conflict found) + negative (no conflict) cases
- D-23: Follow existing Vitest patterns from `src/lib/config-review/__tests__/rules.test.ts`

### Claude's Discretion
- Exact keyword lists within each conflict category (extend patterns from contradiction-rules.ts)
- Jaccard similarity threshold for duplicate detection (existing code uses 0.80 — reasonable to keep)
- Exact color/icon choices for severity badges (follow ReviewView patterns)
- Whether `ConflictResult` type mirrors `ReviewResult` shape or diverges where needed

### Deferred Ideas (OUT OF SCOPE)
- LLM-powered semantic conflict detection — pro tier, future phase
- Conflict severity scoring / overall conflict health score
- Fix for `isBootstrapFile` duplication (CONCERNS.md) — unrelated tech debt
</user_constraints>

---

## Summary

Phase 1 builds a new `src/lib/conflict/` subsystem that runs alongside the existing `src/lib/config-review/` without touching it. The conflict runner receives the same `FileAnalysis[]` the orchestrator already computes when a scan runs, so zero new file I/O is needed. Four rule modules cover OpenClaw-specific structural risks (highest value), cross-file contradictions, within-file self-contradictions, and near-duplicate content.

The UI replaces the `ConflictScannerView.tsx` stub with a real view that groups findings into collapsible category sections, exactly mirroring the dark aesthetic established by `ConfigHealthView` and `ReviewView`. Demo data is pre-computed and wired through `page.tsx` alongside the existing `reviewResult` state.

The full pattern — types, runner, rule modules, tests, UI — is already proven in the codebase. This phase is primarily about applying that proven pattern to a new domain. The highest-risk design decision is how to wire `conflictResult` state into `page.tsx` and pass it to `ConflictScannerView` as a prop, since that requires touching the orchestrator.

**Primary recommendation:** Mirror the `ReviewResult`/`runReview`/`ReviewView` chain exactly. Build `ConflictResult`/`runConflict`/`ConflictScannerView` as a parallel chain, add `conflictResult` state to `page.tsx`, and call `runConflict(analyzedFiles)` wherever `runReview` is currently called.

---

## Standard Stack

### Core (already in project — no installs needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.1.6 | App framework | `'use client'` on all view components |
| React | 19.2.3 | UI | Functional components only |
| TypeScript | 5.9.3 | Types | strict mode, no `any` |
| Tailwind CSS | 4.x | Styling | Utility classes + inline style objects for dynamic colors |
| Vitest | 4.0.18 | Tests | `vitest run`, node environment |

[VERIFIED: package.json read directly]

**No new dependencies required for this phase.** All detection is pure string/set operations over `FileAnalysis[]`. The UI follows existing component patterns.

---

## Architecture Patterns

### Recommended Project Structure

```
src/lib/conflict/
├── types.ts              # ConflictFinding, ConflictRule, ConflictResult, ConflictCategory
├── runner.ts             # runConflict(files: FileAnalysis[]): ConflictResult
├── rules/
│   ├── structural-rules.ts      # subagent visibility + compaction survival + model assignment
│   ├── cross-file-rules.ts      # escalation, delegation, verbosity, permissions, style, etc.
│   ├── within-file-rules.ts     # same-file self-contradictions
│   └── duplicate-rules.ts       # near-duplicate paragraphs (Jaccard)
└── __tests__/
    └── conflict.test.ts

src/lib/conflict-demo-data.ts    # OR append to phase3-demo-data.ts
src/components/map/views/ConflictScannerView.tsx   # replace placeholder
```

[VERIFIED: codebase read — mirrors `src/lib/config-review/` structure exactly]

### Pattern 1: ConflictRule Shape

Follow `ReviewRule` exactly but replace `Category` with a conflict-specific category union:

```typescript
// Source: src/lib/config-review/types.ts (verified read)
// Parallel shape for src/lib/conflict/types.ts

export type ConflictCategory =
  | 'structural'         // subagent visibility, compaction survival
  | 'cross-file'         // instruction contradictions across files
  | 'within-file'        // same-file self-contradictions
  | 'duplicate';         // near-identical content across files

export interface ConflictFinding {
  ruleId: string;
  severity: Severity;          // reuse from config-review/types.ts
  category: ConflictCategory;
  files: string[];             // DIVERGE from ReviewFinding.file (string) — conflicts always involve 1+ files
  message: string;
  conflictingPhrases?: string[]; // the actual matching snippets, for display
  recommendation: string;
}

export interface ConflictRule {
  id: string;
  name: string;
  description: string;
  category: ConflictCategory;
  severity: Severity;
  check: (files: FileAnalysis[]) => ConflictFinding[];
}
```

Note: `files: string[]` (array) diverges from `ReviewFinding.file: string`. This is intentional — conflicts inherently span multiple files. The UI must handle both a single file (within-file) and multiple files (cross-file).

[VERIFIED: contradiction-rules.ts already uses `file: \`${aFiles} ↔ ${bFiles}\`` string concatenation — an array is cleaner for the new system]

### Pattern 2: Runner Shape

```typescript
// Source: src/lib/config-review/runner.ts (verified read)
// Mirrors runReview pattern exactly

export interface ConflictResult {
  findings: ConflictFinding[];
  structuralCount: number;     // subagent visibility + compaction risks
  crossFileCount: number;
  withinFileCount: number;
  duplicateCount: number;
  totalCount: number;
  filesAnalyzed: number;
  rulesExecuted: number;
}

export function runConflict(files: FileAnalysis[]): ConflictResult {
  // ... mirror runReview: iterate ALL_RULES, catch per-rule, sort by severity
}
```

### Pattern 3: Subagent Visibility Detection

```typescript
// Source: D-08, D-09 from CONTEXT.md + thresholds.ts (verified read)

const SUBAGENT_VISIBLE = new Set(SUBAGENT_BOOTSTRAP_FILES.map(f => f.toUpperCase()));

const IMPERATIVE_PHRASES = ['always', 'never', 'must', 'do not', "don't", 'should', 'shall'];
const AGENT_ACTION_KEYWORDS = ['delegate', 'route', 'assign', 'spawn', 'subagent', 'escalate', 'tool', 'model'];

function isSubagentHidden(filePath: string): boolean {
  const base = filePath.split('/').pop()?.toUpperCase() ?? '';
  return !SUBAGENT_VISIBLE.has(base);
}

// For each line in subagent-hidden file:
// Layer 1: matches any IMPERATIVE_PHRASES → flag
// Layer 2: matches any AGENT_ACTION_KEYWORDS → flag
```

[VERIFIED: SUBAGENT_BOOTSTRAP_FILES = ['AGENTS.md','TOOLS.md','SOUL.md','IDENTITY.md','USER.md'] from thresholds.ts]

### Pattern 4: Compaction Survival Detection

```typescript
// Source: D-10, D-11, D-12 from CONTEXT.md

const SAFE_SECTIONS = ['session startup', 'red lines']; // match case-insensitively

// Algorithm:
// 1. Get AGENTS.md file from files array
// 2. Split content into sections using heading boundaries
// 3. For each section NOT matching SAFE_SECTIONS (case-insensitive):
//    - Scan lines for IMPERATIVE_PHRASES
//    - Flag matching lines as compaction risk

// Use FileAnalysis.headings[] to identify section names
// Section content = lines between one heading and the next
```

### Pattern 5: Cross-file Contradiction Detection

Reuse `checkConflictPattern` approach from `contradiction-rules.ts`, but enhanced with more keyword pairs and returning `ConflictFinding[]` (with `files: string[]`):

```typescript
// Source: contradiction-rules.ts (verified read)
// Existing patterns to port/extend:
// - CONTRA_ESCALATION (already defined)
// - CONTRA_DELEGATION_THRESHOLD (already defined)
// - CONTRA_ALWAYS_NEVER (verbosity, already defined)
// NEW to add per spec: permission scope, communication style, error handling, tool preferences
```

### Pattern 6: page.tsx Integration

```typescript
// Source: src/app/page.tsx (verified read, lines 47-55, 97-106, 161-166)
// ConflictScannerView currently receives no props (line 325: <ConflictScannerView />)
// Need to:
// 1. Add: const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
// 2. Wherever runReview(analyzed) is called (3 locations), also call:
//    setConflictResult(runConflict(analyzed))
//    - buildMapFromTree (line ~165)
//    - loadDemoData (line ~100) — use pre-built demo data instead
//    - Demo mode useEffect (line ~74) — use pre-built demo data instead
// 3. Change: <ConflictScannerView /> to <ConflictScannerView conflictResult={conflictResult} />
```

[VERIFIED: All three call sites identified in page.tsx read]

### Pattern 7: UI Component Structure

```typescript
// ConflictScannerView receives conflictResult prop
// Structure mirrors ReviewView → ConfigHealthView chain:
// ConflictScannerView → ViewContextHeader + CategorySection(s)

// Category section: collapsible, shows count badge when collapsed
// Finding row: severity badge | file(s) | message + phrases | recommendation

// Severity colors (from ConfigHealthView patterns, verified read):
// critical: #da3633 (red)
// warning: #d97706 or similar amber
// info: #506880 (muted)

// Empty state: positive message, not blank panel (D-17)
```

### Pattern 8: Demo Data Shape

```typescript
// Source: src/lib/phase3-demo-data.ts (verified read — exports DEMO_DRIFT_REPORT, DEMO_SNAPSHOT, DEMO_BUDGET)
// Add parallel export: DEMO_CONFLICT_RESULT: ConflictResult
// Must have at least one finding per category (D-19)
// Wire in page.tsx demo paths same as DEMO_DRIFT_REPORT (D-20)
```

### Anti-Patterns to Avoid

- **Touching contradiction-rules.ts or config-review/ at all** — D-03 locks this. The two systems are independent.
- **Sharing rule instances between ReviewView and ConflictScannerView** — each view runs its own scan.
- **String concatenation for multi-file references** — `contradiction-rules.ts` uses `"${aFiles} ↔ ${bFiles}"` as a string hack. The new system should use `files: string[]` properly.
- **Scanning non-markdown files** — conflict rules operate on `FileAnalysis[]` which is already filtered to `.md` bootstrap files by the time the runner receives it.
- **Imperative detection without section awareness for AGENTS.md compaction check** — scanning all lines in AGENTS.md for imperatives would produce massive false positives. Only flag imperatives in sections OUTSIDE the two safe headings.
- **Using `FileAnalysis.headings[]` alone to detect sections** — `headings` gives heading text but not the lines of content under each heading. Section content requires re-parsing `content` with heading boundaries.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate detection | Custom similarity algorithm | `jaccard()` from contradiction-rules.ts | Already tested, 0.80 threshold established |
| Keyword matching | Custom regex engine | `findMatches(content, keywords)` from contradiction-rules.ts | Already handles case-insensitive, returns matches |
| File parsing | New markdown parser | `FileAnalysis.content` + `FileAnalysis.headings[]` already computed | Re-parsing is wasted work |
| Severity type | New enum | Import `Severity` from `@/lib/config-review/types` | Shared type, no duplication |
| UI collapsible | Custom accordion | React `useState(false)` + CSS `grid-template-rows` trick | Same pattern as `ViewContextHeader` |

**Key insight:** The two reusable helpers (`findMatches` and `jaccard`) in `contradiction-rules.ts` should be extracted to a shared location (e.g., `src/lib/conflict/helpers.ts`) rather than duplicated. The contradiction-rules.ts versions are internal unexported functions — copy them into the conflict lib.

---

## Common Pitfalls

### Pitfall 1: Section Boundary Detection in AGENTS.md

**What goes wrong:** Checking if a line is in a "safe" section by searching `FileAnalysis.headings[]` doesn't tell you which section each line of content belongs to. You need to walk the raw content line-by-line, tracking the current heading.

**Why it happens:** `headings` is an array of heading text strings — it doesn't preserve position. Re-reading `FileAnalysis.content` and tracking current section state is required.

**How to avoid:** Write a `parseSections(content: string): Map<string, string>` helper that splits content into `{sectionName -> sectionContent}` using heading regex, then check if `sectionName.toLowerCase()` is in the safe list.

**Warning signs:** If the compaction rule fires on content inside `## Session Startup`, the section tracking logic is wrong.

### Pitfall 2: Within-File Self-Conflict False Positives

**What goes wrong:** Applying the same cross-file keyword pair approach to within-file detection produces very high false positive rates. A single file intentionally uses both sides of a keyword pair (e.g., "always delegate code… but handle trivial tasks directly").

**Why it happens:** Within-file contradictions require understanding that two phrases are in *different sections* addressing the *same topic*, not just both present.

**How to avoid:** Limit within-file detection to the highest-confidence patterns only (e.g., `always X` and `never X` in the same sentence, or identical section headings with contradicting content). Accept lower recall in exchange for near-zero false positives.

### Pitfall 3: Model Identifier Pattern Too Broad

**What goes wrong:** Regex for model names like `claude` or `gpt` matches commentary, file paths, and prose that isn't actually a model assignment (e.g., "I was built by Anthropic using claude-level reasoning").

**Why it happens:** Model identifiers appear in many contexts, not just assignment directives.

**How to avoid:** Require the model identifier to appear on a line that also contains an assignment indicator: a table cell (`|`), an equals sign, "model:", "use", or "assigned to". E.g., `/\|\s*[^|]+\|\s*(claude|gpt|gemini)\S*/i`.

### Pitfall 4: page.tsx Integration — Three Call Sites

**What goes wrong:** Only updating the `buildMapFromTree` code path, forgetting that demo mode uses a `useEffect` and `loadDemoData()` to initialize state. ConflictScannerView in demo mode shows null.

**Why it happens:** page.tsx has three places where `runReview` is called or demo data is set (lines ~74, ~97, ~165). All three need parallel conflict handling.

**How to avoid:** Search for `runReview` in page.tsx and also check both demo-mode call sites. Demo mode uses pre-built `DEMO_CONFLICT_RESULT` (not live `runConflict()`) to keep the demo deterministic.

### Pitfall 5: vitest.config.ts Include Pattern

**What goes wrong:** Test file named `conflict.test.ts` gets picked up, but `__tests__/conflict.test.ts` does not match `src/**/*.test.ts` if placed incorrectly.

**Why it happens:** vitest.config.ts uses `include: ["src/**/*.test.ts"]`. The `__tests__/` directory is within `src/`, so `src/lib/conflict/__tests__/conflict.test.ts` will match. Verified.

**How to avoid:** Name test files `*.test.ts` (not `*.spec.ts`) and place them under `src/`.

[VERIFIED: vitest.config.ts read directly]

---

## Code Examples

### Reusable helpers to copy into `src/lib/conflict/helpers.ts`

```typescript
// Source: src/lib/config-review/rules/contradiction-rules.ts (verified read, lines 41-84)

export function findMatches(content: string, keywords: string[]): string[] {
  const lower = content.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
```

### Section parser for AGENTS.md compaction detection

```typescript
// Source: Pattern derived from FileAnalysis.headings[] approach (verified in analyze-file.ts)
// This is new logic, no existing equivalent

export function parseSections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split('\n');
  let currentHeading = '__preamble__';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^#{1,6}\s+(.+)/.exec(line);
    if (headingMatch) {
      sections.set(currentHeading, currentLines.join('\n'));
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  sections.set(currentHeading, currentLines.join('\n'));
  return sections;
}
```

### Vitest test structure to follow

```typescript
// Source: src/lib/config-review/__tests__/rules.test.ts (verified read)

import { describe, test, expect } from 'vitest';
import { analyzeFile } from '@/lib/config-review/analyze-file';
import { runConflict } from '@/lib/conflict/runner';

function makeFile(path: string, content: string) {
  return analyzeFile(path, content);
}

describe('structural rules — subagent visibility', () => {
  test('imperative phrase in HEARTBEAT.md fires', () => {
    const files = [makeFile('HEARTBEAT.md', '## Rules\nAlways route code tasks to sonnet.')];
    const result = runConflict(files);
    const findings = result.findings.filter(f => f.category === 'structural');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  test('imperative phrase in AGENTS.md does NOT fire subagent gap', () => {
    const files = [makeFile('AGENTS.md', '## Delegation\nAlways delegate code tasks.')];
    const result = runConflict(files);
    const subagentFindings = result.findings.filter(
      f => f.category === 'structural' && f.ruleId.includes('SUBAGENT')
    );
    expect(subagentFindings).toHaveLength(0);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact on This Phase |
|--------------|------------------|---------------------|
| `ReviewFinding.file: string` with concatenation | New: `ConflictFinding.files: string[]` | Cleaner multi-file display in UI |
| No conflict view exists | Replacing stub with real view | Full implementation needed |
| Contradiction rules embedded in config-review | New: dedicated conflict subsystem | Parallel, independent system per D-01 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `parseSections()` must re-parse `content` line-by-line because `FileAnalysis.headings[]` doesn't preserve line positions | Architecture Patterns (Pitfall 1) | Low — headings[] is a flat array with no position data, confirmed by reading analyze-file.ts |
| A2 | The TypeScript errors in `.next/types/validator.ts` are pre-existing stale artifacts from generated types, not new breakage | Environment Availability | Low risk — these are about missing route files (admin/cost-tracking) that don't relate to the conflict scanner feature. `npx tsc --noEmit` with `exclude: ["node_modules"]` in tsconfig.json would not include `.next/` |
| A3 | Demo mode should use a pre-computed `DEMO_CONFLICT_RESULT` rather than running `runConflict()` live on demo data | Architecture Patterns | Low — consistent with how DEMO_DRIFT_REPORT and DEMO_BUDGET work (pre-built constants, not computed) |

---

## Open Questions

1. **Where does demo conflict data live: `phase3-demo-data.ts` or a new `conflict-demo-data.ts`?**
   - What we know: D-19 says "phase3-demo-data.ts (or a new conflict-demo-data.ts)". `phase3-demo-data.ts` is already 300+ lines.
   - What's unclear: Whether adding conflict demo data to the existing file risks it becoming unwieldy.
   - Recommendation: Create `src/lib/conflict-demo-data.ts` for cleaner separation. Import it into page.tsx alongside the existing phase3 import.

2. **Should `ConflictScannerView` own collapsible state internally or receive it as props?**
   - What we know: `ConfigHealthView` manages all its own UI state internally. The pattern is self-contained views.
   - What's unclear: Nothing — the pattern is clear.
   - Recommendation: `ConflictScannerView` manages its own collapsed/expanded state per category via `useState`. No props needed for that.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is pure code/config changes. All dependencies (Next.js, Vitest, TypeScript) are already installed and verified by the existing codebase.

Pre-existing TypeScript errors in `.next/types/validator.ts` are stale generated types referencing route files that don't exist (admin/cost-tracking). These are NOT caused by this phase and do not affect `vitest run`. The conflict scanner planner should document a verification gate of `npx vitest run` (not `npx tsc --noEmit`) to avoid false failures.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/conflict` |
| Full suite command | `npx vitest run` |

[VERIFIED: vitest.config.ts read directly, include pattern: `src/**/*.test.ts`]

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File |
|----------|-----------|-------------------|------|
| Subagent visibility gap detection fires on HEARTBEAT.md/BOOTSTRAP.md/MEMORY.md | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| Subagent visibility gap does NOT fire on AGENTS.md/SOUL.md/TOOLS.md/IDENTITY.md/USER.md | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| Compaction survival risk fires on imperative outside safe sections | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| Compaction survival risk does NOT fire inside `## Session Startup` or `## Red Lines` | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| Cross-file escalation conflict fires (existing CONTRA_ESCALATION pattern) | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| No false positive on clean files | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| Duplicate paragraph (Jaccard >= 0.80) across files fires | unit | `npx vitest run src/lib/conflict` | Wave 0 |
| `runConflict` returns correct category counts | unit | `npx vitest run src/lib/conflict` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/conflict`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npx vitest run` green before marking phase complete

### Wave 0 Gaps
- [ ] `src/lib/conflict/__tests__/conflict.test.ts` — all detection rules
- [ ] `src/lib/conflict/helpers.ts` — shared helpers (no dedicated test file needed; tested via rules)

---

## Security Domain

Not applicable. This phase performs read-only pattern matching on already-loaded `FileAnalysis[]` objects. No network calls, no auth, no external data. All analysis runs client-side in browser memory.

---

## Project Constraints (from CLAUDE.md)

The workspace `CLAUDE.md` is a symlink to the universal operating manual. Project-specific constraints come from `PROJECT.md` (read directly):

| Constraint | Source | Impact on This Phase |
|------------|--------|----------------------|
| Client-side only — no server calls | PROJECT.md non-negotiable | Conflict runner must be pure functions, no fetch() |
| No LLM calls | PROJECT.md non-negotiable | Pattern matching only — confirmed in scope |
| Match existing visual quality | PROJECT.md non-negotiable | Use existing dark aesthetic, follow ConfigHealthView patterns |
| TypeScript strict mode, no `any` | PROJECT.md non-negotiable | All ConflictFinding/ConflictRule types must be fully typed |
| Vitest test coverage for new analysis logic | PROJECT.md non-negotiable | `src/lib/conflict/__tests__/` required |

[VERIFIED: PROJECT.md read directly]

---

## Sources

### Primary (HIGH confidence)
- `src/lib/config-review/types.ts` — ReviewRule, ReviewFinding, FileAnalysis interfaces
- `src/lib/config-review/runner.ts` — ReviewResult shape, runReview pattern
- `src/lib/config-review/rules/contradiction-rules.ts` — findMatches, jaccard, ConflictPattern, checkConflictPattern
- `src/lib/config-review/thresholds.ts` — SUBAGENT_BOOTSTRAP_FILES, BOOTSTRAP_FILE_ORDER (both verified [SOURCE])
- `src/lib/config-review/__tests__/rules.test.ts` — test structure and helper patterns
- `src/lib/config-review/analyze-file.ts` — analyzeFile, FileAnalysis construction
- `src/app/page.tsx` — All three call sites for runReview, ConflictScannerView integration point
- `src/components/map/views/ConflictScannerView.tsx` — Current placeholder (no props)
- `src/components/map/views/ReviewView.tsx` — ViewContextHeader usage pattern
- `src/components/map/views/ConfigHealthView.tsx` — Color tokens, UI patterns
- `src/components/map/MapSidebar.tsx` — View type confirmed includes 'conflict'
- `src/components/guidance/ViewContextHeader.tsx` — Reusable hint banner pattern
- `package.json` — Confirmed stack versions, no new deps needed
- `vitest.config.ts` — Test include pattern `src/**/*.test.ts`
- `.planning/phases/01-conflict-scanner/01-CONTEXT.md` — All locked decisions
- `/mnt/c/Users/conta/Documents/shared-brain/specs/driftwatch/conflict-scanner-gsd.md` — Domain knowledge (session visibility, compaction survival)

### Secondary (MEDIUM confidence)
- None needed — all critical findings verified directly from source files.

### Tertiary (LOW confidence)
- None — no claims in this research rely on unverified sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — read directly from package.json and existing source
- Architecture patterns: HIGH — mirrored from existing verified codebase patterns
- Pitfalls: HIGH — derived from direct code inspection of contradictions-rules.ts and page.tsx

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable codebase — no external deps changing)
