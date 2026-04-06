# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
driftwatch/
├── src/
│   ├── app/                  # Next.js App Router pages and API routes
│   │   ├── page.tsx          # Root page — application entry point and orchestrator
│   │   ├── layout.tsx        # Root layout (fonts, metadata, global CSS)
│   │   ├── globals.css       # Global Tailwind CSS base styles
│   │   ├── favicon.ico
│   │   ├── map/
│   │   │   └── page.tsx      # Redirect stub → / (preserves old ?demo=true links)
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── scan-stats/route.ts
│   │       ├── waitlist/route.ts
│   │       └── feedback/route.ts
│   ├── components/           # React components
│   │   ├── map/              # Page-level shell and sidebar
│   │   │   ├── MapShell.tsx
│   │   │   ├── MapTopBar.tsx
│   │   │   ├── MapSidebar.tsx
│   │   │   ├── ResetDialog.tsx
│   │   │   └── views/        # Swappable content panels
│   │   │       ├── ReviewView.tsx
│   │   │       ├── DriftView.tsx
│   │   │       ├── ConflictScannerView.tsx
│   │   │       └── ConfigHealthView.tsx
│   │   ├── drift/
│   │   │   └── DriftReport.tsx
│   │   ├── editor/           # In-session file editor slide-in
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── MDEditor.tsx
│   │   │   └── MDViewer.tsx
│   │   ├── guidance/         # Contextual help UI
│   │   │   ├── DemoBanner.tsx
│   │   │   └── ViewContextHeader.tsx
│   │   ├── CommunityCounter.tsx
│   │   ├── FeedbackWidget.tsx
│   │   ├── FileViewer.tsx
│   │   ├── MapErrorBoundary.tsx
│   │   ├── TreeInput.tsx
│   │   └── WaitlistForm.tsx
│   ├── lib/                  # Pure analysis functions and type definitions
│   │   ├── types.ts          # AgentMap, AgentInfo, WorkspaceFiles, HealthReport
│   │   ├── parser.ts         # Tree string → AgentMap
│   │   ├── pathsToTree.ts    # Flat path array → tree string
│   │   ├── analyzer.ts       # AGENTS.md / openclaw.json enrichment
│   │   ├── redact.ts         # Strip secrets from openclaw.json
│   │   ├── demo-data.ts      # Hardcoded demo AgentMap and file contents
│   │   ├── phase3-demo-data.ts # Hardcoded demo Snapshot, DriftReport, Budget
│   │   ├── config-review/    # Config health analysis subsystem
│   │   │   ├── types.ts      # FileAnalysis, ReviewRule, ReviewFinding, BootstrapBudget
│   │   │   ├── analyze-file.ts
│   │   │   ├── runner.ts     # Rule registry + ReviewResult
│   │   │   ├── budget.ts
│   │   │   ├── thresholds.ts # Per-file size constants sourced from OpenClaw internals
│   │   │   ├── truncation.ts
│   │   │   └── rules/
│   │   │       ├── agent-edit-rules.ts
│   │   │       ├── contradiction-rules.ts
│   │   │       ├── size-rules.ts
│   │   │       ├── structure-rules.ts
│   │   │       └── truncation-rules.ts
│   │   └── drift/            # Snapshot and drift subsystem
│   │       ├── types.ts      # Snapshot, DriftReport, FileChange
│   │       ├── snapshot-serialize.ts
│   │       ├── snapshot-export.ts
│   │       ├── snapshot-import.ts
│   │       ├── diff-engine.ts
│   │       ├── content-hash.ts
│   │       └── session-notes.ts
│   └── scanner/              # File System Access API integration
│       ├── DirectoryScanner.tsx
│       └── fs-types.d.ts
├── smoke/                    # Smoke tests
│   └── helpers/
├── spec/                     # Spec files for GSD planning
├── specs/                    # Executed spec + result files
├── design-system/            # Design reference pages
│   └── pages/
├── public/                   # Static assets
├── .planning/codebase/       # GSD codebase analysis documents
├── .github/workflows/        # CI configuration
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── vitest.config.mts
├── eslint.config.mjs
├── postcss.config.mjs
└── package.json
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router pages and API routes
- Contains: Two pages (`/` and `/map`), four API route handlers
- Key files: `src/app/page.tsx` — this is the entire application in one component

**`src/components/map/`:**
- Purpose: The application shell rendered once a scan is loaded
- Contains: Layout shell (`MapShell`), navigation top bar (`MapTopBar`), sidebar with view switcher (`MapSidebar`), reset confirmation dialog (`ResetDialog`)
- Key files: `src/components/map/MapShell.tsx` — responsive grid layout (252px sidebar + 1fr content on desktop, full-width with bottom tab bar on mobile)

**`src/components/map/views/`:**
- Purpose: Swappable content panels controlled by the `activeView` state in `src/app/page.tsx`
- Contains: One component per view; each receives pre-processed data as props
- Key files: `src/components/map/views/ConfigHealthView.tsx` — the primary review UI (renders per-file findings, budget bar)

**`src/components/editor/`:**
- Purpose: Slide-in panel for viewing and editing individual files without leaving the scan session
- Contains: `EditorPanel` (outer container, rescan button), `MDEditor` (textarea), `MDViewer` (rendered preview)

**`src/components/guidance/`:**
- Purpose: Contextual help — collapsible per-view explanations and demo session banner
- Contains: `ViewContextHeader.tsx` (expandable info header per view), `DemoBanner.tsx` (shown when `?demo=true`)

**`src/lib/`:**
- Purpose: All business logic — pure TypeScript functions with no React dependencies
- Contains: Parser, analyzer, config-review subsystem, drift/snapshot subsystem, type definitions, demo data
- Key files: `src/lib/config-review/thresholds.ts` — source-of-truth for all size limits

**`src/lib/config-review/`:**
- Purpose: Config health analysis — file parsing, rule execution, budget calculation
- Contains: Type definitions, rule runner, budget calculator, threshold constants, five rule modules

**`src/lib/config-review/rules/`:**
- Purpose: Individual pluggable rules, each exporting an array of `ReviewRule` objects
- Contains: Five rule files covering size, truncation, structure, contradiction, agent-edit patterns
- Pattern: Each rule file exports a named `*Rules` array that `runner.ts` spreads into `ALL_RULES`

**`src/lib/drift/`:**
- Purpose: Snapshot lifecycle — create, export, import, compare
- Contains: Type schema, async serializer (SHA-256 hashing), file-based export/import, diff engine

**`src/scanner/`:**
- Purpose: Browser File System Access API integration (Chrome/Edge only)
- Contains: `DirectoryScanner.tsx` — manages the three-state UI (idle → scanning → review), calls `showDirectoryPicker`, reads workspace files, redacts secrets

**`smoke/`:**
- Purpose: Smoke/integration tests
- Contains: Helper utilities in `smoke/helpers/`

**`spec/` and `specs/`:**
- Purpose: GSD planning specs and CC result files
- Generated: No (manually authored or GSD-generated)
- Committed: Yes

**`design-system/`:**
- Purpose: Reference pages for design decisions
- Contains: HTML page references in `design-system/pages/`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root application page — scan orchestration, all state
- `src/app/layout.tsx`: HTML shell, font config, global metadata

**Configuration:**
- `src/lib/config-review/thresholds.ts`: All size thresholds and bootstrap file constants
- `tsconfig.json`: TypeScript config; defines `@/*` → `src/*` path alias
- `next.config.ts`: Next.js config
- `vitest.config.ts` / `vitest.config.mts`: Test runner config
- `.env.example`: Documents required environment variables

**Core Logic:**
- `src/lib/parser.ts`: Tree string → AgentMap (input parsing)
- `src/lib/config-review/runner.ts`: Rule runner → ReviewResult
- `src/lib/drift/diff-engine.ts`: Snapshot diff → DriftReport
- `src/lib/drift/snapshot-serialize.ts`: Current scan state → Snapshot

**Testing:**
- `src/lib/__tests__/analyzer.test.ts`
- `src/lib/__tests__/redact.test.ts`
- `src/lib/config-review/__tests__/rules.test.ts`
- `src/lib/drift/__tests__/diff-engine.test.ts`
- `src/app/api/health/__tests__/health.test.ts`
- `src/app/api/waitlist/__tests__/route.test.ts`
- `src/app/api/feedback/__tests__/route.test.ts`

## Naming Conventions

**Files:**
- React components: PascalCase `.tsx` (e.g., `MapShell.tsx`, `DirectoryScanner.tsx`)
- Library functions: camelCase `.ts` (e.g., `analyze-file.ts`, `diff-engine.ts`, `snapshot-serialize.ts`)
- Rule modules: kebab-case with `-rules` suffix (e.g., `size-rules.ts`, `truncation-rules.ts`)
- Type definitions: `types.ts` in each subsystem directory
- Test files: co-located in `__tests__/` subdirectory with `.test.ts` extension
- Demo data: `demo-data.ts`, `phase3-demo-data.ts`

**Directories:**
- Feature subsystems: lowercase kebab-case (`config-review/`, `drift/`)
- Component groupings: lowercase kebab-case (`map/`, `editor/`, `guidance/`)
- Test directories: `__tests__/` co-located next to source

## Where to Add New Code

**New Analysis Rule:**
- Implementation: `src/lib/config-review/rules/<category>-rules.ts` — export a named `<category>Rules: ReviewRule[]` array
- Register: Add to `ALL_RULES` spread in `src/lib/config-review/runner.ts`
- Types: Use existing `ReviewRule`, `ReviewFinding` from `src/lib/config-review/types.ts`
- Tests: `src/lib/config-review/__tests__/rules.test.ts`

**New View Panel:**
- Implementation: `src/components/map/views/<ViewName>View.tsx`
- Add view to the `View` type union in `src/app/page.tsx`
- Add nav item to `src/components/map/MapSidebar.tsx`
- Add conditional render block inside `ScanPageContent` in `src/app/page.tsx`

**New API Route:**
- Implementation: `src/app/api/<endpoint>/route.ts`
- Tests: `src/app/api/<endpoint>/__tests__/route.test.ts`
- Pattern: Named exports `GET`, `POST` etc. returning `NextResponse.json()`

**New Library Utility:**
- Shared helpers: `src/lib/<name>.ts` (pure functions only — no React)
- Subsystem-specific: `src/lib/<subsystem>/<name>.ts`

**New Shared Component:**
- Top-level UI widget: `src/components/<ComponentName>.tsx`
- Feature-grouped: `src/components/<group>/<ComponentName>.tsx`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents and codebase analysis
- Contains: `codebase/` with analysis docs written by GSD mapper
- Generated: Partially (mapper outputs)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes
- Committed: No

**`smoke/`:**
- Purpose: Smoke/integration test helpers
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-05*
