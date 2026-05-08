# MB-T36 Session Findings — 2026-05-08

**Session:** MB-T36 main-branch (Sonnet 4.6)
**Branch:** main
**Base SHA:** 7040cb5 (Q-V35-4 re-arbitration — MB-T36 architecture-independent fire window)
**Ladder:** 3 commits (WB1 RED 9c832e5, WB2 GREEN a93ad74, WB3 NO-REFACTOR, WB4 docs this commit)
**Dispatch anchor:** v3.5 BUILD §5.2 + SPIKE-HSO-01 ADR + Q-V35-4 re-arbitration

---

## §I — Scope delivered

| Acceptance criterion | Status |
|---|---|
| `fireSpawn` placeholder throw at coarchitect-ipc.ts replaced | SHIPPED |
| `readDispatchMode()` gating in orchestrator-fired spawn path | SHIPPED |
| 'auto' mode: fires `SpawnIpcController.handleSpawnRequest` directly | SHIPPED |
| 'ask' mode: gates via `SpawnConfirmGate`; pending until confirm | SHIPPED |
| 'ask' + cancel: resolves `{ declined: true }` without firing controller | SHIPPED |
| `SpawnConfirmGate` onCancel extension (backward-compat) | SHIPPED |
| `sharedSpawnConfirmGate` exported from spawn-ipc.ts (shared instance) | SHIPPED |
| 6-test probe GREEN (probe-fireSpawn-dispatch-mode.spec.ts) | VERIFIED |
| dispatch-workstation typecheck clean | VERIFIED |
| MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED CLOSED | CLOSED |
| MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE CLOSED | CLOSED |

---

## §II — Phase 1 stale-cite corrections (HALT 0 + WB1 probe catches)

Three stale cites caught via anti-fabrication probe-verify discipline:

| Source | Dispatch claim | Actual state | Catch point |
|---|---|---|---|
| v3.5 BUILD §5.2 line 236 | `coarchitect-ipc.ts:365-374` for `fireSpawn` | Actual line 429 at HEAD 7040cb5 | WB1 probe phase (`grep -n "fireSpawn"`) |
| v3.5 BUILD §5.2 line 234 | Same 365-374 cite in scope description | Same — line 429 | WB1 (same grep) |
| dispatch §2 WB2 | `reply.ok` for SpawnReply error check | Actual discriminant: `reply.type === 'success'|'error'` (spawn-ipc.ts:54-73) | WB1 probe (read SpawnSuccessReply + SpawnErrorReply types) |

All three caught before any production code was authored. The `reply.ok` correction is the most load-bearing: the GREEN implementation uses `reply.type === 'error'` per actual API contract. Dispatch cited `reply.ok` which would have been a silent runtime bug (TypeScript would not have caught it since both `reply.ok` on a success-typed object and `reply.type === 'success'` are valid expressions — but `reply.ok` is `undefined` on the actual reply type).

**v3.5 BUILD stale cite tracking:** the `coarchitect-ipc.ts:365-374` cite is the third surface of the same drift:
1. SPIKE-HSO-01 dispatch: cited 360-380
2. v3.5 BUILD §5.2 line 234: cited 365-374
3. Current dispatch §2 WB2: same 365-374

Root cause: v3.5 BUILD was authored at base SHA `534ab52` before MB-T17/T24/T25/T28/T34 ladder shipped, all of which added lines to coarchitect-ipc.ts. The cite rotted with each merge. Flagged for eventual BUILD doc amendment.

---

## §III — Implementation pattern

**Key design: `orchestrator-fire-spawn.ts` — electron-free deps-injected module**

The dispatch's suggested `await SpawnConfirmGate.openSpawnConfirmModal(spawnArgs)` API does not exist. Actual `SpawnConfirmGate` API is callback-based (`decide(event, payload, onConfirm)`), not Promise-based. The implementation wraps the gate in a Promise in the 'ask' path:

```
fireOrchestratorSpawn(payload, deps):
  mode = deps.readDispatchMode()
  if mode === 'auto':
    controller = await deps.getController()
    reply = await controller.handleSpawnRequest(req)
    check reply.type === 'error' → throw
    return { sessionName }
  // 'ask' mode:
  return new Promise((resolve, reject):
    deps.spawnConfirmGate.decide(
      broadcastSink,
      req,
      onConfirm: () → getController → handleSpawnRequest → resolve/reject,
      onCancel:  () → resolve({ declined: true }),  // MB-T36 extension
    )
```

**`SpawnConfirmGate` extension:** `onCancel?: () => void` added as optional 4th param to `decide()`. The cancel path (`handleResponse(id, 'cancel')`) now calls `cached.onCancel?.()` before returning `'cancelled'`. Backward-compat: existing 3-arg operator-driven path (`registerSpawnIpcHandlers`) passes no `onCancel`; optional call `?.()` is a no-op. Case-4 probe verifies this explicitly.

**Shared gate instance:** `sharedSpawnConfirmGate` exported at module scope in spawn-ipc.ts (moved from inside `registerSpawnIpcHandlers`). This ensures the existing `workstation:spawn-confirm-response` IPC handler resolves pending entries from both operator-driven AND orchestrator-driven spawns via the same gate. The orchestrator-fired path uses the existing workstation-shell.html MB-T24 modal zone — no new UI surface required.

**`getOrchestratorSpawnController()`:** module-level lazy cache in coarchitect-ipc.ts, following the `controllerPromise` pattern at spawn-ipc.ts:286. Resolves `claude` binary path once; subsequent orchestrator spawns reuse the same controller. This keeps the async `defaultSpawnHandlerDeps()` call out of the hot spawn path.

**Production wiring:** coarchitect-ipc.ts `fireSpawn` dep calls `fireOrchestratorSpawn(payload, { readDispatchMode, getController: getOrchestratorSpawnController, spawnConfirmGate: sharedSpawnConfirmGate, broadcast: allWebContents-fan-out })`. Declined result `{ declined: true }` is mapped to a thrown error so `dispatchAction` returns `kind: 'error'` (consistent with how other dep errors surface in the action-fire-without-card path).

**Electron-free invariant:** `orchestrator-fire-spawn.ts` has no electron imports. All deps are injected. This is the correct partition: probe suite can import and test the module without electron mocking. The production deps (sharedSpawnConfirmGate, allWebContents) are wired in coarchitect-ipc.ts, which already requires electron mocking in its tests.

---

## §IV — Followup closures

### MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED — CLOSED

**Closure commit:** WB2 GREEN `a93ad74`
**Closure mechanism:** `orchestrator-fire-spawn.ts` exports `fireOrchestratorSpawn(payload, deps)` which is wired as the `fireSpawn` dep in `defaultDispatchActionDeps(...)` overrides in coarchitect-ipc.ts (line ~450 in MB-T36 zone). Placeholder throw `'orchestrator-fired spawn-new-session not wired in v3.0 (MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED)'` removed.

The followup's "future closure" description exactly matched the implementation:
- ✓ "wire orchestrator-fired spawn through the existing SpawnIpcController.handleSpawnRequest" — done
- ✓ "threading `defaultSpawnHandlerDeps()` (which is async — needs the same controllerPromise pattern as `registerSpawnIpcHandlers` in spawn-ipc.ts:266)" — done via `getOrchestratorSpawnController()` lazy cache

### MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE — CLOSED

**Closure commit:** WB2 GREEN `a93ad74`
**Closure mechanism:** `fireOrchestratorSpawn` reads `readDispatchMode()` first (closure path (a) per followup body). In 'ask' mode, gates via `SpawnConfirmGate` with a synthetic broadcast event sink (`allWebContents.getAllWebContents().forEach(wc => wc.send(channel, msg))`) — closure path (b), option "re-use SpawnConfirmGate with a synthetic event sink."

The operator-driven path and orchestrator-driven path now share `sharedSpawnConfirmGate`. Both surfaces honor the same dispatch-mode gate. The acceptance asymmetry that the original followup identified is resolved.

**Note on line-cite drift:** followup body cited `coarchitect-ipc.ts:365-374` as the discoverability anchor. That line range is no longer a throw — it is now the MB-T36 sentinel zone with the real implementation. The stale cite is a documentation artifact; the structural closure is complete.

### MB-F-T24-CONFIRM-MODAL-MULTI-PENDING-UX — elevated from future to reachable

**Status: NOT modified.** Row remains Tier 3 but the condition "When MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE closes, orchestrator-fired spawns may queue" is now satisfied. The multi-pending gap in the renderer (single-instance modal overwriting `spawnConfirmPendingRequestId`) is now potentially reachable in production if the orchestrator emits multiple `spawn-new-session` actions in rapid succession (action-fire-without-card path, no batching control). The discoverability row is accurate; no implementation change needed from MB-T36. Operator to reassess tier if swarm-scale dogfood reveals the queue UI gap in practice.

---

## §V — WB3 no-refactor rationale

Operator-ratified: no refactor commit. WB2 implementation is clean as shipped:
- `fireOrchestratorSpawn` is 80 LOC including doc-comments; no tactical shortcuts
- `OrchestratorFireSpawnDeps` interface is properly defined; no inline type coercions
- `OrchestratorSpawnResult` union is clear and unambiguous
- `getOrchestratorSpawnController()` correctly stays in coarchitect-ipc.ts, NOT in orchestrator-fire-spawn.ts — moving it would couple electron to the electron-free module, breaking probe testability

---

## §VI — Methodology signals (cairn-under-stress Round 7 evidence)

Three within-session anti-fabrication signals in WB1/WB2 (beyond SPIKE-HSO-01 baseline):

**(1) Pre-existing-failure verification via stash before changes**
At WB2 regression check, `test_register_ipc_handlers.spec.ts` card-or-multi-choice test failed. Before attributing to WB2 changes, used `git stash` + re-run to confirm the failure existed at pre-WB2 HEAD (9c832e5). Verified: `1 failed | 20 passed` at stash = same 1 failure. Methodology: failure attribution via independent code-state triangulation, not memory or assumption.

**(2) SpawnReply discriminant correction at probe-authoring time**
Dispatch §2 WB2 cited `reply.ok` for SpawnReply success check. WB1 probe phase read actual types at spawn-ipc.ts:54-73 → found `{ type: 'success' }` / `{ type: 'error' }` discriminant, NOT `{ ok: true | false }`. Probe tests mock `{ type: 'success', result: { sessionName } }`. WB2 implementation uses `reply.type === 'error'`. The `reply.ok` approach would have produced a TypeScript-invisible runtime bug (accessing `.ok` on a typed reply object that doesn't declare that field).

**(3) Refactor self-assessment grounded in electron-free invariant, not aesthetic preference**
WB3 no-refactor assessment cited the specific technical constraint: moving `getOrchestratorSpawnController` to `orchestrator-fire-spawn.ts` would import `defaultSpawnHandlerDeps` and `SpawnIpcController` from spawn-ipc.ts — which imports electron at the top level — breaking the electron-free probe invariant that makes the module independently testable. The self-assessment is grounded in architectural evidence, not "looks clean."

These three signals add to the cairn-under-stress-round-7.md §3 substrate-positive findings.

---

## §VII — Acceptance verification summary

```
probe suite:         6/6 GREEN (probe-fireSpawn-dispatch-mode.spec.ts)
  case-1 auto:       fires handleSpawnRequest with correct args; resolves {sessionName}
  case-1 error:      SpawnReply type:'error' → throws with error_type in message
  case-2 ask+confirm: gates via SpawnConfirmGate; pendingSize=1; fires on confirm
  case-3 ask+cancel:  pendingSize=0 after cancel; controller NOT fired; {declined:true}
  case-4 regress:    decide() fire-now in auto (backward compat); ask 3-arg legacy
workstation tests:   34/35 GREEN (1 pre-existing: MB-F-COARCHITECT-IPC-LINE-485)
workstation typecheck: CLEAN (exit 0)
```

LOC delta (MB-T36 WB1+WB2, excluding pre-existing commits at base):
```
5 files changed, 376 insertions(+), 14 deletions(-)
  orchestrator-fire-spawn.ts (new)            +100 lines
  probe-fireSpawn-dispatch-mode.spec.ts (new) +208 lines
  coarchitect-ipc.ts                          +59/-4 lines
  spawn-ipc.ts                                +15/-4 lines
  spawn-confirm-gate.ts                       +8/-4 lines
```

WB3 commit: none (no-refactor per operator HALT WB3 ack).

---

## §VIII — Outcome classification

**Improved (capability enabled)** — orchestrator-fired `spawn-new-session` action now fires through the full dispatch-mode-aware spawn pipeline. 'auto' fires directly; 'ask' gates through the existing operator-driven confirmation modal (shared gate instance). Closes the MB-T11 WB7 deferred gap and the MB-T24 acceptance asymmetry. 6/6 probe tests GREEN; typecheck clean; no new test failures.
