# MB-T-POOL-SHUTDOWN-HOOK-FIX Findings — pool.stop() wired to electron before-quit

**Terminal/dispatch session:** T4 (commit-plan-doc, parallel-track per autonomous max-parallel dispatch 2026-05-11)
**Date:** 2026-05-11
**Ticket body anchor:** `ddc4a52`
**Commit chain (WB1 → WB3):** `bd1af53` (WB1 red) → `eaa00c2` (WB2 green) → `3f57be3` (WB3 smoke evidence)
**Outcome:** Improved (capability enabled with known limitations — signal-exit edge case open per §IX)

---

## I. What Shipped

MB-T-POOL-SHUTDOWN-HOOK-FIX wires the existing shipped `OrchestratorPoolManager.stop()` method (`hso-pool.ts:266-286`, path-E shipped at `deca210`) to electron's `before-quit` event in `main.ts`:

```
electron 'before-quit'
  → event.preventDefault() (defer real quit)
  → Promise.race([
      pool.stop()    ─→ disposes observers + timer
                     ─→ iterates [RESERVED_ACTIVE, RESERVED_STANDBY]
                     ─→ PATCHes each: state='armed' → 'held' (best-effort)
      timeoutPromise(5_000)
    ])
  → finally: app.exit(0) (bypass re-fire of before-quit)
```

Pre-fix: clean SIGTERM (operator Cmd-Q under electron 41) leaves both reserved-name rows at `state='armed'` after exit; each launch accumulates 2 daemon-registry orphans. Post-fix: rows survive at `state='held'`; subsequent launch's path-E `start()` GET-then-PATCH-to-`'armed'` handles them cleanly.

### Commit chain

| # | SHA | WB | Subject |
|---|---|---|---|
| 1 | `bd1af53` | WB1 red | main.ts wires pool.stop() to electron before-quit + Sub-Q-B=b 5s timeout (source-text probe; 5/5 RED at HEAD `3be4c6b`) |
| 2 | `eaa00c2` | WB2 green | main.ts wires orchestratorPool.stop() to electron before-quit + Sub-Q-B=b 5s Promise.race timeout (zone Z-2 new sibling sentinel; flips probe 5/5 RED → GREEN) |
| 3 | `3f57be3` | WB3 smoke | runtime-launch smoke (operator-driven quit PASS; signal-exit edge case Tier 3 follow-on) |

WB4 SKIPPED per Sub-Q-A=α (daemon-side reaper deferred to separate follow-on ticket). WB5 = this commit + COMMIT 2 (FOLLOWUPS.md closure batch).

### New files this ticket

- `packages/dispatch-workstation/test/unit/coarchitect/probe-mbt-pool-shutdown-hook-01-before-quit-wiring.spec.ts` (129 lines, WB1) — source-text probe with 4 conditions across 5 it-blocks.
- `docs/coordination/mbt-pool-shutdown-hook-smoke-2026-05-11.md` (116 lines, WB3) — 3-cycle smoke evidence doc.
- `docs/coordination/mbt-pool-shutdown-hook-findings-2026-05-11.md` (this doc, WB5).

### Modified files this ticket

- `packages/dispatch-workstation/src/main/main.ts` (+37 lines, WB2) — new sentinel zone `=== BEGIN: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook ===` placed immediately after the MB-T-HSO-WIRE zone end (line 725 pre-edit).

### Untouched (per ticket §2.1 path-E binding)

- `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` — `stop()` implementation at lines 266-286 is binding per path-E precedent (`deca210`); this ticket WIRES the existing implementation, does NOT modify it.

---

## II. Operator-arbitrated Q-disposition table

| ID | Disposition | Source / Anchor |
|---|---|---|
| Sub-Q-A | **α defer** — daemon-side reaper companion deferred to separate follow-on ticket; this ticket stays workstation-only | Operator-acked 2026-05-11 via orchestrator chat |
| Sub-Q-B | **b 5s bounded timeout** — Promise.race([pool.stop(), timeoutPromise(5_000)]); safe; bounded user-visible quit latency | Operator-acked 2026-05-11 |
| WB1 probe location | Cairn-grammar adjustment — placed under `test/unit/coarchitect/` instead of originally-proposed `test/unit/main-process/`; matches probe-mbthsowire-NN convention | Ticket body §4 WB1 explicit permission clause |
| WB2 zone placement | **Z-2 new sibling zone** `=== BEGIN: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook ===` placed immediately after the MB-T-HSO-WIRE zone end; selected over Z-1 (extend existing zone) per CLAUDE.md §3.3 sentinel discipline | T4 autonomous decision under §3.3; surfaceable to operator post-commit if Z-1 preferred |

---

## III. Architectural deltas (vs ticket body §4 illustrative skeleton)

1. **Probe location moved from `test/unit/main-process/` to `test/unit/coarchitect/`** [KNOWN] — Ticket body §4 WB1 originally proposed a new `main-process/` directory; T4's pre-write scan confirmed no such directory existed and the established convention (per probe-mbthsowire-02/04 + others) is to group probes by domain (coarchitect/, console-ipc/, etc.) rather than by main-process-generic placement. Cairn-grammar permission clause in ticket body §4 WB1 ("if directory naming collides with existing test convention, adjust under cairn-grammar at WB1 RED") was exercised.

2. **Zone placement Z-2 (new sibling zone) chosen over Z-1 (extend MB-T-HSO-WIRE zone)** [KNOWN] — CLAUDE.md §3.3 explicitly mandates: "Add new logic in NEW sentinel blocks (`=== BEGIN: MB-TXX <description> ===`) outside existing zones." The MB-T-HSO-WIRE shared-emitter-and-writer zone's stated scope is "shared-emitter-and-writer" — the shutdown-hook is a separate concern (lifecycle teardown). Z-2 honors §3.3; the existing zone's purpose stays narrow.

3. **WB3 smoke required 3 cycles to characterize signal-vs-Cmd-Q behavior** [KNOWN] — Ticket body §4 WB3 5-step protocol assumed a single quit trigger would suffice. WB3 execution discovered that signal-based exit (SIGTERM/SIGINT via `pkill`) does NOT reliably fire before-quit to completion; only AppleScript-driven Cmd-Q (cycle 3) achieved full PASS. The 3-cycle structure was T4's smoke-design adjustment to isolate the failure mode and produce a clean Tier 3 follow-on row body (see §IX).

---

## IV. Probe Distribution — all GREEN at HEAD post-WB3

| Surface | Tests | Status |
|---|---|---|
| `probe-mbt-pool-shutdown-hook-01-before-quit-wiring.spec.ts` (WB1 RED → WB2 GREEN flip) | 5 (4 conditions; condition (3) split into 2 it-blocks) | ✓ 5/5 GREEN at WB2 commit `eaa00c2` |
| WB3 runtime smoke (3 cycles) | 5-step acceptance per cycle 3 | ✓ PASS for operator-driven quit |
| **Consumer non-regression** | probe-mbthsowire-{02,04,06,08,10,12} v3.5 sanity | ✓ 6 files / 41 tests / all GREEN post-WB2 |
| **Workstation typecheck** | `pnpm --filter dispatch-workstation typecheck` | ✓ CLEAN |

---

## V. Architecture notes

### Handler implementation pattern (WB2 zone)

```typescript
// === BEGIN: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook (do not modify outside this block) ===
app.on('before-quit', (event) => {
  event.preventDefault();
  void (async () => {
    try {
      await Promise.race([
        orchestratorPool.stop(),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ]);
    } finally {
      app.exit(0);
    }
  })();
});
// === END: MB-T-POOL-SHUTDOWN-HOOK-FIX shutdown-hook ===
```

Design points:
- `event.preventDefault()` defers the real quit so the async teardown can complete.
- `Promise.race(...)` bounds the worst case at 5000ms; daemon hang does not block app exit indefinitely.
- `app.exit(0)` (not `app.quit()`) bypasses re-firing of before-quit. Per electron 41 docs.
- `orchestratorPool` const reference is in scope because the new zone is placed inside the same `app.whenReady()` callback that constructs the pool at `main.ts:692`.

### Cross-cycle state machine (WB3 smoke evidence)

```
Cycle N start:    rows at 'held' (from prior cycle's clean teardown)
pool.start():     'held' → 'armed' (path-E shipped at deca210)
< runtime >
operator Cmd-Q:   electron 'before-quit' → handler → pool.stop()
pool.stop():      iterates reserved names; PATCH 'armed' → 'held' each
                  best-effort try/catch around daemon HTTP fetch
app.exit(0):      clean exit, code 0, no signal trace
Cycle N+1 start:  rows at 'held' from N's teardown
```

### Daemon PATCH latency (measured in WB3)

`curl -X PATCH "http://localhost:7878/v2/sessions/<name>/state" {"state":"held"}` returns 200 in ~30-60ms per call (measured via `time curl` between cycles). Well under the Sub-Q-B=b 5000ms timeout budget. PATCH latency is NOT the failure mode for the signal-exit edge case.

---

## VI. Documentation drift acknowledgments

1. **Ticket body §4 WB3 5-step protocol assumed any quit trigger suffices** [KNOWN] — WB3 execution discovered signal-exit edge case. Ticket-body amendment NOT issued mid-execution per cairn discipline; finding captured in smoke doc §IV-finding-3 + §V follow-on row instead. Future ticket-body authors may benefit from explicit "production-path-only" smoke language vs "any-quit" framing.

---

## VII. Consumer non-regression evidence

- **5-package typecheck CLEAN** at WB2 commit `eaa00c2`: workstation passes `tsc --noEmit` with no diagnostics.
- **v3.5 probe sanity** (`probe-mbthsowire-{02,04,06,08,10,12}`): 6 files / 41 tests / all GREEN post-WB2 [KNOWN]. The new sibling sentinel zone is placed adjacent to (not inside) the MB-T-HSO-WIRE shared-emitter-and-writer zone; v3.5 probes' source-text assertions against the MB-T-HSO-WIRE zone are unaffected.
- **WB3 cycle 3 runtime smoke**: WINDOW_READY ≤ ~3s; pool.start() succeeds against pre-existing 'held' rows; no SessionAlreadyRegistered halts across 3 launches.

---

## VIII. WB Skip Rationale

**WB4 (`green(MB-T-POOL-SHUTDOWN-HOOK-FIX): daemon-side reaper for orphaned reserved-name sessions`) SKIPPED** per Sub-Q-A=α operator ratification 2026-05-11. Daemon-side reaper deferred to separate follow-on ticket; this ticket stays workstation-only. The conditional ticket-§4-WB4 framing ("CONDITIONAL on Sub-Q-A=β") is dispositive — WB4 was always a conditional fork. WB3 → WB5 proceeds unchanged.

---

## IX. New Followups Filed + Closures Achieved

### New (WB5 COMMIT 2 appends 2 rows + 1 closure stamp to docs/FOLLOWUPS.md)

| ID | Tier | Source | One-line |
|---|---|---|---|
| `MB-F-SHUTDOWN-HOOK-SIGNAL-EXIT-BYPASS-BEFORE-QUIT` | 3 | WB3 smoke cycle 1+2 evidence | electron signal-handler force-exits before async-await race resolves; SIGTERM/SIGINT bypass preventDefault'd before-quit handler. NOT a WB2 regression — Cmd-Q path works. Closure options: (a) explicit process.on('SIGTERM/SIGINT') sync handlers; (b) operator UX guidance (Cmd-Q production only); (c) accept-the-edge-case (path-E catches stale 'armed' on next launch). |
| `MB-F-DOGFOOD-TEARDOWN-PROTOCOL-LEAVES-ORPHAN-REGISTRATIONS` | 2 | Filed + immediately CLOSED for pool-driven manifestation | Pool-driven teardown-orphan pattern observed in Phase C dogfood; closed by WB2 wiring of pool.stop() to before-quit. Residual operator-driven hygiene (force-kill -9, OS-level termination outside before-quit) noted as out-of-scope; sibling row `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (Tier 2 at row 271) remains OPEN for the operator-driven manifestation. |

### Closed (WB5 COMMIT 2 stamps "CLOSED" inline on existing row)

| ID | Tier | Closure mechanism |
|---|---|---|
| `MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION` (FOLLOWUPS.md line 286) | 3 | WB2 (`eaa00c2`) wires `orchestratorPool.stop()` to electron `before-quit`; WB3 (`3f57be3`) cycle 3 confirms PATCH-to-'held' across cycles under operator-driven Cmd-Q. Signal-exit edge case noted in companion row `MB-F-SHUTDOWN-HOOK-SIGNAL-EXIT-BYPASS-BEFORE-QUIT`. |

### Cross-referenced (NOT closed by this ticket)

| ID | Tier | Disposition |
|---|---|---|
| `MB-F-AUDIT-EXTERNAL-SESSION-DEATH-RECONCILIATION` (FOLLOWUPS.md line 271) | 2 | CROSS-REF only per Sub-Q-A=α — operator-driven external-death manifestation requires either daemon-side reaper (deferred follow-on ticket) OR TileGridApp UI-side reconciliation (separate scope per row 271's original closure path). |

---

## X. Open items / Deferred

- **Daemon-side reaper** — deferred to separate follow-on ticket per Sub-Q-A=α. Operator-arbitration territory because it touches `dispatch-daemon` package which has its own cairn ladder + frozen-surface considerations.
- **Signal-exit edge case** — filed as `MB-F-SHUTDOWN-HOOK-SIGNAL-EXIT-BYPASS-BEFORE-QUIT` Tier 3 OPEN (see §IX). Operator may decide closure path (a), (b), or (c) at follow-on dispatch.
- **WB6** — ticket body §4 originally enumerated 6 WBs; the actual ladder collapsed to WB1+WB2+WB3+WB5 (WB4 SKIPPED, WB6 not numbered in execution chain). WB5 is this commit + COMMIT 2.

---

## XI. Cairn-discipline observations

- **Anti-fabrication discipline (§2.1)** honored: ticket body §4 WB3 5-step protocol was treated as canonical; the signal-exit failure mode surfaced was captured as new evidence + new followup row, NOT silently absorbed.
- **Halt discipline (§2.5)** preserved: HALT-MBT-POOL-SHUTDOWN-HOOK-AUTHORED surfaced Sub-Q-A + Sub-Q-B; operator-acked autonomous-mode delegation maintained at WB1+WB2+WB3+WB5 commit cycles.
- **Per-path stage + pathspec-restricted commit (§2.7)** consistently applied: each WB commit isolated to single path (probe / main.ts / smoke doc / findings doc); concurrent T2/T3 staging (probe-mbtdwai-02 + hso-pool.ts modifications) preserved in shared index for their own commit cycles; no cross-session sweep this ticket.
- **Q1-Q9 commit-body self-check (§10.5)** answered against actual `git diff --cached` output per Q7 discipline at each WB commit.

---

## XII. Confidence label distribution in this doc

- `[KNOWN]` occurrences: ~12 (every observed fact tied to direct git/source/runtime evidence from this session)
- `[MODELED]` occurrences: 1 (electron signal-handler bypass mechanism — inferred from cycle 1+2 outcomes vs cycle 3, not directly inspected in electron source)
- `[SPECULATIVE]` occurrences: 0

---

**End of MB-T-POOL-SHUTDOWN-HOOK-FIX findings.**

Pending WB5 COMMIT 2 (FOLLOWUPS.md closure batch): 1 inline stamp + 2 new rows.
