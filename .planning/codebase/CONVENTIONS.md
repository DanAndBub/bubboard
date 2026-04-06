# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- React components: PascalCase `.tsx` (e.g., `WaitlistForm.tsx`, `DriftReport.tsx`, `MapErrorBoundary.tsx`)
- Library modules: kebab-case `.ts` (e.g., `diff-engine.ts`, `analyze-file.ts`, `contradiction-rules.ts`)
- API routes: `route.ts` (Next.js App Router convention)
- Type files: `types.ts` per module (e.g., `src/lib/drift/types.ts`, `src/lib/config-review/types.ts`)
- Test files: `<name>.test.ts` placed in a `__tests__/` subdirectory

**Functions:**
- camelCase for all functions: `computeDrift`, `analyzeFile`, `runReview`, `calculateBudget`
- Named exports preferred over default exports for library functions
- Default exports used only for React components
- Pure utility helpers use descriptive verb-first names: `calculateHealthScore`, `findMatches`, `checkConflictPattern`

**Variables:**
- camelCase for local variables and parameters
- `SCREAMING_SNAKE_CASE` for module-level constants: `BUDGET_WARNING`, `SNAPSHOT_SCHEMA_VERSION`, `SENSITIVE_KEYS_REGEX`
- Numeric constants use underscore separators: `15_360`, `20_480`, `150_000`

**Types and Interfaces:**
- PascalCase interfaces: `FileAnalysis`, `ReviewFinding`, `DriftReport`, `SnapshotAgent`
- PascalCase type aliases: `Severity`, `Category`, `FileChange`
- Prefer `interface` for object shapes; `type` for unions and primitives
- Types exported from the file that defines them, co-located with usage in `types.ts`
- Type-only imports use `import type`: `import type { Snapshot } from '../types'`

## Code Style

**Formatting:**
- No Prettier config detected — relies on ESLint for style enforcement
- Husky pre-commit hook runs `lint-staged` → `eslint --fix` on `*.{ts,tsx,js,jsx}`
- Single quotes for strings in `.ts` files; double quotes also present in `.tsx` (mixed but consistent within files)
- Semicolons present throughout

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs`
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- No explicit `any` types in library code; `unknown` used when type is truly unknown

## Import Organization

**Order (observed pattern):**
1. Framework/external imports (`next/server`, `react`, `vitest`)
2. Path alias imports (`@/lib/...`)
3. Relative imports (`../types`, `./rules/size-rules`)

**Path Aliases:**
- `@/*` maps to `src/*` — use for cross-module imports from `src/`
- Example: `import type { DriftReport } from '@/lib/drift/types'`

**Import style:**
- Named imports for library utilities: `import { computeDrift } from '../diff-engine'`
- Type-only imports explicitly flagged: `import type { Snapshot } from '../types'`

## Error Handling

**API Routes:**
- Validate all inputs before processing; return early with `NextResponse.json({ error: '...' }, { status: 4xx })`
- Wrap external calls in try/catch; return `500` on unexpected errors
- Log errors with `console.error('[module-name] Message:', err)` using bracketed prefix tags
- Use `.catch(() => ({}))` for JSON parsing of error responses from external APIs

**Library Functions:**
- Pure functions silently return empty/default values on bad input rather than throwing
- `runReview` catches per-rule exceptions silently and continues: `catch { /* skip rule */ }`
- `analyzeOpenClawConfig` wraps entire body in try/catch and returns the unmodified `map` on failure
- `redactSensitiveValues` returns the original string on invalid JSON

**Components:**
- `MapErrorBoundary.tsx` provides a class-based error boundary at the component tree level
- `console.error` inside `componentDidCatch`

## Logging

**Framework:** `console.error` (no external logging library)

**Patterns:**
- API route errors logged with bracketed module prefix: `console.error('[waitlist] Error:', err)`
- No `console.log` or `console.warn` in production paths — only `console.error`
- No debug logging in library functions

## Comments

**When to Comment:**
- JSDoc on public function signatures explaining purpose, not mechanics
- Inline comments on non-obvious logic (e.g., `// added — skip`, `// Only emit warning if not also critical`)
- Section dividers using `// ── Section Name ──────` pattern in longer files
- `// [SOURCE]`, `// [COMMUNITY]`, `// [DRIFTWATCH]` annotations on constants to indicate their origin

**JSDoc style:**
```typescript
/**
 * Two-point diff between a previous snapshot and current scan state.
 * Returns a DriftReport summarizing character-level changes.
 */
export function computeDrift(previous: Snapshot, current: Snapshot): DriftReport {
```

**Test file headers:**
- Block comment at top of test files explaining route behavior and test strategy

## Function Design

**Size:** Functions are focused and short. Helpers extracted for reuse (e.g., `sizeCheck`, `findMatches`, `jaccard`).

**Parameters:** Input objects typed with interfaces; no untyped object params.

**Return Values:** Functions return typed results; never `any`. Optional fields expressed with `?` on interface properties.

**Pure functions:** Library functions are pure where possible — no side effects, no mutations. Spread operator used to return new objects: `return { ...map, config: configInfo }`.

## Module Design

**Exports:**
- One concern per file; all exports named
- Default export only for React components
- Rule arrays exported as `const` arrays: `export const sizeRules: ReviewRule[]`

**Barrel Files:** Not used. Consumers import directly from the defining module.

**Rule pattern:** Rules defined as objects implementing `ReviewRule` interface and exported as arrays, consumed by `runner.ts` registry pattern.

---

*Convention analysis: 2026-04-05*
