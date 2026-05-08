# MB-T24 Findings — Auto/Ask dispatch-mode toggle + spawn-flow hard gate

**Date:** 2026-05-08
**Final HEAD on `mbt24-worktree`:** WB5 docs commit (this commit)
**WB ladder:** Phase 1 → WB1 red → WB2 green → WB3 green → WB4a green → WB4b green → WB5 docs (6-WB ladder, expanded from 5 per Q-MBT24-5=c re-disposition)
**Outcome classification (CLAUDE.md §2.11):** **Improved (binary flip + behavioral quality).** Auto/Ask toggle ships as a hard renderer-side gate at the only currently-firing spawn surface (operator-driven). Both acceptance bullets 2 + 3 close honestly without "Capability enabled with known limitations" framing. Orchestrator-fired spawn gating is the appropriate scope for a separate ticket once `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` closes.

---

## I. Summary

MB-T24 ships a workstation-wide **dispatch-mode toggle** (`Auto` | `Ask`) in the chat-shell header-bar (FAR-LEFT slot per Q-MBT24-4=a). The toggle persists across workstation restart via file-JSON store at `<userData>/dispatch-mode-state.json` (Q-MBT24-1=a, mirrors `splitter-state.ts` per CLAUDE.md §3.5). Default mode is `'ask'` on first install (Q-MBT24-2=a — operator opts INTO `'auto'` consciously, matching `spawn-handler.ts:88` precedent).

The behavioral semantics ship as a **hard gate at `spawn-ipc.ts handle('workstation:spawn-requested')`** per Q-MBT24-5=c (operator HALT 0 ack 2026-05-08, re-disposed from tentative (a) soft system-prompt injection):

- **`'auto'`**: spawn fires immediately (today's flow). Gate is a no-op.
- **`'ask'`**: main emits `'workstation:spawn-confirm-required'` to the renderer with `{ requestId, repoPath, sessionName }`. Renderer surfaces a styled confirmation modal. On Confirm, spawn fires through the controller as today. On Cancel (or Esc), spawn does NOT fire; pending entry is discarded.

**Critical Phase 1 anti-fabrication finding** (now closed by WB4a's hard gate): the prompt §2 claim that "spawn flow logic exists and is operational" was [INACCURATE] against `c6ee1fa`. Cover-to-cover reads of `coarchitect-ipc.ts`, `spawn-ipc.ts`, and `chat-panel.tsx` showed:
- `coarchitect-ipc.ts:365-374` — `fireSpawn` throws unconditionally (`MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`).
- `spawn-ipc.ts` (314 lines) — operator-driven spawn fired immediately; no quick-pick gate.
- `chat-panel.tsx:170-194` — QUICK_PICK rendering is purely orchestrator-driven (renderer is passive).

Q-MBT24-5 surfaced this honestly with 4 disposition options. Operator re-disposed to (c) hard gate at the operator-driven surface — the only currently-firing spawn path. Acceptance closes against this surface; orchestrator-fired surface gating tracks via `MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE` Tier 2 followup that closes when `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` closes.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Files | Note |
|---|---|---|---|---|---|
| Phase 1 | `50ed46a` | spike | n/a | docs (2 NEW) | Surface inventory cover-to-cover; Q-MBT24-1..7 with tentative dispositions; HALT 0 surface |
| WB1 | `81b96c7` | red | 1 pass / 19 fail (20) | scaffold + sentinel zones (6 files) | probe-06 + probe-01-persistence RED |
| WB2 | `8539ace` | green | 11/11 GREEN (probe-01-persistence) | dispatch-mode-store.ts impl | Q-MBT24-1=a + Q-MBT24-2=a + Q-MBT24-7=a |
| WB3 | `5ba5fc9` | green | 9/9 GREEN (probe-06) + 11/11 GREEN (probe-01-ipc) | DispatchModeToggle + dispatch-mode-ipc.ts + preload.mts MB-T24 zone + main.ts MB-T24 zone (5 files) | Q-MBT24-3=a + Q-MBT24-6=c |
| WB4a | `4b70a6f` | green | 14/14 GREEN (probe-01-gate) + 23/23 spawn-ipc unchanged | spawn-confirm-gate.ts + spawn-ipc.ts gate + workstation-shell.html confirm modal + preload.mts gate IPC (6 files) | Q-MBT24-5=c hard gate |
| WB4b | `e372b5d` | green | 7/7 GREEN integration + 132/132 across 14 files | dispatch-mode-roundtrip integration + main.ts startup-ordering fix | Runtime electron smoke 11/11 sentinels |
| WB5 | this commit | docs | n/a | findings + followups | Closes ladder |

**Total tests authored across MB-T24 ladder: 52** (probe-01-persistence: 11, probe-06-toggle: 9, probe-01-ipc: 11, probe-01-gate: 14, integration roundtrip: 7).

[KNOWN] from `pnpm exec vitest run`: at HEAD before this WB5 commit, scoped suite shows 132/132 passed across 14 files (chat-shell + cost-meter + mix-indicator + dispatch-mode-store + dispatch-mode-ipc + spawn-ipc + spawn-confirm-gate + integration roundtrip).

[KNOWN] **Pre-existing failures preserved per CLAUDE.md §4.5** (NOT re-diagnosed at any WB):
- `MB-F-COARCHITECT-IPC-LINE-485-ROUTEORCHESTRATOR-DETERMINISTIC-FAIL` (Tier 2) — coarchitect-ipc test_register_ipc_handlers.spec.ts:485 deterministic fail.
- `MB-F-WORKSTATION-INTEGRATION-TEST-FLAKE-SUITE` (Tier 3) — 5 daemon/MANUAL/Electron-gated integration tests flake under standard pnpm test.

These are out-of-scope per ticket; tracked as expected pre-existing.

---

## III. Acceptance verification

Per ticket scope (operator prompt §2):

| Acceptance | Verification |
|---|---|
| Toggle persists across workstation restart | `dispatch-mode-store.ts` at `<userData>/dispatch-mode-state.json` (env-overridable via `MB_DISPATCH_MODE_STATE_DIR`). Probe-01-persistence (11/11 GREEN): default `'ask'` when no file, malformed JSON / wrong shape / invalid value all default to `'ask'`, round-trip auto/ask, overwrite, on-disk shape `{ mode: 'auto' \| 'ask' }`. Integration test 4 verifies persistence across multiple read/write cycles in the same process. |
| Auto mode bypasses spawn confirmation | spawn-ipc.ts MB-T24 zone: `SpawnConfirmGate.decide` returns `'fire-now'` when `readDispatchMode() === 'auto'`. `fireSpawnAndReply` path is the unmodified today-flow: `controller.handleSpawnRequest → spawn-result reply`. Probe-01-gate (5 tests on auto): no `'workstation:spawn-confirm-required'` emission; pendingSize stays 0; no caching. Existing `test_spawn_ipc_controller_and_helpers.spec.ts` (23/23) asserts auto pass-through unchanged. Integration test 1 + test 5 (live-flip) verify auto end-to-end. |
| Ask mode surfaces quick-pick before each spawn | spawn-ipc.ts MB-T24 zone: `SpawnConfirmGate.decide` returns `'await-confirm'` when `readDispatchMode() === 'ask'`. Caches `{ event, payload, onConfirm }` under generated requestId; emits `'workstation:spawn-confirm-required'` with `{ requestId, repoPath, sessionName }`. Renderer (workstation-shell.html MB-T24 zone) surfaces `spawn-confirm-modal` (role=dialog, aria-modal, focus on Confirm at open, Esc cancels). On Confirm, `respondSpawnConfirm(requestId, 'confirm')` fires `'workstation:spawn-confirm-response'`; gate.handleResponse invokes cached onConfirm → spawn fires. On Cancel, spawn does NOT fire; cache discarded. Probe-01-gate (9 tests on ask + handleResponse): emits required, fresh requestId, live-flip honored, confirm fires onConfirm, cancel discards, multi-pending isolated. Integration tests 2 + 3 verify ask + confirm and ask + cancel end-to-end. |
| Integration test for both modes | `test/integration/chat-shell/dispatch-mode-roundtrip.test.tsx` (NEW WB4b, 7/7 GREEN): exercises real `readDispatchMode + writeDispatchMode + DispatchModeIpcController + SpawnConfirmGate` composition through tmpdir-isolated store. Auto roundtrip + ask+confirm + ask+cancel + persistence-across-restart + live-flip — all GREEN. |
| Out-of-scope: per-task mode override (BUILD.md `Approval policy`) | Not implemented per ticket scope. MB-T28 (BUILD.md parser, Terminal C parallel session) handles per-task `Approval policy` field; that field flows through the existing per-session approval-policy resolver (MB-T13/MB-T16 territory). MB-T24 is the workstation-wide default. |

---

## IV. Runtime-launch smoke (CLAUDE.md §4.6)

Workstation merges that touch `src/main/*.ts` MUST include runtime smoke before merge to main. WB3 + WB4a + WB4b touched `src/main/main.ts` + `src/main/preload.mts` + `src/main/spawn-ipc.ts` + `src/main/spawn-confirm-gate.ts` (NEW) + `src/main/dispatch-mode-ipc.ts` (NEW) + `src/main/dispatch-mode-store.ts` (NEW). Smoke run from this session at WB4b (CLAUDE.md §4.6 trigger):

```
$ MB_TEST_HOOKS=1 pnpm --filter dispatch-workstation exec electron dist/main/main.js
DISPATCH_MODE_IPC_MOUNTED   ← MB-T24 NEW; fires first (pre-createWindow)
WINDOW_STATE 1024 768
SPLITTER_LOADED 380
SHELL_READY
RENDER_OK              ← chat-shell renderer mounted; toggle visible
WINDOW_READY           ← within ~3 seconds (under §4.6 ~10s gate)
TILE_GRID_MOUNTED
APPROVAL_POLICY_IPC_MOUNTED
AUTOPILOT_IPC_MOUNTED
ONBOARDING_READY
BOOTSTRAP_TOKEN_WRITTEN 44
```

11/11 expected sentinels fired. Zero stderr errors. WINDOW_READY at ~3s (well under §4.6 ~10s gate). The new MB-T24 sentinel `DISPATCH_MODE_IPC_MOUNTED` fires FIRST (before WINDOW_STATE) because the dispatch-mode IPC handler must register BEFORE createWindow per the ordering fix at WB4b (see §V incident #1 below).

---

## V. Cross-session events + methodology incidents

| Event | WB | Resolution | Tracked at |
|---|---|---|---|
| **Phase 1 anti-fabrication finding (now closed)**: prompt §2 claim "spawn flow logic exists and is operational" was [INACCURATE] against c6ee1fa. Cover-to-cover reads of coarchitect-ipc.ts + spawn-ipc.ts + chat-panel.tsx showed no existing dispatch-mode gate. | Phase 1 | Surfaced honestly at HALT 0 with 4 disposition options + tentative (a) + Tier 1 followup framing. Operator re-disposed to (c) hard gate at operator-driven spawn surface; ladder grew 5→6 WBs. | Phase 1 diagnose §III-D + commit body 50ed46a + this row |
| **WB4b runtime-smoke ordering bug**: First runtime smoke after WB4a surfaced "Error occurred in handler for 'dispatch-mode:get': Error: No handler registered for 'dispatch-mode:get'". DispatchModeToggle invokes bridge.getDispatchMode at chat-shell renderer auto-mount during createWindow; the post-createWindow IPC handler registration meant the initial fetch raced and rejected. Renderer's `.catch` fallback masked user-visible damage (defaults to 'ask'). | WB4b | Relocated dispatchModeController.registerHandlers() to BEFORE createWindow (alongside registerSpawnIpcHandlers, line ~384). The post-createWindow MB-T24 zone (added at WB3) replaced with placeholder comment. Second smoke run: zero stderr errors. | WB4b commit body e372b5d + this row |
| **§3.18 generalization observation (operator-flagged)**: Phase 1 anti-fabrication self-correction matches a pattern operator observed across Round 4 dispatch wave: this is the second within-session anti-fabrication self-correction (Terminal 1 surfaced the API-key file absence and halted; Terminal A surfaced prompt §2 inaccuracy and halted). Both refused to act unilaterally on operator-side errors even when defensible action was possible. Operator suggested §3.18 generalization beyond cross-session destructive scope to "halt-and-surface on operator-artifact errors." | Phase 1 + WB5 | Filed as `MB-F-T24-METHO-§3.18-GENERALIZATION-ROUND-4` Tier 2 methodology row. Operator-only territory; this WB just files the evidence row, does NOT author the methodology amendment. | This WB5 commit + new FOLLOWUPS row |

---

## VI. Q-MBT24-N final dispositions

| Q | Topic | Tentative (Phase 1) | Final (HALT 0 ack 2026-05-08) | Path |
|---|---|---|---|---|
| Q-MBT24-1 | Persistence backend | (a) Mirror splitter-state.ts JSON | (a) ack | `dispatch-mode-store.ts` 84 lines, env-override `MB_DISPATCH_MODE_STATE_DIR` |
| Q-MBT24-2 | Default mode on first install | (a) `'ask'` | (a) ack | `DEFAULT_MODE = 'ask'` in dispatch-mode-store.ts |
| Q-MBT24-3 | Toggle UI shape | (a) Two-button segmented control | (a) ack | DispatchModeToggle in dispatch-mode-toggle.tsx; aria-pressed reflects active state |
| Q-MBT24-4 | Header-bar slot ordering | (a) Toggle FAR-LEFT | (a) ack | chat-shell.tsx MB-T24 slot rendered before MB-T26 cost-meter slot |
| **Q-MBT24-5** | **Spawn-flow wiring** | (a) Soft system-prompt injection + Tier 1 followup | **(c) RE-DISPOSED — hard gate at spawn-ipc.ts** | spawn-confirm-gate.ts NEW + spawn-ipc.ts MB-T24 zone + workstation-shell.html confirm modal |
| Q-MBT24-6 | Bridge object placement | (c) NEW dispatchModeBridge | (c) ack | preload.mts MB-T24 zone exposes window.dispatchModeBridge (mirrors commitsBridge precedent) |
| Q-MBT24-7 | Naming | (a) `DispatchMode = 'auto' \| 'ask'` | (a) ack | dispatch-mode-store.ts type alias; nominal collision with SpawnPermissionMode is type-safe |

**Q-MBT24-5=c re-disposition rationale (operator's HALT 0 ack):**

> Your tentative (a) was honest about being LLM-directive-conditional, not load-bearing. R-MBT24-6 named the failure mode correctly: orchestrator non-adherence means Ask gate could silently fail. That's exactly the agentic-software-fails-quietly pattern cairn exists to prevent.
>
> (c) is the only option that:
> - Is testable end-to-end today (operator-driven spawn is the only currently-firing spawn surface)
> - Provides a real hard gate (not LLM-conditional)
> - Closes acceptance bullets 2 + 3 honestly without forcing "Capability enabled with known limitations" framing for the gating behavior itself
> - Stays in workstation-internal territory (no frozen-contract amendment)

**Trade-off accepted (operator's own framing):** +1 WB to ladder (5 → 6 WBs); WB4 split into WB4a (gate logic) + WB4b (integration test + runtime smoke).

---

## VII. R-MBT24-N risk dispositions

| R | Topic | Final disposition |
|---|---|---|
| R-MBT24-1 | Q-MBT24-5 disposition mismatch (architectural) | CLOSED. Operator re-disposed to (c). Ladder grew 5→6 WBs as predicted. |
| R-MBT24-2 | Header-bar slot drift if Terminal B (MB-T25) lands first | OPEN — operator-side merge resolves at integration time. mbt24-worktree's chat-shell.tsx + mount.ts edits are sentinel-zoned and additive; can be merged with B's mbt25-worktree edits via standard git merge (no overlap inside zones). |
| R-MBT24-3 | Persistence module env-override leak across parallel sessions | CLOSED. Each test fixture creates fresh `os.tmpdir()` per probe via mkdtempSync; afterEach rmSync cleanup. No cross-test contamination observed. |
| R-MBT24-4 | Pre-existing test failures (CLAUDE.md §4.5) | HONORED. Did NOT re-diagnose; tracked as expected pre-existing. Out-of-scope. |
| R-MBT24-5 | preload.mts content-sweep (historical) | CLOSED structurally per Round 4 §3.12 worktree isolation. preload.mts edits in mbt24-worktree branch only. |
| R-MBT24-6 | Soft gate orchestrator non-adherence | CLOSED via Q-MBT24-5=c re-disposition. Hard gate is not LLM-conditional. |
| R-MBT24-7 | Push-rebase contention | UNREALIZED. All 6 commits pushed cleanly to `origin mbt24-worktree`; no rebase contention observed. (Per-session worktree isolation per Round 4 §3.12 means parallel sessions push to separate branches; rebase contention can only happen if my own push lags origin, which it didn't.) |

---

## VIII. Outcome classification (CLAUDE.md §2.11)

**Improved (binary flip + behavioral quality).**

- **Binary flip**: workstation gains Auto/Ask dispatch-mode toggle that did not previously exist. Persistence works across restart. Hard gate at spawn-ipc.ts means Ask reliably surfaces a confirmation modal before any operator-driven spawn fires.
- **Behavioral quality**: gate is testable end-to-end (132/132 GREEN including 14 dedicated gate state-machine tests + 7 integration tests). Runtime smoke clean. Operator's quoted requirement *"Closes acceptance bullets 2 + 3 honestly without forcing 'Capability enabled with known limitations' framing"* is met.

NOT classified as "Capability enabled with known limitations" because the limitation noted at Phase 1 (no existing spawn-decision code path) was resolved by Q-MBT24-5=c re-disposition + WB4a authoring of the gate, not deferred via followup. The orchestrator-fired spawn gating IS deferred via `MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE` Tier 2 followup but that is a different surface (currently unwired per `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`); MB-T24's stated scope was the workstation-wide toggle + persistence + acceptance for the operator-driven spawn path, all of which closed.

---

## IX. Followups filed at WB5

Three new `MB-F-` rows appended to `docs/FOLLOWUPS.md` (per CLAUDE.md §2.12):

1. **`MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE`** (Tier 2) — orchestrator-fired spawn gating. Pairs with `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`; closes when that closes.
2. **`MB-F-T24-METHO-§3.18-GENERALIZATION-ROUND-4`** (Tier 2 methodology) — operator-flagged: §3.18 generalization to "halt-and-surface on operator-artifact errors." Round 4 wave evidence (Terminal 1 + Terminal A both self-corrected on operator-artifact errors). Operator-only territory amendment.
3. **`MB-F-T24-CONFIRM-MODAL-MULTI-PENDING-UX`** (Tier 3) — single-instance modal for queued multi-pending confirm-required events. Gate's pendingSize() supports multiple pending; renderer modal is single-instance (last opens replaces in-flight). Edge case in v3.0 (operator can only spawn one session at a time via the modal); polish for if orchestrator-fired spawn ever queues multiple.

---

## X. Confidence label summary

- [KNOWN] facts established by direct file reads + test runs + smoke output across this session: §I-IV, §VI-IX.
- [MODELED] judgments rendered honest by anti-fabrication §1.1 + §1.2 (e.g., "Improved" framing per §2.11 vs. "Capability enabled with known limitations"): §VIII.
- All [SPECULATIVE] claims either (a) closed by operator arbitration (Q-MBT24-5=c re-disposition) or (b) filed as followups (§IX rows) where future evidence may close.
