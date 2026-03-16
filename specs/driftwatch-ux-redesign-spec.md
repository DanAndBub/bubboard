# SPEC: Driftwatch UX Redesign — Sidebar Layout Integration

**Version:** 1.0  
**Date:** March 11, 2026  
**Author:** Dan (via design consultant)  
**For:** Bub  
**Branch:** `feature/ux-redesign` (create from current main)

---

## 1. What This Is

The Agent Map page (`/map`) is being restructured from a single long-scroll layout to a **sidebar-driven app shell**. All existing backend logic, data flows, and browser APIs stay exactly the same. This is a **layout and component reorganization only** — no new features, no new data, no new dependencies.

The Cost Tracking page (`/costs` or wherever it currently lives) is also being absorbed into the sidebar as a view, so users navigate everything from one unified interface instead of separate pages.

**Reference mockup:** `mockup-b-v2-accessible.html` (provided separately). Open it in Chrome and click through all six sidebar views. That is the target.

---

## 2. Architecture Change Summary

### Current Structure
```
/map (single page, vertical scroll)
├── Nav bar
├── Stats bar (5 stat cells)
├── Agent Fleet (card grid)
├── Workspace Files (6 category grids)
├── Health Check (right sidebar panel)
├── Agent Hierarchy (right sidebar panel)
├── Config Review Panel (expandable)
├── Drift Report Panel (expandable)
└── Snapshot/Session buttons (bottom)

/costs (separate page)
├── Cost stats
├── Charts
├── Insights
└── Request log
```

### New Structure
```
/map (app shell)
├── Top bar (sticky, full width)
├── Sidebar (fixed left, 252px)
│   ├── Setup Score card
│   ├── Views nav group
│   │   ├── Overview
│   │   ├── Agents
│   │   ├── Files
│   │   └── Cost Tracking
│   ├── Intelligence nav group
│   │   ├── Config Review
│   │   └── Drift Report
│   └── Actions (Download/Upload Snapshot, Session Notes)
└── Main content area (scrollable, right of sidebar)
    ├── [Overview]     — summary cards linking to other views
    ├── [Agents]       — agent list + hierarchy
    ├── [Files]        — file browser by category + budget bar
    ├── [Costs]        — stats, charts, insights, request log
    ├── [Review]       — findings list with Fix buttons
    └── [Drift]        — snapshot diff or empty state
```

---

## 3. Migration Strategy

### Principle: Wrap, Don't Rewrite

Every existing component already works. The job is to **move components into new containers**, not rebuild them. Think of it as rearranging furniture in a house — the furniture stays the same, the rooms change.

### Step-by-step Order

Do these in order. Each step should result in a working (if incomplete) page.

---

### Step 1: Create the App Shell

**Create:** `src/components/map/MapShell.tsx`

This is the new root layout for `/map`. It renders:

- A CSS Grid body: `grid-template-columns: 252px 1fr; grid-template-rows: 52px 1fr; height: 100vh; overflow: hidden;`
- The top bar (full width, row 1)
- The sidebar (column 1, row 2)
- The main content area (column 2, row 2, `overflow-y: auto`)

The main content area renders ONE view at a time based on local state:

```tsx
type MapView = 'overview' | 'agents' | 'files' | 'costs' | 'review' | 'drift';

const [activeView, setActiveView] = useState<MapView>('overview');
```

The sidebar passes `activeView` and `setActiveView` as props.

**Do not use React Router for these views.** They are local state within `/map`, not separate routes. The URL stays `/map` regardless of which view is active.

---

### Step 2: Create the Sidebar Component

**Create:** `src/components/map/MapSidebar.tsx`

Renders:
1. **Setup Score card** — pull the score value from the existing health check data (already computed)
2. **Views section** — 4 buttons: Overview, Agents, Files, Cost Tracking
3. **Intelligence section** — 2 buttons: Config Review (with red dot if findings exist), Drift Report
4. **Actions section** — 3 buttons: Download Snapshot, Upload Snapshot, Session Notes

These action buttons should call the exact same handlers that the current bottom buttons call. Just move the `onClick` handlers.

Sidebar item with alert dot for Config Review:
```tsx
{reviewFindings.length > 0 && (
  <span className="si-alert" role="status" aria-label="Issues found" />
)}
```

---

### Step 3: Create the Overview View

**Create:** `src/components/map/views/OverviewView.tsx`

This is the new default view. It shows **summary cards** that link to other views:

1. **Stats row** — the existing 4 stat cells (Total Files, Agents, Memory Entries, Skills). Move the existing stat components here.
2. **Agent Fleet card** — shows the 5 agents as a compact list (name + model). Clicking "View all →" calls `setActiveView('agents')`.
3. **Config Review card** — shows top 3 findings as compact rows. Clicking "View all →" calls `setActiveView('review')`.
4. **Bootstrap Budget card** — the existing budget bar + top 3 file sizes.
5. **File Health card** — the existing health checklist + memory date range. Clicking "View all →" calls `setActiveView('files')`.

**Key:** These cards display *subsets* of data that already exists in state. No new data fetching.

---

### Step 4: Move Agent Fleet + Hierarchy into Agents View

**Create:** `src/components/map/views/AgentsView.tsx`

Move the existing `AgentFleet` component (or equivalent) here, but switch from the current card grid to a **row-based list** layout:

```
| agent name | model | provider badge | reports-to |
```

Below the list, render the existing `AgentHierarchy` tree component in a card. No changes to the hierarchy logic — just different container.

---

### Step 5: Move Workspace Files + Health Check into Files View

**Create:** `src/components/map/views/FilesView.tsx`

Move the existing workspace files grouped display here. **Key changes to the display:**

- Instead of a grid of tiny cards, render files as **rows**: `filename | char count | status badge`
- Group by category (Core Identity, Operations, Custom, Memory, Protocols) using section headers with colored dots
- Below the file list, render the **Bootstrap Budget bar** (already built)
- Memory section becomes a compact single row showing date range + count

The Health Check panel becomes a sidebar within this view (or collapses into the file status badges — each file row already shows ✓/⚠/✗).

---

### Step 6: Move Cost Tracking into Costs View

**Create:** `src/components/map/views/CostsView.tsx`

This absorbs the entire current cost tracking page. Move these existing components into the new view container:

1. **Period selector** (7d / 30d / 90d / All buttons) — already built
2. **Cost stat cards** (Today, Session, 7-Day, Total Requests) — already built
3. **Cost Over Time chart** (Recharts line chart) — already built
4. **Cost by Model donut** — already built
5. **Insights section** (anomaly alerts) — already built
6. **Request Log table** with pagination — already built

Everything keeps its existing data sources (IndexedDB via Dexie). The only change is these components now render inside the sidebar layout's main content area instead of their own page.

**Routing change:** The old `/costs` route should redirect to `/map` with the costs view active. You can do this with a query param (`/map?view=costs`) or just redirect to `/map` and let users click Cost Tracking in the sidebar.

---

### Step 7: Move Config Review into Review View

**Create:** `src/components/map/views/ReviewView.tsx`

Move the existing `ReviewPanel` component here. Layout changes:

- Score + filter buttons at the top (already built)
- Findings list below (already built)
- Each finding's "Fix →" button still triggers the editor slide-in panel (no change to editor behavior)
- Truncation diagrams render inline within findings (they now have full width instead of competing with other panels)

---

### Step 8: Move Drift Report into Drift View

**Create:** `src/components/map/views/DriftView.tsx`

Move the existing `DriftReport` component here. Two states:

1. **No snapshot loaded:** Empty state with upload prompt
2. **Snapshot loaded:** Full diff display (already built)

No logic changes. Just a new container.

---

### Step 9: Wire Up the Editor Panel

The slide-in editor panel (triggered by "Fix →" buttons) should work identically. It overlays the main content area, not the sidebar. Ensure:

- The editor's backdrop covers only the main content area (not the sidebar)
- After save + re-scan, the review view updates (already wired)
- The editor's z-index is above the main content but respects the top bar

---

### Step 10: Remove Old Layout Code

Once all views are working in the new shell:

1. Delete the old vertical scroll layout in the map page
2. Remove the old `/costs` page component (keep a redirect)
3. Remove the bottom action buttons (now in sidebar)
4. Clean up any orphaned CSS/styles

---

## 4. WCAG 2.1 AA Color System

The mockup uses an updated color palette. **Replace the current color tokens** in your Tailwind config or CSS variables:

### Updated Tokens

```
/* Backgrounds — unchanged */
--bg-page: #0a0e17;
--bg-card: #111827;
--bg-elevated: #1c2637;

/* Borders — CHANGED (old ones fail 3:1 for UI components) */
--border: #506880;          /* was #1e293b — now 3.07:1 on card ✓ */
--border-subtle: #3a4e63;   /* secondary border */

/* Text — CHANGED */
--text-primary: #f1f5f9;    /* was #e2e8f0 — now 16.19:1 ✓ */
--text-secondary: #b0bec9;  /* was #94a3b8 — now 9.34:1 ✓ */
--text-muted: #7a8a9b;      /* was #475569 — OLD FAILED at 2.55:1, now 5.01:1 ✓ */

/* Semantic — CHANGED */
--accent: #7db8fc;           /* was #60a5fa — now 8.56:1 ✓ */
--success: #34d399;          /* was #10b981 — now 9.23:1 ✓ */
--warning: #fbbf24;          /* was #f59e0b — now 10.63:1 ✓ */
--critical: #f87171;         /* was #ef4444 — now 6.41:1 ✓ */
--purple: #a78bfa;           /* was #8b5cf6 — now 6.52:1 ✓ */
```

### Contrast Ratios Verified

All ratios measured against `--bg-card` (#111827), the most common text background:

| Token | Old Value | Old Ratio | New Value | New Ratio | AA (4.5:1) |
|-------|-----------|-----------|-----------|-----------|------------|
| text-primary | #e2e8f0 | 15.66:1 | #f1f5f9 | 16.19:1 | ✓ Pass |
| text-secondary | #94a3b8 | 7.53:1 | #b0bec9 | 9.34:1 | ✓ Pass |
| text-muted | #475569 | **2.34:1** | #7a8a9b | 5.01:1 | ✓ **Fixed** |
| accent | #60a5fa | 7.59:1 | #7db8fc | 8.56:1 | ✓ Pass |
| success | #10b981 | 7.61:1 | #34d399 | 9.23:1 | ✓ Pass |
| warning | #f59e0b | 8.99:1 | #fbbf24 | 10.63:1 | ✓ Pass |
| critical | #ef4444 | 5.13:1 | #f87171 | 6.41:1 | ✓ Pass |
| purple | #8b5cf6 | 4.56:1 | #a78bfa | 6.52:1 | ✓ Pass |
| border | #1e293b | **1.54:1** | #506880 | 3.07:1 | ✓ **Fixed** (3:1 UI) |

### Additional Accessibility Requirements

Apply these throughout all components:

```css
/* Focus visible on all interactive elements */
*:focus-visible {
  outline: 2px solid #7db8fc;
  outline-offset: 2px;
}
```

- Add `aria-label` to all icon-only buttons and status indicators
- Add `aria-current="page"` to the active sidebar item
- Add `role="progressbar"` with `aria-valuenow` to the budget bar
- Add `scope="col"` to all table header cells
- Add `role="status"` to the config review alert dot
- Add a skip-to-content link as the first focusable element: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`

---

## 5. File Structure After Migration

```
src/components/map/
├── MapShell.tsx              ← NEW: app shell (grid layout)
├── MapSidebar.tsx            ← NEW: left sidebar nav + actions
├── MapTopBar.tsx             ← NEW: top bar (extracted from old nav)
├── views/
│   ├── OverviewView.tsx      ← NEW: summary dashboard
│   ├── AgentsView.tsx        ← NEW: wraps existing agent components
│   ├── FilesView.tsx         ← NEW: wraps existing file components
│   ├── CostsView.tsx         ← NEW: wraps existing cost components
│   ├── ReviewView.tsx        ← NEW: wraps existing review components
│   └── DriftView.tsx         ← NEW: wraps existing drift components
├── AgentFleet.tsx            ← EXISTING: may need row layout variant
├── AgentHierarchy.tsx        ← EXISTING: no changes
├── WorkspaceFiles.tsx        ← EXISTING: may need row layout variant
├── HealthCheck.tsx           ← EXISTING: moves into FilesView
├── ReviewPanel.tsx           ← EXISTING: moves into ReviewView
├── DriftReport.tsx           ← EXISTING: moves into DriftView
├── EditorPanel.tsx           ← EXISTING: overlay behavior unchanged
├── SnapshotControls.tsx      ← EXISTING: handlers move to sidebar
└── ... (other existing files)
```

---

## 6. What NOT to Change

- **No new npm dependencies.** This is CSS Grid + component reorganization.
- **No data flow changes.** All scan results, IndexedDB reads, file system API calls, and state management stay identical.
- **No new API calls.** Everything remains client-side.
- **No changes to the input/scan flow.** The directory picker and text paste fallback remain as-is. They render in the main content area before the map is generated.
- **No changes to the editor panel logic.** Save, revert, re-scan, API key detection — all unchanged.
- **No changes to snapshot format.** Download/upload JSON behavior stays identical.

---

## 7. Acceptance Criteria

When this is done, Dan will verify:

1. [ ] Sidebar navigates between all 6 views without page reload
2. [ ] Overview shows summary cards that link to detail views
3. [ ] Agents view shows list + hierarchy with all existing data
4. [ ] Files view shows grouped files with status badges and budget bar
5. [ ] Cost Tracking view shows all charts, stats, insights, and request log
6. [ ] Config Review view shows score, findings, and Fix buttons trigger editor
7. [ ] Drift Report shows empty state or diff (depending on snapshot)
8. [ ] Snapshot download/upload works from sidebar buttons
9. [ ] Session Notes download works from sidebar button
10. [ ] Editor slide-in panel works from Fix buttons
11. [ ] All text passes 4.5:1 contrast on its background
12. [ ] All interactive borders pass 3:1 contrast
13. [ ] Tab/keyboard navigation works through sidebar and all views
14. [ ] Focus outlines are visible on all interactive elements
15. [ ] Screen reader can navigate via landmarks and labels
16. [ ] No horizontal scroll, no content overflow
17. [ ] Old `/costs` route redirects to map with cost view

---

## 8. Estimated Effort

This is a layout migration, not a feature build. Every component already exists and works.

| Step | Description | Effort |
|------|-------------|--------|
| 1 | App shell + grid layout | Small |
| 2 | Sidebar component | Small |
| 3 | Overview view (new, but uses existing data) | Medium |
| 4 | Agents view (move + restyle) | Small |
| 5 | Files view (move + restyle to rows) | Medium |
| 6 | Costs view (move from separate page) | Small |
| 7 | Review view (move) | Small |
| 8 | Drift view (move) | Small |
| 9 | Editor panel wiring | Small |
| 10 | Cleanup old layout + color token swap | Small |

The color token swap (Section 4) should be done first as a single commit so the entire app updates at once.

---

## 9. Questions for Dan Before Starting

None. This spec is self-contained. If something is ambiguous during implementation, Bub should default to matching the mockup HTML and report any structural conflicts at the sprint boundary.
