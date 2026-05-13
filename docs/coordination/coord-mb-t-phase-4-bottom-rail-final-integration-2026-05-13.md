# Coord note — MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION (Round 12 §3.9 Wave 1 body-drafting)

**Session:** `r12-phase4-bottom-rail-integration-body` claiming Round 12 Wave 1 plugin-loaded cohort.
**Date:** 2026-05-13
**Status:** BODY-DRAFTING COMPLETE — 3 docs authored (ticket body + decisions + this coord) at Round 12 Wave 1; execution-phase dispatched at Wave 2+.

---

## §I — Body-drafting session deliverables

| Artifact | Path | Purpose |
|---|---|---|
| Ticket body | `docs/build-docs/CONDUCTOR_MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION_BUILD.md` | §1 scope + §2 arbitration + §3 Sub-Q gates + §4 WB ladder (7-9 WBs) + §5 cross-refs + §6 Q1-Q9 expectations + §7 DoD + §8 risk register + §9 plugin-agent dispatch enumeration |
| Decisions doc | `docs/coordination/mb-t-phase-4-bottom-rail-final-integration-decisions-2026-05-13.md` | Sub-Q dispositions table (6 PENDING rows; default recommendations enumerated) + non-default escalation triggers + cross-refs + append history |
| Coord doc | `docs/coordination/coord-mb-t-phase-4-bottom-rail-final-integration-2026-05-13.md` | this file — implementation plan + cross-session-coord notes for Wave 2 execution-phase prep |

`[KNOWN per Round 12 dispatch step 4]`: body-drafting session authors body + coord + decisions; execution-phase session (Wave 2) authors findings doc + appends to this coord doc with WB-by-WB race-window evidence.

---

## §II — Implementation plan (Wave 2 execution-phase prep)

### §II.1 — WB sequence (default-path; assumes all Sub-Q defaults accepted)

`[MODELED per Phase 1 diagnose `a5e8425ce76f9ae5b` ladder shape]`:

| WB | Verb | Scope | Files touched | Pre-WB Sub-Q ack required? |
|---|---|---|---|---|
| WB0 | docs | This session's 3 docs | (this session — already complete) | n/a |
| WB1 | red | `probe-mbtphasebrf-01-max-parallel-mount-wiring.spec.tsx` | NEW test path | BR-1 + BR-2 + BR-3 |
| WB2 | green | `mount.ts resolveRenderMaxParallelCounter` + (conditional) `max-parallel-source.ts` | MOD mount.ts + (NEW source module if BR-3=(b)) | (BR-3 binding here) |
| WB3 | red | `probe-mbtphasebrf-02-bypass-perms-mount-wiring.spec.tsx` | NEW test path | BR-1 + BR-5 |
| WB4 | green | `mount.ts resolveRenderBypassPerms` | MOD mount.ts + (conditional) MOD `coarchitect-ipc.ts` for renderer subscription | (BR-1 binding here) |
| WB5 | red | `probe-mbtphasebrf-03-main-aggregator-instantiation.spec.ts` | NEW test path | BR-5 |
| WB6 | green | `main.ts` aggregator instantiation + `spawn-ipc.ts` deps wiring | MOD main.ts (new sentinel zone) + MOD spawn-ipc.ts | (BR-5 binding here) |
| WB7 (CONDITIONAL) | contract | `WORKSTATION_CONTRACT.md §6.6` amendment | MOD WORKSTATION_CONTRACT.md + MOD preload.mts | ONLY if BR-1=(b) chosen |
| WB8 | green | Integration smoke + runtime-launch verification | NEW integration test path | n/a |
| WB-final | docs | Findings doc + append-coord doc | NEW findings + APPEND this file | n/a |

Default-path total: **9 WBs** (including this WB0).

### §II.2 — Wave 2 manifest expansion required (territorial relaxation)

`[MODELED]` Execution-phase manifest must grant WRITE on the following paths (currently FORBIDDEN under this session's body-drafting manifest):

- `packages/dispatch-workstation/src/chat-shell/mount.ts` — PRIMARY (WB2 + WB4)
- `packages/dispatch-workstation/src/main/main.ts` — PRIMARY (WB6; sentinel-zone authoring per CLAUDE.md §3.3)
- `packages/dispatch-workstation/src/main/spawn-ipc.ts` — PRIMARY (WB6)
- `packages/dispatch-workstation/src/chat-shell/max-parallel-source.ts` — NEW (WB2 if BR-3=(b))
- `packages/dispatch-workstation/test/unit/{chat-shell,main}/probe-mbtphasebrf-*.spec.{ts,tsx}` — NEW tests (WB1, WB3, WB5)
- `packages/dispatch-workstation/test/integration/chat-shell/probe-mbtphasebrf-*.test.ts` — NEW integration test (WB8)
- (CONDITIONAL on BR-1=(b)) `docs/build-docs/WORKSTATION_CONTRACT.md` + `packages/dispatch-workstation/src/main/preload.mts` + `packages/dispatch-workstation/src/main/coarchitect-ipc.ts`

`[KNOWN per CLAUDE.md §1]` `WORKSTATION_CONTRACT.md` is a frozen-contract surface; Sub-Q-BR-1=(b) escalation triggers operator-arbitrated amendment cycle (`contract:` cairn-grammar prefix per CLAUDE.md §2.3).

### §II.3 — Per-WB verification ordering

Per CLAUDE.md §4.4 + memory's consumer-non-regression-per-WB discipline:

| WB | Build step | Test scope | Consumer probes |
|---|---|---|---|
| WB2 | `pnpm --filter dispatch-workstation build` (chat-shell renderer bundle) | unit test for mount factory + ChatShell render smoke | T10 `MaxParallelCounter` probe; T4 WB12 `BypassPermsIndicator` probe (regression shield) |
| WB4 | (same as WB2) | unit test for bypass-perms mount factory + ChatShell render | T11 `BypassPermsIndicator` probe (regression shield) |
| WB6 | `pnpm --filter dispatch-core build` (if any cross-package contract touch; default = none) + `pnpm --filter dispatch-workstation build` | unit test for main.ts instantiation + spawn-ipc deps factory | T11 spawn-handler probes (4 files; 17/17 GREEN baseline per T11 findings §V.2) |
| WB8 | full workstation build | integration smoke + `pnpm --filter dispatch-workstation exec electron dist/main/main.js` runtime smoke | end-to-end bottom-rail render verification |
| WB-final | n/a | 5-package typecheck one command at a time per CLAUDE.md §4.4 (NO `&&` chains); full workstation suite at WB-final per CLAUDE.md §4.5 (expect pre-existing fails noted) | full coverage report |

### §II.4 — Sentinel-zone authoring at WB6 (CLAUDE.md §3.3 compliance)

`[KNOWN per Phase 1 diagnose]` `main.ts` has dense sentinel-zone topology. Pre-WB6 verification step:

```bash
grep -n "=== " packages/dispatch-workstation/src/main/main.ts
```

Current zones per CLAUDE.md §3.3 enumeration:
- Fix-A (multiple sub-regions)
- Fix-B (spawn-result subscription)
- Fix-C (multiple sub-regions)
- Fix-92 (config/env)
- Fix-89 (menu rebuild)
- Probe-92 obs-infra (multiple sub-regions)
- Probe-92 KANBAN_EVAL
- Session-3 SHELL_EVAL

WB6 authors NEW zone:
```typescript
// === BEGIN: MB-T-PHASE-4-BOTTOM-RAIL bypass-perms-source instantiation ===
import { createBypassPermsSource } from './bypass-perms-source.js';
const bypassPermsSource = createBypassPermsSource();
// (threading into defaultSpawnHandlerDeps via spawn-ipc.ts factory)
// === END: MB-T-PHASE-4-BOTTOM-RAIL ===
```

Adjacent to existing SpawnIpcController construction (per Phase 1 diagnose: "line 878 area"). Verify zone insertion point does NOT overlap with Fix-B sub-regions (spawn-result subscription is co-located).

---

## §III — Cross-session-coord notes (anticipated Wave 2 activity)

### §III.1 — Path-overlap sessions to watch for

`[MODELED — based on Round 11 Wave 4 evidence pattern]`:

| Sibling session class | Likely territory | Path-overlap with this ticket? |
|---|---|---|
| T8/T9 cost-meter + plan-timer data-source ticket execution | `coarchitect-ipc.ts`, `bottom-rail-cost-meter.tsx`, `plan-timer-text.tsx` | LOW — Sub-Q-BR-4=(b) default keeps this ticket out of those source-data ARMs; only shared file is `coarchitect-ipc.ts` if BR-1=(a) extends coarchitectBridge |
| spawn-handler co-edit sessions | `spawn-handler.ts` (path-overlap with T11 WB4 evidence at `bf1c33b`) | LOW — this ticket touches `spawn-ipc.ts` deps factory, not spawn-handler.ts itself; per-path commit pathspec on spawn-ipc.ts suffices |
| main.ts sentinel-zone-authoring sessions | `main.ts` | MEDIUM — new sentinel zones may collide if multiple sessions author simultaneously; per-path commit + pre-stage `git status --short` mandatory |
| Wave 2 Phase 3 visual-verification | `dist-screenshots/`, results doc | NONE — disjoint surfaces |
| Cairn-under-stress Round 12 archive writer | `cairn-under-stress-round-12.md`, etc. | NONE — disjoint |

### §III.2 — Pre-existing race-window patterns (from Round 11 Wave 4)

`[KNOWN per T11 coord doc `coord-phase4-bypass-perms-2026-05-13.md` §spawn-handler-concurrent-edit-race + §III]`:

Round 11 Wave 4 observed `spawn-handler.ts` shifting 424→473 lines mid-ladder due to sibling T8-cluster-A WB2 edits. Reconciliation pattern that held:
1. Pre-stage `git status --short` MANDATORY before every WB.
2. Re-read target file at edit time (not just at probe-authoring time) if any sibling commits land between WB pairs.
3. Per-path `git add <single-path>` only.
4. Per-path `git commit -m "..." -- <single-pathspec>` — restricts commit to specified path even if sibling files are concurrently staged.
5. Atomic stage+commit+verify in single shell invocation per T11 precedent.
6. Post-commit `git log -1 --stat` verifies commit scope = 1 file only.

Execution-phase session inherits these patterns at every WB.

### §III.3 — Plugin-agent dispatch budget at Wave 2

`[MODELED]` Recommended plugin-agent dispatches at execution session:

| Agent | Trigger | Expected use |
|---|---|---|
| `cairn-anti-fabrication-verifier` | Before ANY new `[KNOWN]` claim about altered surface state | Pre-WB2 (mount.ts current state); pre-WB6 (main.ts sentinel-zone state) |
| `cairn-phase-1-diagnose` | If Wave-1-to-Wave-2 gap exceeds ~24h (re-diagnose surface for drift) | Optional re-run if HEAD has advanced significantly since `762eed4` |
| `cairn-cross-package-impact` | If Sub-Q-BR-1=(b) or Sub-Q-BR-2=(b) escalation | Only on operator-arbitrated non-default Sub-Q paths |
| `cairn-test-failure-triage` | If new test fails at WB2/WB4/WB6/WB8 GREEN | Determine pre-existing-vs-new-cause per CLAUDE.md §4.5 |
| `cairn-followup-drafter` | At WB-final if findings surface new Tier 2/3 followups | Author FOLLOWUPS row text for operator-stamp |

Round 12 §11(VIII) requires plugin-agent dispatch enumeration in findings doc; execution session inherits this enumeration discipline.

---

## §IV — Body-drafting session per-path discipline metrics (this session)

`[KNOWN per pre-commit `git status --short` snapshots]`:

| Doc | Pre-stage state | Files staged | Files in commit | Lines |
|---|---|---|---|---|
| Ticket body (`CONDUCTOR_MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION_BUILD.md`) | clean | 1 | 1 (forthcoming) | ~370 |
| Decisions doc (`mb-t-phase-4-bottom-rail-final-integration-decisions-2026-05-13.md`) | + ticket body untracked | 1 | 1 (forthcoming) | ~120 |
| Coord doc (this file) | + ticket body + decisions untracked | 1 | 1 (forthcoming) | ~200 |

Three separate cairn-grammar commits with `docs(MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION):` prefix. Per-path `git add <single-path>` + per-path `git commit -m "..." -- <single-pathspec>` discipline at each commit. Push immediately after each commit per CLAUDE.md §2.6.

Post-commit verification: `git log --oneline origin/main..HEAD` MUST return empty after each push.

---

## §V — Round 12 §3.9 SPECULATIVE framing (anti-fabrication)

`[KNOWN per Round 12 dispatch + CLAUDE.md §2.2]`:

- Body marked SPECULATIVE per Round 12 forward-positioning.
- All `[KNOWN]` claims about codebase state inherit from Phase 1 diagnose `a5e8425ce76f9ae5b` `[KNOWN]` evidence; no direct file:line reads performed by body-drafting session (delegated to Phase 1 agent per dispatch step 2).
- All `[MODELED]` claims about Wave 2 manifest expansion + sibling activity prediction are explicit `[MODELED]` per CLAUDE.md §2.2.
- All `[SPECULATIVE]` claims about Phase 3 evidence + follow-up surfacing are explicit `[SPECULATIVE]`.
- No claim is asserted as `[KNOWN]` from training-data priors or assumed-typical-pattern-inference.

Anti-fabrication discipline per CLAUDE.md §2.1: "Read actual source before claiming what it does" — delegated to Phase 1 diagnose agent at this session per `cairn-phase-1-diagnose` plugin-agent capability. Execution-phase session re-applies anti-fabrication at every WB before new `[KNOWN]` claims.

---

## §VI — Open items for Wave 2 entry

| Item | Status | Resolution path |
|---|---|---|
| Sub-Q-BR-1 disposition | PENDING | Operator-ack at HALT-PRE-WAVE-2-EXECUTION OR auto-default per envelope |
| Sub-Q-BR-2 disposition | PENDING | (same) |
| Sub-Q-BR-3 disposition | PENDING | (same) — affects whether `max-parallel-source.ts` NEW module is authored at WB2 |
| Sub-Q-BR-4 disposition | PENDING | (same) — affects whether cost-meter + plan-timer touched at all |
| Sub-Q-BR-5 disposition | PENDING | (same) — affects WB6 main.ts wiring shape |
| Sub-Q-BR-6 disposition | CONDITIONAL on BR-1 | Skip if BR-1=(a) (default); revisit if BR-1=(b) |
| Wave 2 manifest expansion | PENDING | Operator authors new manifest with PRIMARY territory paths per §II.2 |
| Execution session dispatch | PENDING | Operator dispatches at Wave 2 row in `dispatch-queue-current.md` |
| Phase 3 visual-verification re-trigger | OPTIONAL | If Phase 3 results have landed since Round 11 Wave 4, may inform RATIFY/RESHAPE/DISCARD disposition |

---

**End of MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION coord doc (body-drafting phase).**

`[KNOWN per Round 12 §3.9 STATUS FRAMING]`: Wave 1 body-drafting complete. Wave 2 execution-phase deferred to operator dispatch. Coord doc remains OPEN for append-only by execution-phase session at WB-final.
