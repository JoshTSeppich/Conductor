# Dogfood Phase D-2 — 15-min sustained HSO uptime + cross-launch state transition

**Date:** 2026-05-11
**Anchor SHA:** `ddc4a52` (HEAD at smoke launch; post MB-T-POOL-SHUTDOWN-HOOK-FIX ticket authoring)
**Predecessor:** Phase D-1 retry (`fc6c512`) + closures (`6081cbb`)
**Daemon:** PID 92700 continuous, port 7878, `x-conductor-token` auth
**Dist rebuild:** required mid-cycle (see §VI stale-dist anti-fabrication catch); fresh dist at `2026-05-11T10:04` post-rebuild

**Outcome:** 🟡 **MIXED.** LAUNCH-1 (state=held + tmux=alive baseline) **PASSED** with full Path (E) cross-launch transition validation — load-bearing `[MODELED]` → `[KNOWN]` promotion. LAUNCH-2 (state=held + tmux=KILLED baseline per dispatch step 4) surfaced a **NEW Tier 2 partial-gap**: pool's crash-recovery path (`_promote` / `_onStandbyCrash`) bypasses the Path (E) GET-first state machine and hits 409 cascade on existing-armed rows when tmux dies out-of-band. Plus a Tier 2 dist-rebuild discipline finding caught via anti-fabrication self-flag pre-rebuild.

**Gate decision:** PROCEED to D-3 (60-min Q-V35-7(a)) — but with caveat: file the crash-recovery follow-up first, OR run D-3 with PATCH-to-held teardown + tmux-leave-alive (not kill) so the scenario doesn't recur.

---

## I. Phase D-2 scope (intended + executed)

Per orchestrator dispatch 2026-05-11:

1. Validate sustained-window stability (3× wall-clock of D-1).
2. KNOWN-promote the MODELED GET-200-held → PATCH-armed branch end-to-end under real Electron.
3. LAUNCH-1 (5 min) + teardown + 30s pause + LAUNCH-2 (10 min) = 15-min sustained-window total.

Executed (post-rebuild):
- LAUNCH-1: 5 min 24s clean (T+0 → T+324s). PASS.
- Teardown LAUNCH-1: kill electron + PATCH state=held (HTTP 200 both) + `tmux kill-session` (succeeded both). Final state: state=held + tmux=DEAD.
- 30s pause.
- LAUNCH-2: launched at `2026-05-11T10:13:18`. Pool successfully transitioned both names held → armed (Path E held-branch ✓), but `_startPoll` detected tmux dead within 5s → cascade-halt-loop fired 8 times before watcher exit at T+45s.

---

## II. Method

### Pre-flight discovery: stale dist caught by anti-fabrication self-flag

First LAUNCH-1 attempt failed with `SessionNameExists` halt-loop (tmux duplicate at `spawn-handler.ts:332-337`). Root cause: `dist/coarchitect/hso-pool.js` was last built `May 11 00:24` — ~9 hours BEFORE the fix01e GREEN at `deca210` (09:41). The running electron used PRE-fix01e pool code that unconditionally calls `spawnController.handleSpawnRequest`. Phase D-1 retry findings doc at `fc6c512` claimed Path (E) was validated; that claim is now self-corrected — D-1 retry's first-launch behavior is identical between OLD pool and Path-E pool when daemon rows are absent (both POST), so it did not distinguish the two.

Halt-and-surface fired; operator authorized rebuild + retry. Post-rebuild verification:
- `dist/coarchitect/hso-pool.js` mtime: `May 11 10:04` (after all fix01e commits)
- fix01e symbol count in compiled output: 10 (`DefaultDaemonSessionsClient`, `_prepareReservedName`, `daemonSessionsClient`, `'held'` etc.)
- File size: 18,733 bytes (vs 10,951 pre-rebuild — +71% from fix01e additions)

### LAUNCH-1 (post-rebuild)

```bash
date +%s > /tmp/dogfood-phase-d2-launch1-start.ts
pnpm --filter dispatch-workstation exec electron dist/main/main.js 2>&1 | \
  tee /tmp/dogfood-phase-d2-launch1-electron.log
# 5-min watcher via background until-loop
```

Pre-launch baseline: both reserved names `state=held` (from D-1 retry teardown); both tmux sessions ALIVE (created `09:47:43` and `09:47:44`).

### Teardown LAUNCH-1

Per dispatch step 4 (operator-explicit per ddc4a52 ticket-pending-execution):
```bash
pkill -f "electron dist/main/main.js"
curl -X PATCH ... '{"state":"held"}' ... __orchestrator_active/state    # HTTP 200
curl -X PATCH ... '{"state":"held"}' ... __orchestrator_standby/state   # HTTP 200
tmux kill-session -t __orchestrator_active
tmux kill-session -t __orchestrator_standby
```

Post-teardown: both reserved names `state=held`; both tmux KILLED.

### LAUNCH-2

Post-30s-pause + same launch invocation. Pre-LAUNCH-2 baseline: state=held both + tmux=missing both (note: this differs from LAUNCH-1's baseline because of the tmux kill in step 4).

10-min watcher armed; exited at T+45s due to halt-detection.

### Teardown LAUNCH-2

Same as LAUNCH-1: kill + PATCH held + tmux kill.

---

## III. Evidence

### LAUNCH-1 (state=held + tmux=alive)

Full log (2 lines):
```
WINDOW_STATE 1024 768
WINDOW_READY
```

| Metric | Value | Interpretation |
|---|---|---|
| Uptime | 324s | ≥300s ✓ |
| `OrchestratorPoolManager halt` | **0** | No false-positive collision |
| `ERR_/Uncaught/fatal` | 0 | Clean |
| `WINDOW_READY` | 1 | Boot success |
| `ACTION_VARIANT_FIRED` | 0 | Expected (5-min idle) |
| Daemon state post-launch | both `armed` | **held → armed PATCH fired** ✓ |
| Daemon state pre-launch | both `held` | baseline |
| tmux creation timestamps post-launch | `09:47:43`/`09:47:44` (UNCHANGED from D-1 retry) | **tmux REUSE confirmed; NOT respawned** ✓ |

**Path (E) cross-launch transition end-to-end VALIDATED [KNOWN].** Pool's GET-200-held → PATCH-armed → _registerExistingSession branch fired correctly. tmux re-attachment without re-spawn confirmed by preserved creation timestamps.

### LAUNCH-2 (state=held + tmux=KILLED — out-of-band scenario)

Full log (10 lines):
```
WINDOW_STATE 1024 768
WINDOW_READY
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] Manual __orchestrator_standby session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.
```

| Metric | Value | Interpretation |
|---|---|---|
| Uptime | 45s | Cascade-halt cut short |
| `OrchestratorPoolManager halt` | **8** | All "Manual __orchestrator_standby session exists" (WB13 Path β SessionAlreadyRegistered branch) |
| Daemon state post-launch | both `armed` | held → armed PATCH fired (Path E ✓ for primary held-branch) |
| Active halts | 0 | Active's held-branch ran cleanly |
| Standby halts | 8 | Cascade originates in crash-recovery path |
| Halt cadence | ~5s intervals | matches `POLL_INTERVAL_MS=5000ms` |

### Cascade root cause (NEW finding)

Sequence reconstructed from pool source `hso-pool.ts`:

1. `start()` → `_prepareReservedName(__orchestrator_active)`: GET state=held → PATCH armed → `_registerExistingSession` ✓
2. `start()` → `_prepareReservedName(__orchestrator_standby)`: GET state=held → PATCH armed → `_registerExistingSession` ✓
3. `_startPoll()` arms timer (5s interval).
4. **T+~5s** poll #1: `runTmuxHasSession(__orchestrator_active)` THROWS (tmux killed in LAUNCH-1 teardown) → `_onActiveCrash()` → `_promote()`:
   - active = standby ('__orchestrator_standby')
   - standby = null
   - `_spawnAndRegister(RESERVED_STANDBY)` (the line `void this._spawnAndRegister(RESERVED_STANDBY)` at `hso-pool.ts:273`)
5. `_spawnAndRegister(__orchestrator_standby)` → spawnController.handleSpawnRequest → daemon POST → **409 SessionAlreadyRegistered** (row exists at `state=armed` from step 2's PATCH). error_type = `SessionAlreadyRegistered`. Pool's WB13 Path β branch fires "Manual __orchestrator_standby session exists" halt (halt #1).
6. **T+~10s** poll #2: similar cascade. Each promote retries `_spawnAndRegister(RESERVED_STANDBY)`. Same 409 each time. Halts #2-#8.
7. Watcher detects halt → exits at T+~45s.

**Key insight**: pool's crash-recovery path (`_promote` → `_spawnAndRegister`) does NOT route through the new `_prepareReservedName` Path-(E) state machine added at fix01e. It calls `_spawnAndRegister` directly, which unconditionally POSTs and trips daemon Blocker 3 when the row exists in any non-killed state.

This is structurally similar to the original D-1 blocker (`MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION`) but in the **crash-recovery** code path rather than the **startup** code path. fix01e closed the startup path; the crash-recovery path remains.

---

## IV. Findings

### Acceptance criteria

| Criterion | Result | Notes |
|---|---|---|
| HSO uptime ≥300s LAUNCH-1 | ✅ 324s | Path E full transition exercise |
| Pool stable (2 sessions) LAUNCH-1 | ✅ both armed; tmux reused | Path E cross-launch [KNOWN] |
| GET-200-held → PATCH-armed [MODELED → KNOWN] | ✅ **KNOWN-promoted** | LAUNCH-1 evidence |
| HSO uptime LAUNCH-2 | ❌ 45s | cascade-halt out of an out-of-band tmux-killed scenario |
| Sustained-window 15-min total | ❌ ~6 min total (324s + 45s + 30s pause) | LAUNCH-2 cut short |
| Action emissions | 0 (5-min idle each launch) | Expected |
| New crash classes | 0 ERR_/Uncaught/fatal | Halts are operator-actionable surfaces, not crashes |

### Confidence labels

- `[KNOWN]` Path (E) cross-launch state transition (held → armed + tmux re-attach) — verified LAUNCH-1 evidence; load-bearing MODELED claim from fix01e + D-1 retry now [KNOWN]-promoted by direct observation.
- `[KNOWN]` Path (E) GREEN code DEPLOYED to Electron — verified by `dist/coarchitect/hso-pool.js` mtime + symbol grep after rebuild.
- `[KNOWN]` Pool's crash-recovery path bypasses Path (E) state machine — verified by 8-halt cascade with WB13 Path β `SessionAlreadyRegistered` error message; root cause traced through `_promote` → `_spawnAndRegister` (hso-pool.ts:273).
- `[KNOWN]` Phase D-1 retry findings doc over-claimed Path (E) validation — self-correction via §VI below + cross-ref in new MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE row (filed in COMMIT 3).
- `[MODELED]` Crash-recovery fix scope — likely involves routing `_promote` and `_onStandbyCrash` through `_prepareReservedName` instead of direct `_spawnAndRegister`. Estimated 1-2 WB scope; not blocking v3.5-alpha if dogfood teardown protocol switches to "leave tmux alive" (then crash-recovery scenario doesn't recur).
- `[SPECULATIVE]` D-3 (60-min) viability without crash-recovery fix — if tmux survives, D-3 should run cleanly per LAUNCH-1 pattern; if anything kills tmux mid-window, D-3 would cascade-halt. SPECULATIVE because we have no evidence of tmux dying during normal sustained uptime.

---

## V. Gate decision recommendation

### Recommendation: **PROCEED to D-3 with constraints**

The core Path (E) ship-gate validation (cross-launch transition + sustained startup) is now [KNOWN]. The new crash-recovery gap is a separate concern that:

- Does NOT block v3.5-alpha measurement (D-3 60-min run with tmux-leave-alive teardown will not trigger the cascade)
- DOES need a Tier 2 followup for ship-confidence (D-3 + future operator workflows where tmux might die unexpectedly)
- Could be addressed in a dedicated `MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX` ticket (similar pattern to fix01e — extend `_promote` + `_onStandbyCrash` to call `_prepareReservedName`)

### Constraints for D-3 execution

1. **Teardown protocol revision** (companion to fix01e): the dogfood step 4/8 teardown should NOT `tmux kill-session`. Path (E) design intent is tmux survives across teardowns. The tmux kill-session step was inherited from Phase D-1 original (where killing tmux was the only way to free state-killed daemon registrations — but that's no longer the case with state-held teardown).
2. **OR**: Fix crash-recovery path before D-3 (Tier 2 ticket — see §VII).

### What D-3 should add (assuming proceed)

1. 60-min sustained uptime per Q-V35-7(a).
2. ≥2 handoffs (token-threshold-driven active↔standby promotion).
3. ≥80% action-variant emission correctness (requires stimulus + scoring methodology).
4. Tmux-leave-alive teardown (NOT kill-session) per Path (E) intent.

---

## VI. Stale-dist anti-fabrication catch (per dispatch instruction)

### What happened

Phase D-1 retry at `fc6c512` claimed:
> Path (E) validation (end-to-end across launch + teardown) — ✓ GET 404 → POST via spawnController (first-launch path)

The "✓" was over-confident. The OLD pool code (pre-fix01e) ALSO POSTs to daemon on first-launch (just without the GET-first step). The observed `state='armed'` post-launch is consistent with BOTH OLD and Path-E behavior. The single observation does not distinguish them.

The mistake was not running `pnpm --filter dispatch-workstation build` after fix01e commits. dist/ at D-1 retry's launch time was from `May 11 00:24` — predating ALL fix01e commits at 09:41+. Therefore the integration smoke at fc6c512 actually exercised PRE-fix01e pool code on a daemon registry that fix01e's surgical-jq cleanup had primed for OLD-code success.

### Self-correction

- Phase D-1 retry's PASS framing stands for the **surgical-cleanup operation** (134→132 rows; daemon GET 404; pool spawn success on a clean baseline).
- Phase D-1 retry's PASS framing does NOT stand for **Path (E) code validation** — that validation is THIS Phase D-2 measurement (specifically LAUNCH-1 of D-2 post-rebuild).
- No prior commit is amended per dispatch instruction ("DO NOT amend prior commits"; archaeology preserved); this cross-ref is the canonical record.

### What changed in Phase D-2 cycle

- Stale-dist caught at LAUNCH-1 (first attempt) via halt-loop diagnostic + dist-mtime comparison.
- `pnpm --filter dispatch-workstation build` executed.
- LAUNCH-1 retried with fresh dist; cross-launch transition validated for real.

### Discipline rule reinforced

Any dogfood smoke that purports to validate workstation source changes MUST verify dist freshness FIRST. This is the workstation analog of CLAUDE.md §3.4 (dispatch-core post-pull rebuild discipline). Filed as a Tier 2 followup in COMMIT 3 of this cycle: **MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE**.

---

## VII. New followups recommended (queued for COMMIT 3 of this cycle)

| Candidate | Tier | Closure path |
|---|---|---|
| `MB-F-DISPATCH-WORKSTATION-DIST-REBUILD-DISCIPLINE` | 2 | Dogfood scripts auto-rebuild dist as first step, OR explicit pre-smoke dist-mtime gate. Companion to `MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE` (CLAUDE.md §3.4). |
| `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` | 2 | Extend `_promote` + `_onStandbyCrash` in `hso-pool.ts` to call `_prepareReservedName` instead of direct `_spawnAndRegister`. Same pattern as fix01e applied to the crash-recovery branch. Estimated 1-2 WB. |
| `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVE-TMUX-ALIVE` | 3 (workflow) | Dogfood step 4/8 should NOT `tmux kill-session` for reserved names. Path (E) design intent is tmux persists across teardowns. The original kill-session step is vestigial from Phase D-1 (pre-fix01e) when tmux had to be killed to keep state-killed rows from accumulating — no longer needed with state-held teardown. |

---

## VIII. Comparison table — Phase D-1 (BLOCKER + retry-with-stale-dist) vs Phase D-2 (post-rebuild)

| Metric | D-1 BLOCKER (`7c175f0`) | D-1 retry (`fc6c512`, stale dist) | D-2 LAUNCH-1 (`this`, fresh dist) | D-2 LAUNCH-2 (`this`, fresh dist) |
|---|---|---|---|---|
| Pool spawn outcome | FAIL (false-positive 409 halt-loop) | PASS (first-launch — OLD code path) | PASS (held→armed; existing tmux reuse) | PARTIAL (held→armed succeeds; crash-recovery cascade-halts) |
| Halts | 20 | 0 | 0 | 8 |
| Validates Path (E)? | N/A (Path E not yet shipped) | NO (stale dist exercised OLD code) | **YES (cross-launch + tmux reuse)** | partial (held-branch yes; crash-recovery no) |
| dist mtime | pre-fix01e (May 11 00:24) | pre-fix01e (May 11 00:24, stale) | **post-fix01e (May 11 10:04, fresh)** | post-fix01e (May 11 10:04, fresh) |
| Uptime | aborted T+30s | 318s | 324s | 45s |
| Daemon end-state | both killed (the trap) | both held (Path E teardown) | both held (Path E teardown) | both held (Path E teardown) |
| tmux end-state | absent | alive (Path E intent) | killed by dispatch step 4 | killed by dispatch step 8 |

---

**End Phase D-2 findings.**
