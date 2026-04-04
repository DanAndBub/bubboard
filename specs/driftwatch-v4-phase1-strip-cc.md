# CC SPEC: Driftwatch V4 Phase 1 — Strip and Simplify

## Goal
Remove three feature areas (Agents, Files, Cost Tracking) from the Driftwatch web app, reducing it to its core: config health monitoring and drift detection. This is purely subtractive — no new features, no redesigns, no UI polish. After this phase, the app has: Overview (sparse, Phase 2 redesigns it), Config Review, Drift Report, Markdown Editor, and Snapshot download/upload.

## Context
- Project: driftwatch (read `projects/driftwatch.md` for full context)
- Repo: `DanAndBub/Driftwatch` (public) — remote name: `origin`. This is the working repo.
- Branch: `v4/phase-1-strip` (create from `origin/master` — see Step 1)
- Note: `feature/4tier-thresholds` branch exists but is abandoned — do NOT merge it. Branch `v4/phase-1-strip` from `master` as-is.
- Key files to DELETE: see Step 2
- Key files to EDIT: `src/app/map/page.tsx`, `src/components/map/MapSidebar.tsx`, `src/components/map/views/OverviewView.tsx`, `src/components/map/MapTopBar.tsx`, `src/components/LandingDemo.tsx`, `src/components/CompactDemo.tsx`, `src/lib/types.ts`, `src/lib/demo-data.ts`, `src/lib/phase3-demo-data.ts`, `src/app/page.tsx`
- Dependencies: None — this is Phase 1

## Constraints
- Do NOT redesign the Overview — it will look sparse after cuts, that's expected (Phase 2 handles it)
- Do NOT add any new features or components
- Do NOT change the config review engine (`src/lib/config-review/`)
- Do NOT change the drift detection engine (`src/lib/drift/`)
- Do NOT change the editor (`src/components/editor/`)
- Do NOT change the scanner (`src/scanner/DirectoryScanner.tsx`, `src/components/TreeInput.tsx`)
- Do NOT change API routes (`src/app/api/`)
- Do NOT add or remove npm packages UNLESS a package was exclusively used by cost tracking — in that case remove it from `package.json` and run `npm install`
- No keys in source — if any are encountered during edits, do not commit them
- Push tag and branch to `origin` (public repo)

---

## Steps

### Step 1: Tag the archive and set up branch

Before any code changes, tag the current master so existing users can access the full v3 feature set.

```bash
git checkout master
git pull origin master
git tag v3.0.0-archive
git push origin v3.0.0-archive
git checkout -b v4/phase-1-strip
```

Work is done on the **public** repo (`origin` = `DanAndBub/Driftwatch`). Push the tag and branch to `origin`.

**Gate:** `git tag -l v3.0.0-archive` returns the tag name. `git branch --show-current` returns `v4/phase-1-strip`.

---

### Step 2: Delete files and directories

Delete all of these. No partial deletions — entire files/directories go.

**Views:**
- `src/components/map/views/AgentsView.tsx`
- `src/components/map/views/FilesView.tsx`
- `src/components/map/views/CostsView.tsx`

**Components:**
- `src/components/AgentMap.tsx`
- `src/components/AgentCard.tsx`
- `src/components/StatsBar.tsx`
- `src/components/RelationshipPanel.tsx`
- `src/components/HealthCheck.tsx`
- `src/components/FileCard.tsx`
- `src/components/FileViewer.tsx`
- `src/components/Nav.tsx` (confirmed dead code — zero imports anywhere)
- `src/components/cost-tracking/` (entire directory — includes all UI components, `__tests__/`, `test-utils/`, and everything else)

**Lib:**
- `src/lib/cost-tracking/` (entire directory — includes `store.ts`, `db.ts`, `pricing.ts`, `calculator.ts`, `sdk-wrapper.ts`, `reconciliation.ts`, `importers/`, `analytics/`, `types.ts`, `__tests__/`, `test-utils/`, and everything else)

**Pages:**
- `src/app/cost-tracking/` (entire directory)
- `src/app/settings/` (entire directory — exists solely for cost-tracking admin key configuration, imports from `cost-tracking/reconciliation`)

**Tests:**
Delete any test files in `__tests__/` or elsewhere that import from deleted modules. Use this check:
```bash
grep -rl "cost-tracking\|AgentsView\|FilesView\|CostsView\|AgentCard\|StatsBar\|RelationshipPanel\|HealthCheck\|AgentMap\|FileCard\|FileViewer" src/ __tests__/ --include="*.test.*" --include="*.spec.*" 2>/dev/null
```
Delete every test file returned by this grep (they will fail to compile after the source deletions).

**Gate:** All listed paths no longer exist on disk. Spot-check:
```bash
ls src/components/cost-tracking/ 2>&1 | grep -q "No such file"
ls src/lib/cost-tracking/ 2>&1 | grep -q "No such file"
ls src/app/settings/ 2>&1 | grep -q "No such file"
ls src/components/Nav.tsx 2>&1 | grep -q "No such file"
ls src/components/FileCard.tsx 2>&1 | grep -q "No such file"
```

---

### Step 3: Surgery on surviving files

These files are kept but need targeted edits to remove references to deleted features. After completing ALL sub-sections, run `npx tsc --noEmit` as the step gate.

#### 3A. `src/components/map/MapSidebar.tsx`

**Update the `View` type:**
```typescript
// BEFORE
type View = 'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift';

// AFTER
type View = 'overview' | 'review' | 'drift';
```

**Remove from `MapSidebarProps` interface:**
- `agentCount: number`
- `fileCount: number`

**Remove from `TABS` array (mobile bottom tabs):**
- `{ view: 'agents', icon: '⬡', label: 'Agents' }`
- `{ view: 'files', icon: '▤', label: 'Files' }`
- `{ view: 'costs', icon: '◎', label: 'Costs' }`

**Remove from desktop sidebar nav:** The nav items for Agents (⬡), Files (▤), and Cost Tracking (◎). Keep: Overview, Config Review (with alert dot), Drift Report, all action buttons, the "More" / Waitlist modal button.

**Remove any usage of `agentCount` and `fileCount`** within the component body.

#### 3B. `src/app/map/page.tsx`

**Update the `View` type:**
```typescript
type View = 'overview' | 'review' | 'drift';
```

**Remove these view rendering blocks:**
- `{activeView === 'agents' && ...}`
- `{activeView === 'files' && ...}`
- `{activeView === 'costs' && ...}`

**Remove imports for deleted views/components:**
- `import AgentsView from ...`
- `import FilesView from ...`
- `import CostsView from ...`
- Any imports from `src/lib/cost-tracking/`

**Remove cost-related state and logic:**
- `costRecordCount` state variable and any IndexedDB/Dexie calls that populate it (e.g., `getRecordCount()` from `src/lib/cost-tracking/store`)

**Remove deleted props from `<MapSidebar>` call:**
- `agentCount={...}`
- `fileCount={...}`

**Remove `costRecordCount` prop from `<MapTopBar>` call.**

**Keep `snapshotCount` prop on `<MapTopBar>`** — it serves the "New Map" reset flow (clearing snapshots), which is a kept feature.

**Update the "How Driftwatch works" step 3 text:**
```
// BEFORE
"Review findings across six views: Overview, Agents, Files, Config Review, Drift Detection, and Cost Tracking."

// AFTER
"Review findings across three views: Overview, Config Review, and Drift Detection."
```

**Keep all other state:** `agentMap`, `fileContents`, `reviewResult`, `analyzedFiles`, `budget`, `snapshots`, `driftReport`, `editorFile`.

#### 3C. `src/components/map/views/OverviewView.tsx`

**Update the `onNavigate` prop type:**
```typescript
// BEFORE
onNavigate: (view: 'agents' | 'files' | 'costs' | 'review' | 'drift') => void;

// AFTER
onNavigate: (view: 'review' | 'drift') => void;
```

**Remove:**
- The "Agent Fleet" summary card (references agents data, links to deleted agents view)
- The "File Health" summary card (links to deleted files view)
- Any `onNavigate('agents')`, `onNavigate('files')`, or `onNavigate('costs')` calls

**Stats row cleanup — remove these stats:**
- "Agents" stat
- "Skills" stat

**Keep:**
- "Config Review" summary card
- "Bootstrap Budget" summary card
- "Total Files" stat
- "Memory Entries" stat

The overview will look sparse. That's expected.

#### 3D. `src/components/map/MapTopBar.tsx`

**Remove `costRecordCount` prop** from the interface and any display that uses it.

**Keep `snapshotCount` prop** — it serves snapshot functionality (kept feature).

**Keep:** Driftwatch logo/name, "New map" button, demo mode indicator.

#### 3E. `src/components/LandingDemo.tsx`

**Remove imports:**
- `import CostsView from ...`
- `import AgentsView from ...`
- `import FilesView from ...`

**Remove from `renderView()` switch:**
- `case 'agents':` block
- `case 'files':` block
- `case 'costs':` block

**Update the `View` type** to `'overview' | 'review' | 'drift'`.

**Remove deleted props from the `<MapSidebar>` call:**
- `agentCount={...}`
- `fileCount={...}`

#### 3F. `src/components/CompactDemo.tsx`

This component renders on the landing page and currently showcases "Agent Fleet" and "Workspace Files" — both removed features. It also shows stats for Agents and Skills.

**Remove:**
- The entire "Agent Fleet" section (the `map.agents.map(...)` block with agent cards)
- The entire "Workspace Files" section (the `WORKSPACE_FILES.map(...)` block with file chips and the memory files chip)
- The `WORKSPACE_FILES` constant array
- "Agents" and "Skills" from the `stats` array

**Keep:**
- The stats row (with remaining stats: Files, Memory, Score)
- The "Health Score" card at the bottom

**Update `stats` array:**
```typescript
// BEFORE: 5-column grid with Files, Agents, Memory, Skills, Score
// AFTER: 3-column grid with Files, Memory, Score
```

Update the `grid-cols-5` class to `grid-cols-3` accordingly.

After removing agent/file display, check whether CompactDemo still needs the `getDemoAgentMap` import. It likely still does — the `totalFiles` count and `map.workspace.memoryFiles.length` use it. If so, keep the import. If nothing from `map` is used, remove it.

#### 3G. `src/app/page.tsx` (landing page)

**Review for references to removed features.** The landing page copy currently mentions "how costs are trending" and references six views. Update:
- Remove cost tracking language from the value proposition copy
- Update any view counts or feature lists to reflect three views (Overview, Config Review, Drift Detection)
- Keep references to config health, truncation, and drift detection

#### 3H. `src/lib/types.ts`

Review for dead types. Remove types that are ONLY used by deleted features. When in doubt, keep it — dead types don't break builds; missing types do.

#### 3I. `src/lib/demo-data.ts` and `src/lib/phase3-demo-data.ts`

Remove any demo data generation that ONLY served deleted views (agent fleet demo data, cost tracking demo data). Keep demo data that serves overview, config review, drift, and budget views.

**Note:** If `getDemoAgentMap` is no longer imported by any file after the CompactDemo and LandingDemo surgery, remove it. Check with:
```bash
grep -r "getDemoAgentMap" src/ --include="*.tsx" --include="*.ts"
```

**Gate:** `npx tsc --noEmit` passes with zero errors after all surgery is complete.

---

### Step 4: Verify and clean

Run the full verification suite:

```bash
# Type check
npx tsc --noEmit

# Build
npx next build

# Tests
npx vitest run

# Dead import check — all must return zero results
grep -r "cost-tracking" src/ --include="*.tsx" --include="*.ts"
grep -r "AgentsView" src/ --include="*.tsx" --include="*.ts"
grep -r "FilesView" src/ --include="*.tsx" --include="*.ts"
grep -r "CostsView" src/ --include="*.tsx" --include="*.ts"
grep -r "AgentCard" src/ --include="*.tsx" --include="*.ts"
grep -r "StatsBar" src/ --include="*.tsx" --include="*.ts"
grep -r "RelationshipPanel" src/ --include="*.tsx" --include="*.ts"
grep -r "HealthCheck" src/ --include="*.tsx" --include="*.ts"
grep -r "AgentMap" src/ --include="*.tsx" --include="*.ts"
grep -r "FileCard" src/ --include="*.tsx" --include="*.ts"
grep -r "FileViewer" src/ --include="*.tsx" --include="*.ts"
grep -r "from.*settings" src/app/ --include="*.tsx" --include="*.ts"
```

If any grep returns results (in non-spec, non-comment contexts), those are leftover references that need cleanup. Fix them before proceeding.

Also check for orphaned npm dependencies:
```bash
# Check if dexie is still imported by any kept code
grep -r "dexie\|from 'dexie'" src/ --include="*.tsx" --include="*.ts"
```
If zero results, remove `dexie` and `fake-indexeddb` from `package.json` (dependencies and devDependencies respectively) and run `npm install`.

**Gate:** All commands above pass cleanly — tsc, build, vitest, all greps return zero results (or only false positives in comments/strings).

---

## ⛔ STOP conditions
- The `View` type in `page.tsx` or `MapSidebar.tsx` has a shape different from `'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift'` (suggests prior changes this spec doesn't account for)
- `src/lib/cost-tracking/store.ts` is imported by non-cost-tracking code (would mean store.ts serves multiple features — need to investigate before deleting)
- `page.tsx` has been significantly restructured since the UX redesign shipped (surgical edits in Step 3B may not match current code structure)
- `src/app/settings/` imports from modules other than cost-tracking (would mean it serves other purposes — investigate before deleting)

## Acceptance Criteria
- [ ] `v3.0.0-archive` tag exists on `origin` remote
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx next build` succeeds
- [ ] `npx vitest run` — all remaining tests pass
- [ ] `grep -r "cost-tracking" src/` returns zero results
- [ ] `grep -r "AgentsView\|FilesView\|CostsView" src/` returns zero results
- [ ] `grep -r "AgentCard\|StatsBar\|RelationshipPanel\|HealthCheck\|AgentMap\|FileCard\|FileViewer" src/` returns zero results
- [ ] `src/app/settings/` directory no longer exists
- [ ] `src/components/Nav.tsx` no longer exists
- [ ] `src/components/FileCard.tsx` and `src/components/FileViewer.tsx` no longer exist
- [ ] Sidebar renders only: Overview, Config Review, Drift Report, and action buttons (no Agents, Files, or Cost Tracking)
- [ ] Landing page CompactDemo renders without agent fleet or workspace files sections
- [ ] Landing page demo (LandingDemo) renders without console errors using only the three kept views
- [ ] Landing page copy does not reference cost tracking, agents view, or files view
- [ ] "How Driftwatch works" step 3 text references three views, not six
- [ ] NEEDS DAN: Smoke test — load landing page, scan or demo, navigate all three views, download/upload snapshot, open editor from fix button. No console errors.

## Edge Cases
⚠️ `OverviewView.tsx` imports `StatsData` from `src/lib/types.ts` which includes agent/skill stats fields → the type itself stays (other code may use it), just don't render those fields in the overview.
⚠️ `package.json` may have dependencies exclusively used by cost tracking (e.g., `dexie` for IndexedDB, `fake-indexeddb` for tests) → Step 4 checks for this. If no kept code imports them, remove them.
⚠️ `CompactDemo.tsx` imports `getDemoAgentMap` which returns agent data → after removing agent display from CompactDemo, check if the import is still needed for remaining stats (Files, Memory). If CompactDemo still uses `map.workspace.coreFiles.length` for the Files stat, the import stays. If not, remove it.
⚠️ `src/app/page.tsx` landing page copy references "how costs are trending" → must be updated to remove cost-tracking language.
