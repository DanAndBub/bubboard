# CC SPEC: Driftwatch V4 Phase 2 — Post-Build Patch

## Goal

Three fixes from Dan's visual review of the Phase 2 build:
1. ConfigHealthView shows bars for non-bootstrap files. Only the 8 bootstrap files should appear.
2. Legend at the bottom is too small. Increase font size and spread evenly.
3. Remove the "Read file contents" toggle and the terminal paste scan method. Contents are mandatory for config review to work, and paste can't read contents — so paste adds no value. Folder picker only.

## Context

- Project: driftwatch
- Branch: `v4/phase-2-config-visual` (existing — patch on same branch)
- Key files:
  - `src/app/map/page.tsx` — calls `analyzeFiles()` on all `.md` files (root cause of #1)
  - `src/components/map/views/ConfigHealthView.tsx` — renders bars + legend (#2)
  - `src/scanner/DirectoryScanner.tsx` — has `includeContents` toggle and paste mode (#3)
  - `src/lib/config-review/thresholds.ts` — has `BOOTSTRAP_FILE_ORDER` constant
- Dependencies: None

## Constraints

- Do NOT modify `analyzeFiles()` or any analysis engine code in `src/lib/config-review/`
- Do NOT change the summary cards layout at the top of ConfigHealthView
- Do NOT change bar colors, tick marks, callouts, or truncation overlays
- Do NOT remove the `TreeInput` component or `handleTreeSubmit` in page.tsx — only remove paste mode from the DirectoryScanner. TreeInput is a separate component that may still be referenced elsewhere.

## Steps

### Step 1: Filter analyzedFiles to bootstrap-only in page.tsx

The root cause: `buildMapFromTree()`, `handleRescan()`, and the demo `useEffect` in `page.tsx` pass every `.md` file to `analyzeFiles()`. Only bootstrap files should be analyzed.

Add a filter helper near the top of the file:

```typescript
import { BOOTSTRAP_FILE_ORDER } from '@/lib/config-review/thresholds';

const BOOTSTRAP_NAMES = new Set(BOOTSTRAP_FILE_ORDER.map(f => f.toUpperCase()));

function isBootstrapFile(filename: string): boolean {
  const base = filename.split('/').pop()?.toUpperCase() ?? '';
  return BOOTSTRAP_NAMES.has(base);
}
```

Then at every `analyzeFiles()` call site (there are three), add the filter:

```typescript
// BEFORE:
const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0);

// AFTER:
const mdFiles = Object.entries(allContents).filter(([k, v]) => k.toLowerCase().endsWith('.md') && v.length > 0 && isBootstrapFile(k));
```

`runReview()` consumes the same `analyzed` result, so config review findings also scope to bootstrap files — correct.

**Gate:** `npx tsc --noEmit` passes. `grep -n "analyzeFiles(" src/app/map/page.tsx` — every hit has `isBootstrapFile` in the filter chain.

### Step 2: Increase legend text size and spread evenly

In `ConfigHealthView.tsx`, find the legend section (horizontal row at bottom with colored dots + labels).

Changes:
- Container: `flex justify-evenly w-full`, add `py-3` for breathing room
- Dot size: increase from 8px to 10px
- Label font size: increase from `text-[10px]` to `text-[13px]`
- Label color: keep `#8b949e`

**Gate:** `npx tsc --noEmit` passes.

### Step 3: Remove contents toggle + paste mode from DirectoryScanner

This is a simplification pass. Paste mode can't read file contents, and without contents the config review feature doesn't work. The folder picker always reads contents. Remove the dead path.

**3A. Remove the `includeContents` state and toggle UI:**
- Delete `const [includeContents, setIncludeContents] = useState(false);`
- Delete the entire "Contents toggle" UI block in the `review` state render
- Remove the `"read"` badge next to each scanned file item (the `{includeContents && fileContents[item.path] !== undefined && ...}` span)

**3B. Update `handleConfirm()` to always pass contents:**

```typescript
// BEFORE:
const filteredContents: Record<string, string> = {};
if (includeContents) {
  for (const path of paths) {
    if (fileContents[path] !== undefined) filteredContents[path] = fileContents[path];
  }
}

// AFTER:
const filteredContents: Record<string, string> = {};
for (const path of paths) {
  if (fileContents[path] !== undefined) filteredContents[path] = fileContents[path];
}
```

**3C. Remove paste mode entirely:**
- Delete `const [pasteMode, setPasteMode] = useState(false);`
- Delete `const [pasteText, setPasteText] = useState('');`
- Delete `const [copied, setCopied] = useState(false);`
- Delete `const [scanSource, setScanSource] = useState<'picker' | 'paste'>('picker');`
- Delete the `PASTE_LS_COMMAND` constant
- Delete the `parsePastedOutput()` function
- Delete `handlePasteSubmit()` function
- Delete the entire `{/* ── IDLE: paste mode ── */}` render block (the textarea + parse button + back button)
- In the `{/* ── IDLE: picker buttons ── */}` block, remove the "Paste terminal output" button and the `or` divider
- In `handleReset()`, remove `setPasteMode(false)` and `setPasteText('')` lines
- Remove `scanSource` references throughout (e.g. `setScanSource('picker')` in `handleDirectoryPicker`, `setScanSource('paste')` in paste handler)
- Any browser detection text that says "use terminal paste below" for non-Chrome browsers → change to state that folder picker requires Chrome or Edge

**3D. Simplify the idle state:**
After removing paste, the idle state on desktop just shows the folder picker button. On browsers without `showDirectoryPicker` (Firefox/Safari), show a message: "Config review requires Chrome or Edge to read file contents. Open Driftwatch in Chrome or Edge to scan your workspace." Don't show a disabled button — just the message.

**3E. Clean up dead code:**
- `grep -rn "pasteMode\|pasteText\|includeContents\|scanSource\|parsePastedOutput\|PASTE_LS_COMMAND\|handlePasteSubmit" src/scanner/DirectoryScanner.tsx` should return zero results
- `IconClipboard` component (if defined locally for the paste copy button) — remove if no longer referenced

**Gate:** `npx tsc --noEmit` passes. `npx next build` succeeds. The grep above returns zero results.

## ⛔ STOP conditions

- `BOOTSTRAP_FILE_ORDER` doesn't exist in `thresholds.ts` → check actual export name; if missing, define locally: `['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 'USER.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md']`
- `analyzeFiles()` call sites in page.tsx don't match the pattern shown
- Paste-related state or functions are imported/used outside `DirectoryScanner.tsx` → grep the full `src/` tree before deleting

## Acceptance Criteria

- [ ] ConfigHealthView only shows bars for the 8 bootstrap files
- [ ] Non-bootstrap files (subagent protocols, schemas, handoff docs, daily notes) do NOT appear as bars
- [ ] FilesView still shows all workspace files (unaffected)
- [ ] Legend text is 13px and items spread evenly across full width
- [ ] Legend dots are 10px
- [ ] Summary card counts only count bootstrap files
- [ ] Scanner shows folder picker only — no paste option, no contents toggle
- [ ] Scanner always passes file contents through `onConfirm`
- [ ] Firefox/Safari users see a clear message that Chrome/Edge is required
- [ ] No references to `includeContents`, `pasteMode`, `pasteText`, `scanSource`, `parsePastedOutput`, or `PASTE_LS_COMMAND` remain in DirectoryScanner.tsx
- [ ] `npx tsc --noEmit` passes
- [ ] `npx next build` succeeds
- [ ] NEEDS DAN: Visual check — legend readability, bootstrap-only bar list, simplified scan flow

## Edge Cases

⚠️ A workspace might not have all 8 bootstrap files → Only show bars for files that exist. No empty placeholder rows.

⚠️ `BOOTSTRAP_FILE_ORDER` might not be exported from thresholds.ts → Define locally if needed. The 8 names are stable.

⚠️ Demo mode file contents may use basenames or paths → `isBootstrapFile()` extracts basename before matching.

⚠️ `TreeInput` component in page.tsx also provides a text input path → Don't remove it. It's a separate component from the scanner's paste mode. Check whether `TreeInput` still adds value without file contents — if not, flag it as a future cleanup candidate but don't remove in this patch.

⚠️ Mobile users currently see a "Scanning works best on desktop" message → Keep this message. It's still accurate.

⚠️ The `IconClipboard` SVG component may be used by other copy buttons elsewhere → Grep before deleting. Only remove if isolated to paste mode.
