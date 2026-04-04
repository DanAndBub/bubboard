# CC SPEC: Driftwatch V4 Phase 2 — Post-Build Patch

## Goal

Post-build fixes from Dan's visual review. Four areas:

1. **Bootstrap filter** — ConfigHealthView shows bars for non-bootstrap files. Only the 8 bootstrap files should appear.
2. **ConfigHealthView cleanup** — Remove the bottom legend (summary cards serve as legend). Add red-stripe text effect on the Truncated card number. Move attribution to centered footer.
3. **Scanner redesign** — Simplify to single-page flow: folder picker → inline file list → analyze. Remove paste mode, contents toggle, SSH accordion, instruction cards, tips. Show only bootstrap files in staging. Mobile-first.
4. **Scan page cleanup in page.tsx** — Remove "How Driftwatch works" instructions, SSH accordion + TreeInput, "HOW TO SCAN YOUR WORKSPACE" step cards, and tip text. Replace with minimal heading + one-line description.

## Context

- Project: driftwatch
- Branch: `v4/phase-2-config-visual` (existing — patch on same branch)
- Key files:
  - `src/app/map/page.tsx` — scan page layout + `analyzeFiles()` calls
  - `src/components/map/views/ConfigHealthView.tsx` — bars + legend + attribution
  - `src/scanner/DirectoryScanner.tsx` — scanner component
  - `src/lib/config-review/thresholds.ts` — `BOOTSTRAP_FILE_ORDER` constant
  - `src/components/TreeInput.tsx` — text paste fallback (to remove from page.tsx usage)
- Dependencies: None
- Reference: Approved mockup in this chat (scan page redesign, single-page flow)

## Constraints

- Do NOT modify analysis engine code in `src/lib/config-review/`
- Do NOT modify `analyzeFiles()`, `runReview()`, `calculateBudget()`, or any lib functions
- Do NOT delete `TreeInput.tsx` file itself — just remove its usage from page.tsx (may be imported elsewhere)
- Do NOT change bar colors, tick marks, callouts, or truncation overlays in ConfigHealthView
- Do NOT change the summary cards layout at the top of ConfigHealthView (except the Truncated card number color)
- Do NOT change sidebar, navigation, or any other views

## Steps

### Step 1: Filter analyzedFiles to bootstrap-only in page.tsx

Add a filter helper near the top of the file:

```typescript
import { BOOTSTRAP_FILE_ORDER } from '@/lib/config-review/thresholds';

const BOOTSTRAP_NAMES = new Set(BOOTSTRAP_FILE_ORDER.map(f => f.toUpperCase()));

function isBootstrapFile(filename: string): boolean {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
}
```

Find every `analyzeFiles()` call site (there are three: `buildMapFromTree()`, `handleRescan()`, and the demo `useEffect`). At each, add the filter:

```typescript
// BEFORE:
const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0);

// AFTER:
const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0 && isBootstrapFile(k));
```

**Gate:** `npx tsc --noEmit` passes. `grep -n "analyzeFiles(" src/app/map/page.tsx` — every hit has `isBootstrapFile` in the filter chain.

### Step 2: ConfigHealthView — remove legend, add striped Truncated number, footer attribution

In `ConfigHealthView.tsx`:

**2A. Remove the legend row.** Delete the entire legend section at the bottom (the horizontal row with colored dots + "Healthy", "Warning", "Danger", "Truncated" labels).

**2B. Truncated card number gets red-stripe text.** Find the summary card that shows the Truncated count. Apply the red diagonal stripe as a text fill using CSS `background-clip: text`:

```tsx
// The Truncated count number should use this style:
<span style={{
  background: 'repeating-linear-gradient(135deg, #da3633, #da3633 3px, #8b1a18 3px, #8b1a18 6px)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}}>
  {truncatedCount}
</span>
```

The other three card numbers keep their existing solid colors (green, yellow, red).

**2C. Move attribution to centered footer.** The attribution text "Thresholds based on OpenClaw source code and community best practices" should be:
- Centered, full width
- `font-size: 11px`, color `#506880`
- `margin-top: 16px`, `padding-top: 12px`
- `border-top: 1px solid #1c2028` (subtle separator)
- Positioned as the last element in the component, below the aggregate bar (where the legend used to be)

**Gate:** `npx tsc --noEmit` passes.

### Step 3: Rewrite DirectoryScanner — single-page flow, bootstrap-only

This is a significant rewrite of `src/scanner/DirectoryScanner.tsx`. The component keeps the same `Props` interface (`{ onConfirm }`) but the internal structure changes completely.

**What to remove:**
- `pasteMode`, `pasteText`, `copied`, `scanSource` state variables
- `includeContents` state variable and all references
- `PASTE_LS_COMMAND` constant
- `parsePastedOutput()` function
- `handlePasteSubmit()` function
- `BUCKET_ORDER`, `BUCKET_LABELS`, `BucketIcon` — no more bucket grouping
- The entire paste mode UI (textarea, parse button, back button, copy button)
- The "Contents toggle" UI block
- The "Read file contents" toggle switch
- The `"read"` badge next to each file
- Browser detection text ("Detected: Chrome — folder picker available")
- "Recommended" badge on the folder button
- `IconClipboard` component (if only used by paste)

**What to keep:**
- `scanWithDirectoryPicker()` function and its helpers (`tryGetDir`, `tryGetFile`, etc.)
- `handleDirectoryPicker()` function (adjusted)
- `scanState` states: `'idle'` | `'scanning'` | `'review'` — but `idle` and `review` now render on the same page
- `toggleItem()` for individual file checkboxes
- `handleConfirm()` (simplified — always passes contents)
- `handleReset()` (simplified)
- Error banner
- Mobile message ("Scanning requires Chrome or Edge on desktop")

**New render structure (single page, not state-swapped):**

The component always renders the same container. The content changes based on `scanState`:

```
Always visible:
├── Error banner (if error)
└── Main content area

When scanState === 'idle':
├── "Select workspace folder" button (primary)
└── (No other UI — the heading/description are in page.tsx)

When scanState === 'scanning':
├── Spinner + progress message

When scanState === 'review':
├── Folder path bar: shows "~/.openclaw" with "Rescan" button on right
│   (muted style — border #30363d, bg #111827, text #8b949e)
│   Clicking "Rescan" calls handleReset() then handleDirectoryPicker()
├── File list (bootstrap files only):
│   ├── Header: "Found N bootstrap files" + "N selected"
│   ├── One row per bootstrap file with checkbox + filename (mono)
│   └── Only shows files from BOOTSTRAP_FILE_ORDER that were found in scan
├── "Analyze N files" button (primary, N = selected count)
└── Privacy note: "File contents stay in your browser." (11px, #506880, centered)
```

**Key behavior changes:**

**3A. Filter scanned items to bootstrap-only for display.** After `scanWithDirectoryPicker()` returns all items, filter to only show bootstrap files in the file list:

```typescript
const bootstrapItems = items.filter(item => {
  const base = item.path.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
});
```

Use `bootstrapItems` for the file list display and selection count. But keep the full `items` array and full `fileContents` — `handleConfirm()` still passes ALL selected paths and contents to `onConfirm`, because page.tsx needs the full file set for other views (AgentsView, FilesView, etc.).

Wait — actually, `handleConfirm()` should pass ALL scanned items (not just bootstrap), because the other views need agent directories, memory file names, skill directories, etc. The bootstrap filter only controls what's SHOWN in the staging UI. The confirm payload stays unchanged.

So the flow is:
1. Scan finds 74 items (full workspace)
2. File staging UI shows only 8 bootstrap files with checkboxes
3. User can uncheck bootstrap files they want to skip
4. "Analyze" sends ALL 74 paths + all file contents to `onConfirm`
5. page.tsx's `isBootstrapFile` filter (Step 1) ensures only bootstrap files enter `analyzeFiles()`

The checkboxes on bootstrap files control whether those files appear in `analyzedFiles`. To implement: when a user unchecks a bootstrap file, remove its contents from the `fileContents` map passed to `onConfirm`. The file path still gets passed (so the tree structure works), but without content it won't be analyzed.

Actually, simpler approach: keep the existing behavior where `handleConfirm()` only passes selected items' paths and contents. The scanner already does this. The only change is that the UI shows only bootstrap files for toggling. Non-bootstrap items stay selected (and hidden) — they're always included.

```typescript
function handleConfirm() {
  // All items are included in paths (bootstrap + non-bootstrap)
  const paths = items.filter(i => i.selected).map(i => i.path);
  // Contents always passed
  const filteredContents: Record<string, string> = {};
  for (const path of paths) {
    if (fileContents[path] !== undefined) filteredContents[path] = fileContents[path];
  }
  onConfirm(paths, { manifestVersion: '3.0', fileContents: filteredContents });
}
```

Non-bootstrap items never appear in the UI, so they can't be unchecked — they're always selected and always passed through.

**3B. "Analyze N files" button.** The count shows the number of SELECTED bootstrap files (not total items). Label: `Analyze ${selectedBootstrapCount} files`.

**3C. Mobile message.** On mobile (`md:hidden`), show: "Config review requires Chrome or Edge on desktop." No folder picker button on mobile.

**3D. `supportsDirectoryPicker` check.** If `false` (Firefox/Safari), show instead of the button: "Config review requires Chrome or Edge to read file contents. Open Driftwatch in Chrome or Edge to scan your workspace." Centered, muted text.

**Gate:** `npx tsc --noEmit` passes. `grep -n "pasteMode\|pasteText\|includeContents\|scanSource\|parsePastedOutput\|PASTE_LS_COMMAND\|handlePasteSubmit\|BUCKET_ORDER\|BUCKET_LABELS\|BucketIcon" src/scanner/DirectoryScanner.tsx` returns zero results.

### Step 4: Clean up scan page in page.tsx

In `src/app/map/page.tsx`, the `{!agentMap && activeView !== 'costs'}` section (the INPUT SECTION) currently renders:
1. "How Driftwatch works" — 3-step numbered instructions + privacy note
2. "Map Your Agent" heading + subtitle + "Try Demo" button
3. `<DirectoryScanner>` component
4. SSH accordion with `<TreeInput>`
5. "HOW TO SCAN YOUR WORKSPACE" — 3-step instruction cards
6. Tip text at the bottom

**Replace the entire INPUT SECTION with:**

```tsx
{!agentMap && activeView !== 'costs' ? (
  <div className="max-w-lg mx-auto px-4 py-8">
    <h1 className="text-xl font-medium text-[#f1f5f9] mb-2">
      Scan your workspace
    </h1>
    <p className="text-sm text-[#7a8a9b] mb-6 leading-relaxed">
      Point Driftwatch at your{' '}
      <code className="text-xs bg-[#1c2028] px-1.5 py-0.5 rounded text-[#b0bec9]">~/.openclaw</code>
      {' '}directory. File contents are read locally — nothing leaves your browser.
    </p>

    <DirectoryScanner onConfirm={handleDirectoryConfirm} />

    <div className="mt-4 border-t border-[#30363d] pt-4">
      <button
        onClick={() => {
          window.history.pushState({}, '', '/map?demo=true');
          window.location.reload();
        }}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#506880] bg-transparent px-4 py-3 text-sm text-[#b0bec9] hover:border-[#7db8fc]/40 hover:text-[#f1f5f9] transition-colors"
      >
        Try the interactive demo
      </button>
    </div>

    <p className="text-[11px] text-[#506880] text-center mt-3">
      Requires Chrome or Edge for folder access.
    </p>
  </div>
) : // ... rest of existing code
```

**Remove:**
- "How Driftwatch works" section entirely
- "Map Your Agent" heading and subtitle
- The SSH/headless accordion (`textFallbackOpen` state, the accordion button, the `<TreeInput>` render)
- "HOW TO SCAN YOUR WORKSPACE" step cards (01, 02, 03)
- The tip at the bottom
- The `textFallbackOpen` state variable from the component
- The `handleTreeSubmit` function (if only used by TreeInput in this context — grep first)
- The `TreeInput` import (if no longer used in page.tsx — grep first)

**Keep:**
- The "Try Demo" button (now secondary, below the scanner with a divider)
- `handleDirectoryConfirm` function
- All other state and logic

Note: The demo button implementation above uses `window.location.reload()` — check how the existing demo button works and match that pattern. It might use `router.push` or a Link component instead.

**Gate:** `npx tsc --noEmit` passes. `npx next build` succeeds. The page should render with just the heading, one line of description, the scanner component, and the demo button.

## ⛔ STOP conditions

- `BOOTSTRAP_FILE_ORDER` doesn't exist in `thresholds.ts` → define locally: `['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 'USER.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md']`
- `scanWithDirectoryPicker()` returns a different shape than `{ items, fileContents }` → read the actual function signature before rewriting
- `handleDirectoryConfirm` in page.tsx depends on paths from non-bootstrap buckets (agents, skills, etc.) for the agent map → confirm by reading `buildMapFromTree()` and `parseAgentTree()`. The full path list must still be passed.
- `TreeInput` is imported or used in files other than page.tsx → don't delete the component file, just remove the import from page.tsx
- The demo button uses a pattern other than reload (e.g. state-based) → match the existing pattern

## Acceptance Criteria

- [ ] ConfigHealthView only shows bars for the 8 bootstrap files
- [ ] Non-bootstrap files do NOT appear as bars
- [ ] Legend row at bottom of ConfigHealthView is gone
- [ ] Truncated summary card number has red diagonal stripe text effect
- [ ] Attribution text "Thresholds based on..." appears as centered footer below aggregate bar
- [ ] Scan page shows: heading → one-line description → folder picker → demo button → Chrome/Edge note
- [ ] No "How Driftwatch works" instructions on the scan page
- [ ] No SSH/paste accordion on the scan page
- [ ] No "HOW TO SCAN YOUR WORKSPACE" step cards
- [ ] No tip text at bottom of scan page
- [ ] No "Recommended" badge on folder button
- [ ] No "Read file contents" toggle anywhere
- [ ] After scanning: folder path bar with "Rescan" appears inline, bootstrap file list appears below
- [ ] File staging shows only bootstrap files with checkboxes (not 74 items across 7 buckets)
- [ ] "Analyze N files" button shows count of selected bootstrap files
- [ ] Unchecking a bootstrap file excludes it from analysis but doesn't break other views
- [ ] Non-bootstrap items (agents, memory, skills, etc.) still pass through to `onConfirm` for other views
- [ ] FilesView, AgentsView, OverviewView still work with full data
- [ ] Mobile shows "requires Chrome or Edge" message
- [ ] Firefox/Safari shows clear message that folder picker is required
- [ ] `npx tsc --noEmit` passes
- [ ] `npx next build` succeeds
- [ ] `npx vitest run` passes
- [ ] NEEDS DAN: Visual review — scan page flow, file staging, ConfigHealthView footer/cards

## Anti-Slop Note

🎯 ANTI-SLOP: The generic version would add a new instruction panel, helpful tooltips, and animated transitions between scan states.
Instead: Bare minimum. One heading, one sentence, one button. After scan: one file list, one action button. No instructions — the UI is self-evident. The only text that earns its place explains something the user couldn't figure out from the button label alone.
Reference: Vercel's deploy flow, Linear's onboarding — minimal text, obvious actions.

## Edge Cases

⚠️ Workspace has fewer than 8 bootstrap files → Show only what's found. "Found N bootstrap files" header adjusts. If zero found, show: "No bootstrap files found in this directory."

⚠️ `background-clip: text` for the striped Truncated number may not work in all browsers → Use `-webkit-background-clip` as well. Fallback: plain `#f85149` red if the gradient clip fails (the text is still readable).

⚠️ Demo button pattern → Read how the existing "Try Demo" button works before implementing. The current one might be a `<Link>` to `/map?demo=true` or use `router.push`. Match that pattern.

⚠️ `handleTreeSubmit` or `TreeInput` might be referenced in tests → grep `src/` before removing. Only remove from page.tsx.

⚠️ The `items` array from `scanWithDirectoryPicker()` includes non-bootstrap items that are needed by `parseAgentTree()` → The full items array MUST still be passed to `onConfirm`. The bootstrap filter is display-only for the staging UI.
