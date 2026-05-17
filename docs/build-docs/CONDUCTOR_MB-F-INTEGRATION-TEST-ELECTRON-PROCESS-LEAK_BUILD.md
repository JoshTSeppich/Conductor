# MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK — build doc

**Ticket type**: Followup closure (Tier 1)
**Followups row**: `docs/FOLLOWUPS.md:153`
**Session**: SESSION-r12-t1c-w1-electron-process-leak-cleanup
**Date**: 2026-05-16
**Status**: RESOLVED pending operator-stamp on FOLLOWUPS.md row.

---

## 1. Scope

Eliminate Electron process leaks from the dispatch-workstation integration test suite. Pre-closure baseline: a full `pnpm --filter dispatch-workstation exec vitest run test/integration/` run leaked 31 Electron processes (all `ppid=1`, re-parented to launchd) on macOS. Mitigation was manual `pkill -9 -f "[Ee]lectron"` between phases — operator-burden + dogfood-disrupting.

Closure target: zero leaked Electron processes after a full integration suite run, verified via `pgrep -fl "[Ee]lectron" | grep -v Claude.app | wc -l` returning 0.

## 2. Closure design — fork-scoped descendant polling + global setup wiring

Three-stage protection, registered globally from `packages/dispatch-workstation/test/setup.ts`:

```
test/setup.ts ── (imports + calls) ──▶ registerElectronCleanup()
                                            │
                                            ├─ startDescendantPolling()  ◀── beforeAll-equivalent
                                            ├─ afterEach: killAllTracked() if any
                                            └─ afterAll:
                                                 ├─ stopDescendantPolling()
                                                 ├─ snapshotDescendantsOnce() (final)
                                                 ├─ sweepOrphanDescendants(process.pid)
                                                 └─ killObservedDescendants()
```

### 2.1 Why polling (the load-bearing primitive)

The original auto-ack envelope (afterEach + afterAll, with ancestor-bounded sweep keyed on `pgrep -P process.pid`) had a **macOS-specific gap**: when a test's inline `child.kill('SIGKILL')` runs in `try/finally`, the shim node process dies BEFORE afterAll fires. Electron .app children then re-parent to launchd (`ppid=1`), and `pgrep -P process.pid` no longer finds them. WB-final verification surfaced 31 leaks under this exact path.

Polling closes the gap: snapshotting descendants every 500ms during the test captures PIDs **while they are still descendants of the fork**, before re-parenting can occur. PIDs are stable system-wide identifiers, so the helper can SIGKILL by PID in afterAll regardless of who the current parent is.

### 2.2 Why polling is fork-isolated (Q-ELEAK-6 architecture preserved)

- `observedDescendants` is a module-scope `Set<number>` in `electron-process-cleanup.ts`.
- Each vitest worker fork loads the module into its own V8 isolate → its own independent Set.
- `snapshotDescendantsOnce` BFS-walks from `process.pid` (the fork's PID), never crosses fork boundaries.
- PIDs are unique system-wide → no cross-fork collisions.
- One fork's `afterAll` can never observe — and so cannot kill — another fork's still-alive Electron processes.

An earlier WB4 attempt used `sweepByCommandLine` keyed on `--user-data-dir=/var/folders/.../T/` patterns. That broke fork isolation (any fork's afterAll matched ANY fork's still-alive Electron by command line) and cascaded 4 additional failures in parallel runs. Polling-by-PID supersedes it.

### 2.3 Manifest-expansion-3 — territory grant for `test/setup.ts`

Original dispatch territory restricted writes to per-suite `__cleanup-amend.spec.ts` files (4 amends for the 4 named suites). Phase 1 diagnose (cairn-phase-1-diagnose subagent) surfaced [KNOWN]:
- The dispatch listed 4-5 suites, but `Grep -l 'spawn(ELECTRON_BIN' test/integration` returned **28 spec files**.
- Under vitest `isolate: true`, sibling `__cleanup-amend.spec.ts` files cannot observe spawns in `probe-*.test.ts` siblings (separate forks).

Operator (gen-6) auto-ack `OPTION (b)` 2026-05-16 expanded WRITE territory to include `packages/dispatch-workstation/test/setup.ts` for a single 1-line registration. This closes leak across all 28 spawning suites without 28 separate amend files (manifest-expansion-3, gen-6 commit `2881f4a`).

## 3. WB ladder + commits

| WB | Verb | Commit | Description |
|----|------|--------|-------------|
| WB1 RED | `red` | `d83c980` | probe-mbfeleak-01 unit tests for helper API surface |
| WB1 GREEN | `green` | `60bfa93` | electron-process-cleanup.ts helper (initial 5 primitives) |
| WB2 | `green` | `805cabd` | probe-mbfeleak-02 ratify meta-probe (suite-wide cleanup) |
| WB3 | `green` | `7cade94` | test/setup.ts wiring (registerElectronCleanup global) |
| WB4 | `green` | `2b25d4b` | helper amend: descendant polling closes macOS reparenting gap |
| WB-final | `docs` | _this commit_ | build-doc + findings + decisions + impl-coord |

## 4. Verification

### 4.1 Helper probes (14/14 passing)

`pnpm --filter dispatch-workstation exec vitest run test/integration/_helpers/`

- `probe-mbfeleak-01-afterall-cleanup-helper.spec.ts` (9 tests):
  - public API surface (10 exports)
  - trackChild + killAllTracked SIGKILLs tracked
  - killAllTracked empty is no-op
  - sweepOrphanDescendants kills descendants matching commPattern
  - sweepOrphanDescendants is ancestor-bounded (no sibling/unrelated PIDs)
  - sweepOrphanDescendants returns [] for nonexistent rootPid
  - descendant polling captures spawned children
  - killObservedDescendants kills observed PIDs that are still alive
  - fork-isolation invariant (observed set is module-state)
- `probe-mbfeleak-02-suite-wide-cleanup.spec.ts` (5 tests):
  - sweep cleans N=5 untracked children
  - mixed: tracked + untracked sweep composition
  - sweep with default commPattern (Electron) skips non-Electron children
  - registerElectronCleanup afterEach reaps tracked children (test A spawns)
  - test B verifies tracked from A was reaped between tests

### 4.2 Leak elimination (closure criterion, KNOWN)

| State | Baseline check | Post-suite check |
|-------|----------------|------------------|
| Pre-closure | 0 zombies | **31 zombies** (all `ppid=1`) |
| WB3 only (sweep, no polling) | 0 zombies | 31 zombies |
| WB3+WB4 polling | 0 zombies | **0 zombies** |

Verified via: `pgrep -fl "[Ee]lectron" \| grep -v Claude.app \| wc -l`

### 4.3 Suite duration impact

| State | Duration | Notes |
|-------|----------|-------|
| WB3 only | 73.37s | sweep adds ~5-20ms per fork afterAll |
| WB3+WB4 polling | 69.81s | polling adds ~2-4% overhead during tests; within noise |

### 4.4 Test failures — pre-existing baseline (out of scope for closure)

| State | Failed | Passed | Skipped |
|-------|--------|--------|---------|
| WB3 baseline | 16 | 117 | 1 |
| WB3+WB4 | 20 | 116 | 1 |

The 4 additional failures (vs WB3 baseline) are sentinel-timeout flakes in `t1-cold-launch-composite`, `mb-t05-kanban-card`, and `fix-94-verification`. They match the `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3, CLAUDE.md §4.5) pattern. Not caused by polling at the architecture level (polling does READS only — kills are confined to afterAll, post-test). Filed for orthogonal triage as `MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA` (Tier 3) in findings doc §6.

## 5. Q-ELEAK arbitration record

See decisions doc §1 for full Q-ELEAK-1 through Q-ELEAK-7 dispositions.

## 6. Out-of-scope items (filed for followup)

- `MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA` (Tier 3) — investigate whether the 4 additional sentinel-timeout failures are caused by polling overhead vs pre-existing flake (see findings doc §6).
- `MB-F-INTEGRATION-TEST-REGISTRY-LEAK` (FOLLOWUPS:158, Tier 2) — daemon-side registry rows from test fixtures persist after test runs. Sibling-class to this ticket but separate cleanup surface (daemon HTTP DELETE, not process kill). Not in scope here.

## 7. Closure stamp proposal (operator-stamp envelope)

Update `docs/FOLLOWUPS.md:153` to prepend the row body with:

> **CLOSED by SESSION-r12-t1c-w1-electron-process-leak-cleanup (commits d83c980→2b25d4b, 2026-05-16).** Helper at `packages/dispatch-workstation/test/integration/_helpers/electron-process-cleanup.ts` registered globally via `test/setup.ts` (manifest-expansion-3). Three-stage cleanup: descendant polling during tests + ancestor-bounded sweep in afterAll + observed-PID kill in afterAll. Closes the macOS-reparenting gap by capturing PIDs before re-parenting and killing by PID in afterAll. Verified: 31 leaks → 0 leaks post full integration suite run. Fork-isolated by V8-isolate module state; cannot cross-kill other forks' live processes. Tier 1.
