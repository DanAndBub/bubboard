# CC SPEC: DriftwatchV4 Phase 3 — Cleanup, Route, and Drift Focus

## Goal
Strip legacy naming, remove the Overview page, fix the demo banner bug, redesign the drift report to focus exclusively on character count drift and truncation risk, update the Config Review intro copy, and make the scan page the root landing page. This is a subtractive + rename phase — the app should feel tighter and more purposeful after this.

## Context
- Project: driftwatch (public repo `DanAndBub/Driftwatch`)
- Branch: Continue working on the existing V4 branch. Check which V4 branch exists (`git branch | grep v4`). If multiple exist, use the most recent one (likely `v4/phase-2-config-visual` or `v4/phase-1-strip`). Do NOT create a new branch — all V4 work accumulates on one branch. Nothing merges to master until the full V4 is ready.
- Key files to modify:
  - `src/components/map/MapTopBar.tsx` — rename button + remove breadcrumb
  - `src/components/map/ResetDialog.tsx` — update dialog copy
  - `src/components/map/MapSidebar.tsx` — remove Overview nav item, change default view
  - `src/components/map/views/OverviewView.tsx` — DELETE
  - `src/components/guidance/DemoBanner.tsx` — fix "Scan yours" link behavior
  - `src/components/guidance/ViewContextHeader.tsx` — no structural changes (used by review copy update)
  - `src/components/map/views/ReviewView.tsx` — update ViewContextHeader copy
  - `src/components/map/views/DriftView.tsx` — update ViewContextHeader copy
  - `src/components/drift/DriftReport.tsx` — redesign: strip to char counts + truncation
  - `src/lib/drift/types.ts` — remove unused fields from DriftReport interface
  - `src/lib/drift/diff-engine.ts` — stop computing removed fields
  - `src/lib/drift/session-notes.ts` — update to match new DriftReport shape
  - `src/lib/phase3-demo-data.ts` — update DEMO_DRIFT_REPORT to match new shape
  - `src/lib/drift/__tests__/diff-engine.test.ts` — update tests
  - `src/app/map/page.tsx` — change default view from 'overview' to 'review', update handleNewMap, remove Overview references
  - `src/app/page.tsx` — replace marketing landing page with scan tool
  - `src/app/cost-tracking/page.tsx` — update redirect if it references /map
- Dependencies: None

## Constraints
- Do NOT add new npm dependencies
- Do NOT modify the scan engine, config review rules, or file analysis logic
- Do NOT touch cost tracking functionality (it stays as-is in the sidebar)
- Do NOT modify the editor panel or its behavior
- Do NOT change the snapshot download/upload mechanism — only what the drift report DISPLAYS
- The diff-engine still computes `filesAdded` and `filesRemoved` internally (needed for snapshot integrity) — just don't display them and remove from the DriftReport type's UI-facing fields
- Keep `ViewContextHeader` component unchanged — only update the string props passed to it

## Steps

### Step 1: Rename "map" → "scan" in UI copy + remove breadcrumb

**MapTopBar.tsx:**
- Change button text `"New map"` → `"New scan"`
- Remove the breadcrumb elements: the `/` separator span and the `"Agent Map"` span. Keep only `"Driftwatch"` and the ◈ logo.

**ResetDialog.tsx:**
- Change dialog title `"Reset map"` → `"Reset scan"`
- Change always-on checkbox label `"Reset map & config data"` → `"Reset config data"`
- The "Clear cost data" checkbox: REMOVE entirely. Cost tracking is being kept but we don't need a separate clear option in the reset dialog.
- The "Clear drift snapshots" checkbox: keep as-is

**MapTopBar.tsx prop/function names:** Leave `onNewMap`, `showNewMap` etc. as-is internally — this is a user-facing copy change, not a refactor.

**Gate:** `npx tsc --noEmit` passes. `grep -rn "Agent Map" src/components/map/` returns zero results. `grep -rn "New map" src/components/map/` returns zero results. `grep -rn "Reset map" src/components/map/` returns zero results.

### Step 2: Remove Overview page + set Config Review as default + fix demo banner

**Delete** `src/components/map/views/OverviewView.tsx`

**MapSidebar.tsx:**
- Remove the Overview nav item from the sidebar (the `◉ Overview` button)
- The Views section should now contain: Files, Cost Tracking (Agents is already removed per Phase 1)
- If the Views section label "Views" feels redundant with only 2 items remaining, keep it anyway — it maintains the visual structure

**`src/app/map/page.tsx`:**
- Change default `activeView` from `'overview'` to `'review'`
- Remove the `'overview'` option from the valid views array
- Remove any import of `OverviewView`
- Remove the `case 'overview':` (or equivalent conditional) rendering block
- In `handleNewMap`, change `setActiveView('overview')` → `setActiveView('review')`
- In demo mode initialization, if it defaults to overview, change to review
- Remove the `healthScore` and `health` state/computation if they are ONLY used by OverviewView. Read the code first — if other views reference health score, leave it.

**Demo mode flow:**
- In demo mode (`?demo=true`), the app should now load directly into the Config Review view instead of Overview
- The Overview-specific demo data in `phase3-demo-data.ts` can stay (it's not hurting anything and other views reference the same data objects)

**DemoBanner.tsx:**
- The "Scan yours →" link currently uses `<Link href="/map">` which navigates to `/map` — but since the user is already ON `/map`, this effectively does nothing and the banner's dismiss behavior fires
- Fix: Change the link to call a callback that triggers the scan input screen. Add an `onScanYours` prop:

```tsx
interface DemoBannerProps {
  isDemo: boolean;
  onScanYours?: () => void;
}
```

- Replace the `<Link>` with a `<button>` that calls `onScanYours`:

```tsx
<button
  onClick={onScanYours}
  className="text-[#5a8aaa] hover:text-[#7aaac8] underline underline-offset-2 transition-colors"
>
  Scan yours →
</button>
```

- In `page.tsx`, pass `onScanYours` that:
  1. Calls `handleNewMap({ clearCosts: false, clearSnapshots: false })` (resets to scan input)
  2. Removes `?demo=true` from URL: `window.history.pushState({}, '', '/map')`

**Gate:** `npx tsc --noEmit` passes. `grep -rn "OverviewView" src/` returns zero results. `grep -rn "'overview'" src/app/map/page.tsx` returns zero results (except possibly comments). App loads demo mode and lands on Config Review view.

### Step 3: Redesign drift report — strip to char counts + truncation focus

This step modifies the data layer and UI. Work bottom-up: types → engine → demo data → UI.

**3a. Update `src/lib/drift/types.ts`:**

Remove these fields from the `DriftReport` interface:
- `filesAdded`
- `filesRemoved`
- `filesUnchanged`
- `significantGrowth`
- `possibleAgentBloat`
- `healthScoreDelta`
- `newFindings`
- `resolvedFindings`
- `persistentFindings`
- `agentTopologyChanges`

Rename:
- `budgetDelta` → `totalCharsDelta`

The `DriftReport` interface should become:

```typescript
export interface DriftReport {
  previousTimestamp: string;
  currentTimestamp: string;
  daysBetween: number;
  filesChanged: FileChange[];
  totalCharsDelta: number;
}
```

The `FileChange` interface stays as-is (it already has `charCountDelta`, `percentGrowth`, `headingsAdded`, `headingsRemoved`, `contentHashChanged`).

**3b. Update `src/lib/drift/diff-engine.ts`:**

- Stop computing: `filesAdded`, `filesRemoved`, `filesUnchanged`, `significantGrowth`, `possibleAgentBloat`, `healthScoreDelta`, `newFindings`, `resolvedFindings`, `persistentFindings`, `agentTopologyChanges`
- Remove the `ReviewFinding` import if no longer needed
- Rename `budgetDelta` → `totalCharsDelta` in the return object
- The `filesChanged` array should now include ALL files that exist in BOTH snapshots where `contentHash` differs — same logic as before, just no longer categorized into added/removed/unchanged
- Files that only exist in one snapshot (added/removed) should be silently skipped — don't include them in `filesChanged`

The streamlined `computeDrift` return:

```typescript
return {
  previousTimestamp: previous.timestamp,
  currentTimestamp: current.timestamp,
  daysBetween,
  filesChanged,
  totalCharsDelta: current.workspaceSummary.totalChars - previous.workspaceSummary.totalChars,
};
```

**3c. Update `src/lib/drift/session-notes.ts`:**

- Remove references to `drift.filesAdded`, `drift.filesRemoved`, `drift.healthScoreDelta`
- Update `drift.budgetDelta` → `drift.totalCharsDelta`
- Label it "All bootstrap files combined" instead of "Budget"
- Keep the per-file change list (it uses `drift.filesChanged` which still exists)

**3d. Update `src/lib/phase3-demo-data.ts`:**

Update `DEMO_DRIFT_REPORT` to match the new `DriftReport` shape. Remove all the deleted fields. Keep `filesChanged` array as-is (the 3 changed files with their deltas). Rename `budgetDelta` → `totalCharsDelta`.

**3e. Update `src/lib/drift/__tests__/diff-engine.test.ts`:**

- Remove or update tests for: `filesAdded`, `filesRemoved`, `filesUnchanged`, `healthScoreDelta`, `newFindings`, `resolvedFindings`, `agentTopologyChanges`
- Update the `budgetDelta` test to use `totalCharsDelta`
- Keep/add tests for: `filesChanged` (char deltas, heading changes), `totalCharsDelta`, `daysBetween`

**3f. Update `src/components/drift/DriftReport.tsx`:**

Strip the UI to show only:
1. **Header:** Time comparison (days between scans) — keep as-is
2. **Summary stat:** "All bootstrap files combined: +X chars" (was "Budget: +X chars")
3. **Changed files list:** Each file shows char delta, percent growth, and expandable heading changes — keep the existing expandable row pattern, it works well
4. **Remove:** Files added/removed sections, finding changes section, agent topology section, health score delta, "files unchanged" footer

The `DriftReport.tsx` component no longer needs to import `ReviewFinding`.

**Gate:** `npx tsc --noEmit` passes. `npm test` passes (drift tests updated). `grep -rn "filesAdded\|filesRemoved\|healthScoreDelta\|agentTopology\|newFindings\|resolvedFindings\|persistentFindings\|possibleAgentBloat\|significantGrowth" src/lib/drift/types.ts` returns zero results.

### Step 4: Update view intro copy + make scan page the root landing page

**4a. Config Review intro copy (`ReviewView.tsx`):**

Update the `ViewContextHeader` props:

```tsx
<ViewContextHeader
  viewId="review"
  oneLiner="Your config files, checked for issues that silently break your agent."
  expandedDetail="Each finding below is something that can degrade your agent's performance without any visible error. Truncation means your agent literally cannot see parts of your instructions. Oversized files waste token budget on every single message. Structural issues like missing compaction headings mean your agent loses critical context during long conversations. Critical findings first — those are actively hurting your agent right now."
/>
```

**4b. Drift Report intro copy (`DriftView.tsx`):**

Update the `ViewContextHeader` props:

```tsx
<ViewContextHeader
  viewId="drift"
  oneLiner="How your config files changed between scans."
  expandedDetail="Snapshot your workspace, come back later, and compare. Drift detection tracks character count changes and section-level shifts across your bootstrap files. Catch unreviewed agent edits, creeping file growth, and content that quietly crossed a truncation threshold."
/>
```

**4c. Make scan page the root URL:**

The current `src/app/page.tsx` is a marketing landing page. The current `src/app/map/page.tsx` is the actual tool.

Strategy: Move the tool to `/` and set up `/map` as a redirect for backwards compatibility.

1. **Move** the content of `src/app/map/page.tsx` to `src/app/page.tsx` (replace the marketing page entirely)
2. **Create** `src/app/map/page.tsx` as a simple redirect:

```tsx
import { redirect } from 'next/navigation';

export default function MapRedirect() {
  redirect('/');
}
```

3. **Update all internal links** that reference `/map`:
   - `DemoBanner.tsx` — already being changed to a callback in Step 2
   - `src/app/cost-tracking/page.tsx` — if it redirects to `/map`, change to `/`
   - Any other `href="/map"` references — search with `grep -rn '"/map"' src/` and update
   - Demo mode link: change `href="/map?demo=true"` → `href="/?demo=true"`

4. **Move** `src/app/map/layout.tsx` to `src/app/layout.tsx` if a map-specific layout exists, or merge its content. Read the files first to determine if there's a map-specific layout.

5. **Move** supporting components that lived under `src/app/map/` (if any page-level components exist there beyond page.tsx) — but the actual components are in `src/components/map/` which doesn't need to move.

6. **Delete** the old marketing page components that are no longer used:
   - `src/components/LandingDemo.tsx`
   - `src/components/CompactDemo.tsx`
   - `src/components/WaitlistForm.tsx`
   - `src/components/Footer.tsx` (if only used by landing page)
   - `src/app/api/waitlist/route.ts` (if exists)
   
   Before deleting each, verify it's not imported elsewhere with `grep -rn "ComponentName" src/`.

7. **Update the scan page intro message.** The current "How Driftwatch works" section with the 3-step explainer needs to be replaced with tighter copy. Replace the entire `<div className="max-w-2xl mx-auto px-4 pb-8">` block containing the explainer with:

```tsx
<div className="max-w-2xl mx-auto px-4 pb-8 text-center">
  <h2 className="text-xl font-semibold text-[#f1f5f9] mb-3">
    See what your agent can't see.
  </h2>
  <p className="text-sm text-[#b0bec9] leading-relaxed max-w-md mx-auto">
    Scan your OpenClaw workspace to find truncated config, silent drift, and wasted token budget.
    Everything runs in your browser — nothing is uploaded.
  </p>
</div>
```

**Gate:** `npx tsc --noEmit` passes. `npm run build` passes. Navigating to `/` shows the scan tool. Navigating to `/map` redirects to `/`. `grep -rn '"/map"' src/` returns only the redirect file. `grep -rn "LandingDemo\|CompactDemo\|WaitlistForm" src/` returns zero results (after deletions).

## ⛔ STOP conditions
- Prior V4 phases have not been completed — if `OverviewView.tsx` doesn't exist or Agents/Files/Cost Tracking views are still present, Phase 1 wasn't run. If config review visual updates from Phase 2 are missing, Phase 2 wasn't run. Escalate to Dan.
- `OverviewView` is imported by files other than `page.tsx` and `MapSidebar` — indicates deeper integration than expected
- The health score (`calculateHealthScore`) is used by views other than Overview — need to assess impact before removing Overview
- `src/app/map/` has a `layout.tsx` with non-trivial logic that can't be trivially merged into the root layout
- `DemoBanner` is rendered from somewhere other than `page.tsx` — the `onScanYours` callback wiring assumption may be wrong
- Existing tests reference `/map` routes in a way that would break with the redirect

## Acceptance Criteria
- [ ] Top bar shows "Driftwatch" only — no "/ Agent Map" breadcrumb
- [ ] Top-right button reads "New scan", dialog title reads "Reset scan"
- [ ] Reset dialog checkbox reads "Reset config data" (not "Reset map & config data")
- [ ] Cost data clear checkbox removed from reset dialog
- [ ] No Overview nav item in sidebar
- [ ] App defaults to Config Review view after scan (both normal and demo mode)
- [ ] Demo banner "Scan yours →" navigates to scan input (not disappearing)
- [ ] Drift report shows only: time comparison, "All bootstrap files combined" delta, per-file char deltas with heading changes
- [ ] Drift report does NOT show: files added/removed, health score delta, finding changes, agent topology, files unchanged
- [ ] Config Review ViewContextHeader explains what findings mean and why they matter
- [ ] Drift View ViewContextHeader explains char count drift and truncation threshold crossing
- [ ] Root URL `/` shows the scan tool directly
- [ ] `/map` redirects to `/`
- [ ] `/map?demo=true` redirects to `/?demo=true` (preserve query params in redirect)
- [ ] Old landing page components (LandingDemo, CompactDemo, WaitlistForm) are deleted
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] NEEDS DAN: Visual review of full app after changes (drift report, config review copy, scan page copy, route behavior)

## Anti-Slop Note
🎯 ANTI-SLOP: The generic approach would be "Welcome to Driftwatch! Our powerful tool helps you monitor your AI agent configurations with ease."
  Instead: One declarative sentence that names the pain ("See what your agent can't see"), one sentence of specifics (truncated config, drift, budget waste), one line of trust ("browser-only, nothing uploaded"). No feature lists, no emoji pills, no gradient CTAs.
  Reference: Linear's landing page — tool-first, copy-minimal, lets the product speak.

## Edge Cases
⚠️ The `/map` redirect must preserve query params (`?demo=true`, `?view=costs`) → Use Next.js `redirect()` with the full URL including search params, or use middleware for a cleaner catch-all redirect.
⚠️ `ViewContextHeader` uses `localStorage` for dismiss state keyed by `viewId` — the existing keys (`dw-hint-review-dismissed`, `dw-hint-drift-dismissed`) won't change, so dismissed state persists. The `dw-hint-overview-dismissed` key becomes orphaned — harmless but not cleaned up.
⚠️ If any external links or bookmarks point to `/map`, the redirect handles them. But if there are any server-side references to `/map` (API routes, middleware), those need updating too — check `middleware.ts` if it exists.
