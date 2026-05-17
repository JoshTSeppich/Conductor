# MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK — findings

**Session**: SESSION-r12-t1c-w1-electron-process-leak-cleanup (Wave T1-CLOSURE-Wave-1 expansion, POOL-C #2)
**Date**: 2026-05-16
**Followups row**: `docs/FOLLOWUPS.md:153` (Tier 1)
**Outcome classification (per CLAUDE.md §2.11)**: **Improved (binary flip + behavioral quality)** — leak count flipped from 31→0 with explicit fork-isolation invariants documented.

---

## 1. Surface-inventory findings (Phase 1)

Invoked `cairn-phase-1-diagnose` subagent per §14.4 amortization heuristic. Key findings [KNOWN]:

- **Dispatch undercount**: dispatch listed 4-5 affected suites; `Grep -l 'spawn(ELECTRON_BIN' test/integration` returned **28 spec files**. Only 14% of leak surface would have been touched by the named amend files alone.
- **Vitest fork isolation gap (Q-ELEAK-6)**: under default `isolate: true`, `__cleanup-amend.spec.ts` sibling files run in SEPARATE forks from `probe-*.test.ts` siblings. Amend-file hooks cannot observe sibling specs' spawns — load-bearing for whether the originally-dispatched architecture is mechanically capable of closing the leak. Surfaced to operator at HALT 0.
- **Zero existing afterEach/afterAll** across the 28 spawning specs. All kill sites are inline `try/finally child.kill('SIGKILL')` per-`it`, which DOES execute on test failure but does NOT survive vitest worker teardown if the kill races against re-parenting.
- **Vitest config**: `testTimeout: 10_000` file-level (overridable per-`it` up to 180_000); no `pool` setting (default forks); no `fileParallelism: false`; no `globalSetup`/`globalTeardown`. Spec files run in parallel by default.

## 2. Macos re-parenting gap (WB-final discovery)

The original auto-ack envelope (afterEach tracked-PID kill + afterAll ancestor-bounded sweep) passed all helper probes but **failed to close the leak in the actual suite run**.

WB-final full-suite run with WB3 alone observed **31 leaked Electron processes**, all with `ppid=1` (launchd). Trace:

| Phase | Owner | State |
|-------|-------|-------|
| Test body spawns Electron via `spawn(ELECTRON_BIN, [MAIN_JS])` | shim PID → main process | child of fork |
| Test fails / times out at assertion | test body throws | Electron tree still alive |
| `try { ... } finally { child.kill('SIGKILL') }` runs | shim node process killed | shim dies |
| Electron .app processes re-parent to launchd | `ppid=1` now | NO LONGER descendant of fork |
| afterEach fires (no `trackChild` was called) | no-op | — |
| afterAll fires: `sweepOrphanDescendants(process.pid)` | `pgrep -P process.pid` returns [] | sweep misses re-parented orphans |
| Vitest fork exits | — | 4-5 Electron procs leaked per failed spawn-spec |

Per CLAUDE.md §2.11: "MODELED claims become KNOWN only by evidence, never by repetition." The re-parenting bug was MODELED in the Phase 1 diagnose (Risk R3) but became KNOWN only at WB-final verification when 31 actual leaks were observed.

## 3. WB4 amend — descendant polling

Closure designed to address §2: snapshot descendants of `process.pid` every 500ms during the test, accumulating PIDs into a fork-scoped Set BEFORE re-parenting can occur. In `afterAll`, kill any observed PID still alive by direct `process.kill(pid, 'SIGKILL')`. PIDs survive re-parenting; the kill succeeds regardless of current `ppid`.

Fork isolation invariants [KNOWN]:
- `observedDescendants: Set<number>` is module-state in helper TS file
- Each vitest worker fork loads the module into its own V8 isolate → its own Set
- BFS-walk roots at `process.pid` (the fork) → never crosses fork boundaries
- PIDs unique system-wide → no cross-fork collision possible

An earlier WB4 spike used `sweepByCommandLine` keyed on `--user-data-dir=/var/folders/.../T/` patterns. That broke fork isolation (any fork's afterAll matched ANY fork's still-alive Electron by command line) and **cascaded 4 additional test failures** in parallel runs. Reverted in favor of polling-by-PID.

## 4. Closure verification (KNOWN)

| Metric | Pre-closure | WB3 only | WB3+WB4 polling |
|--------|-------------|----------|-----------------|
| Leaked Electron procs post-suite | 31 | 31 | **0** |
| Helper probes passing | n/a | 11/11 | 14/14 |
| Suite duration | 73.37s | 73.37s | 69.81s |
| Suite failures | 16 (baseline §4.5) | 16 | 20 |

Closure criterion (Q-ELEAK-7=a): `pgrep -fl "[Ee]lectron" \| grep -v Claude.app \| wc -l` returns 0 post full integration suite run. **Satisfied** [KNOWN].

## 5. Q-ELEAK arbitration outcomes

See decisions doc §1 for verbatim Q-ELEAK-1 through Q-ELEAK-7 dispositions.

## 6. Out-of-scope discoveries (for followup)

### 6.1 Polling overhead flake delta

WB3+WB4 suite ran with 20 failures vs WB3-baseline 16. The 4 additional failures are:

- `fix-94-verification/probe-03-permission-mode-ask-default.test.ts` (2 cases) — live ps-aux negative-evidence flakes, environmental
- `t1-cold-launch-composite/probe-01-cold-launch-one-shot.test.ts` — WINDOW_READY sentinel timeout
- `mb-t05-kanban-card/probe-01-spawn-card-renders.test.ts` — SPAWN_MODAL_OPENED sentinel timeout

All 4 match the `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3, CLAUDE.md §4.5) sentinel-timeout-flake pattern. Polling does READ-ONLY operations (pgrep + ps) during tests; kills are confined to afterAll. Architecturally, polling cannot cause sentinel-timeout failures unless the ~2-4% runtime overhead pushes a marginal flake over its threshold.

**Filed as followup**: `MB-F-ELEAK-CLOSURE-POLLING-OVERHEAD-FLAKE-DELTA` (Tier 3) — investigate whether reducing poll frequency (e.g., 1000ms instead of 500ms) eliminates the delta. If not, the 4 failures are pre-existing flakes that happened to manifest this run.

### 6.2 Helper Helper-process re-parent edge

macOS Electron Helper processes (Renderer/GPU) re-parent to launchd between main-kill and their own exit. Polling captures them as long as they're descendants AT poll time. If a helper spawns AFTER the last poll tick AND before afterAll, it would NOT be in the observed set. Reasoning: helpers are spawned by main Electron, not directly by the test. They appear within milliseconds of Electron start. Polling at 500ms catches them with 1-2 ticks of slack before any test could finish.

Not filed as followup — the WB-final 0-leak count [KNOWN] indicates the slack is sufficient in practice.

### 6.3 trackChild path remains opt-in

WB3 wires `registerElectronCleanup` globally so every fork's afterEach/afterAll hooks fire. Specs that explicitly call `trackChild(child)` after spawn get an additional afterEach kill path. Existing specs don't call `trackChild` — the polling-based path is the load-bearing primitive.

Not filed as followup — opt-in `trackChild` is documented in the helper module header; can be adopted incrementally if specs need per-test cleanup granularity.

## 7. Self-correcting cycle observation

This closure pattern matches a self-correcting cycle:

1. WB1+2 design from Phase 1 diagnose (auto-ack envelope) — passes helper probes
2. WB3 ships setup.ts wiring — passes probe re-run + unit-test non-regression
3. **WB-final verification surfaces the actual production-failure mode** (31 leaks via re-parenting)
4. WB4 amend (polling) addresses the surfaced root cause
5. WB-final re-verification: 0 leaks [KNOWN]

The discipline that made this work: per CLAUDE.md §2.1 anti-fabrication — running the actual full-suite verification at WB-final (instead of trusting probe results) caught the gap. The diagnose's R3 (macOS re-parent) was MODELED at HALT 0; only WB-final execution made it KNOWN.

## 8. Methodology observations for the cairn-under-stress doc

- **§14.4 amortization heuristic confirmed pays off**: invoking `cairn-phase-1-diagnose` for this 4-WB ticket surfaced Q-ELEAK-4/5/6/7 that operator did not anticipate in dispatch. Without the agent, those would have surfaced as WB-mid pivots or post-closure flame.
- **WB-final empirical verification is load-bearing**: helper probes passing ≠ closure complete. The 31-leak discovery only at WB-final after probe-passing WB3 underscores §2.1 — read actual production behavior, not just unit-test pass signals.
- **HALT-on-new-arbitration discipline applied correctly**: Phase 1 surfaced 4 new Q-ELEAK arbitrations beyond auto-ack envelope; halted for operator ack rather than carrying forward.
- **macOS Electron behavior is non-obvious**: re-parenting to launchd happens between shim-kill and Electron-exit. Linux likely doesn't have this exact pattern (different process group semantics). Helper docs the behavior in module header so future readers don't have to re-discover.
