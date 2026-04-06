# Driftwatch — Roadmap

## Milestone 1: Conflict Scanner (Free Tier)

**Goal:** Build the Conflict Scanner feature — detect cross-file instruction conflicts, self-contradictions, duplications, and OpenClaw-specific structural issues in bootstrap files using client-side pattern matching only.

---

### Phase 1: Conflict Scanner Core

**Goal:** Build the conflict detection engine and wire it into the existing UI placeholder.

**Scope:**
- New `src/lib/conflict/` subsystem (types, detection engine, rule modules)
- Detection categories:
  - Cross-file instruction conflicts (escalation, delegation, verbosity, permissions, style, error handling, tool preferences)
  - Within-file self-conflicts
  - Near-duplicate directives across files
  - OpenClaw-specific: subagent visibility gaps (rules in HEARTBEAT.md/BOOTSTRAP.md/MEMORY.md that apply to subagents)
  - OpenClaw-specific: compaction survival risks (critical AGENTS.md content outside `## Session Startup` and `## Red Lines`)
  - OpenClaw-specific: model assignment conflicts
- Replace `ConflictScannerView.tsx` placeholder with real UI
- Demo data for the conflict scanner view

**Constraints:**
- Client-side only — no server calls, no LLM
- Input: `WorkspaceFiles` (already parsed by DirectoryScanner — same input as ReviewView)
- Must handle 8 files × 20K chars without noticeable delay
- Extensible for future LLM-powered semantic analysis (pro tier — don't build now)

**Canonical refs:**
- `src/lib/config-review/types.ts` — Existing ReviewRule/ReviewFinding pattern to follow
- `src/lib/config-review/runner.ts` — Rule runner pattern
- `src/lib/config-review/thresholds.ts` — Bootstrap file constants (BOOTSTRAP_FILE_ORDER, session visibility, etc.)
- `src/components/map/views/ConflictScannerView.tsx` — Placeholder to replace
- `src/app/page.tsx` — Orchestration layer (where conflict results plug in)
- `src/lib/types.ts` — WorkspaceFiles type (the input)
- `/mnt/c/Users/conta/Documents/shared-brain/specs/driftwatch/conflict-scanner-gsd.md` — Original spec

**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — Conflict detection engine: types, helpers, rule modules, runner, and unit tests
- [ ] 01-02-PLAN.md — UI integration: demo data, ConflictScannerView component, page.tsx wiring

**Status:** Planned
