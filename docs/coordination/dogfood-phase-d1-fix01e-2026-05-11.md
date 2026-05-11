# Dogfood Phase D-1 fix01e — Path (E) shipped; stale-row remediation pending

**Date:** 2026-05-11
**Anchor SHA:** `deca210` (GREEN fix01e; HEAD post-RED `09b9697`)
**Predecessor:** Phase D-1 BLOCKER findings (`7c175f0`) — pool false-positive collision on stale killed registrations
**Operator arbitration:** Path (E) auto-acked 2026-05-11 per autonomous-ack mode

**Outcome:** Path (E) code closure SHIPPED. fix01e probe (`09b9697`) flips RED → GREEN: 9 failed | 1 passed → 10 passed. Adjacent regression closed (`hso-pool.spec.ts` makeManager + null daemon mock). Workstation typecheck clean. **Phase D-1 retry-smoke NOT executed at this commit** — the existing `__orchestrator_active:killed` + `__orchestrator_standby:killed` stale registry rows still trap pool spawn until operator-arbitrated registry remediation lands. Retry-smoke gates on HALT-FIX01E-STALE-ROW-CLEANUP-PRE-ACTION operator ack.

---

## I. Phase D-1 fix01e scope (delivered)

3-commit cycle authorized by operator 2026-05-11 dispatch:

1. **COMMIT 1 (RED)**: `red(MB-T-HSO-WIRE-fix01e): path (E) — pool state-machine revision probe` at `09b9697`. 10 assertions; 9 fail RED, 1 vacuous-pass (PATCH-from-killed = no calls).
2. **COMMIT 2 (GREEN)**: `green(MB-T-HSO-WIRE-fix01e): path (E) — pool teardown PATCH=held + startup GET-then-PATCH state machine` at `deca210`. 3 files modified (hso-pool.ts core; main.ts wiring; hso-pool.spec.ts adjacent regression fix). 261 insertions, 3 deletions.
3. **COMMIT 3 (docs)**: this findings doc.

---

## II. Path (E) implementation details

### Design rationale

Aligns pool behavior with daemon design intent. Three frozen daemon facts make Path (E) the only viable closure:

1. `dispatch-core/src/v2/schema.ts:32` — `StateEnum = z.enum(['armed', 'paused', 'held', 'killed'])`. Only 4 states; no 'archived' option.
2. `daemon/src/state/transitions.ts:97-102` — `validTransitions`:
   ```
   armed   → paused, held, killed
   paused  → armed, killed
   held    → armed, killed
   killed  → []  (TERMINAL — no outbound transitions)
   ```
3. `daemon/src/routes/sessions.ts:155` Blocker 3 — "state:'killed' existing → 409 with operator-arbitrated Blocker 3". POST refuses to overwrite killed rows by design.

Conclusion: reserved orchestrator names (`__orchestrator_active`, `__orchestrator_standby`) are de-facto **permanent registrations**. Pool teardown that PATCHed them to 'killed' was operating against design intent. fix01e revises pool to PATCH-to-'held' instead — 'held' is a graceful pause state with valid armed→held + held→armed transitions, and the held-side-effect (Ctrl+C per `transitions.ts:143-149`) leaves tmux detached but alive for re-attachment on the next workstation launch.

### Code surface (3 files)

#### 1. `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` (+241 lines)

NEW exports:
- `DaemonSessionState` type alias (`'armed' | 'paused' | 'held' | 'killed'`)
- `DaemonSessionInfo` interface (`{state: DaemonSessionState}`)
- `IDaemonSessionsClient` interface: `getSession(name)` + `patchSessionState(name, targetState)`
- `DefaultDaemonSessionsClient` class — production impl wrapping `globalThis.fetch` + `~/.foxworks-dispatch/token` reading + `FOXWORKS_DAEMON_URL` env var (default `http://localhost:7878`). Auth header `'x-conductor-token'` per `MB-F-DAEMON-AUTH-HEADER-CONTRACT-DOC` (NOT `Authorization: Bearer`).

Modified `OrchestratorPoolManager`:
- `OrchestratorPoolManagerDeps.daemonSessionsClient: IDaemonSessionsClient` — new REQUIRED dep.
- `start()`: replaces unconditional `_spawnAndRegister(RESERVED_ACTIVE)` + `_spawnAndRegister(RESERVED_STANDBY)` with `_prepareReservedName` calls. Stdout + stream-close observer registration ORDER preserved (registered before reserved-name preparation).
- `stop()`: now `async`. After observer disposal + poll-timer clear, PATCHes both reserved names to 'held' via `daemonSessionsClient.patchSessionState`. Best-effort — `try {...} catch {}` per name; teardown does not block app exit on daemon-connectivity issues.

NEW private methods:
- `_prepareReservedName(sessionName)`: 5-branch state machine:
  | GET result | Action |
  |---|---|
  | 404 (null) | `_spawnAndRegister(sessionName)` (first-launch path; POST + tmux spawn) |
  | 200 state='armed' | `_registerExistingSession(sessionName)` (no daemon mutation) |
  | 200 state='held' | `patchSessionState(name, 'armed')` + `_registerExistingSession(name)` |
  | 200 state='paused' | `halt` with operator-pause-intent message |
  | 200 state='killed' | `halt` with operator-actionable remediation message (sessions.json edit OR daemon restart) |
- `_registerExistingSession(sessionName)`: bookkeeping for existing rows (mirrors success branch of original `_spawnAndRegister` lines 188-195).

#### 2. `packages/dispatch-workstation/src/main/main.ts` (+9 lines)

- Added `DefaultDaemonSessionsClient` to the existing `OrchestratorPoolManager` import block.
- Added `daemonSessionsClient: new DefaultDaemonSessionsClient()` field to pool construction call at line ~691, with inline comment citing `MB-F-DAEMON-AUTH-HEADER-CONTRACT-DOC` for auth-header discipline.

#### 3. `packages/dispatch-workstation/test/unit/coarchitect/hso-pool.spec.ts` (+11 lines)

Adjacent regression fix. Pre-existing MB-T37 WB1 probes (probe-01..09 in `hso-pool.spec.ts`) pre-date the `daemonSessionsClient` dep. After fix01e GREEN their `makeManager` factory was missing the required field, causing the new `_prepareReservedName` GET to throw → halt → `spawnController` never called → probe-01 + probe-02 assertions about `spawnController.handleSpawnRequest` calls failed.

Fix: add a default `daemonSessionsClient: { getSession: vi.fn().mockResolvedValue(null), patchSessionState: vi.fn().mockResolvedValue(undefined) }` to `makeManager`. The `null` (404) return preserves pre-fix01e behavior — start() always enters the first-launch branch → spawnController IS called → original assertions hold.

### What this commit does NOT do

- **NO daemon-side code changes.** No new routes, no schema modifications, no contract amendments.
- **NO stale-row remediation.** The existing `__orchestrator_active:killed` + `__orchestrator_standby:killed` rows in the daemon registry persist post-commit. They were created by Phase B+C teardown PATCH-to-killed (the now-corrected behavior). Until removed, pool startup will halt with the new actionable message at the `'killed'` branch of `_prepareReservedName`.
- **NO Phase D-1 retry-smoke.** The smoke would observe the same blocker (pool halt-on-killed) until stale rows are cleared.
- **NO MB-F-DISPATCH-WEB-AUTH-INJECTION work.** Path-disjoint per parallel-track territory boundaries.

---

## III. Verification evidence

| Check | Result | Source |
|---|---|---|
| probe-mbthsowire-fix01e | **10/10 GREEN** (was 9 failed / 1 passed at RED) | `vitest run ... fix01e ... .spec.ts` exit 0, 270ms |
| Adjacent coarchitect regression | **116/116 passed across 14 files** | `vitest run test/unit/coarchitect/` exit 0, 946ms |
| Workstation typecheck | **clean** | `pnpm --filter dispatch-workstation typecheck` (`tsc --noEmit`) exit 0 |
| Files modified | 3 (hso-pool.ts +241, main.ts +9, hso-pool.spec.ts +11) | `git diff --cached --stat` |
| Daemon routes touched | **0** | hso-pool.ts uses existing GET `/v2/sessions/:name` + PATCH `/v2/sessions/:name/state` per `daemon/src/routes/sessions.ts:122,257` |
| Frozen surfaces touched | **0** | `REGISTRY.md §2`, `CONDUCTOR_API_CONTRACT.md`, `schema.ts §1-§13`, `WORKSTATION_CONTRACT.md §6` all untouched |

### Confidence labels

- `[KNOWN]` Path (E) GREEN code shipped — verified by `deca210` commit + 10/10 probe pass.
- `[KNOWN]` Adjacent non-regression preserved — verified by 116/116 in full coarchitect dir.
- `[KNOWN]` Stale rows persist — verified by `curl GET /v2/sessions/__orchestrator_active` returning `state: 'killed'` (pre-existing).
- `[MODELED]` Tmux session survives across PATCH-to-held + workstation lifecycle. Relies on PATCH armed→held side-effect `sendCtrlC` (transitions.ts:143-149) leaving tmux detached. Verifiable empirically at retry-smoke once stale rows cleared.
- `[SPECULATIVE]` `paused` state branch (currently halts) may need different behavior if operator workflow ever uses PATCH-to-'paused' intentionally. Out-of-scope for fix01e; flag for v3.5.1+ if surfaced.

---

## IV. Why Phase D-1 retry-smoke is NOT in this commit

The existing daemon registry has two rows that fix01e cannot clear without operator-data-destructive action:

```
__orchestrator_active: state='killed'
__orchestrator_standby: state='killed'
```

On any workstation launch with these rows present:
1. Pool calls `daemonSessionsClient.getSession('__orchestrator_active')` → returns `{state: 'killed'}`.
2. `_prepareReservedName` enters the 'killed' branch.
3. `halt()` fires with the actionable message: "...is in terminal 'killed' state — the daemon registry row is permanently retired per contract §6.1. To resume pool auto-spawn, remove the row from `~/.foxworks-dispatch/sessions.json` or restart the daemon."
4. Same for `__orchestrator_standby`.

This is BETTER than the pre-fix01e behavior (false-positive halt-loop with misleading "Manual session exists; kill the manual session" message) but the pool still does not auto-spawn. The actionable message correctly points the operator to the remediation, but the remediation itself (registry edit) is what HALT-FIX01E-STALE-ROW-CLEANUP-PRE-ACTION surfaces.

---

## V. Next steps + HALT-FIX01E-STALE-ROW-CLEANUP-PRE-ACTION

Per dispatch 2026-05-11 closing instructions, after this commit pushes:

1. **Surface HALT-FIX01E-STALE-ROW-CLEANUP-PRE-ACTION** to orchestrator with:
   - 2 specific stale rows + their current state in `~/.foxworks-dispatch/sessions.json`
   - Proposed cleanup mechanism (jq edit OR daemon restart OR direct file edit)
   - Confirmation that Path (E) code is now ready to receive the cleanup
   - Reminder that ONLY orchestrator → operator ack authorizes the destructive registry edit (operator-data-destructive per dispatch)

2. **After operator ack of cleanup mechanism:**
   - Execute the cleanup (one-shot)
   - Verify both reserved-name rows absent OR in 'held'/'armed' state via `curl GET`
   - Then Phase D-1 retry-smoke becomes executable

3. **Phase D-1 retry-smoke** (separate cycle, after cleanup):
   - Repeat 5-minute observation from dispatch 2026-05-11 Phase D-1
   - Expect pool to auto-spawn cleanly under freshly-stale-killed-baseline
   - Expect `BOOTSTRAP_TOKEN_WRITTEN` + `WINDOW_READY` + POOL_SPAWN evidence in log
   - Author `docs/coordination/dogfood-phase-d1-retry-2026-05-11.md` with success/failure evidence
   - Gate D-2 / D-3 (15-min / 60-min Q-V35-7(a) measurement) on retry success

---

## VI. Followup-row updates queued for next docs commit

Per dispatch 2026-05-11 COMMIT 4 (followup updates):
- `MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` (Tier 1 ship-gate blocker) → **CLOSED by fix01e** anchored at `deca210`.
- `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` (Tier 2) → file NEW; closure-path (c) workflow-only fix (not shipped here since teardown is now pool-side via `stop()`); flag if external dogfood scripts still PATCH-to-killed.
- `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3 at `870e991`) → inline-edit note: closure-path now satisfied by fix01e `stop()` PATCH-to-'held'. Tier-ratchet candidacy: absorb into the closed Tier 1 row OR keep Tier 3 with closure annotation citing `deca210`.

These row updates are queued for the next docs commit per dispatch 4-commit cycle structure — but the dispatch only authorized 3 commits in T2's scope (RED + GREEN + this docs). Followup-row updates surface as a separate orchestrator-relayed dispatch.

---

**End Phase D-1 fix01e closure findings.**
