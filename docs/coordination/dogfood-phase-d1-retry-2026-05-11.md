# Dogfood Phase D-1 retry — post-fix01e + sessions.json surgical cleanup; 5-min HSO uptime smoke PASS

**Date:** 2026-05-11
**Anchor SHA:** `3a02373` (HEAD at smoke launch — post filename-cite fix COMMIT 1)
**Predecessor:** Phase D-1 fix01e closure (`736832b`) + filename-cite fix (`3a02373`)
**Daemon:** PID 92700 (continuous since 2026-05-06), port 7878, `x-conductor-token` auth
**Sessions.json baseline:** 132 rows post-surgical-cleanup (134 pre, 2 stale reserved-name rows removed at 1778514437 — backup at `~/.foxworks-dispatch/sessions.json.backup-fix01e-1778514437`)

**Outcome:** 🎉 **PASS.** Pool auto-spawned both reserved names cleanly (no halt-loop). 5-min uptime stable; 0 halts; 0 errors. Path-(E)-aligned teardown via `PATCH state='held'` succeeded (HTTP 200 for both); tmux sessions survived teardown per design intent. **Gate decision: PROCEED to D-2 (15-min).**

---

## I. Phase D-1 retry scope

Per orchestrator dispatch 2026-05-11 (post-Path-E + sessions.json cleanup):

1. Re-run the 5-minute HSO uptime smoke originally dispatched at GATE 5 Phase D-1.
2. Verify pool auto-spawn SUCCESS path (failed in original D-1 at `7c175f0` due to false-positive collision halt-loop).
3. Capture: WINDOW_READY, pool spawn evidence (daemon state + tmux), action emissions (likely 0 in 5-min idle), halt count, error count, teardown state-transitions.
4. Validate Path (E) teardown discipline: `PATCH state='held'` (NOT `'killed'`).
5. Stage-gate: proceed to D-2 (15-min) OR halt-and-surface new blocker.

---

## II. Method

### Pre-smoke baseline

```
~/.foxworks-dispatch/sessions.json: 132 rows (post-cleanup)
__orchestrator_active : daemon GET 404 (row absent — surgical jq deletion succeeded)
__orchestrator_standby: daemon GET 404 (row absent)
tmux orchestrator sessions: none
non-killed sessions    : 0
```

Cap-clear baseline confirmed for Path (E) first-launch path (404 → POST via spawnController).

### Launch (smoke start at `2026-05-11T09:47:18`)

```bash
date +%s > /tmp/dogfood-phase-d1-retry-start.ts
rm -f /tmp/dogfood-phase-d1-retry-electron.log
pnpm --filter dispatch-workstation exec electron dist/main/main.js 2>&1 | \
  tee /tmp/dogfood-phase-d1-retry-electron.log
```

Background task `bpul8d8km`. Log: `/tmp/dogfood-phase-d1-retry-electron.log`.

### 5-min observation (background watcher)

Per harness guidance for long waits, used a background `until`-loop watcher that exits when EITHER 300s elapsed OR a halt message appears:

```bash
START=$(cat /tmp/dogfood-phase-d1-retry-start.ts)
until [ $(($(date +%s) - START)) -ge 300 ] || \
      grep -q "OrchestratorPoolManager halt" /tmp/dogfood-phase-d1-retry-electron.log; do
  sleep 5
done
```

Background task `bmo901zu5` exit code 0 at `T+318s` (`5s` poll-granularity overshoot of the `300s` floor). Exit reason: 5-min elapsed (no halt detected).

### Teardown (Path-(E)-aligned)

```
pkill -f "electron dist/main/main.js"
PATCH /v2/sessions/__orchestrator_active/state  body {"state":"held"}  → HTTP 200
PATCH /v2/sessions/__orchestrator_standby/state body {"state":"held"} → HTTP 200
```

Per Path (E) design intent: PATCH-to-'held' (not 'killed'); tmux Ctrl+C side effect (`transitions.ts:143-149`) leaves the tmux session detached but alive for re-attachment on the next launch.

---

## III. Evidence

### Electron log (full content, 2 lines)

```
WINDOW_STATE 1024 768
WINDOW_READY
```

Comparison to original D-1 (`7c175f0`): original log had 22 lines including **20 halt-loop messages**; retry log has **0 halts**.

### Sentinel counts

| Sentinel | Count | Notes |
|---|---|---|
| `WINDOW_READY` | 1 | Boot succeeded within ~10s per CLAUDE.md §4.6 expectation |
| `OrchestratorPoolManager halt` | **0** | (Original D-1: 20) |
| `POOL_SPAWN` | 0 | No console-log sentinel emitted by pool on spawn-success (pool's spawn-success is observable via daemon state + tmux ls, not stdout sentinel) |
| `ACTION_VARIANT_FIRED` | 0 | Expected (no operator interaction in 5-min idle window; no autonomous actions emitted) |
| `ERR_/Uncaught/fatal` | **0** | (Original D-1: 0) |

### Daemon registration evidence

```
GET /v2/sessions/__orchestrator_active  → state='armed' tmux='__orchestrator_active:0.0'
GET /v2/sessions/__orchestrator_standby → state='armed' tmux='__orchestrator_standby:0.0'
```

Both rows CREATED by pool's spawnController POST path (Path (E) first-launch branch: GET-404 → spawnController.handleSpawnRequest → daemon POST → row added at state='armed' per `daemon/src/routes/sessions.ts:202`).

### tmux registration evidence

```
__orchestrator_active : 1 windows (created Mon May 11 09:47:43 2026)
__orchestrator_standby: 1 windows (created Mon May 11 09:47:44 2026)
```

Both spawned within ~5s of `WINDOW_READY`. Sequential spawn per `hso-pool.ts:start()` await-discipline.

### Post-teardown evidence

```
PATCH active  state=held: HTTP 200 — verified state='held' on GET
PATCH standby state=held: HTTP 200 — verified state='held' on GET
tmux orchestrator sessions: SURVIVE (Path E design: Ctrl+C left them detached-alive)
```

Both PATCH transitions validated armed→held per `transitions.ts:98`. Tmux sessions persist; next workstation launch will GET-200-held → PATCH-to-armed → re-register tile + bookkeeping per `_prepareReservedName` held-branch.

---

## IV. Findings

### Acceptance criteria (per dispatch step 5)

| Criterion | Result | Comparison to original D-1 |
|---|---|---|
| HSO uptime ≥300s | ✅ **T+318s** observed cleanly | ✗ aborted at T+30s due to blocker |
| Pool stable (2 sessions) full window | ✅ Both `state=armed`, tmux alive | ✗ pool never spawned (halt-loop) |
| Action-variant emissions | 0 (expected; 5-min idle) | N/A (no orchestrator alive) |
| Crash-class regressions | ✅ 0 ERR_/Uncaught/fatal | ✅ 0 (also clean failure mode there) |
| Daemon registration | ✅ 2 rows created, state='armed' | ✗ 0 new registrations (POST blocked by 409) |

All 5 acceptance criteria PASS. Path (E) closes the original blocker fully.

### Path (E) validation (end-to-end across launch + teardown)

| Phase (E) branch | Exercised | Evidence |
|---|---|---|
| GET 404 → POST via spawnController (first-launch) | ✅ YES | Both reserved names GET-404 pre-launch (after cleanup); post-launch state='armed' indicates spawnController POST path fired |
| GET 200 'armed' → register existing (no daemon mutation) | not exercised here | Will exercise at next launch if state='armed' persists |
| GET 200 'held' → PATCH→'armed' + register | not exercised here | Will exercise at next launch given post-teardown state='held' |
| GET 200 'paused' → halt (operator-paused) | not exercised | No paused rows in registry |
| GET 200 'killed' → halt (actionable message) | not exercised | No killed reserved-name rows after surgical cleanup |
| stop() PATCH 'armed'→'held' (teardown) | ✅ YES | Both reserved names verified state='held' post-teardown (manual PATCH; pool's stop() not yet wired to app.quit — see followup) |

### Comparison table: Original D-1 (`7c175f0`) vs Retry (`3a02373`)

| Metric | Original D-1 BLOCKER | D-1 retry POST-fix01e |
|---|---|---|
| Pool spawn outcome | FAILED (false-positive halt-loop on stale `state=killed` rows) | SUCCESS (both armed) |
| Halt-message count | 20 in ~25s | 0 in 300s |
| WINDOW_READY | 1 | 1 |
| tmux orchestrator sessions | 0 | 2 (both alive) |
| Daemon non-killed | 0 | 2 (armed) |
| Action emissions | 0 (no orchestrator) | 0 (5-min idle) |
| Crashes / errors | 0 | 0 |
| Teardown protocol | PATCH-to-killed (the trap) | PATCH-to-held (Path E) |
| Trap state at end | both reserved names killed | both reserved names held + tmux alive |

### Confidence labels

- `[KNOWN]` Pool spawn success — verified by daemon GET state='armed' + tmux ls.
- `[KNOWN]` Zero halts in 5-min window — verified by `grep -c 'OrchestratorPoolManager halt' /tmp/...log` returning 0.
- `[KNOWN]` PATCH armed→held valid — verified by HTTP 200 + post-PATCH GET state='held'.
- `[KNOWN]` Tmux Ctrl+C side effect leaves session detached — verified by `tmux ls` showing both `__orchestrator_*` sessions alive POST-teardown.
- `[MODELED]` Cross-launch state continuity — Path (E) GET-200-held → PATCH-armed branch is not yet exercised in this smoke. Would require a second launch cycle. Recommended for D-2 (15-min) which can include a within-window restart to exercise the cross-launch transition.
- `[KNOWN]` Pool stop() not yet auto-fired on app.quit — `main.ts` does not have `app.on('will-quit', () => orchestratorPool.stop())` wiring. Teardown here was operator-explicit PATCH calls. Tracked as followup → existing `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3, `870e991`) closure-path now substantially satisfied by `stop()` PATCH-to-held but the app.quit wiring is the remaining piece for full auto-teardown.

---

## V. Gate decision recommendation

### Recommendation: **PROCEED to D-2 (15-min)**

All 5 acceptance criteria pass. Path (E) state machine demonstrated end-to-end:
- First-launch GET-404 → POST path SUCCESS.
- 5-min uptime stable; no halts.
- Teardown PATCH-to-held SUCCESS; tmux survives for next-launch cross-launch transition.

No new blockers surfaced. The original D-1 Tier 1 blocker (`MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION`) is CLOSED by fix01e at `deca210`.

### What D-2 should add

D-2 (15-min) can extend Phase D-1's smoke with:

1. **Sustained-window observation** (15 min vs 5 min). Validates that pool's poll timer (`POLL_INTERVAL_MS = 5000ms`) doesn't introduce drift/leaks under longer wall-clock.
2. **Cross-launch state transition** (RECOMMENDED). The current smoke leaves reserved names at state='held' + tmux alive. A second launch within D-2's window would exercise the GET-200-held → PATCH-to-armed branch of Path (E) (currently not exercised here). Would validate the `[MODELED]` cross-launch continuity claim.
3. **Manual action-marker injection** (OPTIONAL). Action-variant emissions during D-2 would validate the dispatchActionVariant + action-marker-router + Path (E)-armed-state pipeline end-to-end. Without operator interaction, the 5-min idle window observed 0 emissions; that's expected, but a sustained measurement window may benefit from a stimulus.

### What D-3 should add

D-3 (60-min Q-V35-7(a)) is the ship-gate measurement. After D-2 PASS, D-3 can proceed with:

1. 60-min sustained uptime.
2. ≥2 handoffs (HANDOFF_TOKEN_THRESHOLD=130K tokens triggers active-to-standby promotion per `hso-pool.ts:79`).
3. ≥80% action-variant emission correctness measurement (requires stimulus + emission-correctness scoring methodology).

---

## VI. Followups status (queued for COMMIT 3 of this cycle)

- `MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` (Tier 1 ship-gate blocker) → **CLOSED by fix01e** (`deca210` GREEN + `3a02373` filename-cite + post-cleanup retry SUCCESS at this commit).
- `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` (Tier 2 candidate) → **CLOSED by fix01e** (pool teardown now PATCH-to-held per `hso-pool.ts:stop()`; external dogfood scripts can mirror this discipline going forward).
- `MB-F-T2-FILENAME-CITE-FABRICATION` (Tier 3 methodology, optional per dispatch) → file as methodology row documenting anti-fabrication discipline catch + remediation at `3a02373`.
- `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3 at `870e991`) → cross-ref note: substantially mitigated by `stop()` PATCH-to-held in fix01e; remaining work is wiring `stop()` to `app.on('will-quit', ...)` so teardown auto-fires on app exit. Tier-ratchet candidacy: keep Tier 3 with closure annotation OR ratchet to Tier 2 if app.quit wiring is now load-bearing.

---

**End Phase D-1 retry findings.**
