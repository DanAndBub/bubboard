# CC SPEC: Driftwatch V4 Phase 2 — Config Review → Skill-Style Visual Dashboard

## Goal

Replace the text-based config review (ReviewPanel — findings grouped by file, expandable cards, severity filters) with a skill-style visual dashboard showing progress bars for every bootstrap file. This is a visual replacement, not an addition — the old ReviewPanel goes away. The Driftwatch skill's `visual.py` is the direct CSS/layout reference. The visual output should look like the skill's HTML report, adapted for React/Tailwind.

## Context

- Project: driftwatch (read `projects/driftwatch.md` for full context)
- Branch: `v4/phase-2-config-visual` (create from `v4/phase-1-strip` — all V4 phases chain off the previous phase's branch; nothing merges to master until full V4 is ready)
- Depends on: Phase 1 complete on `v4/phase-1-strip`
- Related decisions: ADR-0057 (4-tier threshold system)
- Key files to READ:
  - `src/lib/config-review/thresholds.ts` — current threshold system (still old 3-tier: `recommended/warning/critical/hardLimit`)
  - `src/lib/config-review/types.ts` — `FileAnalysis`, `BootstrapBudget` types
  - `src/lib/config-review/truncation.ts` — `calculateTruncation()` 
  - `src/lib/config-review/budget.ts` — `calculateBudget()`
  - `src/components/map/views/ReviewView.tsx` — current wrapper (to rewrite)
  - `src/components/config-review/ReviewPanel.tsx` — current panel (to delete)
  - `src/components/config-review/TruncationDiagram.tsx` — current diagram (to delete)
  - `src/components/guidance/FindingTooltip.tsx` — current tooltip (to delete)
  - `src/components/LandingDemo.tsx` — imports ReviewPanel directly (must update)
  - `src/components/map/views/OverviewView.tsx` — receives `reviewFindings[]` (minimal touch)
  - `src/app/map/page.tsx` — wires ReviewView props
- Key files in driftwatch-skill repo (read for visual reference, do NOT modify):
  - `scripts/visual.py` — source of truth for bar CSS, colors, tick marks, truncation overlay, callout patterns
- Dependencies: None (no Bub spec needed)

## ⚠️ CRITICAL: Threshold System State

`thresholds.ts` still uses the OLD 3-tier interface:
```typescript
interface FileThreshold { recommended: number; warning: number; critical: number; hardLimit: number; }
```

ADR-0057 defines the NEW 4-tier system (`compact/typical/heavy/truncation/hardLimit`) but it has **not been migrated yet**. The pre-spec references `typicalThreshold` per file — those values don't exist in the codebase.

**Resolution:** This spec defines a local `TYPICAL_THRESHOLDS` map inside `ConfigHealthView.tsx` using the ADR-0057 "typical" tier values. This is a display-only constant — it doesn't touch `thresholds.ts` or the analysis engine. When the 4-tier migration lands later, refactor to import from `thresholds.ts` instead.

```typescript
// ADR-0057 "typical" tier — used for the first tick mark position
const TYPICAL_THRESHOLDS: Record<string, number> = {
  'AGENTS.md': 5_000,
  'SOUL.md': 6_000,
  'TOOLS.md': 3_000,
  'IDENTITY.md': 3_000,
  'USER.md': 4_000,
  'HEARTBEAT.md': 7_000,
  'BOOTSTRAP.md': 8_000,
  'MEMORY.md': 8_000,
};
const DEFAULT_TYPICAL = 5_000;

function getTypicalThreshold(filename: string): number {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  for (const [key, val] of Object.entries(TYPICAL_THRESHOLDS)) {
    if (base === key.toUpperCase()) return val;
  }
  return DEFAULT_TYPICAL;
}
```

## Constraints

- Do NOT modify the analysis engine (`src/lib/config-review/` — rules, runner, thresholds, analyze-file, budget, truncation all stay untouched)
- Do NOT modify `thresholds.ts` — the 4-tier migration is a separate spec
- Do NOT modify the sidebar (`MapSidebar`) — it still says "Config Review" and routes to the review view
- Do NOT modify DriftView, EditorPanel, or any drift lib code
- Do NOT modify the landing page layout — only update the ReviewPanel → ConfigHealthView swap in LandingDemo
- Do NOT add new npm dependencies — pure React + existing Tailwind
- Do NOT redesign the OverviewView — minimal fixes only if it would crash or show stale data
- The `onOpenFile` editor integration is intentionally deferred — don't wire it in this phase

## Anti-Slop Note

🎯 ANTI-SLOP: The generic version would be rounded-corner cards with gradient fills, shadow elevation, and animated progress bars with percentage labels inside them.
Instead: Dark, utilitarian instrument-panel feel. Grey track bars (#30363d), flat colored fills, thin tick marks with tiny labels, plain-text callouts with no background or border. Looks like a terminal monitoring tool, not a SaaS dashboard. Copy the visual.py CSS faithfully — it was designed to avoid this exact failure mode.
Reference: Driftwatch skill HTML report (`scripts/visual.py`), GitHub's dark theme data displays.

## Steps

### Step 1: Create ConfigHealthView component

**Create:** `src/components/map/views/ConfigHealthView.tsx`

This is the main new component. It receives `analyzedFiles` and `budget` and renders the skill-style visual dashboard.

**Props:**
```typescript
import type { FileAnalysis, BootstrapBudget } from '@/lib/config-review/types';
import { calculateTruncation } from '@/lib/config-review/truncation';
import { BOOTSTRAP_MAX_CHARS_DEFAULT } from '@/lib/config-review/thresholds';

interface ConfigHealthViewProps {
  analyzedFiles: FileAnalysis[];
  budget: BootstrapBudget | null;
}
```

**Sections to render (top to bottom):**

**1. Summary cards row** — 4 cards in a horizontal grid:

| Card | Color | Count logic |
|------|-------|-------------|
| Healthy | `#2ea043` | `charCount <= typicalThreshold` |
| Warning | `#d29922` | `charCount > typicalThreshold && charCount < 18_000` |
| Danger | `#f85149` | `charCount >= 18_000 && charCount < 20_000` |
| Truncated | `#f85149` | `charCount >= 20_000` |

Cards: dark bg (`#111827`), border `#30363d`, count number large + label small below. No icons, no gradients.

**2. Section header** — "Bootstrap file size analysis" in bold, subtitle: "Each file is injected into your agent's context on every turn. Files over 20K characters are silently truncated." in `#8b949e`.

**3. Per-file progress bars** — One row per file in `analyzedFiles`. Each row:

- **Top line:** File name (mono font, bold, `#f1f5f9`) + right-aligned stats `"6,551 / 20K (33%)"` in `#8b949e`
- **Progress bar:** 20px tall, `#30363d` track (NOT transparent), 4px border-radius, `overflow: hidden`, `position: relative`
  - Fill width: `Math.min(100, (charCount / 20_000) * 100)%`
  - Fill color class logic (from visual.py `_html_bar_class`):
    - `charCount >= 20_000` → render truncation overlay instead of normal bar (see below)
    - `charCount >= 18_000` → red fill `#f85149`
    - `charCount > typicalThreshold` → yellow fill `#d29922`
    - else → green fill `#2ea043`
- **Tick marks** (inside bar, absolute positioned):
  - Tick 1: per-file typical threshold → position `(typicalThreshold / 20_000) * 100%`, white `rgba(255,255,255,0.5)`, 1.5px wide, full height, z-index 3
  - Tick 2: 18K danger → position `(18_000 / 20_000) * 100%` = 90%, same style
- **Tick labels** (below bar, 12px height container, relative positioned):
  - Typical label: absolute, `transform: translateX(-50%)`, 9px font, color `#8b949e`, text = threshold value formatted (e.g. "5K")
  - Danger label: absolute, same positioning, 9px font, color `#f85149`, text = "18K"
- **Callout text** (below tick labels, plain text only — no background, no pill, no card):
  - Warning (yellow bar): `"Larger than typical — review for unnecessary content"` in `#d29922`, 10px
  - Danger (red bar, 18K–20K): `"Approaching truncation — trim now to avoid data loss"` in `#f85149`, 10px
  - Healthy (green bar): no callout
  - Truncated (≥20K): `"Lines X–Y are invisible to your agent right now"` in `#f85149`, 10px (use `calculateTruncation()` to get hidden range)
- **Row separator:** `border-bottom: 1px solid #30363d` between each row. Last row: no border.

**Truncation overlay** (replaces normal bar when `charCount >= 20_000`):

```
Container: 22px tall, bg #1c2028, 4px border-radius, overflow hidden, display flex
├── HEAD: 25% width, bg #484f58, centered label "HEAD 14K" (9px, bold, white 85%)
├── CUT: 55% width, bg repeating-linear-gradient(135deg, #da3633, #da3633 4px, #8b1a18 4px, #8b1a18 8px)
│   centered label "✂ {hiddenChars} CUT" (9px, bold 700, white, text-shadow 0 0 4px rgba(0,0,0,0.6))
└── TAIL: 20% width, bg #484f58, centered label "TAIL 4K" (9px, bold, white 85%)
```

For truncated files, the stats line text (`"21,000 / 20K (105%)"`) should be red and bold.

**4. Aggregate separator** — `border-top: 2px solid #30363d` (double-weight). The last per-file row has NO bottom border — the aggregate separator replaces it.

**5. Aggregate bar** — "All bootstrap files" label, same bar treatment. Uses `budget.totalChars` for fill.
- Tick 1: 45K typical aggregate → position `(45_000 / 150_000) * 100%` = 30%
- Tick 2: 120K danger aggregate → position `(120_000 / 150_000) * 100%` = 80%
- Bar max reference: 150K (BOOTSTRAP_TOTAL_MAX_CHARS) — import from thresholds.ts
- Bar class logic (from visual.py `_agg_bar_class`):
  - `totalChars >= 120_000` → red
  - `totalChars > 45_000` → yellow
  - else → green
- If total ≥ 150K: switch to two-zone truncation overlay: `"150,000 loaded" (left) | "✂ {overflow} not loaded" (right, striped red)`

**6. Legend** — Horizontal row: 4 items, each with a small colored dot + label:
- Green dot + "Healthy"
- Yellow dot + "Warning"  
- Red dot + "Danger"
- Red-striped dot + "Truncated"

Dots: 8px circles. Striped dot uses same repeating-linear-gradient as truncation overlay. Font: 10px, `#8b949e`.

**7. Attribution** — `"Thresholds based on OpenClaw source code and community best practices"` in `#8b949e`, 10px, margin-top.

**Gate:** `npx tsc --noEmit` passes.

### Step 2: Rewire ReviewView + page.tsx + LandingDemo

Three files need updating to swap ReviewPanel → ConfigHealthView.

**2A. `src/components/map/views/ReviewView.tsx`** — Rewrite contents entirely:

```typescript
'use client';

import type { FileAnalysis, BootstrapBudget } from '@/lib/config-review/types';
import ConfigHealthView from './ConfigHealthView';
import ViewContextHeader from '@/components/guidance/ViewContextHeader';

interface ReviewViewProps {
  analyzedFiles: FileAnalysis[];
  budget: BootstrapBudget | null;
}

export default function ReviewView({ analyzedFiles, budget }: ReviewViewProps) {
  return (
    <div>
      <ViewContextHeader
        viewId="review"
        oneLiner="Visual health check for your bootstrap files."
        expandedDetail="Shows each bootstrap file's size relative to OpenClaw's 20K per-file limit and 150K aggregate budget. Progress bars, threshold markers, and truncation overlays help you spot problems before your agent silently loses instructions."
      />
      <ConfigHealthView analyzedFiles={analyzedFiles} budget={budget} />
    </div>
  );
}
```

**2B. `src/app/map/page.tsx`** — Update the ReviewView render block. Find:

```tsx
{activeView === 'review' && (
  <ReviewView
    reviewResult={reviewResult}
    analyzedFiles={analyzedFiles}
    onOpenFile={openFileEditor}
  />
)}
```

Replace with:

```tsx
{activeView === 'review' && (
  <ReviewView
    analyzedFiles={analyzedFiles}
    budget={budget}
  />
)}
```

Also remove `ReviewFinding` from the import of `@/lib/config-review/types` in page.tsx IF it's only used for the `onOpenFile` callback typing. If `ReviewFinding` is used elsewhere in the file (e.g. `editorFinding` state), keep the import.

**2C. `src/components/LandingDemo.tsx`** — This file imports `ReviewPanel` directly and renders it in the `'review'` case. Update:

- Remove import: `import ReviewPanel from '@/components/config-review/ReviewPanel';`
- Add import: `import ConfigHealthView from '@/components/map/views/ConfigHealthView';`
- In `renderView()`, replace the `case 'review':` block:

```typescript
// BEFORE:
case 'review':
  return (
    <ReviewPanel
      result={reviewResult}
      files={analyzedFiles}
    />
  );

// AFTER:
case 'review':
  return (
    <ConfigHealthView
      analyzedFiles={analyzedFiles}
      budget={DEMO_BUDGET}
    />
  );
```

**2D. `src/components/map/views/OverviewView.tsx`** — Check if it renders individual findings text from `reviewFindings`. It receives `reviewFindings: ReviewFinding[]` and `healthScore`. The findings list and health score still come from `runReview()` which still runs — this data is still valid. The OverviewView's summary card for config review should still work since it uses `reviewFindings.length` and `healthScore` which are unchanged.

Verify OverviewView doesn't import ReviewPanel, TruncationDiagram, or FindingTooltip. If it does, remove those imports. If it renders finding text inline, leave it — those findings still exist.

**Gate:** `npx tsc --noEmit` passes.

### Step 3: Delete old components + clean dead imports

**Delete these files:**
- `src/components/config-review/ReviewPanel.tsx`
- `src/components/config-review/TruncationDiagram.tsx`
- `src/components/guidance/FindingTooltip.tsx`

**Then grep and clean all dead imports:**
```bash
grep -rn "ReviewPanel" src/ --include="*.tsx" --include="*.ts"
grep -rn "TruncationDiagram" src/ --include="*.tsx" --include="*.ts"
grep -rn "FindingTooltip" src/ --include="*.tsx" --include="*.ts"
```

Remove any remaining import lines for these three components. If a file has no other changes, only remove the import line — surgical edit.

**Keep untouched:**
- `src/lib/config-review/` — entire analysis engine stays
- `src/lib/config-review/truncation.ts` — still used by ConfigHealthView for `calculateTruncation()`
- `src/components/guidance/ViewContextHeader.tsx` — used across views
- `src/components/guidance/DemoBanner.tsx` — used elsewhere

**Gate:** All three grep commands return zero results. `npx tsc --noEmit` passes. `npx next build` succeeds.

## ⛔ STOP conditions

- `FileAnalysis` type doesn't have `charCount` or `path` fields → spec assumptions about data shape are wrong
- `BootstrapBudget` type doesn't have `totalChars` or `budgetLimit` fields → spec assumptions about data shape are wrong
- `calculateTruncation()` doesn't exist in `src/lib/config-review/truncation.ts` → spec assumptions about available utilities are wrong
- `BOOTSTRAP_TOTAL_MAX_CHARS` (150,000) doesn't exist in `thresholds.ts` → read thresholds.ts to find the correct constant name
- Phase 1 (strip and simplify) has not been completed — files referenced here don't match what's on `v4/phase-1-strip`

## Acceptance Criteria

- [ ] Config Review view shows skill-style progress bars, not text findings
- [ ] Summary cards show correct Healthy / Warning / Danger / Truncated counts
- [ ] Each per-file bar has dark grey track (`#30363d`), colored fill, and two tick marks
- [ ] Per-file typical threshold tick positions are correct per file name (using ADR-0057 typical values)
- [ ] 18K danger tick and label appear on every bar in red
- [ ] Warning bars (yellow) show "Larger than typical" callout as plain text (no background)
- [ ] Danger bars (red, 18K–20K) show "Approaching truncation" callout as plain text
- [ ] Truncated files (≥20K) show three-zone overlay (HEAD 14K | ✂ CUT | TAIL 4K)
- [ ] Truncated file stats text is red and bold
- [ ] 1px border separators between each file row
- [ ] 2px border separator above aggregate bar
- [ ] Aggregate bar uses 45K / 120K thresholds against 150K max
- [ ] Legend renders with correct colors (green, yellow, red, red-striped)
- [ ] Attribution line renders
- [ ] Old ReviewPanel, TruncationDiagram, and FindingTooltip are deleted
- [ ] No dead imports remain (`grep` returns 0 results for all three)
- [ ] LandingDemo renders ConfigHealthView instead of ReviewPanel in review tab
- [ ] OverviewView still works (doesn't crash, still shows findings count + health score)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx next build` succeeds
- [ ] `npx vitest run` passes (if tests exist)
- [ ] NEEDS DAN: Visual comparison — bars, colors, tick marks, callouts, and truncation overlays should match the skill's HTML report side by side

## Edge Cases

⚠️ `analyzedFiles` might be empty (no scan yet) → Render empty state: "Scan your workspace to see config health" (same pattern as old ReviewPanel empty state)

⚠️ `budget` might be null → Skip aggregate bar section entirely when null. Summary cards still render from analyzedFiles alone.

⚠️ File names in `analyzedFiles` might include path prefixes (e.g. `workspace/AGENTS.md` not just `AGENTS.md`) → Use `path.split('/').pop()` for display name AND for threshold lookup.

⚠️ A file might have 0 charCount → Render green bar at 0% width with no callout. Don't divide by zero in percentage calc.

⚠️ `config-review/` directory might still have other files besides the three being deleted → Only delete the three named files. Don't touch the directory itself.

⚠️ Demo mode needs to show meaningful data → DEMO_BUDGET and DEMO_FILE_ANALYSES from `src/lib/phase3-demo-data.ts` should provide enough data. If demo files are all small/healthy, the visual will be all green — that's accurate, not a bug.
