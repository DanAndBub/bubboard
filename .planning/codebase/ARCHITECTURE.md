# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Single-page client-side analysis tool with thin Next.js API layer

**Key Characteristics:**
- All analysis (config review, drift diff, snapshot serialization) runs entirely in the browser — no files are uploaded to any server
- One primary page (`src/app/page.tsx`) acts as the application controller, holding all orchestration state
- Server-side API routes exist only for side-channel storage: scan stats (Redis), waitlist emails (Airtable), and user feedback (Airtable)
- The `src/app/map/page.tsx` is a redirect stub — the real app lives at `/`

## Layers

**Orchestration Layer:**
- Purpose: Coordinates all application state and user interactions
- Location: `src/app/page.tsx` (`ScanPageContent` component)
- Contains: All React state (`agentMap`, `fileContents`, `reviewResult`, `analyzedFiles`, `budget`, `currentSnapshot`, `previousSnapshot`, `driftReport`, `editorFile`, `activeView`), event handlers, and data flow wiring
- Depends on: All lib modules, all view components, scanner, editor
- Used by: Root layout (`src/app/layout.tsx`)

**Shell / Layout Layer:**
- Purpose: Responsive page chrome (top bar, sidebar, main content area)
- Location: `src/components/map/MapShell.tsx`, `src/components/map/MapTopBar.tsx`, `src/components/map/MapSidebar.tsx`
- Contains: Navigation between views (`review` | `drift` | `conflict`), snapshot download/upload triggers, demo banner, contact/waitlist modals
- Depends on: View layer components
- Used by: Orchestration layer

**View Layer:**
- Purpose: Render the three analysis views when a scan is loaded
- Location: `src/components/map/views/`
- Contains:
  - `ReviewView.tsx` — wraps `ConfigHealthView` with a `ViewContextHeader`
  - `DriftView.tsx` — wraps `DriftReport` component with a `ViewContextHeader`
  - `ConflictScannerView.tsx` — placeholder stub (feature in development)
  - `ConfigHealthView.tsx` — renders per-file findings and budget breakdown
- Depends on: `src/lib/config-review/types.ts`, `src/lib/drift/types.ts`
- Used by: Orchestration layer (rendered conditionally inside `MapShell`)

**Input Layer:**
- Purpose: Accept workspace data from the user (directory scan or demo)
- Location: `src/scanner/DirectoryScanner.tsx`
- Contains: File System Access API integration (`showDirectoryPicker`), file content reading, bootstrap file filtering, redaction of `openclaw.json` secrets before storing in memory, user review/confirmation UI with checkboxes
- Depends on: `src/lib/redact.ts`, `src/lib/config-review/thresholds.ts`
- Used by: Orchestration layer (pre-scan state)

**Analysis Library:**
- Purpose: Pure functions that transform raw file content into structured findings
- Location: `src/lib/`
- Contains:
  - `src/lib/parser.ts` — parses `tree` command output into `AgentMap`
  - `src/lib/pathsToTree.ts` — converts flat path arrays (File System Access API result) into tree strings for `parser.ts`
  - `src/lib/analyzer.ts` — enriches `AgentMap` from `AGENTS.md`, `openclaw.json`, `HEARTBEAT.md` content
  - `src/lib/config-review/analyze-file.ts` — computes `FileAnalysis` (char/word/line counts, headings) from raw content
  - `src/lib/config-review/runner.ts` — runs all registered `ReviewRule` objects against `FileAnalysis[]`, produces `ReviewResult` with `healthScore`
  - `src/lib/config-review/budget.ts` — calculates `BootstrapBudget` from `FileAnalysis[]`
  - `src/lib/config-review/thresholds.ts` — all size constants and per-file thresholds (sourced from OpenClaw internals)
  - `src/lib/config-review/truncation.ts` — computes truncation zones within a file
  - `src/lib/redact.ts` — strips sensitive key values from `openclaw.json` before in-memory storage
- Depends on: Nothing outside `src/lib/`
- Used by: Orchestration layer, scanner layer

**Rules Layer:**
- Purpose: Pluggable rule definitions that each implement the `ReviewRule` interface
- Location: `src/lib/config-review/rules/`
- Contains:
  - `agent-edit-rules.ts` — detects agent-generated artifacts in config files
  - `contradiction-rules.ts` — finds conflicting instructions across files
  - `size-rules.ts` — flags files that exceed per-file thresholds
  - `structure-rules.ts` — checks for required sections and structural patterns
  - `truncation-rules.ts` — detects files exceeding `BOOTSTRAP_MAX_CHARS_DEFAULT` (20,000 chars)
- Depends on: `src/lib/config-review/types.ts`, `src/lib/config-review/thresholds.ts`
- Used by: `src/lib/config-review/runner.ts`

**Drift / Snapshot Layer:**
- Purpose: Snapshot serialization, import/export, and two-point diff computation
- Location: `src/lib/drift/`
- Contains:
  - `types.ts` — `Snapshot`, `SnapshotFile`, `DriftReport`, `FileChange` interfaces
  - `snapshot-serialize.ts` — async function that builds a `Snapshot` from current scan state; redacts secrets before SHA-256 hashing content
  - `snapshot-export.ts` — downloads `Snapshot` as a `.json` file via `<a>` download trick
  - `snapshot-import.ts` — parses/validates an uploaded snapshot JSON, returns discriminated union `ImportResult`
  - `diff-engine.ts` — `computeDrift(previous, current)` compares two `Snapshot` objects by file path and content hash
  - `content-hash.ts` — async SHA-256 hash via `crypto.subtle.digest`
  - `session-notes.ts` — utility (minor helper)
- Depends on: `src/lib/config-review/types.ts`, `src/lib/types.ts`
- Used by: Orchestration layer

**Editor Layer:**
- Purpose: Slide-in panel for viewing and editing individual config files in-session
- Location: `src/components/editor/`
- Contains: `EditorPanel.tsx` (container with rescan trigger), `MDEditor.tsx` (textarea editor), `MDViewer.tsx` (rendered markdown view)
- Depends on: `src/lib/config-review/types.ts`
- Used by: Orchestration layer (conditionally rendered over main content when `editorFile` state is set)

**API Layer:**
- Purpose: Thin Next.js route handlers for external storage and analytics
- Location: `src/app/api/`
- Contains:
  - `health/route.ts` — `GET /api/health` — returns `{status, timestamp, version}`
  - `scan-stats/route.ts` — `GET/POST /api/scan-stats` — aggregate scan counters in Upstash Redis
  - `waitlist/route.ts` — `POST /api/waitlist` — writes email to Airtable Waitlist table
  - `feedback/route.ts` — `POST /api/feedback` — writes bug/suggestion/review to Airtable Feedback table
- Depends on: External services only; no shared `src/lib` imports
- Used by: Browser (fetch calls from orchestration layer and `MapSidebar`)

## Data Flow

**Primary Scan Flow (File System Access API):**

1. User clicks "Select workspace folder" in `DirectoryScanner` (`src/scanner/DirectoryScanner.tsx`)
2. `showDirectoryPicker()` opens OS folder picker (Chrome/Edge only)
3. Scanner reads `openclaw.json` (redacting secrets), workspace `*.md` files (full content), memory/subagent file names (metadata only), agent and skill directory names
4. User reviews file list and clicks "Analyze N files"
5. `onConfirm` callback fires to orchestration layer (`src/app/page.tsx`) with paths + file contents
6. `pathsToTree(paths)` (`src/lib/pathsToTree.ts`) converts flat paths to tree string
7. `parseAgentTree(tree)` (`src/lib/parser.ts`) builds `AgentMap`
8. `applyAnalyzer()` loop enriches `AgentMap` from `AGENTS.md`, `openclaw.json`, `HEARTBEAT.md`
9. `analyzeFiles(mdFiles)` (`src/lib/config-review/analyze-file.ts`) produces `FileAnalysis[]`
10. `runReview(analyzed)` (`src/lib/config-review/runner.ts`) runs all rules, produces `ReviewResult`
11. `calculateBudget(analyzed)` produces `BootstrapBudget`
12. `serializeSnapshot(...)` (async) builds `Snapshot` with SHA-256 content hashes
13. If `previousSnapshot` is loaded, `computeDrift(prev, current)` produces `DriftReport`
14. Scan stats fired to `/api/scan-stats` (fire-and-forget)
15. UI switches to `MapShell` with active view `'review'`

**Demo Flow:**

1. User clicks "Try demo data"
2. `getDemoAgentMap()` / `getDemoFileContents()` from `src/lib/demo-data.ts` populate state directly
3. `DEMO_SNAPSHOT`, `DEMO_DRIFT_REPORT`, `DEMO_BUDGET` from `src/lib/phase3-demo-data.ts` pre-populate drift state
4. Config review is run on demo file contents the same way as a real scan

**Drift Comparison Flow:**

1. User downloads current `Snapshot` via "Download Snapshot" (`src/lib/drift/snapshot-export.ts`)
2. On a future session, user uploads prior snapshot via "Upload Snapshot"
3. `importSnapshot(jsonText)` validates schema version and structure
4. `setPreviousSnapshot(result.snapshot)` stores it in orchestration state
5. If `currentSnapshot` exists, `computeDrift(previous, current)` immediately computes `DriftReport`
6. DriftView renders the report via `src/components/drift/DriftReport.tsx`

**State Management:**
- All application state lives in `useState` hooks inside `ScanPageContent` in `src/app/page.tsx`
- No external state management library (no Redux, Zustand, Context)
- State is passed down as props to all child components
- The only persistent state is URL query params (`?demo=true`, `?view=`) managed via `window.history.pushState`

## Key Abstractions

**AgentMap:**
- Purpose: Represents a parsed OpenClaw workspace structure
- Examples: `src/lib/types.ts`, produced by `src/lib/parser.ts`, enriched by `src/lib/analyzer.ts`
- Pattern: Plain interface, immutable updates via spread

**FileAnalysis:**
- Purpose: Normalized metrics for a single config file (char count, headings, sections)
- Examples: `src/lib/config-review/types.ts`, produced by `src/lib/config-review/analyze-file.ts`
- Pattern: Pure function input/output, no class instances

**ReviewRule:**
- Purpose: Pluggable rule with a `check(files: FileAnalysis[]) => ReviewFinding[]` function
- Examples: `src/lib/config-review/rules/`
- Pattern: Rule registry in `runner.ts` aggregates all rules; rules are isolated and silent-fail

**Snapshot:**
- Purpose: Point-in-time serializable state of a workspace scan (versioned schema)
- Examples: `src/lib/drift/types.ts` (`SNAPSHOT_SCHEMA_VERSION = 1`)
- Pattern: JSON-serializable, schema version validated on import

## Entry Points

**Root Page (`/`):**
- Location: `src/app/page.tsx` (`HomePage` wrapping `ScanPageContent`)
- Triggers: Direct navigation; also the target of `src/app/map/page.tsx` redirect
- Responsibilities: All orchestration — state management, scan pipeline, view routing

**API Routes:**
- Location: `src/app/api/*/route.ts`
- Triggers: Fetch calls from browser after scan completes (`/api/scan-stats`), sidebar modals (`/api/feedback`), waitlist form (`/api/waitlist`)
- Responsibilities: Airtable writes, Redis counter increments, health check

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Google font injection (JetBrains Mono, IBM Plex Sans), HTML lang/dark class, global CSS

## Error Handling

**Strategy:** Silent-fail for non-critical paths; structured error returns for user-facing failures

**Patterns:**
- `importSnapshot` returns a discriminated union `{ ok: true, snapshot } | { ok: false, error }` — caller shows `alert(result.error)` on failure
- Config review rules are wrapped in try/catch inside `runner.ts` — a failing rule is skipped silently, review still completes
- API routes return structured `{ ok: false, error: string }` JSON with HTTP error status codes
- `DirectoryScanner` catches `AbortError` (user cancelled picker) without showing an error message
- `redactSensitiveValues` falls back to returning the original string on JSON parse failure

## Cross-Cutting Concerns

**Logging:** `console.error` in API routes only (prefixed with `[waitlist]`, `[feedback]`, etc.)
**Validation:** Input validation inline in API route handlers; snapshot validation in `src/lib/drift/snapshot-import.ts`
**Authentication:** None — fully public tool, no user accounts
**Security:** `src/lib/redact.ts` strips sensitive keys from `openclaw.json` before any in-memory storage; `src/lib/drift/snapshot-serialize.ts` redacts Anthropic/OpenAI API key patterns before SHA-256 hashing

---

*Architecture analysis: 2026-04-05*
