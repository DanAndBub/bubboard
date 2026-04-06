---
phase: 1
slug: conflict-scanner
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (existing) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | types | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | helpers | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | cross-file rules | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | self-conflict rules | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | near-duplicate rules | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | openclaw rules | — | N/A | unit | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | runner | — | N/A | integration | `npx vitest run src/lib/conflict` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | UI | — | N/A | manual | visual inspection | ✅ exists | ⬜ pending |
| 1-06-01 | 06 | 3 | page integration | — | N/A | integration | `npx vitest run` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/conflict/__tests__/types.test.ts` — stubs for conflict types
- [ ] `src/lib/conflict/__tests__/rules.test.ts` — stubs for all rule modules
- [ ] `src/lib/conflict/__tests__/runner.test.ts` — stubs for runner

*Existing vitest infrastructure covers the framework — only test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ConflictScannerView renders conflicts visually | UI replacement | Visual layout cannot be automated | Load demo data in browser, confirm findings display with severity colors |
| Performance: 8 files × 20K chars | Perf constraint | No automated perf test in vitest config | Run demo load in browser dev tools, confirm < 200ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
