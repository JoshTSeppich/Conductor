# Dogfood Phase D-1 — 5-minute HSO uptime smoke — **BLOCKER SURFACED, SMOKE NOT EXECUTED**

**Date:** 2026-05-11
**Anchor SHA:** `4fb8d41` (post `MB-T-DISPATCH-WEB-AUTH-INJECTION` ticket authoring; HEAD at smoke-launch time)
**Predecessor:** Phase C (`673d5d6`) — pool auto-spawn SUCCESS path verified + Phase C teardown (`870e991`)
**Daemon:** port 7878, `x-conductor-token` auth, token file present (44 bytes)

**Outcome:** **BLOCKER — pool auto-spawn FALSE-POSITIVE-HALT under stale-killed daemon registrations from Phase B+C teardown.** D-1 5-min observation window NOT completed (electron killed at T+~30s after blocker characterization). D-2 / D-3 RECOMMENDED HALT until closure path is operator-arbitrated.

---

## I. Phase D-1 scope (intended)

Per orchestrator dispatch 2026-05-11:

1. Cap-clear precondition check (≤2 non-killed sessions in daemon).
2. Launch electron workstation; observe for 300s sustained uptime.
3. Capture any natural action-variant marker emissions.
4. Verify pool stability (2 sessions: `__orchestrator_active` + `__orchestrator_standby`) for full window.
5. Stage-gate decision: proceed to D-2 (15 min)? OR halt-and-redesign?

Goal: gate progression to D-2 + D-3 measurement of Q-V35-7(a) thresholds (60-min uptime + ≥2 handoffs + ≥80% action-variant emission correctness).

---

## II. Method (smoke aborted at T+~30s due to BLOCKER)

### Pre-launch precondition (PASSED)

```
TOKEN=$(cat ~/.foxworks-dispatch/token)
curl -s -H "x-conductor-token: $TOKEN" http://localhost:7878/v2/sessions | \
  jq '[.sessions[] | select(.state != "killed")] | length'
```

Result: **0** non-killed sessions. Cap-clear precondition PASSED.

`tmux ls | grep orchestrator` showed only my parallel-CC sub-session named `orchestrator` (created 2026-05-10 21:07:06) — distinct from the reserved names `__orchestrator_active` / `__orchestrator_standby`. No actual collision with the pool's reserved names existed.

### Launch

```bash
rm -f /tmp/dogfood-phase-d1-electron.log
pnpm --filter dispatch-workstation exec electron dist/main/main.js 2>&1 | \
  tee /tmp/dogfood-phase-d1-electron.log
```

Background task ID `bwkcn9eq3`. Log written to `/tmp/dogfood-phase-d1-electron.log`.

### Observation cadence (interrupted at first poll)

Poll #1 at T+25s surfaced the BLOCKER. Subsequent polls SKIPPED per dispatch step (4) blocker-halt branch — the 5-min observation window would have observed nothing but a halt-message retry loop with zero pool spawns.

---

## III. Evidence

### Log final state (22 lines total at electron-kill time)

```
halt-message-count: 20
WINDOW_READY: 1
POOL_SPAWN: 0
ACTION_VARIANT_FIRED: 0
ERR_/Uncaught/fatal: 0
```

### Unique halt messages observed

```
[MB-T-HSO-WIRE OrchestratorPoolManager halt]
  Manual __orchestrator_active session exists; pool cannot auto-spawn.
  Kill the manual session OR disable pool auto-spawn.

[MB-T-HSO-WIRE OrchestratorPoolManager halt]
  Manual __orchestrator_standby session exists; pool cannot auto-spawn.
  Kill the manual session OR disable pool auto-spawn.
```

Both messages fired repeatedly (~10 cycles each in 25s before kill), consistent with the pool's retry-poll loop (`hso-pool.ts:205-209` `_startPoll` `POLL_INTERVAL_MS`).

### Reality-check: no actual collision exists

| Check | Result | Interpretation |
|---|---|---|
| `tmux has-session -t __orchestrator_active` | exit 1, "can't find session" | **NO tmux collision** |
| `tmux has-session -t __orchestrator_standby` | exit 1, "can't find session" | **NO tmux collision** |
| `tmux ls` (full) | 4 sessions: `c5-ticket-wb1`, `commit-plan-doc`, `orchestrator`, `verify-chat-mount` | None match the reserved-name prefix |
| Daemon `/v2/sessions` non-killed count | 0 | NO active daemon collision |
| Daemon `/v2/sessions` raw rows | `__orchestrator_active: killed`, `__orchestrator_standby: killed` (+ 132 other killed test-session rows) | **stale killed-state registrations persist** |

The "Manual ${sessionName} session exists" halt message at `hso-pool.ts:179` is therefore a **FALSE POSITIVE** — no manual session exists anywhere; the trigger is the stale `state='killed'` row in the daemon's session registry.

### Root-cause chain

1. Pool's `_spawnAndRegister(__orchestrator_active)` calls `spawnController.handleSpawnRequest({sessionName: '__orchestrator_active', ...})` at `hso-pool.ts:160-164`.
2. Spawn-handler hits daemon's session-registration endpoint.
3. Daemon sees existing `__orchestrator_active` row (state=killed from Phase B+C teardown via `PATCH /v2/sessions/__orchestrator_active/state` body `{"state":"killed"}`) → returns 409 SessionAlreadyRegistered.
4. spawn-handler maps 409 → `{error_type: 'SessionAlreadyRegistered'}` per spawn-handler.ts:33-38 (cited at hso-pool.ts:170).
5. Pool's collision-detection branch at `hso-pool.ts:177-180` (WB13 Path β operator-actionable message authored at commit `642c246`) fires the halt — treating the stale registration as a "manual collision" with no state-awareness.
6. Pool retries every `POLL_INTERVAL_MS` (via `_pollOnce` at hso-pool.ts:206-208); same error every cycle.
7. The same path fires for `__orchestrator_standby` (which is also `state=killed` in daemon from Phase B+C teardown).

### Post-kill state (clean)

```
pkill -f "electron dist/main/main.js"  # exit 144 = SIGTERM-confirmed
TOKEN=$(cat ~/.foxworks-dispatch/token)
curl ... /v2/sessions | jq '[.sessions[] | select(.state != "killed")] | length'
# → 0
```

No new non-killed registrations created during the smoke (pool never succeeded). Daemon state matches pre-smoke baseline.

---

## IV. Findings

### Acceptance criteria (per dispatch step 5)

| Criterion | Result | Notes |
|---|---|---|
| HSO uptime ≥300s | **✗ NOT MEASURED** | Smoke aborted at T+~30s after blocker characterization |
| Pool stable (2 sessions) for full window | **✗ FAILED** | Pool spawned 0 sessions; collision-detect halt-loop |
| Action-variant emissions observed | **N/A** (0) | No orchestrator was alive to emit anything |
| New crash classes (post-WB14 regression) | **✗ NONE** | No process crash. Clean halt-message loop. |
| Daemon registration (2 stable) | **✗ FAILED** | 0 new registrations; 2 stale `state=killed` rows persist |

### Primary finding (BLOCKER)

**`MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` (Tier 1 ship-gate blocker — recommended new followup)**

The WB13 collision-detection error-mapping (Path β at commit `642c246`, message at `hso-pool.ts:179`) does NOT differentiate between:
- (a) a **genuine** manual `tmux new-session -s __orchestrator_active` predating pool start (the WB12 probe-C-06 scenario the path was designed for)
- (b) a **stale `state='killed'`** daemon registration left over from a previous workstation lifecycle's teardown

Both produce daemon-side 409 `SessionAlreadyRegistered`. The pool's user-visible halt-message + retry-loop behavior is identical. Yet (b) is operator-not-actionable through the message's prescribed remedy ("Kill the manual session OR disable pool auto-spawn") — there is no manual session to kill; the operator must instead delete the stale daemon registration (or restart the daemon).

This interacts with `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3, filed at `870e991`) which already documents that pool shutdown does not clean up daemon registrations. The Phase B+C teardown in the dispatch itself uses `PATCH state=killed` (preserves the row) rather than `DELETE` — so every dogfood phase teardown leaves the trap armed for the next phase.

### Secondary finding (documentation gap)

The dispatch's step (6) teardown protocol:
```
curl -X PATCH -d '{"state":"killed"}' .../v2/sessions/__orchestrator_active/state
```
is the SAME mechanism that armed this blocker. Dogfood Phase D-1's step-6 teardown — if executed verbatim — would also fail to free the registration for D-2 retry. The teardown protocol needs revision to use `DELETE` (if daemon supports) or a daemon restart between phases.

### Confidence labels

- `[KNOWN]` False-positive halt mechanism — verified by direct read of `hso-pool.ts:177-180` + daemon `/v2/sessions` raw response + `tmux has-session` exit 1 for both reserved names.
- `[KNOWN]` `SessionAlreadyRegistered` 409 originates at daemon registration endpoint — cited at `hso-pool.ts:168-170` comment ("Daemon 409 (operator manual `tmux new-session -s <reserved>` predates pool start) surfaces as error_type 'SessionAlreadyRegistered' per spawn-handler.ts:33-38").
- `[MODELED]` Phase B+C teardown via PATCH-state-killed is the proximate trigger. Verified by daemon-state inspection (2 reserved-name rows with `state=killed` + zero pool spawn success).
- `[SPECULATIVE]` Daemon's registration endpoint may not support DELETE; closure path (c) below requires verification.

---

## V. Gate decision recommendation

### Recommendation: **HALT D-2 + D-3; redesign required**

D-2 (15-min smoke) and D-3 (60-min Q-V35-7(a) measurement) cannot proceed until the pool can auto-spawn cleanly on a workstation that has previously run a dogfood phase. Re-running D-1 / D-2 / D-3 under the current code + teardown protocol will reproduce the same blocker every time.

### Closure paths (operator-arbitrated)

Four candidate paths surfaced. (a) + (d) recommended as the minimum forward-compatible fix; (b) + (c) are immediate workarounds for D-2 retry.

**(a) Pool/spawn-handler code fix [recommended — load-bearing for future v3.5+ launches]:**

Modify `hso-pool.ts:177` (or upstream at spawn-handler / daemon registration endpoint) to differentiate `SessionAlreadyRegistered (state='killed')` from `SessionAlreadyRegistered (state='armed'/'crashed'/etc.)`. The killed case should be treated as "registration exists but is dead — re-use or clean automatically" rather than halt-and-surface. New error_type variant suggested: `SessionAlreadyRegisteredButKilled` → pool falls through to a `DELETE` + `_spawnAndRegister` retry path; non-killed cases keep the current halt-and-surface.

**(b) Manual one-shot cleanup before D-2 retry [immediate workaround]:**

Operator deletes the 2 stale registrations via daemon DELETE endpoint (if exists), OR restarts daemon, OR uses some equivalent recovery step. Allows D-2 retry today without code changes. Does NOT prevent re-occurrence on subsequent dogfood phases.

**(c) Teardown protocol revision [workflow fix]:**

Dispatch teardown step (6) updates from `PATCH state=killed` to `DELETE /v2/sessions/<name>` (verify daemon support). Aligns dogfood-phase-end-state with "fresh-launch clean baseline" expectation. Should be paired with (a) for full closure — otherwise a crash mid-phase leaves the same orphan.

**(d) Pool startup hook: daemon-registration reconciliation [recommended companion to (a)]:**

At pool `start()`, query daemon for any pre-existing rows of reserved names; if found with `state='killed'`, DELETE them before `_spawnAndRegister`. This is the proactive form of (a) — closes the `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` Tier 3 followup directly.

### What can proceed in parallel

- Other v3.5 cleanup work (followup closures, documentation drift fixes per `MB-F-PLAN-DOC-MBT35-REVISED-SHA-DRIFT-2026-05-11` etc.).
- `MB-T-DISPATCH-WEB-AUTH-INJECTION` WB1 spike can proceed independently — auth-injection path is orthogonal to pool spawn.
- D-2 retry deferred until closure path selected + implemented.

### Followups recommended for filing (operator approval-needed)

| Candidate | Tier | Closure-path target |
|---|---|---|
| `MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` | 1 (ship-gate blocker) | path (a) — pool code fix differentiating killed-vs-live registrations |
| `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` | 2 | path (c) — teardown DELETE instead of PATCH-killed |

Cross-references:
- `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3, `870e991`) — closure-path now ratchets to load-bearing per this finding; recommend Tier 3 → Tier 2 upgrade or absorption into the new Tier 1 above.

---

**End Phase D-1 findings.**
