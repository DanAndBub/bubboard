# Codebase Concerns

**Analysis Date:** 2026-04-05

## Tech Debt

**Placeholder stats with stale TODO comments:**
- Issue: `CommunityCounter` initializes state with hardcoded `PLACEHOLDER_STATS` (127 scans, 843 files, etc.) and two identical `// TODO: Remove threshold override after Dan's visual review` comments. The fallback values display as real data if the `/api/scan-stats` fetch fails or if Redis is unconfigured — users see fake numbers with no indication they are placeholders.
- Files: `src/components/CommunityCounter.tsx` lines 19–26, 35
- Impact: Misleads users about actual scan volume. Numbers look credible but are invented.
- Fix approach: Replace `PLACEHOLDER_STATS` with zero-values or a loading skeleton. Remove both TODO comments once reviewed.

**`_inputCollapsed` state is written but never read:**
- Issue: `const [_inputCollapsed, setInputCollapsed] = useState(...)` in the main page component — the underscore-prefixed variable is set in multiple places but never consumed. The UI toggle it was meant to control is absent or handled another way.
- Files: `src/app/page.tsx` line 45
- Impact: Dead state management adds cognitive noise; future devs will question whether collapsed behavior is intentional.
- Fix approach: Either wire the value to an actual conditional in the render or delete the state entirely.

**Hardcoded `driftwatchVersion: '3.0.0'` in snapshot serialization:**
- Issue: `src/lib/drift/snapshot-serialize.ts` embeds the version string `'3.0.0'` as a literal. There is no single source of truth; `package.json` says `version: "0.1.0"`.
- Files: `src/lib/drift/snapshot-serialize.ts` line 54
- Impact: Version field in exported snapshots is always wrong. Schema migration logic in `snapshot-import.ts` would fail to distinguish real version differences.
- Fix approach: Import version from `package.json` or a dedicated `version.ts` constant, keeping both in sync.

**`setTimeout(150ms)` used to fake async work in `buildMapFromTree`:**
- Issue: `src/app/page.tsx` line 150 wraps the entire tree parsing and review pipeline in `setTimeout(() => {...}, 150)` — a deliberate artificial delay to show a loading spinner. The parse + review is synchronous and fast; the delay is cosmetic.
- Files: `src/app/page.tsx` lines 150–204
- Impact: Every real scan is artificially slowed by 150ms. If the synchronous work ever becomes genuinely slow, this will compound with it.
- Fix approach: Use a `requestAnimationFrame` or move to a Web Worker for the compute; let the spinner show naturally based on state transitions rather than a fixed delay.

**Duplicate `isBootstrapFile` helper defined in two places:**
- Issue: The function `isBootstrapFile(filename)` is independently implemented in both `src/app/page.tsx` (line 32) and `src/scanner/DirectoryScanner.tsx` (line 27). Both derive from `BOOTSTRAP_FILE_ORDER` but are copy-pasted.
- Files: `src/app/page.tsx` lines 30–35, `src/scanner/DirectoryScanner.tsx` lines 25–30
- Impact: Logic drift — if the file list changes, both copies must be updated. One will likely be missed.
- Fix approach: Export a single `isBootstrapFile` from `src/lib/config-review/thresholds.ts` and import it in both consumers.

**`TYPICAL_THRESHOLDS` duplicates data already in `FILE_THRESHOLDS`:**
- Issue: `src/components/map/views/ConfigHealthView.tsx` lines 13–23 defines `TYPICAL_THRESHOLDS` as a local constant with per-file "typical" sizes. These overlap with (but differ from) `FILE_THRESHOLDS` in `thresholds.ts`. There is no explanation why they diverge.
- Files: `src/components/map/views/ConfigHealthView.tsx` lines 13–23, `src/lib/config-review/thresholds.ts`
- Impact: UI shows different thresholds than the rule engine uses. A user looking at the bar chart sees different numbers than the findings panel.
- Fix approach: Add a `typical` field to `FileThreshold` interface in `thresholds.ts`, move the values there, and import in `ConfigHealthView`.

---

## Known Bugs

**Snapshot import uses type assertion instead of runtime validation:**
- Symptoms: `importSnapshot` in `src/lib/drift/snapshot-import.ts` checks `schemaVersion`, `timestamp`, and `files` array existence, then casts `obj as unknown as Snapshot`. All other fields (`healthScore`, `reviewFindings`, `agents`, `workspaceSummary`, `architectureSummary`) are unchecked. A malformed file passes validation and can cause runtime errors downstream when those fields are accessed.
- Files: `src/lib/drift/snapshot-import.ts` lines 40–44
- Trigger: Upload any JSON with `schemaVersion: 1`, `timestamp: "x"`, and `files: []` — missing all other required fields.
- Workaround: None. Downstream components would receive `undefined` for expected fields.

**`alert()` used for snapshot import errors:**
- Symptoms: When snapshot import fails, the code calls `alert(result.error)` — a blocking browser dialog with no styling.
- Files: `src/app/page.tsx` line 402
- Trigger: Upload a JSON file that fails `importSnapshot` validation.
- Workaround: None.

**`computeDrift` silently skips added and removed files:**
- Symptoms: Files that appear in one snapshot but not the other are not reported in `filesChanged`. The `DriftReport` only reflects files present in both. This is documented in test comments ("Added files are silently skipped") but not surfaced in the UI.
- Files: `src/lib/drift/diff-engine.ts` lines 14–17, `src/lib/drift/__tests__/diff-engine.test.ts` lines 34–57
- Trigger: Scan a workspace, add or delete a bootstrap file, scan again, compare drift — the file change is invisible.
- Workaround: None.

---

## Security Considerations

**`/api/scan-stats` POST endpoint has no authentication:**
- Risk: Anyone can POST to `/api/scan-stats` and inflate Redis counters indefinitely. The endpoint has sanity bounds (max 20 files, max 5M chars) but no rate limiting, no auth, and no IP throttling.
- Files: `src/app/api/scan-stats/route.ts` lines 59–113
- Current mitigation: Sanity bounds prevent single-request abuse. Counter inflation above the bounds is still possible via repeated requests.
- Recommendations: Add rate limiting per IP (Upstash ratelimit package or Vercel middleware). Consider requiring a CSRF token or a lightweight shared secret.

**`NEXT_PUBLIC_ADMIN_SECRET` exposes server secret to the browser:**
- Risk: `.env.example` shows `NEXT_PUBLIC_ADMIN_SECRET=` alongside `DRIFTWATCH_ADMIN_SECRET=`. Any variable prefixed `NEXT_PUBLIC_` is embedded in the client bundle and visible to all users. The admin routes (Anthropic/OpenAI usage, reconcile) appear in the build artifacts but have no source files in `src/` — they may have been removed, but the env var pattern remains documented.
- Files: `.env.example` lines 4–5
- Current mitigation: No active admin routes were found in `src/`. Risk is theoretical if routes are re-added.
- Recommendations: Never use `NEXT_PUBLIC_` prefix for secrets. Use server-only env vars for auth tokens.

**`redactSensitiveValues` only handles JSON; raw markdown file content is not redacted:**
- Risk: `DirectoryScanner` passes `workspace/*.md` file contents directly to `onConfirm` without redaction. The `redact.ts` module only operates on JSON strings. If any `.md` file contains inline API keys (e.g., in a TOOLS.md example), those values flow through to `analyzeFile` and into the snapshot's `reviewFindings`.
- Files: `src/scanner/DirectoryScanner.tsx` lines 75–111, `src/lib/redact.ts`
- Current mitigation: `snapshot-serialize.ts` applies regex redaction of known key patterns (`sk-ant-`, `sk-`) before hashing. But the full content string is held in React state and passed to the rule engine unredacted.
- Recommendations: Apply the regex redaction pass from `snapshot-serialize.ts` to all file content strings at the scanner boundary before storing in state.

**`redactSensitiveValues` does not handle non-JSON content gracefully:**
- Risk: If `openclaw.json` contains comments or is malformed JSON, the function returns the raw string unchanged — with no indication that redaction was skipped.
- Files: `src/lib/redact.ts` lines 26–33
- Current mitigation: The `catch` block silently returns the original string.
- Recommendations: Log a warning (client-side) when JSON parse fails so users know redaction did not run.

---

## Performance Bottlenecks

**`findDuplicateParagraphs` is O(n²) across all paragraph pairs:**
- Problem: `contradiction-rules.ts` compares every paragraph in every file against every other paragraph — O(p²) where p is total paragraph count. With large bootstrap files, this can be slow enough to block the main thread during rule evaluation.
- Files: `src/lib/config-review/rules/contradiction-rules.ts` lines 86–129
- Cause: No early-exit and no pagination — all paragraphs are collected and compared in one pass.
- Improvement path: Cap paragraphs per file (e.g., first 50), or move rule execution to a Web Worker. For current realistic file sizes (< 20K chars each) this is acceptable, but it will degrade with many files.

**`phase3-demo-data.ts` is 1,526 lines — loaded on every page visit:**
- Problem: The demo data file is imported unconditionally at the top of `src/app/page.tsx` even for non-demo sessions. It adds ~1,526 lines of static data to the client bundle.
- Files: `src/lib/phase3-demo-data.ts`, `src/app/page.tsx` line 9
- Cause: Eager import with no code-splitting.
- Improvement path: Dynamic `import()` the demo data only when `isDemo` is true or when "Try demo data" is clicked.

---

## Fragile Areas

**`ConflictScannerView` is a placeholder stub:**
- Files: `src/components/map/views/ConflictScannerView.tsx`
- Why fragile: The component renders static text and "This feature is in development." The sidebar tab for "Conflicts" is fully navigable. Users land on this view with no explanation of when the feature will be ready and no fallback behavior.
- Safe modification: The contradiction detection rules already exist in `runner.ts` and are evaluated during review. The simplest fix is to pass `reviewResult.findings` filtered by `category === 'contradiction'` into this view and display them, removing the stub status.
- Test coverage: No tests for `ConflictScannerView`.

**`analyzeOpenClawConfig` hierarchy derivation is hardcoded to specific agent IDs:**
- Files: `src/lib/analyzer.ts` lines 74–78
- Why fragile: The `deriveReportsTo` function contains hardcoded logic: `if (id === 'main') return undefined` and `if (id === 'coder' && allIds.includes('sonnet')) return 'sonnet'`. Any workspace using different agent naming will get incorrect hierarchy inferred.
- Safe modification: The function is only used for enriching the visual map display, not for security decisions. The risk is cosmetic hierarchy errors for non-standard agent names.
- Test coverage: No tests covering `deriveReportsTo` logic.

**`window.history.pushState` called directly to manage URL state:**
- Files: `src/app/page.tsx` lines 95, 237, 366
- Why fragile: The app uses `window.history.pushState({}, '', '/')` to clear URL state instead of using Next.js `router.push()` or `router.replace()`. This bypasses Next.js's router state and can cause inconsistencies if the router's internal state cache diverges from the actual URL.
- Safe modification: Replace with `router.push('/')` or `router.replace('/')` from `useRouter()`. The `loadDemoData` function also pushes `/?demo=true` via history, which should use the router.
- Test coverage: None.

**Rule engine silently swallows all exceptions:**
- Files: `src/lib/config-review/runner.ts` lines 54–59
- Why fragile: Each rule is wrapped in a `try/catch` that discards exceptions with no logging. A buggy or crashing rule produces zero findings with no indication something went wrong. Users see a clean "0 findings" result that may be a false negative.
- Safe modification: At minimum, log rule failures to `console.error` in development. Consider adding a `ruleErrors` count to `ReviewResult` so the UI can surface "X rules failed to execute."
- Test coverage: No tests for rule failure recovery path.

---

## Scaling Limits

**Redis counters have no expiry or cap:**
- Current capacity: Upstash free tier, unbounded counter growth.
- Limit: Integer overflow is theoretical at Redis scale. The real limit is Upstash free tier request limits (10K requests/day).
- Scaling path: If scan volume grows, add Upstash Pro or cache the aggregate stats with a TTL (e.g., recompute once per minute) rather than fetching live on every page load.

**`FileSystemDirectoryHandle` API limits scan to Chromium browsers only:**
- Current capacity: Chrome and Edge desktop only.
- Limit: Firefox, Safari, and all mobile browsers cannot use the directory scanner. The mobile fallback shows a static message.
- Scaling path: Provide a tree-paste fallback (already partially implemented in `TreeInput.tsx`) as the primary mobile path, and promote it more clearly. A CLI companion tool that outputs the scan payload would remove the browser dependency entirely.

---

## Dependencies at Risk

**`vitest.config.ts` and `vitest.config.mts` both exist:**
- Risk: Two vitest config files in the same directory — `.ts` and `.mts`. Vitest uses file-based resolution and may pick one inconsistently depending on version.
- Impact: CI could run with different config than local development.
- Migration plan: Delete one. The `.mts` variant is the newer convention; keep it and remove `vitest.config.ts`.

---

## Test Coverage Gaps

**`DirectoryScanner` component is untested:**
- What's not tested: File system API scanning logic (`scanWithDirectoryPicker`), item toggle behavior, redact-before-confirm flow, `manifestVersion` field.
- Files: `src/scanner/DirectoryScanner.tsx`
- Risk: File contents could be passed unredacted or the wrong subset of files confirmed without any test catching it.
- Priority: High — this is the primary data ingestion path.

**`analyzer.ts` — only `analyzeHeartbeat` is tested:**
- What's not tested: `analyzeOpenClawConfig` (full parse including agents list format, flat format, model extraction, hierarchy derivation) and `analyzeAgentsMd` (delegation rule extraction, skill references, code block skipping).
- Files: `src/lib/analyzer.ts`, `src/lib/__tests__/analyzer.test.ts`
- Risk: Bugs in the config parse logic produce a silently wrong agent map with no indication of failure.
- Priority: High.

**`snapshot-import.ts` import validation is not tested:**
- What's not tested: Missing `workspaceSummary`, missing `healthScore`, missing `reviewFindings`, missing `agents` — all fields not in the current validation check.
- Files: `src/lib/drift/snapshot-import.ts`
- Risk: Malformed snapshots pass `importSnapshot` and cause runtime errors downstream.
- Priority: Medium.

**All UI components lack tests:**
- What's not tested: `MapSidebar`, `ConfigHealthView`, `DriftView`, `ReviewView`, `ConflictScannerView`, `FeedbackWidget`, `WaitlistForm`, `DirectoryScanner`, `MapShell`, `MapTopBar`, `ResetDialog`.
- Files: `src/components/**`
- Risk: Rendering regressions go undetected. The `ConflictScannerView` stub could be shipped indefinitely.
- Priority: Medium for critical views (ConfigHealthView, DriftView); low for pure display components.

**`session-notes.ts` export function is untested:**
- What's not tested: Markdown generation logic, drift section rendering, empty drift case.
- Files: `src/lib/drift/session-notes.ts`
- Risk: Generated session notes contain formatting errors that users copy into their workspace.
- Priority: Low.

---

*Concerns audit: 2026-04-05*
