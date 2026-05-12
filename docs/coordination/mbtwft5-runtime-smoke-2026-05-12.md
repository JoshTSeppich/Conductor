# MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH — WB11 runtime-launch smoke

**Date:** 2026-05-12
**Anchor commit:** `6ee4bd4` (WB10 GREEN — dispatch-trigger controller + main.ts wiring + §6.6 Channel #6 amendment).
**Smoke harness:** per CLAUDE.md §4.6 (`MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` invariant) + ticket §4 WB11 acceptance + T6 §C envelope α/β gates (operative since `0d71590`).

---

## §1 — What was verified `[KNOWN]`

### §1.1 — Build pipeline

| Step | Command | Outcome |
|---|---|---|
| Build dispatch-core (per CLAUDE.md §3.4) | `pnpm --filter dispatch-core build` | tsc exited 0; `BUILD_COMPLETE` sentinel emitted; dist/ refreshed. |
| Build dispatch-workstation | `pnpm --filter dispatch-workstation build` | All 9 build steps completed; `BUILD_COMPLETE` sentinel emitted. tsc emits to dist/ including new `dist/build-md/{service,types,dispatch-loop,index}.js` + `dist/main/{build-md-ipc,build-md-dispatch-trigger-ipc}.js`. Renderer bundle `dist/tile-grid/renderer.js` unchanged shape (BuildMdStatusLine NOT bundled — not wired into frame-c-root.tsx; see §3 follow-on). |

### §1.2 — T6 α + β envelope gates

| Gate | Target | Output | Result |
|---|---|---|---|
| α build-freshness | `dist/main/main.js` | `FRESH distMtimeS=1778610867 headCommitTimeS=1778610847 delta=20s` | PASS exit 0 |
| β bundle-inclusion (main.js wiring) | `dist/main/main.js` | `workstation:read-build-md=1`, `BuildMdIpcController=2`, `workstation:build-md-dispatch-trigger=1`, `BuildMdDispatchTriggerController=2` | PASS exit 0 |
| β bundle-inclusion (preload bridge) | `dist/main/preload.cjs` | `readBuildMd=1`, `triggerBuildMdDispatch=1` | PASS exit 0 |
| β bundle-inclusion (service module) | `dist/build-md/service.js` | `loadBuildMd=2`, `computeReadySet=2`, `computeBuildMdStatus=2` | PASS exit 0 |
| β bundle-inclusion (dispatch-loop module) | `dist/build-md/dispatch-loop.js` | `createDispatchLoop=1` | PASS exit 0 |

### §1.3 — Electron runtime launch

| Step | Command | Outcome |
|---|---|---|
| Launch electron (background, 15s observation) | `pnpm --filter dispatch-workstation exec electron dist/main/main.js` (PID 17291; SIGTERM after 15s) | `WINDOW_STATE 1024 768` + `WINDOW_READY` sentinel emitted. NO `ERR_MODULE_NOT_FOUND`. NO `Cannot find module`. NO `Error:` / `TypeError` / `Uncaught` lines in 15s of captured stdout/stderr (`/tmp/mbtwft5-electron-smoke.log`; 2 lines total). |
| T5 wiring stability | post-launch verification | Workstation launches cleanly with new T5 sentinel zones (imports + wiring) + new `build-md-ipc.ts` + new `build-md-dispatch-trigger-ipc.ts` modules + new `workstationBridge.readBuildMd` + `triggerBuildMdDispatch` bridge surfaces. No import chain breakage. |

### §1.4 — Test suite (28/28 passing in test/unit/build-md/)

| WB | Probe file | Tests |
|---|---|---|
| WB1 | probe-mbtwft5-01-parser-import-and-fixture-parse.spec.ts | 3/3 |
| WB3 | probe-mbtwft5-02-build-md-ipc-handler.spec.ts | 5/5 |
| WB5 | probe-mbtwft5-03-status-line-renders.spec.tsx | 7/7 |
| WB7 | probe-mbtwft5-04-dispatch-loop-ready-set-traversal.spec.ts | 7/7 |
| WB9 | probe-mbtwft5-05-spawn-trigger-end-to-end.spec.ts | 6/6 |
| **TOTAL** | 5 spec files | **28/28** |

Confidence: `[KNOWN]` for all rows in §1.1-§1.4 — observed via direct command invocation captured in WB11 session 2026-05-12.

---

## §2 — What was NOT verified at WB11 (deferred to operator-manual-screenshot per dispatch §3.5)

The following per-ticket WB11 acceptance items require operator-side interactive verification (dispatch §3.5 visual-comparison gate uses operator-manual-screenshot as fallback until T6 γ headless screenshot pipeline ships):

1. **BUILD.md presence**: repo-root `BUILD.md` does NOT exist (verified `ls BUILD.md` 2026-05-12: NotFound). Status-line component renders honest "No BUILD.md at <path>" empty-state placeholder under realistic dogfood. Operator authors a sample `BUILD.md` at repo root to exercise the loaded-status path.
2. **Frame-C-bottom status-line render**: BuildMdStatusLine component shipped at WB6 (`5c53b04`) but NOT yet wired into `frame-c-root.tsx` (WB6 commit body §β-vacuous discussion; β verifies source via unit-test + happy-dom render). Operator visual confirmation of bottom-status-line in workstation UI deferred to follow-on wiring ticket (see §3 below).
3. **Spawn-K-sessions button click → IPC roundtrip**: WB9 end-to-end probe verifies the main-process integration (`workstation:build-md-dispatch-trigger` → `DispatchLoop.tick()` → fireSpawn) with mock fireSpawn. Operator-visible click → UI feedback ("0 spawned, N declined" per stub posture) deferred to operator manual smoke.
4. **Sub-Q-MBTWFT5-C=(i) production wiring**: orchestrator-fire-spawn DI composition stubbed at WB10 (`fireSpawn` returns `{declined: true}` for every task). Production wiring deferred to `MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING` Tier 2 follow-on (filed at WB12 docs).

---

## §3 — Stub-deps posture (per Wave C #3 `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` precedent)

T5 ships the END-TO-END wiring contract but with stub deps at three points; full production wiring deferred to operator-arbitrated follow-on cycles (queued for WB12 docs):

| Stub point | Current (WB10 ship) | Production wiring scope | Followup |
|---|---|---|---|
| `getCompletedTaskIds()` | Returns empty `Set` | spawn-result-listener completion tracking; new state module mirroring `frame-mode-state.ts` pattern | `MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING` (Tier 2) |
| `getMaxParallel()` | Returns 4 (conservative default) | Read from T4 max-parallel-store per Sub-Q-MBTWFT5-D=(ii) (T4 ticket in flight at sibling sub-session) | `MB-F-T5-MAX-PARALLEL-T4-DEPENDENCY` (Tier 3) |
| `fireSpawn(request)` | Returns `{declined: true}` | Wrap `orchestratorFireSpawn` from `orchestrator-fire-spawn.ts` per Sub-Q-MBTWFT5-C=(i); compose `OrchestratorFireSpawnDeps` (readDispatchMode + getController + spawnConfirmGate + broadcast) | `MB-F-T5-FIRESPAWN-ORCHESTRATOR-FIRE-SPAWN-WIRING` (Tier 2) |
| BuildMdStatusLine mount | Component shipped + unit-tested; NOT wired into `frame-c-root.tsx` | Add `<BuildMdStatusLine>` mount in frame-c-root.tsx; pass `result` prop from new state holder reading `workstationBridge.readBuildMd` on mount + on file-change events | `MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING` (Tier 2; new — file at WB12 docs) |

Operator-visible behavior pre-closure: workstation launches cleanly; clicking Spawn-K-sessions button (when status-line is wired) surfaces successful IPC roundtrip + UI feedback ("0 spawned, N declined") without firing real CC spawns. Verifies the contract surface end-to-end without disrupting workstation state.

---

## §4 — CLAUDE.md §4.6 merge-gate clearance

Per `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE`:
- ✅ Build CLEAN (dispatch-core + dispatch-workstation, `BUILD_COMPLETE` sentinels)
- ✅ Electron launch CLEAN (`WINDOW_READY` sentinel within ~10s; no `ERR_MODULE_NOT_FOUND`)
- ✅ All probes GREEN (28/28 in test/unit/build-md/)
- ✅ Typecheck CLEAN (`pnpm --filter dispatch-workstation typecheck`)
- ✅ T6 α gate FRESH (post-rebuild)
- ✅ T6 β gates PASS across 4 dist artifacts (main.js + preload.cjs + service.js + dispatch-loop.js) covering 11 distinct fingerprints

Per dispatch §3.5 visual-comparison gate (until T6 γ ships):
- ⏳ Operator manual-screenshot validation deferred for §2 items 1-4 + §3 wiring follow-on items

---

## §5 — Anchor commits

| WB | SHA | Summary |
|---|---|---|
| body | `c92f750` | Ticket body authored (all defaults; stale-dispatch reshape) |
| WB1 RED | `90b4f45` | parser-import + fixture-parse probe |
| WB2 GREEN | `0e86966` | build-md/{service,types,index}.ts facade |
| WB3 RED | `6d5cf61` | build-md-ipc handler probe |
| WB4 GREEN | `f9672ad` | build-md-ipc.ts + main.ts wiring + §6.6 Channel #5 amendment |
| WB5 RED | `85c4491` | status-line render probe |
| WB6 GREEN | `5c53b04` | BuildMdStatusLine React component |
| WB7 RED | `2937170` | dispatch-loop ready-set traversal probe |
| WB8 GREEN | `4655a0e` | build-md/dispatch-loop.ts impl + barrel re-export |
| WB9 RED | `d0faf11` | spawn-trigger end-to-end probe |
| WB10 GREEN | `6ee4bd4` | build-md-dispatch-trigger-ipc.ts + main.ts wiring (stub deps) + §6.6 Channel #6 amendment |
| WB11 docs | (this doc) | runtime-launch smoke + α/β verification evidence |
| WB12 docs | (pending) | findings doc + FOLLOWUPS closure stamps + 4 follow-on filings |
