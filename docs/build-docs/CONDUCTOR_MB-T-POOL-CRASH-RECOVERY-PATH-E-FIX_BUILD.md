# MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX — extend Path (E) state machine to pool crash-recovery code paths

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline (max-parallel autonomous mode)
**Authoring delegate:** T2 sub-session (Opus 4.7), bounded by Phase D-2 finding `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` Tier 2 (`9dc19eb`)
**Authoring anchor commit (HEAD at authoring time):** `3be4c6b`
**Cairn ladder anchor:** Phase D-2 finding row body §VII — "dedicated MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX ticket — extend `_promote` + `_onStandbyCrash` to call `_prepareReservedName(RESERVED_STANDBY)` instead of direct `_spawnAndRegister(RESERVED_STANDBY)`. Same Path (E) state-machine pattern, applied to the crash-recovery branch. Estimated 1-2 WB."
**Closes:** `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` (Tier 2, surfaced at Phase D-2 LAUNCH-2 2026-05-11)
**Depends on (all merged):** MB-T-HSO-WIRE fix01e GREEN (`deca210`) + filename-cite (`3a02373`) — these ship the Path (E) state machine (`_prepareReservedName` + `IDaemonSessionsClient` + `DefaultDaemonSessionsClient`) that this ticket extends to the crash-recovery branch
**Downstream gates:** None directly. Improves robustness of HSO autonomy stack under crash-recovery scenarios; aligned with Q-V35-7(a) ship-confidence (not ship-gate-blocking — sibling `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVE-TMUX-ALIVE` Tier 3 workflow fix is the alternate mitigation already-APPLIED at D-3).
**Estimated WB count:** 2 (RED probe + GREEN implementation)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor) — both small; this is a tightly-scoped follow-on ticket.
2. Read §3 — there are NO GATE 3 sub-arbitrations expected; scope is derivative of fix01e GREEN.
3. Read §4 (WB ladder) — 2 WBs total.
4. §5-§8 are operational supports.

Confidence labels per CLAUDE.md §2.2 apply throughout. The Phase D-2 finding row at `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` is `[KNOWN-OPERATOR-FILED-AT-9dc19eb]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-FILED-AT-9dc19eb]` per Phase D-2 finding row closure path:

1. **Extends `_promote()`** (`packages/dispatch-workstation/src/coarchitect/hso-pool.ts:502-512` post-fix01e line numbers; followup row cites pre-fix01e `:264-274`): replace `void this._spawnAndRegister(RESERVED_STANDBY)` at line 511 with `void this._prepareReservedName(RESERVED_STANDBY)`. This routes the new-standby-spawn through the Path (E) GET-first state machine instead of unconditional POST.

2. **Extends `_onStandbyCrash()`** (`hso-pool.ts:525-531` post-fix01e; followup row cites pre-fix01e `:287-293`): replace `void this._spawnAndRegister(RESERVED_STANDBY)` at line 530 with `void this._prepareReservedName(RESERVED_STANDBY)`. Same rationale.

3. Authors a RED probe at `packages/dispatch-workstation/test/unit/coarchitect/probe-mbthsowire-crash-recovery-path-e.spec.ts` (NEW file) asserting the crash-recovery paths route through `_prepareReservedName` (mock-based verification via captured stream-close observer callback).

4. Verifies adjacent probes remain GREEN (`probe-mbthsowire-fix01e-...`, `hso-pool.spec.ts`, `probe-mbthsowire-{02,04,06,08,10,12}`).

5. Closes `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` Tier 2 → CLOSED in `docs/FOLLOWUPS.md` at WB-final.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED-AT-FIX01E]` constraints:

- Does NOT modify Path (E) state-machine semantics — `_prepareReservedName`'s 5-branch behavior (404 / armed / held / paused / killed) is preserved verbatim per fix01e (`deca210`).
- Does NOT modify the daemon contract — uses existing `/v2/sessions/:name` GET + `/v2/sessions/:name/state` PATCH per `CONDUCTOR_API_CONTRACT.md` §6.1. No new endpoints; no DELETE; no schema change.
- Does NOT touch frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6.
- Does NOT touch `_onActiveCrash()` (`hso-pool.ts:519-523`) directly — it only calls `_promote()`; the fix flows through to `_promote()` automatically. Test coverage at `_promote` captures both invocation paths (`_onActiveCrash` + HANDOFF_EMITTED_MARKER).
- Does NOT introduce a new dep on `OrchestratorPoolManagerDeps` — `daemonSessionsClient` is already shipped at fix01e (`deca210`); this ticket consumes the existing dep via the existing `_prepareReservedName` method.
- Does NOT wire `pool.stop()` to `app.on('before-quit', ...)` — that is the territory of `MB-T-POOL-SHUTDOWN-HOOK-FIX` (`ddc4a52`); separate ticket.
- Does NOT address the Tier 1 `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` (filed at Phase D-3, `3be4c6b`) — that is operator-territory at GATE 6 ship-gate eval; orthogonal scope.
- Does NOT re-arbitrate Path (E) — operator-frozen 2026-05-11 at HALT-FIX01-PRE-RED.

---

## §2 — Arbitration anchor (Phase D-2 finding row verbatim)

`[KNOWN-FILED-AT-9dc19eb]`

From `docs/FOLLOWUPS.md` row 292 (verbatim):

> `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` | **Tier 2 — pool's crash-recovery path (`_promote` + `_onStandbyCrash` in `hso-pool.ts`) bypasses the fix01e Path-(E) GET-first state machine, hitting daemon Blocker 3 (409 SessionAlreadyRegistered) on existing-armed rows when tmux dies out-of-band.** Surfaced at Phase D-2 LAUNCH-2 2026-05-11 under state=held + tmux=KILLED baseline: pool's primary `_prepareReservedName` held-branch succeeded (held → armed PATCH ✓), but `_startPoll`'s `runTmuxHasSession` detected tmux dead → `_onActiveCrash` → `_promote` → `_spawnAndRegister(RESERVED_STANDBY)` → daemon POST → 409 (row at state=armed from primary PATCH) → WB13 Path β halt-and-surface. 8 halts at ~5s intervals matching `POLL_INTERVAL_MS=5000ms`. Same structural gap as the original D-1 blocker `MB-F-POOL-FALSE-POSITIVE-COLLISION-ON-STALE-KILLED-REGISTRATION` but in the **crash-recovery code path** rather than the **startup code path**. fix01e closed startup; crash-recovery remains. **Closure path:** dedicated `MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX` ticket — extend `_promote` (`hso-pool.ts:264-274`) + `_onStandbyCrash` (`hso-pool.ts:287-293`) to call `_prepareReservedName(RESERVED_STANDBY)` instead of direct `_spawnAndRegister(RESERVED_STANDBY)`. Same Path (E) state-machine pattern, applied to the crash-recovery branch. Estimated 1-2 WB.

This ticket is a **derivative extension** of fix01e (path β subset): same Path (E) state-machine pattern applied to the crash-recovery code path. No new arbitration; no new design decisions. Scope is purely mechanical translation.

### §2.1 — Source-line cite correction (anti-fabrication note)

`[KNOWN-T2-AUTHORING-OBSERVATION-2026-05-11]`

The followup row body cites pre-fix01e line numbers (`hso-pool.ts:264-274` for `_promote`; `:287-293` for `_onStandbyCrash`). Post-fix01e line numbers (verified at HEAD `3be4c6b` via direct read) are `:502-512` for `_promote` and `:525-531` for `_onStandbyCrash`. The followup row was filed at `9dc19eb` after fix01e shipped but before the line numbers were re-verified; pre-fix01e numbers in the row are stale relative to the current source. This ticket uses post-fix01e line numbers throughout §1 + §4 + §6 to match the actual source state.

This is a discoverability-only concern (line numbers drift; the method names are stable). The PRE-fix01e cite at the followup row is preserved as archaeological evidence per CLAUDE.md "DO NOT amend prior commits" discipline (sibling `MB-F-T2-FILENAME-CITE-FABRICATION` row precedent at `3a02373`).

---

## §3 — GATE 3 sub-arbitrations REQUIRED before specific WBs

**None.** This ticket is scoped as mechanical translation of fix01e to two additional call sites. No operator arbitration required pre-execution.

Implicit sub-Q candidates surfaced + auto-resolved by inheriting fix01e GREEN's prior arbitration:

- **Sub-Q (auto-resolved):** which fire-and-forget vs await semantics? — `void this._prepareReservedName(...)` matches the existing `void this._spawnAndRegister(...)` fire-and-forget pattern at lines 511 + 530. No change to invocation semantics.
- **Sub-Q (auto-resolved):** which Path (E) branch for crash-recovery? — `_prepareReservedName` itself does the 5-branch routing; the crash-recovery call site doesn't need to pre-decide. State-dependent behavior is unchanged from fix01e.

If a NEW arbitration question surfaces during WB execution: HALT-and-surface per CLAUDE.md §2.10. Do NOT absorb.

---

## §4 — WB ladder

2-WB ladder. Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX): crash-recovery routes through _prepareReservedName probe`

**Type:** red
**Scope:** Author RED probe at `packages/dispatch-workstation/test/unit/coarchitect/probe-mbthsowire-crash-recovery-path-e.spec.ts` (NEW file). Probe constructs a pool with mocked deps (same shape as fix01e probe at `probe-mbthsowire-fix01e-path-e-pool-state-machine.spec.ts`), starts the pool (so `_prepareReservedName` initialization completes), captures the stream-close-observer callback registered at `consoleIpc.addStreamCloseObserver`, then invokes that callback with `sessionName=__orchestrator_active` (or `=__orchestrator_standby`) to simulate a PTY-level crash. Asserts:

1. **`_onStandbyCrash` path**: invoking the close-observer with `sessionName=__orchestrator_standby` MUST cause `daemonSessionsClient.getSession(RESERVED_STANDBY)` to be invoked (Path E GET-first); `spawnController.handleSpawnRequest` MUST NOT be invoked unconditionally — only via the 404 branch of `_prepareReservedName`.
2. **`_promote` path (via `_onActiveCrash`)**: invoking the close-observer with `sessionName=__orchestrator_active` MUST cause `daemonSessionsClient.getSession(RESERVED_STANDBY)` to be invoked (the new-standby-spawn after promotion); same constraint on `spawnController`.
3. **Held-row path in crash-recovery**: if the GET returns `{state: 'held'}` for `__orchestrator_standby` during the crash-recovery flow, `daemonSessionsClient.patchSessionState(RESERVED_STANDBY, 'armed')` MUST be invoked AND `spawnController.handleSpawnRequest` MUST NOT be invoked (mirrors fix01e probe assertion (3)).
4. **Killed-row path in crash-recovery**: if the GET returns `{state: 'killed'}`, `halt` MUST be invoked with the operator-actionable remediation message (mirrors fix01e probe assertion (4)).
5. **Idempotency / crash-handled guard preserved**: a second invocation of the close-observer with the same sessionName MUST be no-op (existing `_activeCrashHandled` / `_standbyCrashHandled` guards remain in effect).

Probe MUST fail RED today (HEAD at `3be4c6b`): `_promote` line 511 + `_onStandbyCrash` line 530 call `_spawnAndRegister(RESERVED_STANDBY)` directly, NOT via `_prepareReservedName`. The `daemonSessionsClient.getSession(RESERVED_STANDBY)` mock will never be invoked from the crash-recovery flow; assertion (1) and (2) fail RED.

**Acceptance:** probe asserts the 5 conditions and exits non-zero. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Test infrastructure:** vi.fn() mocks for all 8 dep fields (matches fix01e probe pattern); deps cast via `as unknown as OrchestratorPoolManagerDeps` no longer needed (interface field already exists post-fix01e).

### WB2 — `green(MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX): route _promote + _onStandbyCrash through _prepareReservedName`

**Type:** green
**Scope:** Two minimal source edits to `packages/dispatch-workstation/src/coarchitect/hso-pool.ts`:

1. **Line 511** (`_promote` body): replace
   ```
   void this._spawnAndRegister(RESERVED_STANDBY);
   ```
   with
   ```
   void this._prepareReservedName(RESERVED_STANDBY);
   ```

2. **Line 530** (`_onStandbyCrash` body): replace
   ```
   void this._spawnAndRegister(RESERVED_STANDBY);
   ```
   with
   ```
   void this._prepareReservedName(RESERVED_STANDBY);
   ```

Both fire-and-forget patterns preserved (no `await` introduced — crash-recovery completion is observed via daemon state + observer fan-out, not awaited at the close-observer site). `_prepareReservedName` is `async` per fix01e contract; void-discard the promise.

`_prepareReservedName` internally handles all 5 state branches (404 → `_spawnAndRegister`; armed → `_registerExistingSession`; held → PATCH + `_registerExistingSession`; paused → halt; killed → halt). The fix-up is purely call-site routing.

**Acceptance:** WB1 probe flips RED → GREEN (all 5 assertions pass). Adjacent probes preserved (`probe-mbthsowire-fix01e-...spec.ts` 10/10 GREEN; `hso-pool.spec.ts` 9/9 GREEN; full coarchitect dir non-regression). Workstation typecheck clean. Commit body Q1-Q9.
**Frozen contracts touched:** none.
**Consumer probes (CLAUDE.md memory):** the existing `hso-pool.spec.ts` probes (MB-T37 WB1 — pool lifecycle) include `probe-07: active crash` and `probe-08: standby crash` that exercise the very paths being modified. WB2 GREEN must preserve those probes' GREEN status — they currently use `daemonSessionsClient.getSession: vi.fn().mockResolvedValue(null)` (first-launch null/404 default), so the new GET-first flow returns null → falls through to `_spawnAndRegister` per Path (E) 404 branch — same observable behavior the old probes assert. No regression expected.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup | Tier | Source | Closure-path target |
|---|---|---|---|
| `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` | 2 | `9dc19eb` (Phase D-2 finding row 292) | WB2 GREEN — same Path (E) state-machine pattern applied to `_promote` + `_onStandbyCrash` call sites |

### §5.2 — Followups likely to surface

| Candidate | Tier (est.) | Trigger |
|---|---|---|
| `MB-F-POOL-CRASH-RECOVERY-RACE-MULTI-FAILURE` | 3 (edge case) | If WB1 probe authoring surfaces a race window where active-crash + standby-crash fire simultaneously (e.g., both tmux sessions dying within `POLL_INTERVAL_MS`), the sequential `_promote()` → `_onStandbyCrash()` chain may produce unexpected interleavings. Likely a pre-existing concern not surfaced by fix01e because fix01e only changed start() + stop(); crash-recovery race semantics unchanged. Flag if observed during WB1 RED authoring. |
| `MB-F-POOL-CRASH-RECOVERY-HELD-STATE-UNEXPECTED` | 3 (semantic) | If GET returns `state='held'` during crash-recovery for a session whose tmux just died, the held-branch PATCHes to 'armed' — but the tmux is gone. Pool then runs `_registerExistingSession` which doesn't re-spawn tmux. Result: armed state in daemon but no tmux. Next `_pollOnce` runtmuxHasSession fails → cascade resumes. May need a special crash-recovery branch that bypasses Path (E)'s 'held' state and goes straight to POST. Flag if observed. |

### §5.3 — Related shipped tickets

| Ticket | Anchor SHA | Relevance |
|---|---|---|
| MB-T-HSO-WIRE fix01e GREEN | `deca210` | Source of `_prepareReservedName` + `IDaemonSessionsClient` + `DefaultDaemonSessionsClient` + Path (E) state machine. This ticket extends fix01e's pattern to the crash-recovery code path. |
| MB-T-HSO-WIRE fix01e filename-cite | `3a02373` | Halt-message string corrections. This ticket inherits the corrected `~/.foxworks-dispatch/sessions.json` cite in the `_prepareReservedName` killed-branch — no further halt-message authoring required. |
| MB-T-POOL-SHUTDOWN-HOOK-FIX | `ddc4a52` | Orthogonal closure for `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` Tier 3 (pool.stop() wiring to `app.on('before-quit')`). Same overall pool-stability theme; non-overlapping scope. |
| Phase D-2 findings | `4986b69` | Surfaced the Tier 2 gap closed by this ticket. §IV root-cause trace; §VII followup row. |

### §5.4 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` lines 380-441 (`_prepareReservedName` + `_registerExistingSession` — Path (E) state machine reused)
- `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` lines 519-523 (`_onActiveCrash` — calls `_promote`; flows through transitively)
- `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` lines 514-517 (`_onSessionClose` — dispatches to crash handlers; reads observer callback)
- `packages/dispatch-workstation/src/main/spawn-handler.ts` (referenced for spawnController contract; not modified)
- `packages/dispatch-daemon/src/routes/sessions.ts` (referenced for GET/POST/PATCH contracts; not modified)
- `packages/dispatch-daemon/src/state/transitions.ts` (referenced for state-machine validity; not modified)

### §5.5 — Anchor commit at ticket-authoring time

`3be4c6b` (HEAD at 2026-05-11 ticket-authoring time). WB1 RED authoring should begin by verifying current state via `git status --short` + anti-stale-dispatch checklist (`MB-F-CHAT-CLAUDE-STALE-DISPATCH-2026-05-10` template).

---

## §6 — Self-check protocol per WB commit (CLAUDE.md §10.5)

Every cairn-grammar commit (red / green) carries a Q1-Q9 self-check block in the commit body. Standard answers for this ticket below.

| Q | Standard answer for MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX WBs |
|---|---|
| Q1 — API verified by spike? | N/A. `_prepareReservedName` contract verified by fix01e probe at `deca210` (10/10 GREEN). Crash-recovery call-site shape verified by direct read of `hso-pool.ts:502-512` + `:525-531` at HEAD `3be4c6b`. Daemon GET/PATCH semantics verified by fix01e + Phase D-1 retry runtime observations. |
| Q2 — Test exercises behavior or MOCKS? | Mocks. WB1 RED probe uses vi.fn() spies for `daemonSessionsClient` + `spawnController` + `tileRegistry` + `consoleIpc.addStreamCloseObserver` (callback captured + invoked manually to simulate crash). No mock of `_prepareReservedName` itself — the probe asserts that the REAL `_prepareReservedName` is reached from the crash-recovery call site. Same mock infrastructure pattern as fix01e probe. |
| Q3 — If implementation deleted, test passes? | No. WB1 RED probe's 5 assertions fail today (line 511 + 530 call `_spawnAndRegister` directly, NOT `_prepareReservedName`). After WB2 GREEN, all 5 pass. Reverting WB2 GREEN reproduces RED. |
| Q4 — Anything outside contract spec? | No. Each WB's "Frozen contracts touched" lists explicit boundaries. WB2 GREEN is a 2-line edit (lines 511 + 530); no contract changes; no new exports; no dep additions. |
| Q5 — Modified contract without approval? | No. Frozen contracts (REGISTRY.md §2, CONDUCTOR_API_CONTRACT.md, schema.ts §1-§13, WORKSTATION_CONTRACT.md §6) untouched. Pool's internal call routing is a workstation-side detail. |
| Q6 — Any unlabeled claim in commit body? | All claims labeled `[KNOWN]` / `[MODELED]` / `[SPECULATIVE]` per CLAUDE.md §2.2. The Phase D-2 root-cause trace is `[KNOWN]` per direct observation at LAUNCH-2 + log evidence at `4986b69`. |
| Q7 — Touched files another parallel session might modify? | Answer against actual `git status` per CLAUDE.md §2.7. `hso-pool.ts` is contested territory if MB-T-POOL-SHUTDOWN-HOOK-FIX (`ddc4a52`) ships before this ticket — surface coordination at HALT-WB2-PRE-COMMIT. |
| Q8 — Bypass PATCH /v2/sessions/:name/state? | No. WB2 GREEN uses existing PATCH per contract §6.1 via `_prepareReservedName`'s held-branch (unchanged from fix01e). |
| Q9 — Work during unauthorized halt? | No. HALT-MBTPCRPE-AUTHORED + per-WB HALT-PRE-COMMIT + HALT-PRE-PUSH gate operator-review (auto-ack under operator's autonomous-mode cadence). |

### §6.1 — Per-WB HALT-PRE-COMMIT inventory

WBs requiring operator HALT-PRE-COMMIT review:

- **WB1 RED**: standard HALT-PRE-COMMIT — surface probe contents + RED count + cross-session staging. Auto-ack under autonomous mode.
- **WB2 GREEN**: standard HALT-PRE-COMMIT — surface 2-line diff + probe flip evidence (RED→GREEN) + adjacent regression check (`hso-pool.spec.ts` probes 07+08 specifically, which exercise the modified code paths). Auto-ack under autonomous mode.

NEW arbitration questions surfacing mid-WB execution → HALT-and-surface, NOT auto-ack.

---

## §7 — Definition-of-done

MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX is COMPLETE when ALL of the following are KNOWN-evidence-captured:

1. WB1 + WB2 commits + pushes per CLAUDE.md §2.6 (per-commit-push discipline). `git log --oneline origin/main..HEAD` returns empty after each WB push.
2. WB1 RED probe (`probe-mbthsowire-crash-recovery-path-e.spec.ts`) authored + RED at WB1; flipped GREEN at WB2 (all 5 assertions pass).
3. Adjacent test non-regression at WB2 GREEN:
   - `probe-mbthsowire-fix01e-path-e-pool-state-machine.spec.ts`: 10/10 GREEN preserved.
   - `hso-pool.spec.ts`: 9/9 GREEN preserved (including probes 07 + 08 which exercise crash-recovery).
   - Full `test/unit/coarchitect/` dir: 116+/116+ GREEN.
4. Workstation typecheck clean (`pnpm --filter dispatch-workstation typecheck` exit 0).
5. `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` Tier 2 row in `docs/FOLLOWUPS.md` updated to CLOSED with this ticket's anchor SHA (queued for WB3-docs or bundled with WB2 GREEN — operator discretion at HALT-WB2-PRE-COMMIT).
6. No frozen-contract amendment.

### §7.1 — What MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX completion does NOT achieve

- Does NOT execute a Phase D-3 retry or any new dogfood smoke — that is operator-scheduled and orthogonal.
- Does NOT close the Tier 1 `MB-F-HSO-CLARIFICATION-FIRST-VS-Q-V35-7A-THRESHOLD-DEFINITION` row (Phase D-3 ship-gate operationalization is operator-territory at GATE 6).
- Does NOT wire `pool.stop()` to `app.on('before-quit')` — that is `MB-T-POOL-SHUTDOWN-HOOK-FIX` (`ddc4a52`) territory.
- Does NOT modify dogfood teardown protocol scripts — `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVE-TMUX-ALIVE` Tier 3 workflow row was APPLIED at Phase D-3 (`88b7215`); no further teardown-protocol authoring in this ticket.

---

## §8 — Risk register

### §8.1 — Known risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WB1 RED probe authoring surfaces a stream-close-observer access-pattern issue not present in fix01e probe (which uses GET-mock + start-only). | `[MODELED]` Low | Low — probe shape adjustments | Mirror `hso-pool.spec.ts` probe-07/08 pattern for capturing + invoking the observer; that file already has the working pattern. |
| Multi-failure cascade race: both `__orchestrator_active` and `__orchestrator_standby` crash within same `POLL_INTERVAL_MS=5000ms` window. `_promote()` sets `_standbySessionName = null`, then `_pollOnce` skips standby check (line 455 guard). New standby-spawn fires via `_prepareReservedName(RESERVED_STANDBY)` — Path (E) handles the row appropriately. Should be fine. | `[MODELED]` Low | Low | WB1 probe condition (5) (idempotency guard) covers the obvious case; file `MB-F-POOL-CRASH-RECOVERY-RACE-MULTI-FAILURE` Tier 3 if a non-trivial race surfaces during WB1 authoring. |
| Held-row + tmux-dead anomaly: `_prepareReservedName` 'held' branch PATCHes to 'armed' + `_registerExistingSession` — does NOT respawn tmux. Pool then sees state='armed' but no tmux on next poll → cascade resumes (same loop, new shape). | `[MODELED]` Medium | Medium — would partial-mitigate the fix | After WB2 GREEN, runtime-launch smoke under state=held+tmux=missing scenario should be measured (mirror Phase D-2 LAUNCH-2 baseline). If cascade resumes, file `MB-F-POOL-CRASH-RECOVERY-HELD-STATE-UNEXPECTED` Tier 3 and consider a special crash-recovery branch that bypasses held → goes straight to POST. |
| `hso-pool.spec.ts` probe-07 or probe-08 regresses because the existing first-launch-null mock returns 404 and the new Path (E) flow then takes 404 → `_spawnAndRegister` branch. Same final observable; should preserve. | `[MODELED]` Low (verified path) | Medium | Run `pnpm --filter dispatch-workstation exec vitest run test/unit/coarchitect/hso-pool.spec.ts` at WB2 GREEN before commit; surface regressions at HALT-WB2-PRE-COMMIT. |
| Pre-existing test failures (CLAUDE.md §4.5 baseline) flake under increased test invocation. | `[KNOWN]` Medium | Low (pre-existing) | NOT re-diagnosed per §4.5 discipline. |

### §8.2 — Escalation triggers (HALT all work + surface)

Per CLAUDE.md §2.10:

- Frozen-contract amendment surfaced mid-WB
- A NEW arbitration question (operator-territory) surfaces during WB1 RED or WB2 GREEN authoring
- WB2 GREEN regresses any adjacent probe (`hso-pool.spec.ts` probes 07 or 08 in particular)
- Cross-session conflict on `hso-pool.ts` (T3 or T4 also editing)
- Multi-failure cascade race surfaced as a real concern, not edge-case theoretical

### §8.3 — Anti-patterns to avoid

- ❌ Modifying `_prepareReservedName`'s 5-branch semantics (Path E is frozen at fix01e operator-arbitration)
- ❌ Adding daemon-side endpoints to support crash-recovery (frozen contract surface)
- ❌ Removing the `_activeCrashHandled` / `_standbyCrashHandled` guards (idempotency invariant)
- ❌ `git add -A` or `git add .` (CLAUDE.md §2.7)
- ❌ Force-push to origin/main
- ❌ Chained operator-arbitrated actions behind verification commands (CLAUDE.md §4.2)
- ❌ Re-diagnosing pre-existing test failures (CLAUDE.md §4.5)
- ❌ Touching `MB-T-HSO-WIRE` sentinel zones outside the 2-line edit scope
- ❌ Awaiting the `_prepareReservedName` promise at the crash-recovery call site — fire-and-forget pattern is preserved per existing `void this._spawnAndRegister(RESERVED_STANDBY)` shape; introducing `await` would change crash-recovery semantics from "non-blocking PTY observer callback" to "blocking until daemon GET completes"

---

## §9 — Closing posture

`[KNOWN-AUTHORED-UNDER-§3.4-OPERATOR-SUPERVISED-MECHANICAL-TRANSLATION]`

This ticket translates the Phase D-2 finding row `MB-F-POOL-CRASH-RECOVERY-NOT-PATH-E-AWARE` closure-path text into a 2-WB ladder. Scope is derivative-mechanical (same Path (E) state-machine pattern, applied to two additional call sites — lines 511 + 530 of `hso-pool.ts`). No new arbitration questions surfaced during authoring.

The fix is small (2-line GREEN diff) but ship-confidence-positive: closes a structurally-identical-to-D-1-BLOCKER gap that surfaced only because the dogfood workflow created an unusual baseline (state=held + tmux=KILLED via `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVE-TMUX-ALIVE`). The Tier 3 workflow row has already been APPLIED at Phase D-3 (`88b7215`); this ticket adds defense-in-depth at the code level so the gap doesn't recur under future tmux-out-of-band-death scenarios (e.g., operator manual `tmux kill-session`, OS killing tmux server, etc.).

The cairn methodology applies throughout: red → green → Q1-Q9 → commit → push per WB; per-path `git add`; halt-and-surface for any new arbitration question; no frozen-contract amendment.

Operator review at HALT-MBTPCRPE-AUTHORED gates execution dispatch. Path-disjoint from T3 (workstation onboarding) + T4 (workstation main.ts + hso-pool.ts in MB-T-POOL-SHUTDOWN-HOOK-FIX scope) per dispatch context 2026-05-11 max-parallel autonomous mode.

`[NOTE for T4 coordination]`: this ticket's WB2 GREEN edits `hso-pool.ts:511` + `:530`. `MB-T-POOL-SHUTDOWN-HOOK-FIX` (`ddc4a52`) edits `pool.stop()` and adds `app.on('before-quit', ...)` wiring in `main.ts` — non-overlapping scope on `hso-pool.ts`. Should be safe parallel-cairn-able; cross-session staging verification at HALT-WB2-PRE-COMMIT.

**End MB-T-POOL-CRASH-RECOVERY-PATH-E-FIX build doc.**
