# MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH — Findings

**Date:** 2026-05-12
**Author:** T5 sub-session (Opus 4.7) under full-build-mode Round 9 dispatch, Phase 1 second batch
**Anchor commits:** body `c92f750` → WB1 RED `90b4f45` → WB2 GREEN `0e86966` → WB3 RED `6d5cf61` → WB4 GREEN `f9672ad` → WB5 RED `85c4491` → WB6 GREEN `5c53b04` → WB7 RED `2937170` → WB8 GREEN `4655a0e` → WB9 RED `d0faf11` → WB10 GREEN `6ee4bd4` → WB11 smoke `7317ebd` → WB12 (this doc)
**Closes (partial):** Full-build-mode dispatch §2 workstream T5 (BUILD.md driven dispatch). One of seven workstreams (T1-T7) advancing `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` closure-path-α.
**Sharpens (does NOT close):** `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (Tier 1 OPEN since 2026-05-08; T5 ships FIRST workstation consumer of MB-T28 parser library — load-bearing on parser-as-spec-of-record).

---

## I — What shipped

| Surface | Path | Lines | WB |
|---|---|---|---|
| Ticket body (5 sub-Qs all defaults; stale-dispatch reshape) | `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH_BUILD.md` | 552 | body @ `c92f750` |
| WB1 probe (parser-import + fixture-parse) | `packages/dispatch-workstation/test/unit/build-md/probe-mbtwft5-01-...spec.ts` | 68 | WB1 `90b4f45` |
| WB2 service module (loadBuildMd + computeReadySet + computeBuildMdStatus + types) | `packages/dispatch-workstation/src/build-md/{service,types,index}.ts` | 222 | WB2 `0e86966` |
| WB3 probe (IPC handler) | `test/unit/build-md/probe-mbtwft5-02-...spec.ts` | 163 | WB3 `6d5cf61` |
| WB4 IPC controller + main.ts wiring + preload bridge + §6.6 Channel #5 amendment | `src/main/build-md-ipc.ts` + `main.ts` + `preload.mts` + `WORKSTATION_CONTRACT.md` | 199 | WB4 `f9672ad` |
| WB5 probe (status-line render) | `test/unit/build-md/probe-mbtwft5-03-...spec.tsx` | 148 | WB5 `85c4491` |
| WB6 React component (BuildMdStatusLine) | `src/frame-c/build-md-status-line.tsx` | 83 | WB6 `5c53b04` |
| WB7 probe (dispatch-loop ready-set traversal) | `test/unit/build-md/probe-mbtwft5-04-...spec.ts` | 217 | WB7 `2937170` |
| WB8 dispatch-loop module + barrel extension | `src/build-md/dispatch-loop.ts` + `src/build-md/index.ts` | 132 | WB8 `4655a0e` |
| WB9 probe (end-to-end spawn-trigger) | `test/unit/build-md/probe-mbtwft5-05-...spec.ts` | 263 | WB9 `d0faf11` |
| WB10 dispatch-trigger controller + main.ts wiring (stub deps) + preload bridge + §6.6 Channel #6 amendment | `src/main/build-md-dispatch-trigger-ipc.ts` + `main.ts` + `preload.mts` + `WORKSTATION_CONTRACT.md` | 224 | WB10 `6ee4bd4` |
| WB11 runtime-launch smoke evidence | `docs/coordination/mbtwft5-runtime-smoke-2026-05-12.md` | 107 | WB11 `7317ebd` |

**Probe count:** 3 + 5 + 7 + 7 + 6 = 28; 28/28 passing at WB10 close.
**WB count:** 12 (10 cairn-pair + 1 smoke + 1 docs); matches ticket body §4 estimate (10-12 WBs baseline).

---

## II — Q-disposition (Sub-Q-MBTWFT5-A/B/C/D/E)

All five sub-Qs operator-arbitrated at HALT-TICKET-BODY-PRE-COMMIT 2026-05-12 with DEFAULT (RECOMMENDED) selections:

| Sub-Q | Question | Resolution | Where exercised |
|---|---|---|---|
| MBTWFT5-A | BUILD.md file location | (i) repo-root `BUILD.md` | `main.ts` defaultBuildMdPath: `resolve(app.getAppPath(), '..', '..', 'BUILD.md')` (mirrors SwarmStateWriter pattern) |
| MBTWFT5-B | Dispatch trigger source | (ii) operator-click "Spawn K sessions" button | `build-md-status-line.tsx` button + `triggerBuildMdDispatch` IPC bridge |
| MBTWFT5-C | Spawn pathway | (i) reuse `orchestrator-fire-spawn.ts` via DI | `BuildMdDispatchTriggerDeps.fireSpawn` DI seam (STUB at WB10 ship; production wiring `MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING` Tier 2) |
| MBTWFT5-D | max-parallel source | (ii) T4 bottom-rail counter | `BuildMdDispatchTriggerDeps.getMaxParallel` DI seam (STUB returning 4 at WB10; T4 integration `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` Tier 3) |
| MBTWFT5-E | Status-line DOM location | (i) `frame-c/build-md-status-line.tsx` | `src/frame-c/build-md-status-line.tsx` (component shipped; mount wiring `MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING` Tier 2) |

Plus operator HALT-WB4-PRE-COMMIT + HALT-WB10-PRE-COMMIT acks of WORKSTATION_CONTRACT.md §6.6 Channel #5 + Channel #6 amendment text verbatim 2026-05-12.

---

## III — Architectural deltas

`[KNOWN]`:

1. **First workstation consumer of MB-T28 parser** (shipped `7ce34b4` 2026-05-08). T5 is the FIRST cross-package boundary between dispatch-core's `parseBuildDoc` library and dispatch-workstation. Establishes the `dispatch-core/dist/build-doc-parser/index.js` import path as load-bearing.

2. **New workstation module `src/build-md/`** (5 files; 354 lines): service.ts (facade over parser + status compute) + dispatch-loop.ts (DAG traversal + max-parallel) + types.ts (discriminated unions) + index.ts (barrel). Pure-fn architecture; no electron coupling; all unit-testable in vitest.

3. **Two new main-process IPC controllers**: `BuildMdIpcController` (WB4) + `BuildMdDispatchTriggerController` (WB10). Both follow the Wave C #3 frame-c-ipc Controller-with-DI-seam + factory + `registerHandlers` pattern. Both ship to `src/main/` flat-dir convention per CLAUDE.md §3.2.

4. **WORKSTATION_CONTRACT.md §6.6 evolved with 2 new channels**: Channel #5 `workstation:read-build-md` (WB4) + Channel #6 `workstation:build-md-dispatch-trigger` (WB10). Combined with prior Channels #1-#4 (Wave B `readSwarmState` + Wave C #3 `frame-c:{diff,merge,focus}`), §6.6 now documents SIX channels added under §3.4 operator-supervised mechanical translation since 2026-05-11. The Result-type discriminated-union appendix now contains 5 type families: DiffResult/MergeResult/FocusResult/BuildMdLoadResult/BuildMdDispatchTriggerResult.

5. **New `workstationBridge.readBuildMd` + `triggerBuildMdDispatch` methods** extend EXISTING `workstationBridge` (co-tenant with Wave B `readSwarmState`). Bridge style mixes per-channel: getter-with-optional-payload (`readBuildMd`) vs action-no-payload (`triggerBuildMdDispatch`).

6. **Renderer component `BuildMdStatusLine`** ships at `src/frame-c/build-md-status-line.tsx` (Sub-Q-E=(i)). Unit-tested via @testing-library/react + happy-dom; NOT yet mounted in `frame-c-root.tsx` (Tier 2 follow-on `MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING`).

7. **Stub-deps posture at WB10** mirrors Wave C #3 `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` precedent: contract surface end-to-end-shipped + verified via probe + electron-launchable, but 4 production-wiring follow-ons queued. Operator sees full IPC roundtrip + UI feedback without real spawns disrupting state.

---

## IV — Probe distribution

| Spec file | Cases | Type | Pass at WB10 |
|---|---|---|---|
| probe-mbtwft5-01-parser-import-and-fixture-parse.spec.ts | 3 (parser import + minimal-fixture parse + loadBuildMd export) | unit, behavior, real fs ops + real parser invocation | 3/3 |
| probe-mbtwft5-02-build-md-ipc-handler.spec.ts | 5 (handler registration + payload variants + NotFound + ParseError) | unit, behavior, real ipc-controller + real loadBuildMd through FakeIpcMain DI seam | 5/5 |
| probe-mbtwft5-03-status-line-renders.spec.tsx | 7 (template text + per-count testids + button + idle hide + NotFound + ParseError + onClick) | unit, behavior, @testing-library/react + happy-dom | 7/7 |
| probe-mbtwft5-04-dispatch-loop-ready-set-traversal.spec.ts | 7 (full-fire + maxParallel cap + blocked-skip + re-tick + done + idle + decline) | unit, behavior, real DAG traversal + mock fireSpawn | 7/7 |
| probe-mbtwft5-05-spawn-trigger-end-to-end.spec.ts | 6 (registration + trigger fires 2 + maxParallel=1 + NotFound + decline + compose-with-read-ipc) | unit, behavior, real BuildMdIpcController + DispatchLoop + service.loadBuildMd through FakeIpcMain DI seam | 6/6 |

---

## V — Architecture notes + methodology findings

### V.1 — Stale-dispatch reshape at Phase 1

Per anti-fabrication §2.1 stale-dispatch check (`memory/feedback_stale_dispatch_detection.md`), four dispatch claims did NOT match repo state at HEAD `40fde1e`:

| Dispatch claim | Repo state | T5 reconciliation |
|---|---|---|
| "BUILD.md parser" (T5 scope) | MB-T28 SHIPPED at `7ce34b4` 2026-05-08 (143/143 GREEN; 100% line coverage; zero workstation invocation sites) | T5 reshaped to workstation-CONSUMER; parser is frozen dependency |
| `BUILD-md-spec.md` required-read | Not in repo (`MB-F-BUILD-MD-SPEC-NOT-IN-REPO` Tier 1 OPEN; lives at `~/Downloads/BUILD-md-spec.md`) | Parser-as-spec-of-record acceptable (143/143 GREEN); sharpens row |
| `wireframe-target-2026-05-11.png` | Not in repo | Used dispatch §1 textual inventory verbatim |
| `docs/build-docs/tickets/` deliverable path | Does not exist; existing convention is `docs/build-docs/CONDUCTOR_<TICKET>_BUILD.md` | Landed at existing convention path |

Operator ack'd reshape at HALT-TICKET-BODY-PRE-COMMIT 2026-05-12 with "T5 TICKET-BODY ACK — all defaults accepted, proceed to WB1".

### V.2 — β multi-artifact fingerprint declaration finding

Compounds with T6 WB2/WB4/WB6 methodology findings:
- **WB2 finding** (per-WB dist-path selection): library-shipped-before-consumer-wired WBs target `dist/<library>/<entry>.js` not `dist/main/main.js`.
- **WB4 finding** (multi-artifact fingerprint scoping): single `--dist-path` parameter forces declaration to be scoped per dist artifact; wiring tokens live in main.js, bridge tokens in preload.cjs, service-fn tokens in service.js.
- **WB6 finding** (vacuous at component-ship WBs): React components shipped + unit-tested but not yet rendered have NO dist artifact containing them.

**T5 WB11 demonstrated the full multi-artifact picture**: 11 fingerprints split across 4 dist artifacts in 4 separate β invocations:
- `dist/main/main.js`: wiring tokens (workstation:read-build-md, BuildMdIpcController, workstation:build-md-dispatch-trigger, BuildMdDispatchTriggerController)
- `dist/main/preload.cjs`: bridge tokens (readBuildMd, triggerBuildMdDispatch)
- `dist/build-md/service.js`: service-fn tokens (loadBuildMd, computeReadySet, computeBuildMdStatus)
- `dist/build-md/dispatch-loop.js`: dispatch-loop tokens (createDispatchLoop)

**Filed as Tier 3 follow-on at this WB12**: `MB-F-METHODOLOGY-β-MULTI-ARTIFACT-FINGERPRINT-DECLARATION` (composes with prior T6 findings — currently filed as `MB-F-METHODOLOGY-β-PER-WB-DIST-PATH-SELECTION` candidate from T6 WB2 docs; T5 WB12 sharpens the multi-artifact angle).

### V.3 — Cross-session staging contamination defense

Pathspec-on-commit form (`git commit -m "..." -- <pathspec>`) per `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 closure path α applied at EVERY WB1-WB12 commit. Defended successfully against sibling staging activity at multiple WBs:
- WB3 commit: T4 sibling had `M chat-shell.tsx + A conductor-brand.tsx + M probe-05-header-bar-slot.spec.tsx` staged → pathspec restricted my commit to WB3 probe only
- WB5 commit: T7 + T2 siblings had staged `M docs/FOLLOWUPS.md + A docs/coordination/...findings...` → pathspec restricted
- WB8 commit: T2 sibling staged FOLLOWUPS + findings → pathspec restricted

12-WB ladder produced 12 pristine commits with zero cross-session contamination. Compounds with T6 WB5 incident learning (where pathless `git commit` swept T3's file); T5 ladder applied the closure-path α discipline as default form throughout.

### V.4 — Stub-deps posture as Round 9 v1-ship pattern

Per Wave C #3 `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` precedent: ship the END-TO-END contract surface with stub deps; defer production wiring to follow-on cycles. T5 WB10 applied this 4 stub points:

1. `getCompletedTaskIds` → empty Set
2. `getMaxParallel` → 4 conservative default
3. `fireSpawn` → `{declined: true}` for every task
4. BuildMdStatusLine NOT mounted in frame-c-root.tsx

Trade-off: operator-visible behavior pre-closure shows "0 spawned, N declined" — verifies wiring without firing real CC spawns. Closure delivered incrementally via 4 Tier 2/3 follow-on tickets (queued for filing this WB12). Pattern is operationally sound when:
- Contract surface end-to-end exercised by probes ✓
- Electron launch verified clean ✓
- Operator can see+test UI feedback without state disruption ✓
- Production wiring scope is well-defined + small-bounded ✓

T5 ratifies this as a Round 9 v1-ship default pattern (not just per-ticket exception).

---

## VI — Documentation drift

- Ticket body §1.1 step 6 mentioned "new sentinel zone `=== BEGIN: MB-T-WIREFRAME-T5-BUILD-MD wiring ===`" → realized as `=== BEGIN: MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH wiring ===` (full ticket name per existing T-WIREFRAME-* sentinel convention).
- Ticket body §4 WB12 anticipated "MB-F-METHODOLOGY-β-PER-WB-DIST-PATH-SELECTION" filing → realized as "MB-F-METHODOLOGY-β-MULTI-ARTIFACT-FINGERPRINT-DECLARATION" (sharpened angle per V.2 multi-artifact picture).
- No drift in ticket body §4 WB ladder vs actual execution: 12 WBs as planned (10 cairn-pair + 1 smoke + 1 docs).
- WB10 surfaced a 4th stub-followup (`MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING`) not enumerated in §4 WB12 — filed at this WB12 (BuildMdStatusLine ships but isn't mounted in frame-c-root.tsx; requires follow-on commit to integrate).

---

## VII — Consumer non-regression `[KNOWN]`

- `pnpm --filter dispatch-workstation typecheck` CLEAN at WB2, WB4, WB6, WB8, WB10, WB11 (tsc --noEmit; no errors).
- `pnpm --filter dispatch-workstation build` ran clean at WB4, WB10, WB11 (all renderer bundles + main tsc).
- `pnpm --filter dispatch-core build` ran clean at WB11 (dispatch-core dist freshness verified per CLAUDE.md §3.4).
- T6 α gate FRESH at every GREEN WB (WB2, WB4, WB6 noted vacuous, WB8, WB10, WB11).
- T6 β gates PASS at every GREEN WB with correct per-WB dist-path selection per V.2 finding.
- Pre-existing baseline failures per CLAUDE.md §4.5 (`MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` + `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE`) NOT re-diagnosed per WB. All probe runs scoped to `test/unit/build-md/` exclusively.
- Electron runtime launch CLEAN at WB11 (WINDOW_READY within ~10s; no `ERR_MODULE_NOT_FOUND` / `Cannot find module` / errors).

---

## VIII — WB skip rationale

None — full 12-WB ladder executed per ticket body §4. Two operator HALT cycles consumed (HALT-WB4 + HALT-WB10 for §6.6 amendment text); operator ack'd both verbatim at the respective HALT-PRE-COMMIT surfaces.

---

## IX — New followups filed

This commit appends six new rows to `docs/FOLLOWUPS.md`:

| Row | Tier | Closure path | Filed for |
|---|---|---|---|
| `MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING` | Tier 2 | spawn-result-listener completion tracking; new state module mirroring frame-mode-state.ts pattern | WB10 stub deps |
| `MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING` | Tier 2 | orchestrator-fire-spawn.ts DI composition + dispatch-mode reader | WB10 stub deps |
| `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` | Tier 3 | T4 max-parallel-store integration per Sub-Q-MBTWFT5-D=(ii); fallback to sibling state | WB10 stub deps |
| `MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING` | Tier 2 | Mount BuildMdStatusLine in frame-c-root.tsx + state holder reading workstationBridge.readBuildMd | WB6 component shipped; not yet wired |
| `MB-F-T5-WIREFRAME-AUTO-DISPATCH-AMBIGUITY` | Tier 2 | Re-arbitrate Sub-Q-B=(ii) operator-click vs (i) auto-on-load post-dogfood | Sub-Q-B wireframe text ambiguity |
| `MB-F-T5-BUILD-MD-FILE-WATCH-AUTO-REDISPATCH` | Tier 3 | fs.watch debounced on BUILD.md → auto-redispatch (Sub-Q-B=(iii) alternative) | Sub-Q-B alternative path |
| `MB-F-METHODOLOGY-β-MULTI-ARTIFACT-FINGERPRINT-DECLARATION` | Tier 3 | Document multi-artifact β fingerprint declaration convention; consider single CLI invocation that accepts artifact→fingerprints map | T5 ladder sharpened T6 WB2/WB4/WB6 methodology findings |

Sharpening of existing Tier 1:
- `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (`MB-T28` filed 2026-05-08; Tier 1 OPEN) — T5 ships FIRST workstation consumer; workstation now load-bears on BUILD.md presence + parser-encoded spec semantics. Closure path α (spec copied to `docs/build-docs/BUILD-md-spec.md`) gains urgency; remains operator-arbitrated.
- `MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED` (T1-T7 closure-path-α) — T5 advances one workstream of seven; sibling T1/T2/T3/T4/T6/T7 progress trackable via per-ticket findings docs.

---

## X — Open items

1. **4 stub-deps production wiring** (Tier 2 × 3 + Tier 3 × 1): COMPLETED-TASK-IDS-PRODUCTION-WIRING + FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING + BUILD-MD-STATUS-LINE-MOUNT-WIRING + MAX-PARALLEL-T4-DEPENDENCY. Production wiring scope is well-bounded; each follow-on is small (1-3 WBs estimated).
2. **`MB-F-BUILD-MD-SPEC-NOT-IN-REPO` Tier 1 closure**: operator-arbitrated whether spec copy lands at `docs/build-docs/BUILD-md-spec.md` (parser-as-spec-of-record acceptable until then).
3. **Wireframe text ambiguity** (Sub-Q-B=(ii) operator-click vs (i) auto-on-load): post-dogfood re-arbitration per `MB-F-T5-WIREFRAME-AUTO-DISPATCH-AMBIGUITY`.
4. **`MB-F-WIREFRAME-PARITY-SCOPE-UNDERESTIMATED`**: T5 advances one of seven workstreams; T1/T2/T3/T4/T6/T7 progress concurrent.
5. **CLAUDE.md §2.7 codification candidate**: pathspec-on-commit pattern from `orchestrator-state-current.md §4` operational-primitive should be promoted to CLAUDE.md §2.7 codified rule. T6 WB6 `MB-F-METHODOLOGY-CROSS-SESSION-STAGING-CONTAMINATION` Tier 1 covers this closure path; T5 ladder applied the discipline successfully across 12 commits validates the pattern.
6. **Operator manual-screenshot validation** (per dispatch §3.5 visual-comparison gate): items §2.1-2.4 in WB11 smoke doc — BUILD.md sample authoring, Frame-C-bottom status-line render, button click → UI feedback, production fireSpawn wiring.

---

## XI — Status

**T5 ladder COMPLETE at this commit (WB12 docs).** T5 sub-session available for next dispatch.

**Effective immediately**: future tickets touching workstation IPC inherit the §6.6 Channel #5 + #6 amendments. T5 ships the foundation for BUILD.md-driven dispatch (parser consumer + status indicator + dispatch loop + spawn-trigger IPC); production wiring of stub deps proceeds via 4 follow-on tickets queued for operator dispatch when prioritized.
