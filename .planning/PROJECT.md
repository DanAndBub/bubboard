# Driftwatch — Project

**Project:** Driftwatch
**Branch:** feat/conflict-scanner-gsd
**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Vitest
**Architecture:** Client-side analysis tool (all analysis runs in browser, no server calls)

## Vision

Driftwatch helps OpenClaw users audit their bootstrap files. It scans OpenClaw workspaces for config health issues, drift between snapshots, and (upcoming) cross-file instruction conflicts.

## Current State

Three views exist in the UI:
- **Review view** — Config health analysis (file size, truncation, rule violations)
- **Drift view** — Snapshot comparison (what changed between sessions)
- **Conflict Scanner view** — Placeholder stub (`src/components/map/views/ConflictScannerView.tsx`)

## Non-Negotiables

- **Client-side only** — All analysis runs in the browser. No files ever leave the user's machine.
- **No LLM calls** — Pattern matching only for the free tier
- **Must match existing visual quality** — Dark "Mission Control" aesthetic, JetBrains Mono, existing component patterns
- **TypeScript strict mode** — No `any` types
- **Vitest test coverage** — New analysis logic needs unit tests

## Design Reference

See `design-system/pages/` for design reference pages.
