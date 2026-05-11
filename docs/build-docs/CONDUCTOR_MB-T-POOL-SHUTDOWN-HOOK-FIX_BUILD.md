# MB-T-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION-FIX — wire `pool.stop()` to electron `before-quit`

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-11
**Authored under:** §3.4 operator-supervised mechanical translation discipline
**Authoring delegate:** parallel-track session (Opus 4.7), bounded by operator-frozen envelope 2026-05-11
**Authoring anchor commit (HEAD at authoring time):** `3a02373`
**Cairn ladder anchor:** post-MB-T-HSO-WIRE teardown-discipline closure; sibling of path-E fix01e (`deca210`)
**Closes:**
- `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3 at FOLLOWUPS.md:286)
- `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` (Tier 2, queued post-Phase-D1; pool-driven manifestation closed here; residual operator-driven hygiene noted in §5.2)
- Cross-ref: `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at FOLLOWUPS.md:271) — same teardown-orphan pattern from external-death surface; full closure requires daemon-side reaper (Sub-Q-A; optional WB4)
**Depends on (all merged):** MB-T-HSO-WIRE-fix01e path-E (`deca210`); MB-T-HSO-WIRE WB11 pool-wiring (`a02ddae`); path-E filename-cite followup (`3a02373`)
**Downstream gates:** Phase D-1 retry under post-shutdown-hook conditions; reserved-name rows survive workstation cycle at `state='held'`; no daemon-orphan accumulation
**Estimated WB count:** 4-6 (3-4 if Sub-Q-A=defer; 5-6 if Sub-Q-A=in-scope)

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor — what's binding) first.
2. Read §3 (GATE sub-arbitrations) — two operator decisions are pre-execution prerequisites for specific WBs.
3. Read §4 (WB ladder) for execution order.
4. §5-§8 are operational supports — cross-references, self-check, definition-of-done, risk register.

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source/git read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per dispatch envelope 2026-05-11:

1. Wires existing `OrchestratorPoolManager.stop()` (`hso-pool.ts:266-286`) to electron's `app.on('before-quit', handler)` in `main.ts`. The `stop()` implementation is already shipped at `deca210` (path-E fix01e): disposes observers + clears poll timer, then iterates `[RESERVED_ACTIVE, RESERVED_STANDBY]` and calls `daemonSessionsClient.patchSessionState(name, 'held')` best-effort per `hso-pool.ts:279-285`.
2. Honors race-safe shutdown: handler uses `event.preventDefault()` + `await pool.stop()` + `app.quit()` (or equivalent pattern) so the daemon PATCH calls complete before electron exits, OR a bounded timeout (Sub-Q-B) elapses.
3. Closes the Phase C dogfood-observed orphan-accumulation pattern: pre-fix, each workstation launch leaks 2 daemon-registry entries (`state=armed` for `__orchestrator_active` + `__orchestrator_standby`); 9 days of accumulated test/probe fixtures observed in registry per dogfood `673d5d6`. Post-fix, reserved-name rows survive workstation cycle at `state='held'` and the subsequent launch's `start()` GET-then-PATCH-to-`'armed'` state machine (path-E shipped) handles them cleanly.
4. Adds a runtime smoke verification: launch workstation → SIGTERM → re-launch → confirm reserved-name rows persist at `state='held'` between cycles + no orphan accumulation in registry.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT modify `pool.stop()` itself. Path-E logic at `hso-pool.ts:266-286` is shipped and binding — this ticket WIRES it, does not re-implement it.
- Does NOT modify frozen surfaces: `REGISTRY.md` §2, `docs/build-docs/CONDUCTOR_API_CONTRACT.md`, `packages/dispatch-core/src/v3/schema.ts` §1-§13, `docs/build-docs/WORKSTATION_CONTRACT.md` §6.
- Does NOT modify daemon-side state-machine semantics. Daemon transitions (`transitions.ts:97-149`) already accept the `armed → held` transition with tmux Ctrl+C side effect (session survives detached for re-attachment).
- Does NOT close `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2). That row is the operator-driven manifestation; full closure requires either daemon-side reaper (Sub-Q-A; this ticket optional WB4) OR daemon SSE event for session death (separate scope per row 271 closure path). This ticket cross-references row 271 but does not assert closure.
- Does NOT modify `docs/coordination/v35-operational-readiness-2026-05-10.md`. D-2 plan-doc edits remain operator-edit.
- Does NOT modify `docs/FOLLOWUPS.md` mid-ticket. Followup closures land at the final WB (docs commit) as a single pathspec-restricted edit.
- Does NOT measure Q-V35-7(a) thresholds. Measurement is dogfood Phase D-1 retry under post-shutdown-hook conditions, downstream of this ticket's merge.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-11)

### §2.1 — Path-E precedent is binding

`[KNOWN-OPERATOR-ARBITRATED]`

`pool.stop()` PATCHes reserved-name rows to `state='held'` (not `'killed'`) per `deca210` shipped logic. The path-E state machine — `start()` GET-then-PATCH-to-`'armed'` (for `'held'` rows from prior cycle), `stop()` PATCH-to-`'held'` — is binding for this ticket's WB scope. WBs in §4 wire the existing implementation; they do NOT re-architect the state machine.

### §2.2 — Closure scope: pool-driven manifestation only

`[KNOWN-OPERATOR-ARBITRATED]`

Two manifestations of teardown-orphan pattern exist:
- **Pool-driven** (this ticket): `pool.stop()` exists but is never called from `main.ts`; clean SIGTERM leaks 2 daemon orphans per launch (`__orchestrator_active` + `__orchestrator_standby`). Closure: wire `pool.stop()` to before-quit handler.
- **Operator-driven** (sibling): external session kills (tmux from terminal, daemon restart, claude crash) leave stale tiles in TileGridApp until workstation restart. Closure: daemon SSE event for session-death OR periodic poll + diff (row 271 closure path). NOT IN THIS TICKET'S SCOPE.

The optional WB4 daemon-side reaper (Sub-Q-A) is defense-in-depth that would partially mitigate BOTH manifestations; if pursued, it does not replace row 271's primary closure path.

---

## §3 — GATE sub-arbitrations REQUIRED before specific WBs

Two operator decisions remain pre-execution prerequisites. Surface at HALT-MBT-POOL-SHUTDOWN-HOOK-AUTHORED for operator resolution before WB2 (Sub-Q-B) and before WB4 (Sub-Q-A).

### §3.1 — Sub-Q-A: daemon-side reaper companion inclusion

Required before **WB4** (optional). Default if unresolved: **(α) defer to follow-on ticket**.

| Option | Action | Touches | Scope cost |
|---|---|---|---|
| (α) Defer | Daemon-side reaper authored in a separate follow-on ticket. This ticket stays workstation-side only. | `packages/dispatch-daemon` untouched | 0 WBs (baseline ladder = 4-5 WBs) |
| (β) In-scope | Author daemon-side reaper for orphaned-`armed`/`held` sessions older than N days (N operator-defined, e.g., 7 days). Touches `dispatch-daemon` package. Defense-in-depth — pool teardown still primary; reaper catches misses (workstation kill -9, daemon restart-while-workstation-alive, etc.). Partially closes `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` from the daemon side. | `packages/dispatch-daemon/src/` (new file for reaper logic + integration into daemon startup) | +2-3 WBs (WB4 RED + WB4 GREEN + maybe schema/config) |

`[MODELED]` Path (β) is operator-arbitration territory because it touches the daemon package (which has its own cairn ladder + frozen-surface considerations). Operator may prefer to keep this ticket workstation-only and dispatch the daemon-side reaper as a sibling ticket so daemon work has its own focused review window.

Operator decision pending.

### §3.2 — Sub-Q-B: before-quit timeout strategy

Required before **WB2** (GREEN). Default if unresolved: **(b) bounded timeout 5s**.

`pool.stop()` currently awaits each `patchSessionState` call best-effort (try/catch silently swallows errors per `hso-pool.ts:282-284`). If the daemon is slow (not refused, not 404, but hung), each PATCH could take a long time, blocking app exit. Electron's `before-quit` does not itself impose a timeout — but the OS may kill the app if it takes too long (e.g., macOS Activity Monitor "Force Quit" on a hang).

| Option | Strategy | Trade-off |
|---|---|---|
| (a) No timeout | Handler awaits `pool.stop()` fully. Relies on `pool.stop()`'s existing best-effort try/catch + daemon being responsive. | Cleanest semantics; risks hang if daemon is unresponsive but not error-returning. |
| (b) Bounded timeout 5s | Handler uses `Promise.race([pool.stop(), timeoutPromise(5_000)])`. If timeout wins, app exits without waiting; pool's PATCH calls may be cancelled mid-flight (orphan possible but the structural pattern is in place). | Safe; bounded user-visible quit latency; preserves correctness in 95%+ of cases. **Recommended default.** |
| (c) Bounded timeout 1s | Same as (b) but tighter. | More aggressive; higher orphan-on-shutdown rate; favors fast quit over registry hygiene. |

`[MODELED]` Recommend (b) — pool.stop() should complete in <1s under normal conditions (two PATCH calls to localhost daemon); 5s timeout is a safety net for daemon hangs without compromising clean-shutdown semantics.

Operator decision pending.

---

## §4 — WB ladder

Baseline 4 WBs (Sub-Q-A=α defer); 5-6 WBs if Sub-Q-A=β in-scope. Construction-order: probe → implementation → smoke → docs.

Each WB follows cairn methodology: red authors failing probe; green implements minimum; commit body carries Q1-Q9 self-check per CLAUDE.md §10.5; per-path `git add` per §2.7; push after each cairn-grammar commit per §2.6.

### WB1 — `red(MB-T-POOL-SHUTDOWN-HOOK-FIX): main.ts wires pool.stop() to electron 'before-quit' with race-safe await`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/main-process/probe-mbt-pool-shutdown-hook-01-before-quit-wiring.spec.ts` (NEW file; if directory naming collides with existing test convention, adjust under cairn-grammar at WB1 RED). Asserts via source-text inspection of `main.ts`:
- (1) `main.ts` contains a `app.on('before-quit', ...)` handler registration within or adjacent to the `MB-T-HSO-WIRE shared-emitter-and-writer` sentinel zone (or a new sentinel zone for shutdown hook, operator-flag at WB2).
- (2) The handler invokes `orchestratorPool.stop()`.
- (3) The handler is race-safe per Sub-Q-B operator resolution: either `event.preventDefault()` + `await orchestratorPool.stop()` + `app.quit()` (no-timeout option a) OR `Promise.race([orchestratorPool.stop(), timeoutPromise])` pattern (bounded-timeout options b/c).
- (4) Handler registration occurs AFTER `orchestratorPool = new OrchestratorPoolManager(...)` (line ~692) so the pool reference is in scope.

Probe fails RED at HEAD `3a02373` because:
- `main.ts:719-723` explicitly notes "Keep the binding live for any future stop()/dispose() wiring at app shutdown" — stop() is NOT yet wired.
- `grep -n "before-quit" packages/dispatch-workstation/src/main/main.ts` returns ∅.
- `grep -n "orchestratorPool.stop\(\)" packages/dispatch-workstation/src/main/main.ts` returns ∅.

**Acceptance:** probe RED with the 4 conditions. Commit body Q1-Q9.
**Frozen contracts touched:** none — probe-only.
**Sub-Q-B blocker:** probe's condition (3) assertion shape depends on Sub-Q-B operator resolution. Probe uses a placeholder pattern at WB1 — flag at HALT-WB1-PRE-COMMIT for operator review of Sub-Q-B mechanism choice before WB2.

### WB2 — `green(MB-T-POOL-SHUTDOWN-HOOK-FIX): main.ts wires pool.stop() to electron 'before-quit' handler`

**Type:** green
**Scope:** GREEN implementation in `packages/dispatch-workstation/src/main/main.ts`. Two zone-placement options (operator-flag at HALT-WB2-PRE-COMMIT):
- **(option Z-1)** Extend the existing `MB-T-HSO-WIRE shared-emitter-and-writer` sentinel zone (lines 524-725) — registers the handler immediately after `void orchestratorPool.start()` at line 718, before the `=== END` at line 725. Minimal-surface zone modification.
- **(option Z-2)** New sibling zone `=== BEGIN: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook ===` placed adjacent to the MB-T-HSO-WIRE zone end (line 725). Cleaner separation-of-concerns; matches the pattern used by `MB-T07 card wiring`-removal comment block (line 726-727).

Handler skeleton (Sub-Q-B=b illustrated):
```typescript
app.on('before-quit', (event) => {
  event.preventDefault();
  void (async () => {
    try {
      await Promise.race([
        orchestratorPool.stop(),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ]);
    } finally {
      app.exit(0);  // app.quit() may re-fire before-quit; app.exit() bypasses
    }
  })();
});
```
(Final shape adjusted per Sub-Q-B operator resolution + WB2-time anti-fabrication verification that `app.exit(0)` is the right escape vs `app.quit()` re-fire.)

**Acceptance:** WB1 probe flips RED → GREEN. Commit body Q1-Q9. SURFACE HALT-WB2-PRE-COMMIT for operator review of (a) Sub-Q-B mechanism final shape, (b) zone-placement choice Z-1 vs Z-2.
**Frozen contracts touched:** none — main.ts is workstation territory; `OrchestratorPoolManager.stop()` is shipped + frozen-shape per `deca210`.
**Consumer probes (CLAUDE.md memory):** verify no regression in main.ts startup sequence; existing `WINDOW_READY` sentinel still fires within ~10s; existing `MB-T-HSO-WIRE shared-emitter-and-writer` zone untouched (if Z-2) OR zone-extended additively at known position (if Z-1).

### WB3 — `green(MB-T-POOL-SHUTDOWN-HOOK-FIX): runtime smoke — SIGTERM cycle leaves reserved-name rows at state='held'`

**Type:** green (smoke harness)
**Scope:** per CLAUDE.md §4.6 + path-E precedent (`deca210` shipped Phase D-1 surface):
1. Pre-launch: clean daemon registry of `__orchestrator_active` + `__orchestrator_standby` rows (or note pre-state).
2. Launch workstation: `pnpm --filter dispatch-workstation exec electron dist/main/main.js`. Observe `WINDOW_READY` ≤ ~10s + pool `start()` GET-then-PATCH-to-`'armed'` confirms two reserved-name rows at `state='armed'` post-launch (via `curl http://localhost:7878/v2/sessions/__orchestrator_active` and `_standby`).
3. SIGTERM the workstation (or operator clean-quit via Cmd-Q).
4. Post-quit verification: `curl` the two reserved-name endpoints again. Expected: both rows at `state='held'` (vs pre-fix `state='armed'`).
5. Re-launch workstation. Pool `start()` should GET-find-rows-at-`'held'` → PATCH-to-`'armed'`. No POST → no Blocker 3 collision. Observable: launch succeeds without `OrchestratorPoolManager halt` for `SessionAlreadyRegistered`.

**Acceptance:** all 5 steps verified; daemon registry shows no orphan accumulation across cycles. Commit body Q1-Q9 with explicit `[KNOWN]` claims per step.
**Frozen contracts touched:** none.
**Evidence doc:** `docs/coordination/mbt-pool-shutdown-hook-smoke-<date>.md` (smoke-evidence pattern mirroring `wb16-runtime-smoke-2026-05-11.md`).

### WB4 — `green(MB-T-POOL-SHUTDOWN-HOOK-FIX): daemon-side reaper for orphaned reserved-name sessions` [CONDITIONAL on Sub-Q-A=β]

**Type:** green (multi-step; may decompose to WB4a-c per operator at HALT-WB4-PRE-COMMIT)
**Scope (if Sub-Q-A=β in-scope):** Daemon-side reaper at `packages/dispatch-daemon/src/`. Scans the session registry on a configurable interval (default e.g., 1h); any reserved-name row in `state='armed'` or `state='held'` older than N days (default e.g., 7) is transitioned to `state='killed'` to free registry pressure. Reaper logic must respect transition guards (daemon's `transitions.ts:97-149`) — `armed → killed` and `held → killed` should already be valid transitions per existing state-machine.

Open design questions to surface at WB4 RED:
- N (age threshold) — operator-defined, configurable via daemon config or env-var
- Interval (scan frequency) — same
- Reserved-name filter — only reap `__orchestrator_*` reserved names OR all sessions? Recommend reserved-only for ticket scope.
- Operator-visible audit — daemon log entry per reaped row, OR silent

**Acceptance:** new probe asserts reaper fires + transitions stale rows; existing daemon tests unchanged. Commit body Q1-Q9.
**Frozen contracts touched:** potential — if reaper requires new daemon HTTP endpoint or new event type, frozen-surface consultation per CLAUDE.md §2.10. Recommend reaper is purely-internal (cron-style scan; no new public surface).
**If Sub-Q-A=α defer:** this WB is SKIPPED; ladder collapses to WB1-3 + WB5 docs.

### WB5 — `docs(MB-T-POOL-SHUTDOWN-HOOK-FIX): findings doc + followup closures + ticket closure`

**Type:** docs
**Scope:** author `docs/coordination/mbt-pool-shutdown-hook-findings-<date>.md` per `mb-t-hso-wire-findings-2026-05-11.md` format anchor: I What Shipped / II Q-disposition table / III Architectural deltas / IV Probe distribution / V Architecture notes / VI Documentation drift / VII Consumer non-regression / VIII WB Skip Rationale (e.g., if Sub-Q-A=α defer) / IX New Followups Filed / X Open Items.

Followup updates to `docs/FOLLOWUPS.md`:
- CLOSE `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (Tier 3 at row 286) per WB2 wiring + WB3 smoke evidence. Inline `**→ CLOSED <date> by MB-T-POOL-SHUTDOWN-HOOK-FIX WB2 (<SHA>)**` stamp.
- File + CLOSE `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` (Tier 2; previously queued post-Phase-D1) — new row with closure stamp on the same commit. Body notes: pool-driven manifestation closed by WB2; residual operator-driven hygiene (force-kill -9, OS-level termination outside before-quit) noted as out-of-scope.
- (CONDITIONAL on Sub-Q-A=β) PARTIALLY-CLOSE `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at row 271) — inline `**→ PARTIAL CLOSURE <date> by MB-T-POOL-SHUTDOWN-HOOK-FIX WB4 daemon-side reaper**`. TileGridApp UI-side reconciliation remains OPEN per row 271's original closure path (a) periodic poll or (b) SSE event.
- File any NEW followups surfaced during WBs 1-4.

**Acceptance:** findings doc + FOLLOWUPS.md commit lands. Commit body Q1-Q9.
**Frozen contracts touched:** none — docs only.

---

## §5 — Cross-references

### §5.1 — Followups CLOSED by this ticket

| Followup | Tier | Closure path | Closing WB |
|---|---|---|---|
| `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` | 3 | WB2 main.ts wires `pool.stop()` to electron `before-quit`; WB3 smoke evidence confirms no orphan accumulation across cycles | WB2 (functional) + WB3 (evidence) + WB5 (stamp) |
| `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` | 2 (NEW filing) | Pool-driven manifestation closed by WB2; residual operator-driven hygiene noted | WB5 (filed + stamped CLOSED in same commit) |
| `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` | 2 | CONDITIONAL on Sub-Q-A=β — partial closure via daemon-side reaper; full closure requires TileGridApp UI-side reconciliation (separate scope) | WB4 (if Sub-Q-A=β) + WB5 stamp; otherwise remains OPEN |

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:

- WB2 may discover that `app.exit(0)` vs `app.quit()` has non-obvious side effects under electron 41 (the bundled version per `node_modules/.pnpm/electron@41.3.0/`). If so, file Tier 3 followup with operator-decision on the right escape pattern.
- WB3 smoke may surface daemon-PATCH timing variance — if `pool.stop()` regularly exceeds 5s under realistic conditions, Sub-Q-B timeout may need to be revised post-WB3 evidence.
- WB4 (if pursued) may discover that the existing daemon transition state-machine does NOT cleanly support `armed → killed` or `held → killed` from a reaper-context call (e.g., requires the tmux session to be alive). If so, file Tier 2 followup with daemon-side state-machine extension scope.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-HSO-WIRE-fix01e path-E | `deca210` | `hso-pool.ts:266-286` `stop()` implementation — KNOWN; binds WB1 probe shape + WB2 implementation. Path-E filename-cite correction (`3a02373`) is the current HEAD. |
| MB-T-HSO-WIRE WB11 pool-wiring | `a02ddae` | `main.ts:692-724` pool construction + `void orchestratorPool.start()` — KNOWN; identifies WB2's wiring zone. |
| MB-T-HSO-WIRE WB16 runtime smoke | `b607ed1` | `docs/coordination/wb16-runtime-smoke-2026-05-11.md` — format anchor for WB3 smoke evidence doc. |

### §5.4 — Related FOLLOWUPS rows (read-required)

- `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` at FOLLOWUPS.md:286 — primary closure target.
- `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` at FOLLOWUPS.md:271 — cross-ref; daemon-side reaper would partially close.
- `MB-F-DAEMON-AUTH-HEADER-CONTRACT-DOC` (referenced from `main.ts:715-716`) — `daemonSessionsClient` uses `x-conductor-token` header, not `Authorization: Bearer`; ensure WB2/WB3 do not surface inconsistency.

---

## §6 — Self-check Q1-Q9 per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

Each cairn-grammar commit body answers all nine questions. Expected shapes per WB type:

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB1 RED | spike-equivalent: path-E shipped; this probe asserts wiring | BEHAVIOR (source-text inspection of main.ts) | No — impl absent; probe RED until WB2 | No — probe-only | No | KNOWN/MODELED applied | main.ts is path-disjoint from T2 (path-E cleanup) + T3 (auth-injection); zone is MB-T-HSO-WIRE adjacent | N/A | No (HALT auto-ack per op autonomous mode) |
| WB2 GREEN | (see WB1) | BEHAVIOR (real before-quit handler) | No — impl load-bearing | No | No | KNOWN/MODELED applied | same as WB1 | N/A (uses existing PATCH via pool.stop) | No |
| WB3 smoke | N/A — integration smoke | BEHAVIOR (real electron launch + real daemon HTTP) | No — verifies WB2 impl | No | No | KNOWN per observed sentinels | none — observational | N/A | No |
| WB4 (if β) | N/A | BEHAVIOR (reaper logic + daemon test fixtures) | No — impl load-bearing | No | Conditional — reaper may need new daemon endpoint (surface) | KNOWN/MODELED applied | dispatch-daemon territory; coordinate with any active daemon-side parallel session | N/A | No |
| WB5 docs | N/A | N/A | N/A | No — single-file docs/ + FOLLOWUPS.md edit | No | KNOWN per direct ticket-execution evidence | docs/ + FOLLOWUPS.md path-disjoint from main.ts/hso-pool.ts | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **WB1 probe** authored + RED at `main.ts` HEAD pre-WB2.
2. **WB2 implementation** wires `pool.stop()` to `app.on('before-quit', ...)` per operator-resolved Sub-Q-B mechanism + zone-placement. WB1 probe flips RED → GREEN.
3. **WB3 runtime smoke** confirms: workstation SIGTERM cycle leaves reserved-name rows at `state='held'`; subsequent launch transitions them to `state='armed'` via path-E GET-then-PATCH; daemon registry shows zero orphan accumulation across N cycles (N ≥ 2 observed).
4. **WB4 daemon-side reaper** (CONDITIONAL on Sub-Q-A=β): authored + tested + integrated into daemon startup; partial-closure stamp on `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION`.
5. **WB5 findings doc** + FOLLOWUPS.md closure batch: `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` CLOSED; `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` FILED+CLOSED in same commit.
6. **5-package typecheck CLEAN** per CLAUDE.md §4.4 (one command at a time, no `&&` chains).
7. **No regression in v3.5 probe sanity** — `probe-mbthsowire-{02,04,06,08,10,12}` + WB16 smoke evidence patterns continue to pass post-WB2/3/4 changes.
8. **Operator-visible UX**: clean Cmd-Q quit completes within ~5s under normal conditions (Sub-Q-B=b default); no visible hang.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `app.exit(0)` vs `app.quit()` semantics drift under electron 41 — handler infinite-loop if `app.quit()` re-fires before-quit | `[MODELED-LOW]` (electron's before-quit docs are clear that `event.preventDefault()` requires later `app.exit()` for the real quit) | `[MODELED-HIGH]` (user-visible hang on Cmd-Q) | WB2 explicitly uses `app.exit(0)` post-await; WB3 smoke verifies clean exit |
| Daemon hang causes `pool.stop()` to exceed Sub-Q-B timeout, leaving orphans on shutdown | `[MODELED-LOW]` (daemon is local, normally responsive) | `[MODELED-MEDIUM]` (Tier 3 orphan accumulation — same as pre-fix) | Sub-Q-B=b 5s timeout bounds worst case; daemon-side reaper (Sub-Q-A=β) catches misses |
| Race between `before-quit` handler and pool's `_pollOnce` setInterval (still firing during teardown) | `[MODELED-LOW]` (pool.stop() clears the interval at line 269-272 before PATCH calls) | `[MODELED-LOW]` (worst case: one extra PATCH attempt + observer fire after stop) | pool.stop() already disposes observers + clears timer FIRST (`hso-pool.ts:267-272`) per shipped implementation |
| Path-E state-machine reads stale `state='held'` row from a session that ACTUALLY died (e.g., crashed) — pool starts thinking it can re-attach but tmux session is gone | `[MODELED-MEDIUM]` (depends on crash-mode coverage of path-E) | `[MODELED-MEDIUM]` (pool start() halts; operator-visible message) | Out of scope for this ticket — path-E's behavior is binding per §2.1. If WB3 smoke surfaces this, file Tier 2 followup. |
| WB2 zone-placement (Z-1 vs Z-2) creates merge friction with concurrent main.ts edits from T2/T3 | `[KNOWN-LOW]` (T2 path-E cleanup territory + T3 auth-injection territory are both distinct sentinel zones; this ticket's shutdown-hook zone is post-pool-construction, adjacent to MB-T-HSO-WIRE zone end) | `[MODELED-LOW]` (per-path commit discipline + pathspec-restricted commit per CLAUDE.md §2.7) | Coordinate with orchestrator before WB2 to confirm T2/T3 are at standby for main.ts modifications during WB2 commit cycle |
| Sub-Q-B=a (no-timeout) selected; daemon-PATCH-hang manifests as user-visible quit-hang | `[MODELED-MEDIUM]` if (a) chosen | `[MODELED-HIGH]` (operator perceives broken Cmd-Q) | Default recommendation is (b); if operator selects (a), surface the trade-off explicitly + queue a Tier 3 followup for telemetry/observability of pool.stop() latency |

---

**End of MB-T-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION-FIX ticket body.**

Pending operator resolutions before execution: Sub-Q-A (§3.1 daemon-side reaper inclusion) + Sub-Q-B (§3.2 timeout strategy) + WB2 zone-placement Z-1 vs Z-2.
