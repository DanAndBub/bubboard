# Bubboard Architecture & Codebase Guide

This document explains how Bubboard works at a high level, what each module does, and how data flows through the system. Read this if you're confused about what the hell is actually happening.

## What is Bubboard?

**In 30 seconds:** 
Bubboard is a privacy-first web app that scans your OpenClaw agent directory and shows you:
- Your agent structure and who delegates to who
- Which agents/files exist
- Health score (missing configs, best practices)
- Cost tracking (how much you're spending on AI models)

**Privacy first:** Everything runs in your browser. Your files never leave your computer.

---

## High-Level Architecture

```
┌─────────────────────────────────────┐
│     User's Browser (Client-Side)    │
├─────────────────────────────────────┤
│  Next.js App (React + TypeScript)   │
├──────────────┬──────────────────────┤
│              │                      │
│ File Scanner │   Map Visualizer    │
│ (local FS)   │   (visualize data)  │
│              │                      │
├──────────────┴──────────────────────┤
│    Core Logic (src/lib/)            │
├───────────────┬─────────────────────┤
│               │                     │
│ Parser        │  Analyzer          │ 
│ (LS output)   │  (extract config)  │
│               │                    │
├───────────────┴─────────────────────┤
│    Data Store (IndexedDB/Browser)   │
│    (cost tracking, cached results)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   Optional: Backend (Airtable API)  │
│   - Waitlist signup                 │
│   - Feedback collection             │
└─────────────────────────────────────┘
```

**Key insight:** User's files → Scanner reads them → Parser extracts structure → Analyzer enriches data → UI displays it. All offline, all in-browser.

---

## Data Flow: From Files to UI

### 1. User Selects Directory

```
User clicks "Pick folder" in browser
  ↓
Browser File System Access API opens dialog
  ↓
User selects ~/.openclaw/
  ↓
DirectoryScanner.tsx gets FileSystemDirectoryHandle
```

**File:** `src/scanner/DirectoryScanner.tsx`
- Component that manages file selection
- Uses `FileSystemDirectoryHandle` (browser API)
- User must grant permission (browser security)

### 2. Scanner Reads Specific Files

```
Scanner looks for known files:
  - openclaw.json
  - SOUL.md, AGENTS.md, MEMORY.md
  - cron/jobs.json
  - workspace/* 
  
Does NOT recursively scan all files (privacy + speed)
```

**File:** `src/scanner/DirectoryScanner.tsx` (lines ~150-200)
- `tryGetFile()` — reads a single file
- `tryGetDir()` — navigates into directories
- Only reads files user explicitly allows

### 3. Files Get Parsed

Two types of parsing depending on file format:

**JSON files** (openclaw.json, cron/jobs.json):
```typescript
// src/lib/parser.ts
const config = JSON.parse(fileContent);
// Extract: model names, agent list, heartbeat settings
```

**Markdown files** (SOUL.md, AGENTS.md):
```typescript
// src/lib/analyzer.ts
extractAgentDelegation(markdown)
// Extract: who delegates to whom, structure
```

**Tree format** (user pastes `ls` output):
```typescript
// src/lib/parser.ts
parseTreeString(lsOutput)
// Parse ASCII tree into file objects
```

### 4. Analyzer Enriches Data

```typescript
// src/lib/analyzer.ts
const enriched = analyzeOpenClawConfig(jsonContent, initialMap);
// Returns AgentMap with:
//   - models (providers, versions)
//   - agents (names, roles)
//   - relationships (delegation)
```

This is where the "smarts" happen—extracting meaning from raw config.

### 5. Health Scoring

```typescript
// src/lib/scoring.ts
const report = calculateHealthScore(map);
// Checks:
//   - Has SOUL.md? 
//   - Has AGENTS.md?
//   - Has protocols?
//   - Has error handling?
// Returns score 0-10 + recommendations
```

### 6. Automatic Redaction

```typescript
// src/lib/redact.ts
const safe = redactSensitiveValues(fileContent);
// Replaces values matching:
//   - *_key, *_token, *_secret
//   - OPENAI_API_KEY, etc.
// User sees: {"api_key": "[REDACTED]"}
```

**Important:** This happens BEFORE displaying. User never sees actual secrets.

### 7. UI Displays Everything

```typescript
// src/components/AgentMap.tsx renders:
//   - Visual tree of agents
//   - Health score card
//   - File list by type
//   - Cost breakdown (if enabled)
```

---

## Core Modules Explained

### `src/lib/types.ts`

**What it is:** TypeScript interfaces defining data shapes.

```typescript
interface AgentMap {
  workspace: WorkspaceFiles;
  agents: AgentInfo[];
  // ... more fields
}
```

**Why it matters:** All other modules depend on these types. If you add a field, update it here.

**Edit when:** Adding new data that flows through the app.

---

### `src/lib/parser.ts`

**What it does:** Converts raw text (tree output, JSON) into structured data.

**Example:**
```
Input:  "agents/"
        "├── writer/"
        "└── executor/"

Output: [
  { name: 'writer', isDir: true, depth: 1 },
  { name: 'executor', isDir: true, depth: 1 }
]
```

**Key functions:**
- `parseTreeString()` — Parse ASCII tree
- Tree parsing is actually tricky (indentation, branch chars)

**Edit when:** User input format changes (e.g., new `tree` command output format).

---

### `src/lib/analyzer.ts`

**What it does:** Extract meaning from configs.

**Example:**
```typescript
Input:  openclaw.json with models, agents, channels
Output: AgentMap with enriched data
        - Which agents exist?
        - What models do they use?
        - Who does agent X delegate to?
```

**Key functions:**
- `analyzeOpenClawConfig()` — Parse openclaw.json
- `extractAgentDelegation()` — Extract who delegates to who
- `extractAgentsFromMarkdown()` — Parse AGENTS.md

**Edit when:** OpenClaw config format changes, or you want to extract new data.

---

### `src/lib/scoring.ts`

**What it does:** Calculate health score (0-10) based on what files/configs exist.

**Scoring logic:**
```
10 points possible:
- 1pt: Has SOUL.md (personality)
- 1pt: Has AGENTS.md (structure)
- 1pt: Has MEMORY.md (context)
- 1pt: Has TOOLS.md (capabilities)
- 1pt: Has HEARTBEAT.md (monitoring)
- 1pt: Has USER.md (goals)
- 1pt: Has IDENTITY.md (identity)
- 1pt: Has error handling
- 1pt: Has monitoring setup
- 1pt: Has delegation rules
```

But simplified to key categories.

**Key functions:**
- `calculateHealthScore()` — Main scoring
- Returns: score (0-10) + recommendations for missing files

**Edit when:** You want to add new scoring criteria.

---

### `src/lib/redact.ts`

**What it does:** Hide secrets before displaying to user.

```typescript
Input:  { "api_key": "sk-12345", "name": "Claude" }
Output: { "api_key": "[REDACTED]", "name": "Claude" }
```

**Key functions:**
- `redactSensitiveValues()` — Main function
- Matches patterns like `*_key`, `*_token`, `*_secret`

**Security model:**
- Runs before ANY file is shown to user
- Never logs actual values
- Pattern-based (if key name looks sensitive, redact it)

**Edit when:** New secret patterns appear (e.g., GitHub tokens).

---

### `src/scanner/DirectoryScanner.tsx`

**What it does:** React component that lets user pick a folder and read files.

**How it works:**
```
1. User clicks "Pick Folder"
2. Browser opens file picker (with permissions)
3. Scanner recursively checks for known files
4. Shows file list grouped by type
5. User clicks "Confirm" or toggled "Read Content"
6. Scanner returns file contents
```

**Key functions:**
- `tryGetFile()` — Read single file
- `tryGetDir()` — Navigate into directory
- `scanDirectory()` — Recursively find known files

**Edit when:** You want to change what files are scanned or how the UI works.

---

### `src/components/AgentMap.tsx`

**What it does:** Main visualization. Shows the tree of agents and relationships.

**Displays:**
- Agent tree (visual hierarchy)
- Who delegates to who
- File list
- Health score
- Statistics

**Edit when:** You want to change how data is displayed.

---

### `src/lib/cost-tracking/`

**What it does:** Calculate AI token costs (beta feature).

**Modules:**
- `pricing.ts` — Model pricing data (Anthropic, OpenAI, DeepSeek)
- `calculator.ts` — Calculate cost from token usage
- `store.ts` — Store data in IndexedDB
- `analytics/forecast.ts` — Predict future costs
- `importers/` — Parse cost data from different sources

**Example flow:**
1. User uploads Claude billing log
2. `claude-code.ts` parser extracts usage data
3. `calculator.ts` multiplies tokens × pricing
4. `store.ts` saves to IndexedDB
5. `forecast.ts` predicts next week's costs

**Key insight:** This is the "pro" feature that adds business value.

---

### `src/app/api/waitlist/` and `src/app/api/feedback/`

**What they do:** Backend API routes (Next.js).

```typescript
// Next.js API route
export async function POST(request) {
  const { email } = await request.json();
  // Validate
  // Call Airtable API
  // Return response
}
```

**Uses:**
- Airtable to store emails/feedback
- Environment variables for API key
- Error handling for network issues

**Edit when:** You want to send data to external services.

---

## Common Workflows

### Workflow 1: User Scans Their Directory

1. **DirectoryScanner.tsx** — User picks folder
2. **parser.ts** — Parse file names/tree structure
3. **analyzer.ts** — Extract config from openclaw.json
4. **scoring.ts** — Calculate health score
5. **redact.ts** — Hide secrets
6. **AgentMap.tsx** — Display everything
7. **Browser IndexedDB** — Cache results

### Workflow 2: User Enables "Auto-Read Files"

Same as above, but also:
1. **analyzer.ts** — Extract content from markdown files too
2. **Infer agent structure** from AGENTS.md
3. **Show richer data** in AgentMap

### Workflow 3: User Enables Cost Tracking

1. **User uploads CSV/JSON** with token usage
2. **importers/** — Parse the format
3. **calculator.ts** — Calculate cost per request
4. **store.ts** — Save to IndexedDB
5. **forecast.ts** — Predict future costs
6. **UI components** in `src/components/cost-tracking/` display charts

---

## Data Shapes You'll See

### AgentMap
```typescript
{
  workspace: {
    coreFiles: File[];        // SOUL.md, etc.
    customFiles: File[];      // other markdown
    detected_at: string;      // ISO timestamp
  };
  agents: AgentInfo[];        // Agent objects
  relationships: {
    delegates_to: Map<id, id[]>;  // who delegates to whom
  };
}
```

### HealthReport
```typescript
{
  score: number;              // 0-10
  items: HealthItem[];        // Detailed checks
}

// HealthItem
{
  id: 'soul' | 'agents' | ...;
  status: 'ok' | 'missing' | 'warning';
  recommendation: string;
}
```

### UsageRecord (cost tracking)
```typescript
{
  timestamp: string;
  provider: 'anthropic' | 'openai' | 'deepseek';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cost_usd: number;
}
```

---

## Key Design Decisions

### Why Client-Side Only?

```
Pro:
✅ Privacy (files never leave browser)
✅ No server costs
✅ Works offline
✅ Instant (no network latency)

Con:
❌ Limited by browser capabilities
❌ No persistent data (unless IndexedDB)
❌ Can't analyze 10GB+ directories (memory limits)
```

### Why Specific File Scanning (Not Recursive)?

```
Pro:
✅ Privacy (only look at known files)
✅ Speed (don't scan 1000s of files)
✅ Predictable behavior

Con:
❌ User might have agent config elsewhere
❌ Custom file locations not supported
```

### Why Redaction Before Display?

```
Pro:
✅ Security (user never sees secrets)
✅ Simple (redact everywhere upfront)

Con:
❌ False positives (might redact non-secrets)
```

---

## Testing

Each module has adjacent tests:

```
src/lib/analyzer.ts           →  src/lib/__tests__/analyzer.test.ts
src/lib/scoring.ts            →  src/lib/__tests__/scoring.test.ts
src/lib/cost-tracking/...ts   →  src/lib/cost-tracking/__tests__/...test.ts
```

**How to run:**
```bash
npm test                                    # All tests
npm test -- analyzer.test.ts                # Single file
npm test -- --watch                         # Watch mode
```

---

## Common Questions

### Q: How do I add a new file type to scan?

A: Edit `src/scanner/DirectoryScanner.tsx`
1. Add to `Bucket` type (line ~8)
2. Add label to `BUCKET_LABELS` (line ~21)
3. Add classification logic in `classifyRelativePath()` (line ~125)
4. Add icon in `BucketIcon()` if needed

### Q: How do I change the health score calculation?

A: Edit `src/lib/scoring.ts`
1. Add new check in `calculateHealthScore()` 
2. Push new `HealthItem` to `items` array
3. Update test in `src/lib/__tests__/scoring.test.ts`

### Q: How do I add a new model's pricing?

A: Edit `src/lib/cost-tracking/pricing.ts`
1. Add entry to `MODELS_PRICING` array
2. Include: model name, provider, input cost, output cost, cache costs
3. Update tests

### Q: Why is redaction happening but I still see secrets?

A: Check `src/lib/redact.ts` → `SENSITIVE_KEYS_REGEX`
The pattern might not match your secret pattern. Update the regex.

### Q: How do I store data between sessions?

A: Use `src/lib/cost-tracking/store.ts` which wraps IndexedDB:
```typescript
import { store } from '@/lib/cost-tracking/store';

await store.setUsageRecords(records);
const loaded = await store.getUsageRecords();
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In any file, use console.log during development
console.log('[analyzer] Found agents:', agents);

// Check with: open DevTools → Console tab
```

### Inspect Parsed Data

```typescript
// In DirectoryScanner.tsx, after parsing:
console.log('[scan] Final data:', {
  files: scannedItems,
  meta: metadata
});
```

### Check for Secrets Not Being Redacted

```typescript
// In redact.ts test:
const test = '{ "stripe_api_secret": "sk_live_123" }';
const result = redactSensitiveValues(test);
console.log(result);  // Should have [REDACTED]
```

---

## Architecture Principles

1. **Separation of Concerns**
   - Parser (text → objects)
   - Analyzer (raw → enriched)
   - Scorer (evaluate quality)
   - UI (display)

2. **Pure Functions**
   - `parser.ts`, `analyzer.ts`, `scoring.ts` are pure
   - No side effects
   - Easier to test

3. **Security by Default**
   - Redaction happens automatically
   - No credentials in code
   - Browser permissions model

4. **Offline First**
   - Nothing requires network
   - Optional API calls (feedback, waitlist)
   - Cache in IndexedDB

5. **Type Safety**
   - `types.ts` defines contracts
   - Full TypeScript coverage
   - Strict mode enabled

---

## Next Steps for Contributors

1. **Read this doc** ← You are here
2. **Read [CONTRIBUTING.md](./CONTRIBUTING.md)** — For workflows
3. **Read [.instructions.md](./.instructions.md)** — For AI agents
4. **Look at example code** — Especially tests
5. **Ask questions** — In issues or PRs

You got this! 🚀
