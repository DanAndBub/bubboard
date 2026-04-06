# Phase 1: Conflict Scanner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-05
**Phase:** 01-conflict-scanner
**Mode:** discuss
**Areas analyzed:** Architecture, Existing rules, UI grouping, Subagent detection

## Assumptions Presented

### Architecture
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| New src/lib/conflict/ subsystem parallel to config-review | Confident | ConflictScannerView.tsx is a separate view; spec describes conflict as fundamentally different from config health |

### Existing contradiction-rules.ts
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Leave ReviewView rules unchanged, expand in scanner | Confident | Spec says "main new feature"; existing rules surface in ReviewView and shouldn't break |

### UI grouping
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Group by category (Structural → Cross-file → Self-conflict → Duplicates) | Likely | Spec lists categories in this priority order |

### Subagent detection
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Imperative phrases only | Unclear | Without LLM, hard to know what counts as "relevant to subagent behavior" |

## Corrections Made

### Subagent detection
- **Original assumption:** Flag imperative phrases only (always, never, must, do not, don't, should, shall)
- **User correction:** Add agent-action keyword matching on top: delegate, route, assign, spawn, subagent, escalate, tool, model
- **Reason:** Two-layer approach for higher recall — imperatives catch behavioral instructions; action keywords catch agent-specific directives

## External Research

No external research performed — codebase provided sufficient context.
