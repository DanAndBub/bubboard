# CC SPEC: Driftwatch scan page polish + community counter

## Goal

Polish the Driftwatch scan/landing page into a clean, professional first impression and add a community scan counter with anonymous aggregate stats. This is the root URL — the first thing anyone sees. Visitors arrive from TikTok or a GitHub README, already knowing roughly what Driftwatch does. The page should feel like a serious, purpose-built dev tool — not a SaaS marketing page.

**Product context for design system reasoning:** Config intelligence tool for OpenClaw AI agent workspaces. Target user: solo devs and small teams running AI agents who need visibility into bootstrap file health and truncation. $12/mo Pro tier coming. Anti-hype tone — the tool sells itself on first use. Reference aesthetic: Linear, Notion, GitHub. Monospace type for controls and labels. Dark theme.

## Context
- Project: Driftwatch (public repo `DanAndBub/Driftwatch`)
- Branch: current V4 branch (run `git branch | grep v4` to find it — likely `v4/phase-2-config-visual`)
- Key files:
  - `src/app/page.tsx` — main page; scan input is in the `!agentMap` conditional block
  - `src/scanner/DirectoryScanner.tsx` — folder picker component
  - `src/components/map/MapShell.tsx` — app shell (sidebar + top bar + content area)
  - `src/components/map/MapTopBar.tsx` — top bar
- New files to create:
  - `src/app/api/scan-stats/route.ts` — API route for counter
  - `src/components/CommunityCounter.tsx` — counter display component
- Dependencies: Add `@upstash/redis` (only new dependency in this spec)
- Env vars needed: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (set in Vercel, not in code)
- Design: mobile-first per ADR 0025. Desktop is the adaptation.
- Theme tokens: `#0a0e17` base, `#111827` cards, `#f1f5f9` primary text, `#b0bec9` secondary text, `#7a8a9b` muted text, `#7db8fc` accent, `#506880` borders

## Constraints
- Do NOT modify sidebar layout, Config Review view, Drift Report view, editor panel, snapshot logic, or any analysis engine
- Do NOT add any dependencies besides `@upstash/redis`
- Do NOT store any per-scan data — only increment running aggregate totals
- Do NOT log IPs or any identifying information in the stats endpoint
- Do NOT display the counter until `totalScans >= 50`
- Do NOT put API keys or secrets in source code
- Do NOT create a separate marketing/landing page — the scan tool IS the landing page
- Do NOT use animated counters, confetti, bouncing numbers, or "Join X happy users!" copy
- Demo mode scans must NOT increment the counter

## Steps

### Step 1: Polish the scan input area

Redesign the `!agentMap` block in `page.tsx` — the state users see before they've scanned anything. This is the entire landing experience.

**Page structure (top to bottom, mobile-first):**

1. **Category label** — small, uppercase, monospace, accent color. Text: "bootstrap file inspector". Orients the visitor instantly.
2. **Headline** — "See what your agent can't see." Sans-serif, largest text on page. This line already exists — keep it.
3. **Sub-copy** — one line only. Something like: "Scan your OpenClaw workspace. Check file sizes, find truncation zones, see exactly what's being cut." Trim or rewrite the current copy to this density. No second paragraph.
4. **Primary CTA** — the folder picker / scan button. Outlined in accent color, monospace label. This is the #1 action on the page and should be visually dominant.
5. **Secondary CTA** — "try demo data" or similar. Ghost button, much lower contrast than primary. Clearly secondary. Currently these two buttons look equally weighted — fix that.
6. **Trust signals** — three short lines: "runs entirely in your browser" / "nothing uploaded, nothing stored" / "chrome or edge required for folder access". Muted, small, almost footnote-level. Not marketing bullets — quiet reassurance.
7. **Community counter** — see Step 3. Separated from the above by a subtle divider.

**Desktop adaptation:** Center the content, max-width ~520px. CTAs can sit side-by-side instead of stacked. Trust signals as an inline row with dividers. Counter stays below.

**Gate:** `npx tsc --noEmit` passes. Page renders at `/` without errors.

### Step 2: Build the scan stats API

Create `src/app/api/scan-stats/route.ts` with two handlers:

**POST** — receives scan stats, increments aggregates, returns current totals.

```typescript
// Request body
interface ScanStats {
  filesScanned: number;
  totalChars: number;
  truncatedFiles: number;
}

// Redis keys (each incremented independently)
// dw:totalScans — INCR by 1
// dw:totalFilesScanned — INCRBY filesScanned
// dw:totalCharsAnalyzed — INCRBY totalChars
// dw:totalTruncationsDetected — INCRBY truncatedFiles
// dw:scansWithTruncation — INCR by 1 (only if truncatedFiles > 0)
```

**GET** — returns current aggregate totals.

```typescript
// Response shape
interface AggregateStats {
  totalScans: number;
  totalFilesScanned: number;
  totalCharsAnalyzed: number;
  totalTruncationsDetected: number;
  scansWithTruncation: number;
}
```

Basic rate limiting: reject POST requests that send obviously invalid data (negative numbers, filesScanned > 20, totalChars > 5_000_000). This isn't auth — just sanity bounds. The chars ceiling is generous because 8 files at high sizes can legitimately approach 160K+, and the INCR pattern means even malicious inputs only inflate a counter slightly.

**Gate:** `npx tsc --noEmit` passes. Both endpoints respond correctly when tested with curl (GET returns zeroes initially, POST increments).

### Step 3: Build the community counter component

Create `src/components/CommunityCounter.tsx`.

**Behavior:**
- On mount, GET `/api/scan-stats`
- If request fails or `totalScans < 50`, render nothing (not a skeleton, not a placeholder — literally null)
- If data is available and above threshold, render the counter

**Display — three primary stats + one highlight line:**

| Stat | Source field | Format |
|------|-------------|--------|
| Scans | `totalScans` | `toLocaleString()` |
| Truncations caught | `totalTruncationsDetected` | `toLocaleString()` |
| Characters analyzed | `totalCharsAnalyzed` | Abbreviated: "58.7M", "1.2M", "847K" |

**Highlight line:** "X% of workspaces have at least one file being silently cut." Calculated as `Math.round((scansWithTruncation / totalScans) * 100)`. This is the hook.

**Disclaimer:** "we count scans, not content." — tiny, muted, below the stats.

**Mobile layout:** Three stats in a row, numbers above labels, thin vertical dividers between them. Highlight line and disclaimer centered below.

**Desktop layout:** Stats inline with dot separators: `1,847 scans · 312 truncations caught · 58.7M chars analyzed`. Highlight line below.

🎯 ANTI-SLOP: The generic version would be animated counting numbers, bright colored stat cards with icons, "Join 1,847 developers!" copy, or a confetti celebration. Instead: static numbers, muted color palette (`#b0bec9` numbers, `#506880` labels), small type, no animation, no background cards, no icons. Think GitHub repo stats bar or npm download counts — quiet confidence, not a vanity dashboard. The percentage highlight can be one notch more prominent but still understated.

**Gate:** `npx tsc --noEmit` passes. Component renders when stats are above threshold, renders nothing when below.

### Step 4: Wire the POST call into scan completion

In `page.tsx` (or wherever `reviewResult` is set after a scan completes), add a fire-and-forget POST to `/api/scan-stats`.

**Rules:**
- Only fire on real scans, NOT on demo mode (`loadDemoData()` calls)
- Only fire once per scan — use a ref or flag to prevent duplicates on re-renders
- Fire silently — no loading state, no error handling shown to user. `fetch(...).catch(() => {})` is fine.
- Do NOT block the UI on this call
- Extract `filesScanned`, `totalChars`, and `truncatedFiles` from the scan result data (read the actual data shapes in the codebase to determine exact field names)

**Gate:** `npx tsc --noEmit` passes. `npm run build` passes. A real scan triggers the POST (verify by checking network tab or adding a temporary console.log). Demo mode does NOT trigger the POST.

## ⛔ STOP conditions
- `page.tsx` scan input block structure is significantly different from expected (no `!agentMap` conditional)
- Scan result data doesn't contain file counts or character totals (can't construct `ScanStats` payload)
- Upstash env vars aren't available and the API route can't initialize the Redis client (this is expected in local dev — the route should gracefully return empty data, not crash)

## Acceptance Criteria
- [ ] Scan page has clear visual hierarchy: category label → headline → sub-copy → primary CTA → secondary CTA → trust signals → counter
- [ ] Primary scan button is visually dominant; demo button is clearly secondary
- [ ] Trust signals are present but muted
- [ ] Community counter renders with three stats + highlight line + disclaimer when above 50-scan threshold
- [ ] Community counter renders nothing when below threshold or on API failure
- [ ] POST fires on real scan completion, not on demo mode
- [ ] POST fires exactly once per scan
- [ ] GET endpoint returns current aggregate stats
- [ ] POST endpoint increments aggregates correctly
- [ ] No user-identifying data is stored or logged
- [ ] Mobile layout works at 375px width — nothing overflows, CTAs are full-width stacked
- [ ] Desktop layout centers content with reasonable max-width
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] NEEDS DAN: Visual review of scan page first impression (mobile + desktop)
- [ ] NEEDS DAN: Visual review of counter styling and placement

## Edge Cases
⚠️ Upstash env vars missing (local dev) → API route should return `{ totalScans: 0 }` not crash. Counter component handles this gracefully (renders nothing).
⚠️ Redis connection fails → same as above. Silent failure, counter doesn't render.
⚠️ User scans, then immediately scans again → POST should only fire once per distinct scan result, not on every re-render.
⚠️ `totalCharsAnalyzed` could overflow JS integer limits at extreme scale → use `Number` for now, this is a distant-future concern.
