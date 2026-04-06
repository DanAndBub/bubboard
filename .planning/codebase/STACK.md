# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`src/`)
- CSS - Tailwind utility classes via `src/app/globals.css`

**Secondary:**
- JavaScript (ESM) - Config files (`eslint.config.mjs`, `postcss.config.mjs`)

## Runtime

**Environment:**
- Node.js 20 (`.nvmrc` specifies 20; runtime is v22.22.0)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework (App Router)
- React 19.2.3 - UI rendering
- React DOM 19.2.3 - DOM bindings

**CSS:**
- Tailwind CSS 4 - Utility-first CSS via `@tailwindcss/postcss` PostCSS plugin
- Configured via CSS `@theme` block in `src/app/globals.css` (no separate `tailwind.config.*`)

**Fonts:**
- JetBrains Mono - Monospace font via `next/font/google`
- IBM Plex Sans - Sans-serif font via `next/font/google`

**Testing:**
- Vitest 4.0.18 - Unit test runner; config at `vitest.config.ts`
- Vitest (smoke) - Smoke test runner; config at `smoke/vitest.smoke.config.ts`
- MSW 2.12.14 (msw) - Mock Service Worker for API mocking in tests

**Build/Dev:**
- Next.js built-in dev server (`npm run dev`)
- Husky 9.1.7 - Git hooks; configured at `.husky/pre-commit`
- lint-staged 16.4.0 - Runs ESLint on staged files pre-commit

**Linting:**
- ESLint 9 - Config at `eslint.config.mjs`
- `eslint-config-next` 16.1.6 - Next.js rules including `core-web-vitals` and `typescript`

## Key Dependencies

**Critical:**
- `@upstash/redis` 1.37.0 - Redis client for scan statistics counters (`src/app/api/scan-stats/route.ts`)

**Build Tools:**
- `@tailwindcss/postcss` 4 - PostCSS integration for Tailwind v4
- `dotenv` 17.3.1 - `.env.local` loading in smoke test config

**Type Definitions:**
- `@types/node` 20 - Node.js type definitions
- `@types/react` 19 - React type definitions
- `@types/react-dom` 19 - React DOM type definitions

## Configuration

**TypeScript:**
- Strict mode enabled (`strict: true`)
- `noEmit: true` (Next.js handles compilation)
- Path alias: `@/*` → `./src/*`
- Target: ES2017
- Module resolution: `bundler`
- Config file: `tsconfig.json`

**Environment:**
- Template: `.env.example`
- Local secrets: `.env.local` (not committed)
- Required vars: `AIRTABLE_BASE_ID`, `AIRTABLE_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Admin vars (from `.env.example`): `DRIFTWATCH_ADMIN_SECRET`, `NEXT_PUBLIC_ADMIN_SECRET`, `ANTHROPIC_ADMIN_KEY`, `OPENAI_ADMIN_KEY`

**Build:**
- `next.config.ts` - Minimal config (no custom settings)
- `postcss.config.mjs` - Tailwind CSS PostCSS plugin only

## Platform Requirements

**Development:**
- Node.js 20 (`.nvmrc`)
- `npm install` then `npm run dev`

**Production:**
- Deployable to any Node.js-capable host (Vercel assumed given Next.js)
- Requires Upstash Redis and Airtable credentials as environment variables

---

*Stack analysis: 2026-04-05*
