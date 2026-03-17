# Quick Reference: Bubboard in 60 Seconds

## What does Bubboard do?

```
User's agent directory (local disk)
        ↓
Browser File Scanner (reads files you allow)
        ↓
Parser (extracts structure from JSON/markdown)
        ↓
Analyzer (enriches data, finds relationships)
        ↓
Scorer (calculates health 0-10, gives recommendations)
        ↓
Redactor (hides API keys automatically)
        ↓
Interactive UI (shows everything in browser)
```

## File Locations (Quick Lookup)

| What | Where |
|------|-------|
| Types/interfaces | `src/lib/types.ts` |
| Parse tree output | `src/lib/parser.ts` |
| Extract config | `src/lib/analyzer.ts` |
| Health scoring | `src/lib/scoring.ts` |
| Hide secrets | `src/lib/redact.ts` |
| File picker UI | `src/scanner/DirectoryScanner.tsx` |
| Map display | `src/components/AgentMap.tsx` |
| Cost tracking | `src/lib/cost-tracking/` |
| API routes | `src/app/api/` |
| Tests | `__tests__/` (adjacent to code) |

## Core Data Flow

```
┌─────────────────────────────────────────┐
│ User Picks Folder (DirectoryScanner)    │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Scanner Finds Known Files                │
│ (.json, .md, cron/jobs.json, etc.)      │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Parser: Extract Structure                │
│ (JSON.parse, tree parsing, etc.)        │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Analyzer: Enrich Data                    │
│ (extract agents, relationships, models) │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Scorer: Evaluate Health                 │
│ (0-10 based on what exists)             │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Redactor: Hide Secrets                  │
│ (api_key → [REDACTED])                  │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ Display: AgentMap UI                    │
│ (tree, health, costs, etc.)             │
└─────────────────────────────────────────┘
```

## Common Tasks (How-To)

### I want to change the health scoring

**File:** `src/lib/scoring.ts`

```typescript
// Add new check
items.push({
  id: 'your_check',
  label: 'Your Check',
  description: 'What this checks',
  status: hasFile('NEWFILE.md') ? 'ok' : 'missing',
  recommendation: 'Guidance for user'
});
```

### I want to support a new file type

**File:** `src/scanner/DirectoryScanner.tsx` (line ~125)

```typescript
function classifyRelativePath(relPath: string): Bucket | null {
  const p = relPath.replace(/\\/g, '/');
  // ...existing checks...
  if (/^newformat\//.test(p)) return 'newformat';  // Add this
  return null;
}
```

### I want to add a new model to cost tracking

**File:** `src/lib/cost-tracking/pricing.ts`

```typescript
const MODELS_PRICING: ModelPricing[] = [
  // ...existing...
  anthropicEntry('claude-4', 3.00, 15.00, 30.00, 0.30),  // Add new
];
```

### I want to hide a new secret pattern

**File:** `src/lib/redact.ts`

```typescript
const SENSITIVE_KEYS_REGEX = /^(key|token|...|YOUR_NEW_PATTERN)$/i;
```

## Key Concepts

### Privacy Model
- Everything runs in **your browser**
- Files never uploaded to server
- Optional API calls only for feedback/waitlist
- Redaction automatic before display

### Architecture Principles
- **Parser** — Raw text → Structured data
- **Analyzer** — Structured data → Business logic
- **Scorer** — Business logic → Health score
- **Redactor** — Any output → Secrets hidden
- **UI** — Display to user

### TypeScript Strictness
- No `any` types
- All function params/returns typed
- Strict mode enabled (`tsconfig.json`)

### Testing
- Tests adjacent to code (`__tests__/`)
- Run with `npm test`
- Vitest framework

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── api/
│   │   ├── feedback/route.ts   # Feedback API
│   │   └── waitlist/route.ts   # Waitlist API
│   ├── map/page.tsx            # Map viewer page
│   └── cost-tracking/          # Cost tracking page
│
├── components/
│   ├── AgentMap.tsx            # Main visualization
│   ├── DirectoryScanner.tsx    # File picker (in scanner/)
│   ├── FileViewer.tsx          # File display
│   ├── StatsBar.tsx            # Statistics
│   └── ...other UI components
│
├── lib/
│   ├── types.ts                # Core types/interfaces
│   ├── parser.ts               # Text parsing
│   ├── analyzer.ts             # Config extraction
│   ├── scoring.ts              # Health scoring
│   ├── redact.ts               # Secret redaction
│   ├── demo-data.ts            # Demo data for testing
│   ├── __tests__/              # Tests for lib
│   └── cost-tracking/          # AI cost analytics
│       ├── types.ts
│       ├── calculator.ts
│       ├── store.ts
│       ├── pricing.ts
│       ├── analytics/
│       └── importers/
│
└── scanner/
    └── DirectoryScanner.tsx    # File system access
```

## Testing Checklist

```bash
npm test              # ✅ All tests pass?
npm run lint          # ✅ No lint errors?
npx tsc --noEmit      # ✅ No type errors?
npm run build         # ✅ Builds successfully?
```

All should exit with code 0 before pushing.

## Git Commands You'll Use

```bash
git checkout -b feat/your-feature       # Create branch
git add src/file.ts                     # Stage changes
git commit -m "feat(scope): description" # Commit
git push origin feat/your-feature       # Push
```

Use **Conventional Commits**: `feat|fix|docs|chore(scope): description`

## Deployment

This is a **Next.js** app. Deploy to:
- **Vercel** (default, easiest)
- **Docker** (custom hosting)
- **Self-hosted** (on your own server)

See `next.config.ts` for Next.js config.

## Environment Variables

```bash
# Development
AIRTABLE_BASE_ID=xxx
AIRTABLE_API_KEY=xxx

# Never commit these! Use .env.local
cp .env.example .env.local
# Edit .env.local with your values
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| TypeScript errors | Run `npx tsc --noEmit` and fix |
| Tests fail | Run `npm test` to see details |
| Lint errors | Run `npm run lint -- --fix` |
| Build fails | Check console for errors, usually TypeScript |
| Pre-commit hook blocks commit | You're trying to commit a secret. Use `.env.local` instead |

## Need Help?

1. **Read [CODEBASE.md](./CODEBASE.md)** — Full architecture walkthrough
2. **Read [CONTRIBUTING.md](./CONTRIBUTING.md)** — Workflows & git
3. **Read [.instructions.md](./.instructions.md)** — For AI agents
4. **Check existing tests** — In `__tests__/` directories
5. **Ask in an issue** — Be specific about what you're trying to do

---

**Good luck! You've got this.** 🚀
