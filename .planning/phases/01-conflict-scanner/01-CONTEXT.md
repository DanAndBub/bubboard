# Phase 1: Conflict Scanner - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Conflict Scanner for Driftwatch — a new analysis view that detects instruction conflicts across OpenClaw bootstrap files using client-side pattern matching only. Replaces the ConflictScannerView.tsx placeholder with a real, working feature.

Scope includes: detection engine, UI, demo data. Does NOT include LLM-powered semantic analysis (pro tier, future phase).
</domain>

<decisions>
## Implementation Decisions

### Architecture
- **D-01:** New `src/lib/conflict/` subsystem — parallel to `src/lib/config-review/`, not an extension of it
- **D-02:** Conflict scanner has its own types (`src/lib/conflict/types.ts`), runner, and rule modules
- **D-03:** Existing `contradiction-rules.ts` stays in `config-review/` and continues surfacing in ReviewView — no changes to that system
- **D-04:** ConflictScannerView gets its own richer ruleset; the two views are independent (not sharing results)

### Input data
- **D-05:** Input is `FileAnalysis[]` from `src/lib/config-review/analyze-file.ts` — already computed when scan runs, includes `content`, `path`, `headings`. Same input as ReviewView.
- **D-06:** No new file parsing needed; conflict runner reuses the same `FileAnalysis[]` the orchestrator already has

### Detection categories (in priority order)
- **D-07:** Four categories, each its own rule module:
  1. **Structural** — subagent visibility gaps + compaction survival risks (OpenClaw-specific, highest value)
  2. **Cross-file conflicts** — escalation, delegation, verbosity, permission scope, communication style, error handling, tool preferences
  3. **Within-file self-conflicts** — same file contradicts itself across sections
  4. **Duplicates** — near-identical paragraphs across files (Jaccard similarity, reuse existing approach from contradiction-rules.ts)

### Subagent visibility detection
- **D-08:** Two-layer detection in subagent-hidden files (HEARTBEAT.md, BOOTSTRAP.md, MEMORY.md):
  - Layer 1: Imperative phrases — `always`, `never`, `must`, `do not`, `don't`, `should`, `shall`
  - Layer 2: Agent-action keywords — `delegate`, `route`, `assign`, `spawn`, `subagent`, `escalate`, `tool`, `model`
  - Any line matching either layer → flagged as subagent visibility gap
- **D-09:** Use `SUBAGENT_BOOTSTRAP_FILES` from thresholds.ts to determine which files are visible vs hidden (already source-verified)

### Compaction survival detection
- **D-10:** Parse AGENTS.md headings to detect content outside `## Session Startup` and `## Red Lines` (case-insensitive)
- **D-11:** Flag imperative-phrase lines in AGENTS.md sections that are NOT under those two headings as compaction risk
- **D-12:** Section names must match exactly (case-insensitive) — use `FileAnalysis.headings[]` for section detection

### Model assignment conflicts
- **D-13:** Scan all files for model identifiers (e.g. `claude-opus`, `claude-sonnet`, `claude-haiku`, `gpt-4`, `gemini`) and flag if different files assign different models to the same task type or agent role

### UI presentation
- **D-14:** Group findings by category in the ConflictScannerView: Structural Issues → Cross-File Conflicts → Within-File Conflicts → Duplicates
- **D-15:** Each category renders as a collapsible section with a finding count badge
- **D-16:** Individual findings show: severity badge, affected file(s), the conflicting phrases/lines, and a recommendation
- **D-17:** Empty state (no conflicts found) shows a positive confirmation — not a blank panel
- **D-18:** Match existing dark aesthetic exactly: `#0a0e17` background, `#3b82f6` accent, severity colors from ReviewView

### Demo data
- **D-19:** Add conflict scanner demo data to `src/lib/phase3-demo-data.ts` (or a new `src/lib/conflict-demo-data.ts`) — should demonstrate at least one finding from each category
- **D-20:** Demo mode wires through the same path as real scans — ConflictScannerView receives pre-computed demo results

### Testing
- **D-21:** Unit tests in `src/lib/conflict/__tests__/` covering the runner and each rule module
- **D-22:** Test each detection type with positive (conflict found) and negative (no conflict) cases
- **D-23:** Follow existing Vitest patterns from `src/lib/config-review/__tests__/rules.test.ts`

### Claude's Discretion
- Exact keyword lists within each conflict category (escalation, delegation, etc.) — extend the patterns already in contradiction-rules.ts as a baseline
- Jaccard similarity threshold for duplicate detection (existing code uses 0.80 — reasonable to keep)
- Exact color/icon choices for severity badges (follow ReviewView patterns)
- Whether `ConflictResult` type mirrors `ReviewResult` shape or diverges where needed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec
- `/mnt/c/Users/conta/Documents/shared-brain/specs/driftwatch/conflict-scanner-gsd.md` — Full feature spec with conflict categories, domain knowledge, and hard constraints

### Existing patterns to follow
- `src/lib/config-review/types.ts` — ReviewRule, ReviewFinding, FileAnalysis interfaces (follow this shape)
- `src/lib/config-review/runner.ts` — Rule runner pattern (conflict runner should mirror this)
- `src/lib/config-review/rules/contradiction-rules.ts` — Existing conflict detection logic (reuse findMatches, jaccard helpers; extend keyword lists)
- `src/lib/config-review/__tests__/rules.test.ts` — Test structure to follow

### Constants (source-verified)
- `src/lib/config-review/thresholds.ts` — `BOOTSTRAP_FILE_ORDER`, `SUBAGENT_BOOTSTRAP_FILES`, per-file limits (use these, don't redefine)

### Integration points
- `src/components/map/views/ConflictScannerView.tsx` — Placeholder to replace
- `src/app/page.tsx` — Orchestration layer; ConflictScannerView is rendered here, needs to receive ConflictResult as prop
- `src/lib/phase3-demo-data.ts` — Demo data pattern to follow for conflict demo data
- `src/components/map/views/ReviewView.tsx` — UI pattern reference for findings display
- `src/components/map/views/ConfigHealthView.tsx` — Secondary UI reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `findMatches(content, keywords)` in `contradiction-rules.ts` — extract to shared helper or copy into conflict lib
- `jaccard(setA, setB)` in `contradiction-rules.ts` — duplicate detection similarity function, reuse directly
- `SUBAGENT_BOOTSTRAP_FILES` in `thresholds.ts` — authoritative list of files visible to subagents
- `BOOTSTRAP_FILE_ORDER` in `thresholds.ts` — file ordering and full file list
- `FileAnalysis` from `config-review/types.ts` — already has `content`, `path`, `headings`, `sectionCount` — everything conflict detection needs

### Established Patterns
- Rule pattern: export `const conflictRules: ConflictRule[]` from each rule module, spread into ALL_RULES in runner
- Findings are value objects (plain data, no methods) — `ConflictFinding` should follow `ReviewFinding` shape
- Pure functions only in `src/lib/` — no React, no side effects
- Types co-located in `types.ts` per subsystem directory
- Test files in `__tests__/` subdirectory, co-located with source

### Integration Points
- `src/app/page.tsx` holds all scan state — ConflictScannerView needs a `conflictResult` prop added alongside `reviewResult`
- `src/components/map/MapSidebar.tsx` — conflict view nav tab is likely already wired (check `activeView` type includes `'conflict'`)
- Conflict runner runs after scan completes, same trigger as `runReview()`

</code_context>

<specifics>
## Specific Ideas

- Subagent visibility detection uses a two-layer approach: imperative phrases (always, never, must, do not, don't, should, shall) PLUS agent-action keywords (delegate, route, assign, spawn, subagent, escalate, tool, model) — any line matching either layer gets flagged
- Compaction survival: parse AGENTS.md sections; flag imperative-phrase lines outside `## Session Startup` and `## Red Lines`

</specifics>

<deferred>
## Deferred Ideas

- LLM-powered semantic conflict detection — pro tier, future phase (explicitly out of scope)
- Conflict severity scoring / overall conflict health score — could be a follow-up
- Fix for `isBootstrapFile` duplication (CONCERNS.md) — unrelated tech debt, not this phase

</deferred>

---

*Phase: 01-conflict-scanner*
*Context gathered: 2026-04-05*
