# WB16 — Runtime-launch smoke verification (post-WB14 v3.0 removal)

**Ticket:** MB-T-HSO-WIRE WB16
**Date:** 2026-05-11
**Anchor SHA:** `c8dd797` (WB14d post-v3.0-removal HEAD)
**CLAUDE.md gate:** §4.6 (runtime-launch smoke as merge gate) +
  `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` (closes on green).

---

## §I — Smoke setup

```
$ pnpm --filter dispatch-core build          # tsc clean
$ pnpm --filter dispatch-workstation build   # esbuild bundles all renderers
$ pnpm --filter dispatch-workstation exec electron dist/main/main.js
  (run in background; SIGTERM after ~15s observation window)
```

Environment [KNOWN at run-time]:
- `daemon http://localhost:7878/v2/health → 200` (verified pre-launch via curl)
- 4 pre-existing tmux sessions registered with daemon (`c5-ticket-wb1`,
  `commit-plan-doc`, `orchestrator`, `verify-chat-mount`); plus the
  workstation's auto-spawn target makes daemon's session count near
  cap=5.
- `__orchestrator_active` + `__orchestrator_standby` tmux sessions
  DO NOT exist pre-launch (verified via `tmux ls`).

## §II — Observed console output (full capture, 13 lines)

```
WINDOW_STATE 1024 768
WINDOW_READY
[MB-T-HSO-WIRE OrchestratorPoolManager halt] OrchestratorPoolManager: spawn failed for __orchestrator_active: Session cap (5) reached. Close an existing session before spawning another.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] OrchestratorPoolManager: spawn failed for __orchestrator_standby: Session cap (5) reached. Close an existing session before spawning another.
[MB-T-HSO-WIRE OrchestratorPoolManager halt] OrchestratorPoolManager: spawn failed for __orchestrator_standby: ...  (× 8 more iterations)
Electron exited with signal SIGTERM
```

## §III — Acceptance verification (per dispatch §Acceptance)

| Criterion | Result | Evidence |
|---|---|---|
| (a) WINDOW_READY sentinel within ~10s | **PASS** [KNOWN] | Line 2 of console; emitted at ~2-3s post-launch |
| (b) `__orchestrator_active` auto-spawn attempted | **PASS** [KNOWN] | WB11 wiring fired the spawn; failure path engaged correctly |
| (c) `__orchestrator_active` daemon-registered | **NOT ACHIEVED** [KNOWN] | Daemon's session cap (5) reached pre-spawn — environmental, not WB14 regression |
| (d) `docs/swarm-state.md` written after action | **DEFERRED** [KNOWN] | No pool means no action emission; deferred to dogfood Phase D measurement per dispatch open-clause |
| NO `ERR_MODULE_NOT_FOUND` / crash class | **PASS** [KNOWN] | Zero crash output; SIGTERM exit was operator-initiated |

## §IV — Findings

1. **[KNOWN] v3.5 HSO infrastructure boots cleanly post-WB14 v3.0 removal.**
   Workstation reaches `WINDOW_READY` within ~3s with zero
   `ERR_MODULE_NOT_FOUND`, `Cannot find module`, or any crash class.
   All v3.0-path imports surgically removed across WB14a/b/c/d resolve
   correctly at runtime; no dangling imports survived the typecheck-
   passing state into a runtime regression. CLAUDE.md §4.6 merge-gate
   honored.

2. **[KNOWN] WB13 halt-and-surface generic-message fall-through fires
   correctly at runtime.** Pool spawn failed with `SpawnErrorType =
   'SessionCapExceeded'` (not `SessionAlreadyRegistered`); pool routed
   through the WB13 fall-through branch and emitted the generic
   `OrchestratorPoolManager: spawn failed for ... : ...` message. The
   `SessionAlreadyRegistered` actionable-message branch (specific
   "Manual ... session exists; pool cannot auto-spawn ..." phrasing
   from WB13) was NOT exercised in this smoke (different error_type);
   probe-mbthsowire-12 unit test (642c246) covers that branch
   structurally.

3. **[KNOWN] Pool standby-respawn behaves as an unbounded loop when
   the initial spawn permanently fails.** Console shows 9 standby halt
   iterations during a ~12s observation window — far more than the
   nominal POLL_INTERVAL_MS=5000 would yield. Mechanism (per
   `hso-pool.ts` direct read): `_pollOnce` detects active-tmux-missing
   → `_onActiveCrash` → `_promote()` (resets `_activeCrashHandled =
   false` at line 255) → `_spawnAndRegister(RESERVED_STANDBY)` (async,
   fails with halt). Next poll iteration repeats. The reset-on-promote
   pattern creates a cycle when neither active nor standby ever
   successfully spawned. PRE-EXISTING POOL DESIGN (not a WB14
   regression). Filing as new Tier 3 followup
   `MB-F-HSO-POOL-STANDBY-RESPAWN-UNBOUNDED` (see §V).

4. **[MODELED] Smoke could not exercise dogfood Phase D acceptance
   ((d) swarm-state.md write).** Environmental session cap blocked the
   pool; no orchestrator activity to drive a write. Per dispatch open-
   clause, this acceptance criterion is conditional on pool launching
   successfully + an action emission triggering. Deferred to dogfood
   measurement after operator frees a daemon session slot OR
   `__orchestrator_active` is manually pre-seeded for a smoke pass.

5. **[KNOWN] No `coarchitect:streamError` IPC channel send observed.**
   The pool's `halt` dep in main.ts wires to `console.error +
   mainWindow.webContents.send('coarchitect:streamError', ...)` per
   WB11 commit body. The console output appears to be the
   `console.error` path. The `streamError` IPC send happens silently
   (no renderer connected in this smoke harness; ChatShell would
   surface it visually if loaded interactively).

## §V — New followup candidates

| ID | Body | Tier |
|---|---|---|
| `MB-F-HSO-POOL-STANDBY-RESPAWN-UNBOUNDED` | Pool's `_promote()` resets `_activeCrashHandled = false` (`hso-pool.ts:255`); combined with `_pollOnce` triggering `_onActiveCrash` on every interval when the active-tmux session never spawned, the spawn-standby retry loop is effectively unbounded. Closure path: (a) bound retries via a `_consecutiveSpawnFailures` counter incremented in `_spawnAndRegister` on error and zeroed on success; halt-and-quiesce after N (e.g., 3) failures; (b) operator-visible "pool quiesced; retry via UI" affordance; (c) ensure `_promote` does NOT reset `_activeCrashHandled` when standby was never successfully spawned. Tier 3 — pre-existing pool design (NOT a WB14 regression); observable as repeated console noise; no production data corruption. Discoverability: this row + WB16 smoke evidence at `docs/coordination/wb16-runtime-smoke-2026-05-11.md` + `hso-pool.ts:247-257` `_promote()`. | 3 |

## §VI — Confidence labels

- §I setup: [KNOWN] per direct shell-command invocation + build output.
- §II console capture: [KNOWN] per `/tmp/wb16-smoke.log` 13-line capture.
- §III acceptance matrix: 4 [KNOWN] (a/b/c + crash check) + 1 [KNOWN] for (d) deferred (the deferral itself is a known consequence of environmental cap).
- §IV findings (1)-(3) + (5): all [KNOWN] per direct observation + source read.
- §IV finding (4): [MODELED] — counter-factual claim that (d) WOULD have been observed if env permitted.
- §V followup body: [KNOWN] mechanism per `hso-pool.ts` direct read.

## §VII — Smoke disposition

**PASS** per dispatch acceptance gate.

- Critical sentinel WINDOW_READY observed; no crash class; v3.0 removal
  causes no runtime regression.
- `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` SATISFIED for the
  WB14 merge window.
- Pool spawn outcome environmentally-bounded; not a WB14-attributable
  failure.
- One new Tier 3 followup queued (`MB-F-HSO-POOL-STANDBY-RESPAWN-
  UNBOUNDED`) — pre-existing pool design, not a regression.

**End of WB16 smoke verification.**
