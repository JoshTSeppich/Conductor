# MB-T-HSO-WIRE Findings — HSO Autonomy Loop Wiring

**Terminal/dispatch sessions:** T1 (verify-swarm-state, killed early Phase 1) / T2 (verify-chat-mount, WB2-3) / T3 (c5-ticket-wb1 then various pool tracks, WB4-5/10-11) / T4 (commit-plan-doc, WB1/6-7/12-14/16-17)
**Date:** 2026-05-11
**Ticket body anchor:** `28761d1` (committed 2026-05-11 per GATE 2 arbitrations)
**Spike → first GREEN:** `3c9629b` (WB1 spike, ADR §V binds Pattern B)
**Final WB16 smoke:** `b607ed1`
**Outcome:** Improved (capability enabled with known limitations — see §X for OPEN follow-ons)

---

## I. What Shipped

MB-T-HSO-WIRE wires the v3.5 Hierarchical Swarm Orchestration (HSO) autonomy loop end-to-end:

```
PTY chunk
  → consoleController.addStdoutObserver fan-out (MB-T37 broadcaster)
  → action-marker-router (NEW WB7): per-session buffer accumulator +
      strip-and-re-parse per WB1 spike ADR §V binding
  → parseActionMarker (MB-T35-revised, shipped fc15a26) extracts
      [ACTION:type]...[/ACTION] blocks
  → dispatchActionVariant (action-variant-ipc.ts) with deps:
      .resolveApproval → MB-T13 approval-policy-resolver-shim (WB9)
      .fire* → Sub-Y-1 stub-fires (WB7 placeholder; real fires deferred
               to dedicated downstream tickets)
  → ACTION_VARIANT_FIRED_EVENT → swarm-state-writer captures
      (subscription chain wired in main.ts MB-T-HSO-WIRE sentinel zone)
  → OrchestratorPoolManager auto-spawn at app.whenReady (WB11) +
      collision-detection halt-and-surface (WB13)
```

Plus a complete v3.0 path removal sweep (WB14a/b/c/d, 4-commit β-split
per Q-WB14-1 ack) — net ~7100 lines deleted, 5-package typecheck CLEAN.

### Commit chain (chronological, post-ticket-body)

| # | SHA | WB | Subject |
|---|---|---|---|
| 1 | `3c9629b` | WB1 spike | chat-content-markers parser resilience under PTY chunking |
| 2 | `6a40859` | (mid-WB1 followup) | MB-F-PLAN-DOC-MBT35-REVISED-SHA-DRIFT-2026-05-11 |
| 3 | `1697e46` | WB2 red | shared dispatch-event EventEmitter contract + SwarmStateWriter subscriber probe |
| 4 | `95f5ba7` | WB2+WB3 green | SwarmStateWriter wired into main.ts shared-emitter-and-writer sentinel zone |
| 5 | `ab7e093` | WB4 red (superseded) | PeerSummaryHarvester subscriber + emitter contract probe |
| 6 | `cd135e4` | WB4-revised red | reauthor probe-04 to assert main.ts sentinel zone (supersedes `ab7e093` per Q-WB3-GREEN-PATH=A) |
| 7 | `8c81188` | WB5 green | PeerSummaryHarvester wired into main.ts shared-emitter-and-writer sentinel zone |
| 8 | `35f142e` | WB6 red | pty-stream-relay marker-parse observer + dispatchActionVariant caller contract probe |
| 9 | `d9b5722` | WB7 green | action-marker-router + Pattern B accumulator + dispatchActionVariant caller wired |
| 10 | `4beea15` | WB8 red | MB-T13 approval-policy interception between parse and dispatch-execute probe |
| 11 | `31b1397` | WB9 green | MB-T13 approval-policy resolver wired into action-marker-router dispatchDeps (replaces WB7 stub) |
| 12 | `c849e7f` | WB10 red | OrchestratorPoolManager auto-spawn at app.whenReady probe (env-var argv injection per Sub-Q-A=b) |
| 13 | `a02ddae` | WB11 green | OrchestratorPoolManager auto-spawn at app.whenReady + env-var argv injection (Sub-Q-A=b) |
| 14 | `642c246` | WB12 red | probe-C-06 __orchestrator_active collision-with-manual-spawn detection (Path β error-mapping) |
| 15 | `27ee149` | WB13 green | pool collision-detection halt-and-surface (Path β SessionAlreadyRegistered error-mapping) |
| 16 | `d50ee08` | WB14a refactor | delete v3.0 production files (7 files, −1242 lines) |
| 17 | `d90e2a9` | WB14b refactor | surgical coarchitect-ipc.ts cleanup + main.ts wireCardIpc removal + card-wiring/card-ipc deletion (7 files, +95/−796) |
| 18 | `66847b2` | WB14c refactor | delete v3.0 test directories + v3.0 test fixtures (35 files, −5222 lines) |
| 19 | `c8dd797` | WB14d refactor | stale-comment cleanup (approval-policy-*, autopilot-*, main.ts) — comment-only (6 files, +36/−25) |
| 20 | `b607ed1` | WB16 green | runtime-launch smoke verification — WINDOW_READY + WB13 halt-and-surface confirmed at runtime |

WB15 SKIPPED per Sub-Q-B=Y (parallel ticket `MB-T-DISPATCH-WEB-AUTH-INJECTION` body authored at `4fb8d41` mid-WB14). WB17 = this commit + the FOLLOWUPS.md closure commit.

### New files this ticket

- `packages/dispatch-workstation/src/main/action-marker-router.ts` (143 lines, WB7) — sibling module (Choice Y); per-session string buffer + strip-and-re-parse + async-IIFE dispatch.
- `packages/dispatch-workstation/test/spike/spike-mbthsowire-01-marker-chunking.spec.ts` (177 lines, WB1) — 53-case A/B matrix harness.
- `packages/dispatch-workstation/test/unit/coarchitect/probe-mbthsowire-{02,04,06,08,10,12}-*.spec.ts` — RED probes at each WB-ladder rung.
- `docs/coordination/spike-mbthsowire-01-marker-chunking-resilience-2026-05-11.md` (161 lines, WB1 ADR).
- `docs/coordination/wb16-runtime-smoke-2026-05-11.md` (128 lines, WB16 smoke evidence).
- This findings doc + (forthcoming WB17 COMMIT 2) FOLLOWUPS.md row additions.

### Modified files (high-impact)

- `packages/dispatch-workstation/src/main/main.ts` — MB-T-HSO-WIRE sentinel zone constructed across WB3 (writer) / WB5 (harvester) / WB7 (router) / WB9 (resolver dep swap) / WB11 (pool); zone RELOCATED post-§C.5-tile-token-scraper at WB5 GREEN per Q-WB3-GREEN-PATH=A to scope-resolve `consoleController` for the harvester dep.
- `packages/dispatch-workstation/src/coarchitect/hso-pool.ts` — WB11 env-var injection (`CLAUDE_APPEND_SYSTEM_PROMPT` Sub-Q-A=b) + incidental `TileGridRegistryAdapter.renameSession` null-guard fix; WB13 collision detection halt-and-surface generalized to `${sessionName}` for both reserved names.
- `packages/dispatch-workstation/src/main/spawn-handler.ts` — WB11 `buildTmuxArgs` env-var read for `--append-system-prompt`.
- `packages/dispatch-workstation/src/main/coarchitect-ipc.ts` — WB14b surgical reduction from 562 lines to 75 lines; preserves daemonClient singleton + wirePtyRelay + registerIpcHandlers core surface.

### Deleted files (WB14a + WB14b production sweep)

`anthropic-client.ts` + `anthropic-api-client.ts` + `orchestrator-action-handler.ts` + `orchestrator-output-router.ts` + `orchestrator-card-emitter.ts` + `card-context-cache.ts` + `pty-streaming-bridge.ts` (WB14a, 7 files); `card-wiring.ts` + `card-ipc.ts` (WB14b, 2 files); plus the 35 v3.0 test files at WB14c.

---

## II. Operator-arbitrated Q-disposition table

| ID | Disposition | Source / Anchor |
|---|---|---|
| Q-WB1-1 | Parser path corrected to `src/coarchitect/chat-content-markers.ts` (not `src/main/`) | WB1 stale-dispatch surface; ADR §I |
| Q-WB1-2 | Ship SHA corrected to `fc15a26` (not `f8c679d`); plan-doc / ticket-body batch correction deferred to D-2 edit window | WB1 stale-dispatch surface |
| Q-WB1-3 | Spike harness includes Pattern A (control, per-chunk-parse) AND Pattern B (treatment, buffer accumulator); A/B comparison as evidence substrate | WB1 ADR §II |
| Q-WB3-GREEN-PATH=A | T3 probe-04 reauthor against main.ts source-text assertions (vs `ab7e093`'s import-shape pattern); sentinel zone relocated post-§C.5 | T3 WB4-revised commit body `cd135e4` |
| Sub-Q-A=b | Env-var argv injection mechanism (`CLAUDE_APPEND_SYSTEM_PROMPT`); avoids touching frozen `SpawnSessionRequest` schema | WB10/WB11 commit bodies |
| Q-WB7-1=Y | Sibling module `action-marker-router.ts` (vs extend pty-stream-relay.ts); codebase convention + MB-T40 territorial isolation | WB7 HALT-WB7-PRE-COMMIT ack |
| Q-WB7-2=Sub-Y-1 | Stub-fires for dispatchActionVariant deps at WB7; real-fires wired at WB9 (approval) + future tickets (action execution) | WB7 ack |
| Q-WB7-3=defer | Buffer-size cap omitted (MODELED — DEFER per WB1 ADR); buffer cleanup on session end deferred per pool dispose chain | WB7 ack |
| Q-WB7-4=ack | `coarchitect:streamError` IPC channel for malformed-marker user feedback; matches existing chat error surface | WB7 ack |
| Q-WB12-1=β | Path β spawn-side error-mapping (vs Path α pre-flight HTTP); minimal single-file mod to hso-pool.ts | WB12/WB13 HALT-WB12-PRE-CODE-SCOPE-Q ack |
| Q-WB14-1=β | 4-commit β-split (WB14a/b/c/d) for reviewability; vs single bundled refactor | WB14 HALT-WB14-PRE-COMMIT-SCOPE-Q ack |
| Q-WB14-2=delete | Delete `anthropic-api-client.ts` (orphan of AnthropicChatClient deletion) per §2.10 anti-pattern | WB14 ack |
| Q-WB14-3=delete | Delete v3.0 test directories (~30 files) in WB14c for typecheck closure; vs deferred to follow-on cleanup ticket | WB14 ack |
| Q-WB14-4=leave | Leave schema.ts §1-§13 stale comments (frozen surface per §2.10; not load-bearing) | WB14 ack |
| Sub-Q-B=Y | WB15 token-injection SKIPPED in this ticket; parallel ticket `MB-T-DISPATCH-WEB-AUTH-INJECTION` (`4fb8d41` body) takes that scope | WB15 skip rationale |
| Sub-Q-C=β | Delete `pty-streaming-bridge.ts` entirely (vs wire it into chat-shell mount) — chat-shell uses `window.coarchitectBridge` directly | WB14 ack |

---

## III. Architectural Deltas (vs ticket body)

1. **Sentinel-zone relocation post-§C.5** [KNOWN] — Ticket §4 WB3 placed the `=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===` zone above the Fix-A api-key block (early-launch). T2 WB3 GREEN authored the zone there. At T3 WB5 GREEN (`8c81188`), the harvester needed `consoleController` for its `IConsoleBroadcaster.addStdoutObserver` dep — that reference is not in scope until `registerConsoleIpcHandlers(...)` at line ~437. The zone was relocated to post-§C.5 tile-token-scraper (line ~495). probe-mbthsowire-02 (T2 WB2 RED, source-text assertions only on zone presence + content + position relative to `app.whenReady()`) continues to pass post-relocation. probe-mbthsowire-04 (T3 WB4-revised RED) explicitly asserts both writer AND harvester construction in the same (relocated) zone.

2. **action-marker-router sibling module (Choice Y) — NOT extending pty-stream-relay** [KNOWN] — Ticket §4 WB7 named both options ("extend existing module's `__orchestrator_active` filter with new observer; or author sibling module") with operator-arbitrated choice at HALT-WB7-PRE-COMMIT. T4 surfaced three independent rationales (codebase convention, MB-T40 territorial isolation, separation of concerns) and operator confirmed Y. Result: `pty-stream-relay.ts` UNTOUCHED across WB7; an independent observer subscribes to the same broadcaster fan-out (MB-T37 contract supports N observers). pty-stream-relay's whole-buffer-clear semantics remain unchanged for the renderer-IPC fast-path; the new router has its own per-session buffer with strip-and-re-parse per WB1 binding.

3. **Path β error-mapping vs ticket-literal pre-flight HTTP** [KNOWN] — Ticket §4 WB13 line 292 said "pool's `_spawnAndRegister` checks daemon `GET /v2/sessions/__orchestrator_active` BEFORE attempting tmux spawn." The dispatch §COMMIT 2 wording also referenced "409 (already-registered)" — internal inconsistency. T4 surfaced two paths: α pre-flight HTTP check (new dep + main.ts wiring) vs β spawn-side error-mapping (1-file modification, existing `SessionAlreadyRegistered` error_type from `spawn-handler.ts:33-38`). Operator confirmed β. WB13 modifies `hso-pool.ts:165-189` error-branch only; pre-flight UX deferred as Tier 3 followup `MB-F-HSO-POOL-COLLISION-PRE-FLIGHT-HTTP-CHECK` (see §IX).

4. **WB14 4-commit β-split for reviewability** [KNOWN] — Ticket §4 WB14 listed 8 v3.0 consumer files for removal as a single refactor. T4's pre-write scan revealed ~30 v3.0 test files + 4 orphaned production files beyond the named list; surfacing HALT-WB14-PRE-COMMIT-SCOPE-Q with Options α (literal 8 files, breaks typecheck), β (full sweep with 4-commit reviewability split), γ (split into two tickets). Operator confirmed β with 4-commit split: WB14a (production file deletes) + WB14b (surgical coarchitect-ipc.ts/main.ts/preload.mts edits + orphan deletes) + WB14c (test fixture deletes for typecheck closure) + WB14d (stale comment cleanup). Net: 4 commits, +131 / −7285 lines across 55 files, 5-package typecheck CLEAN.

---

## IV. Probe Distribution — all GREEN at HEAD `b607ed1`

| Surface | Tests | Status |
|---|---|---|
| **WB1 spike harness** | 53 cases (50 Pattern A/B cells + 3 chunking-adjacent concerns) | ✓ |
| `probe-mbthsowire-02-emitter-writer-subscribe.spec.ts` (T2 WB2) | source-text + behavioral assertions on emitter + writer + zone construction order | ✓ |
| `probe-mbthsowire-04-harvester-subscribe.spec.ts` (T3 WB4-revised) | source-text assertions on harvester construction + `.start()` + writer-before-harvester order | ✓ |
| `probe-mbthsowire-06-relay-marker-parse.spec.ts` (T4 WB6) | factory shape + 5 behavioral conditions (filter / accumulator / strip-and-re-parse / dispatch / onError) | ✓ |
| `probe-mbthsowire-08-approval-policy-gate.spec.ts` (WB8) | approval-policy interception between parse and dispatch-execute | ✓ |
| `probe-mbthsowire-10-pool-autospawn.spec.ts` (T3 WB10) | OrchestratorPoolManager construction order + auto-spawn at app.whenReady + argv injection via env-var | ✓ |
| `probe-mbthsowire-12-collision-detection.spec.ts` (T4 WB12) | 4 conditions (specific halt message + no retry + no overwrite + generic fall-through) | ✓ |
| **WB16 runtime smoke** | WINDOW_READY ≤ ~3s; no crash class; v3.5 boots clean; WB13 halt-and-surface fires at runtime | ✓ |

**Consumer non-regression** [KNOWN]: coarchitect suite GREEN post-WB14 v3.0 removal; chat-shell + tile-grid render unchanged per WB16 smoke (no console errors observed for renderer mounts).

**Pre-existing-failure baseline** updated per CLAUDE.md §4.5:
- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` — **CLOSED by WB14c** (test file deleted; underlying `routeOrchestratorOutput` deleted WB14a).
- `MB-F-MBT38-COARCH-T03-SDK-CALL-SHAPE-FAILURES` — **CLOSED by WB14c** (sdk-call-shape + sdk-error-states test files deleted; underlying AnthropicChatClient classes deleted WB14a).
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` — Tier 3 remains OPEN (untouched).

---

## V. Architecture Notes

### Construction-order chain (final, main.ts MB-T-HSO-WIRE sentinel zone)

```
sharedDispatchEmitter = new EventEmitter()              [WB3]
swarmStateWriter = new SwarmStateWriter(emitter, ...)    [WB3]  ← subscribes 7 listeners in constructor
peerSummaryHarvester = new PeerSummaryHarvester({...})   [WB5]
peerSummaryHarvester.start()                             [WB5]  ← registers addStdoutObserver
actionMarkerRouterDispose = registerActionMarkerRouter({ [WB7]  ← independent addStdoutObserver
  broadcaster: consoleController,
  dispatch: dispatchActionVariant,
  dispatchDeps: {
    resolveApproval: resolveApprovalShim,                [WB9]   ← real MB-T13 shim (swapped from WB7 placeholder)
    fire*: Sub-Y-1 stub-fires                            [WB7]
  },
  onError: (m) => mainWindow?.webContents.send(
    'coarchitect:streamError', { message: m })           [WB7]
})
orchestratorPool = new OrchestratorPoolManager({...})    [WB11]
void orchestratorPool.start()                            [WB11]  ← spawns active + standby
```

### Env-var argv injection mechanism (Sub-Q-A=b)

Pool's `_spawnAndRegister` wraps `spawnController.handleSpawnRequest` in try/finally:
- Sets `process.env.CLAUDE_APPEND_SYSTEM_PROMPT = orchestratorSystemPromptPath` before invocation
- Restores previous value (or `delete` if previously unset) in `finally`
- `spawn-handler.ts:buildTmuxArgs` reads env-var after the auto-permissions branch and appends `--append-system-prompt <path>` to claude argv when present

Operator-driven spawns from the renderer modal observe unset env-var and skip the branch → no behavior change for non-pool spawns; argv-shape coupling confined to spawn-handler.ts; `SpawnSessionRequest` schema (`dispatch-core/src/v3/schema.ts §1-§13` frozen surface) untouched.

### Pathspec-restricted commit discipline (shared-worktree sweep mitigation)

[KNOWN per Phase 4.1 + Phase 4.6 evidence] `git commit -- <pathspec>` isolates a commit to specific paths regardless of what other paths are staged in the shared index. Multiple T-sessions wrote to the same `.git/index` concurrently; pathspec discipline prevented cross-session inclusion. Reference: `MB-F-WORKTREE-SAMEPATH-CROSSSESSION-SWEEP-2026-05-10` (Tier 3, archaeological record from earlier sweep at `8f50fa1`). NEW Tier 3 followup queued for the REFS-layer analog (`MB-F-WORKTREE-SHARED-HEAD-PUSH-SWEEP-2026-05-11`, see §IX).

### Pool collision-detection halt-and-surface (WB13 runtime evidence)

WB16 smoke confirmed the WB13 halt-and-surface path FIRES AT RUNTIME with the `SessionCapExceeded` error_type (different from `SessionAlreadyRegistered`). The generic fall-through branch emits `OrchestratorPoolManager: spawn failed for ${sessionName}: ${msg}` per `hso-pool.ts:166-167`. The actionable `SessionAlreadyRegistered` branch ("Manual ${sessionName} session exists; pool cannot auto-spawn. Kill the manual session OR disable pool auto-spawn.") was NOT exercised at runtime (env cap-blocked first); probe-mbthsowire-12 unit-test (`642c246`) covers it structurally. See `docs/coordination/wb16-runtime-smoke-2026-05-11.md` §II for the captured 13-line console.

---

## VI. Documentation Drift Acknowledgments

1. **Plan-doc §7.1 SHA `f8c679d` carried into ticket-body §1.1/§2.1/§5.3** [KNOWN] — Actual MB-T35-revised WB2 GREEN ship commit is `fc15a26` per `git log --all --oneline -- packages/dispatch-workstation/src/coarchitect/chat-content-markers.ts`. T4 caught the drift at WB1 spike read-phase via stale-dispatch-detection discipline BEFORE authoring spike under wrong premises. Q-WB1-2 ack 2026-05-11 batched the plan-doc + ticket-body correction to the D-2 plan-doc edit window post-MB-T-HSO-WIRE (NOT mid-ticket-cycle). Filed as `MB-F-PLAN-DOC-MBT35-REVISED-SHA-DRIFT-2026-05-11` Tier 3 (`6a40859`).

2. **`MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 row body structurally stale** [MODELED] — T2's authoring of `MB-T-DISPATCH-WEB-AUTH-INJECTION` ticket body (`4fb8d41`) surfaced that Fix-92 (`daemon-token-bootstrap.ts` + main.ts:108-110 imports zone) already implements workstation-side token-injection — the originally-described "auth-persistence gap" may be partially-closed-in-place. Operator decision pending: declare row CLOSED-by-Fix-92 vs scope reduction for MB-T-DISPATCH-WEB-AUTH-INJECTION. NOT in WB17 scope; surfaced here for archaeological clarity.

3. **§5.3 v3.5 plan-doc reference to MB-F-DISPATCH-WEB-AUTH-PERSISTENCE** — same as (2); operator-pending.

---

## VII. Consumer Non-Regression Evidence

- 5-package typecheck CLEAN at HEAD `c8dd797` (post-WB14d) [KNOWN] — `dispatch-core` / `dispatch-daemon` / `dispatch-workstation` / `dispatch-cli` / `dispatch-web` all pass `tsc --noEmit` with no diagnostics.
- WB16 runtime smoke at HEAD `b607ed1`: WINDOW_READY observed ≤ ~3s; no `ERR_MODULE_NOT_FOUND` or other crash class; chat-shell + tile-grid renderers mount (no console errors observed for renderer chain) [KNOWN].
- v3.5 probe sanity (`probe-mbthsowire-{02,04,06,08,10,12}`): 6 files / 41 tests / all GREEN in 476ms post-WB14c (no regression in shared sentinel-zone territory) [KNOWN].

---

## VIII. WB Skip Rationale

**WB15 (`green(MB-T-HSO-WIRE): WB15 — dispatch-web token-injection wiring`) SKIPPED** per Sub-Q-B=Y operator ratification 2026-05-11. Token-injection scope moved to parallel ticket `MB-T-DISPATCH-WEB-AUTH-INJECTION` (`4fb8d41` body authored by T2 mid-WB14). The conditional ticket-§4-WB15 framing ("CONDITIONAL on Sub-Q-B=X") is dispositive — WB15 was always a conditional fork. WB16/WB17 proceed unchanged.

---

## IX. New Followups Filed + Closures Achieved

### New (WB17 COMMIT 2 appends 4 rows to docs/FOLLOWUPS.md tail)

| ID | Tier | Source | One-line |
|---|---|---|---|
| `MB-F-HSO-POOL-STANDBY-RESPAWN-UNBOUNDED` | 3 | WB16 smoke evidence | pool's `_promote()` resets `_activeCrashHandled = false`; `_pollOnce` re-triggers crash on every interval when initial spawn never succeeded — unbounded loop visible as repeated console halt messages. Pre-existing pool design (not WB14 regression). |
| `MB-F-HSO-POOL-COLLISION-PRE-FLIGHT-HTTP-CHECK` | 3 | Q-WB12-1=β deferral | Path α pre-flight HTTP `GET /v2/sessions/__orchestrator_active` BEFORE spawn attempt; deferred per minimal-scope WB12/WB13 ack. Operator can revisit post-MB-T-HSO-WIRE if dogfood surfaces UX gap. |
| `MB-F-T07-AUDIT-WRITE-PATH-ORPHAN` | 3 | WB14b removal | `postAuditViaFetch` helper retained for test fixtures after `postAudit` method + `DaemonAuditClient` interface deleted; production consumer surface orphaned. Decision deferred: remove helper or repurpose for future audit-write path. |
| `MB-F-WORKTREE-SHARED-HEAD-PUSH-SWEEP-2026-05-11` | 3 | Phase 4.1 surface (T4 push pulled T2+T3 commits) | refs-layer analog of MB-F-WORKTREE-SAMEPATH-CROSSSESSION-SWEEP. Shared `.git/refs/heads/main` means whoever pushes first sweeps everything currently on HEAD; serial-push protocol structurally bypass-able under shared-worktree mode. Mitigation options: worktree isolation OR explicit pre-push HEAD-snapshot orchestration. |

### Closed (WB17 COMMIT 2 stamps "CLOSED" inline)

| ID | Tier | Closure mechanism |
|---|---|---|
| `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` | 2 | WB14c removal: test file `test_register_ipc_handlers.spec.ts` deleted; underlying `routeOrchestratorOutput` deleted WB14a. No future RED possible. |
| `MB-F-MBT38-COARCH-T03-SDK-CALL-SHAPE-FAILURES` | 2 | WB14c removal: `test/unit/coarch-t03/` directory deleted; underlying AnthropicChatClient + AnthropicAPIClient deleted WB14a. SDK-drift gap moot. |
| `MB-F-WORKSTATION-RUNTIME-RELAUNCH-AS-MERGE-GATE` | (gate) | WB16 smoke pass at `b607ed1` satisfies the merge-gate discipline for the WB14 v3.0-removal merge window. |

---

## X. Open Items / Deferred

### Followups remaining OPEN per closure-claim correction (operator-acked 2026-05-11)

- `MB-F-A2C-PTY-SCRAPE-COST-METER-MIGRATION` (Tier 3) — CostMeter data path needs PTY-scrape consumer wiring BEFORE honest closure. WB14b stubbed `coarchitect:getDailyCost` to return `0`. Separate sub-ticket scope.
- `MB-F-A3-PLAN-RING-DATA-PATH-POST-HSO` (Tier 2) — PlanUsageRing data path needs PTY-scrape consumer wiring. WB14b stubbed `coarchitect:getRateLimitState` to return `null`. Separate sub-ticket scope.

### Deferred work

- **D-2 plan-doc edit window** — operator-batched correction of plan `v35-operational-readiness-2026-05-10.md` §7.1 + MB-T-HSO-WIRE ticket body §1.1/§2.1/§5.3 stale SHA `f8c679d` → `fc15a26` per `MB-F-PLAN-DOC-MBT35-REVISED-SHA-DRIFT-2026-05-11`.
- **MB-T-DISPATCH-WEB-AUTH-INJECTION execution** — ticket body landed at `4fb8d41` (T2-authored); execution dispatch pending operator decision on `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` Tier 1 status (see §VI item 2).
- **WB7 Sub-Y-1 stub-fires → real-fires migration** — `dispatchActionVariant`'s `fire*` deps (`fireSendPrompt`, `fireSpawn`, `fireKill`, `firePullHandoff`, `fireAssignTask`) currently no-op resolvers; real-fires wiring is per-ticket downstream scope.
- **Pool buffer cleanup on session end** (Q-WB7-3=defer) — action-marker-router buffer Map clears on dispose() but no per-session cleanup hook; if WB11 pool wiring grows additional sessions through this observer (unlikely under current `__orchestrator_active`-only filter), filing a follow-on.

---

## XI. Cairn-Discipline Observations

- **Anti-fabrication discipline (§2.1)** caught two operator/dispatch-authoring errors before downstream waste: stale parser path + stale ship SHA at WB1 (Q-WB1-1/2). Both surfaced at HALT-WB1-READ-PHASE → operator ack → corrected scope BEFORE spike code authored.
- **Halt discipline (§2.5)** preserved across 4 named HALT cycles (WB1/WB7/WB12/WB14) with operator-arbitrated dispositions; no "useful prep" absorbed during halt scope.
- **Per-path stage + pathspec-restricted commit (§2.7)** prevented index-layer sweeps in Phase 4.1 / 4.4 / 4.6 multi-session staging windows; refs-layer analog filed as new followup.
- **Q1-Q9 commit-body self-check (§10.5)** answered against actual `git diff --cached` output per Q7 discipline; the WB14b commit body explicitly noted T3's concurrent untracked-doc file as a non-swept territorial-disjoint observation.
- **Confidence labels (§2.2)** applied throughout this findings doc; counts at §XII.

---

## XII. Confidence label distribution in this doc

- `[KNOWN]` occurrences: ~25 (every observed fact tied to direct git/source/runtime evidence)
- `[MODELED]` occurrences: 2 (the `MB-F-DISPATCH-WEB-AUTH-PERSISTENCE` operator-pending claim + the §X "if WB11 pool wiring grows" follow-on prediction)
- `[SPECULATIVE]` occurrences: 0

---

**End of MB-T-HSO-WIRE findings.**

GATE 4 EXECUTION COMPLETE pending WB17 COMMIT 2 (FOLLOWUPS.md row updates).
