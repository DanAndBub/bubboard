# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Waitlist & Feedback Storage:**
- Airtable - Stores waitlist signups and user feedback submissions
  - SDK/Client: Native `fetch` to `https://api.airtable.com/v0/{baseId}/{table}`
  - Auth: `AIRTABLE_API_KEY` (Bearer token), `AIRTABLE_BASE_ID`
  - Tables: `Waitlist` (email), `Feedback` (type, message, optional email)
  - Used in: `src/app/api/waitlist/route.ts`, `src/app/api/feedback/route.ts`

**AI Provider Admin (planned/configured):**
- Anthropic - Admin API for org-wide usage/billing data
  - Auth: `ANTHROPIC_ADMIN_KEY` (from `.env.example`)
- OpenAI - Admin API for org-wide usage/billing data
  - Auth: `OPENAI_ADMIN_KEY` (from `.env.example`)
  - Note: Referenced in `.env.example` but no implementation found in `src/`

## Data Storage

**Databases:**
- Upstash Redis - Stores aggregate scan statistics counters
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: `@upstash/redis` 1.37.0 (HTTP-based REST client)
  - Keys: `dw:totalScans`, `dw:totalFilesScanned`, `dw:totalCharsAnalyzed`, `dw:totalTruncationsDetected`, `dw:scansWithTruncation`
  - Used in: `src/app/api/scan-stats/route.ts`
  - Graceful degradation: returns zero stats if env vars are absent

**File Storage:**
- None — all config scanning is client-side (files read in browser via File System API)
- Snapshot import/export is local file-based: `src/lib/drift/snapshot-export.ts`, `src/lib/drift/snapshot-import.ts`

**Caching:**
- None beyond Upstash Redis counters

## Authentication & Identity

**Auth Provider:**
- Custom admin secret — simple shared-secret approach
  - `DRIFTWATCH_ADMIN_SECRET` and `NEXT_PUBLIC_ADMIN_SECRET` must match
  - Referenced in `.env.example`; no full implementation visible in `src/`
  - No third-party auth provider (no Clerk, Auth.js, Supabase Auth, etc.)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.error` calls in API routes for error conditions
- Prefixed by route name: `[waitlist]`, `[feedback]`

## CI/CD & Deployment

**Hosting:**
- Vercel assumed (Next.js project, `bubbuilds.com` referenced in OpenGraph metadata)
  - `src/app/layout.tsx`: `url: 'https://bubbuilds.com'`

**CI Pipeline:**
- None detected (no `.github/workflows/`, no CircleCI, no Vercel CI config)

**Pre-commit:**
- Husky pre-commit hook runs `lint-staged` → ESLint `--fix` on staged `.ts`/`.tsx` files

## Environment Configuration

**Required env vars:**
- `AIRTABLE_BASE_ID` - Airtable base identifier
- `AIRTABLE_API_KEY` - Airtable personal access token
- `UPSTASH_REDIS_REST_URL` - Upstash Redis HTTP endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis auth token

**Optional / planned env vars (from `.env.example`):**
- `DRIFTWATCH_ADMIN_SECRET` - Admin API authentication (server-side)
- `NEXT_PUBLIC_ADMIN_SECRET` - Admin API authentication (client-side, must match above)
- `ANTHROPIC_ADMIN_KEY` - Anthropic org admin key
- `OPENAI_ADMIN_KEY` - OpenAI org admin key

**Secrets location:**
- `.env.local` (not committed); template at `.env.example`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected (previous webhook pattern replaced by direct Airtable API calls)

## Google Fonts

**Fonts loaded via Next.js font optimization:**
- `JetBrains_Mono` - served via `next/font/google`
- `IBM_Plex_Sans` - served via `next/font/google`
- Both configured in `src/app/layout.tsx`; fetched at build time, self-hosted at runtime

---

*Integration audit: 2026-04-05*
