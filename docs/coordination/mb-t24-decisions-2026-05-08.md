# MB-T24 Decisions — Auto/Ask mode toggle (operator-skim review surface)

**Date:** 2026-05-08
**Companion to:** `mb-t24-diagnose-2026-05-08.md` (full evidence; this doc is the skim layer)
**Worktree:** `~/Desktop/Automata/foxworks-dispatch-mbt24/` (branch `mbt24-worktree`)
**Status:** Awaiting operator ack at HALT 0.

---

## Top-line ask

Operator ack on Q-MBT24-1..7 dispositions before WB1. Q-MBT24-5 is the architectural decision: ALL OTHER dispositions are mechanical given that one.

---

## Tentative dispositions (one-line each)

| Q | Topic | Tentative | Rationale |
|---|---|---|---|
| Q-MBT24-1 | Persistence backend | (a) Mirror `splitter-state.ts` JSON pattern | Matches CLAUDE.md §3.5 convention; single global toggle, not keyed |
| Q-MBT24-2 | Default mode on first install | (a) `Ask` | Matches spawn-handler.ts:88 "operator opts INTO 'auto' consciously" precedent |
| Q-MBT24-3 | Toggle UI shape | (a) Two-button segmented control | Cleanest visual sibling to cost-meter slot in chat-shell-header-bar |
| Q-MBT24-4 | Header-bar slot ordering | (a) Toggle FAR-LEFT | Operator-control priority; prompt §4 recommendation |
| **Q-MBT24-5** | **Spawn-flow wiring** | **(a) System-prompt injection + Tier 1 followup for hard gate** | **Honest framing per anti-fabrication §III-D evidence** |
| Q-MBT24-6 | Bridge object placement | (c) NEW `dispatchModeBridge` exposure | Mirrors `commitsBridge` precedent; clean separation |
| Q-MBT24-7 | Naming | (a) `DispatchMode = 'auto' \| 'ask'` | Preserves natural-language alignment + UI labels; collision is typographic |

---

## Q-MBT24-5 in detail (THE decision)

**Why this matters.** Prompt §2 (line 108) asserts "spawn flow logic exists and is operational." After cover-to-cover reads of `coarchitect-ipc.ts` (441 lines) + `spawn-ipc.ts` (314 lines) + `chat-panel.tsx` QUICK_PICK render path, I report this claim is [INACCURATE]:

- `coarchitect-ipc.ts:365-374` — `fireSpawn` throws unconditionally; orchestrator-fired spawn IS NOT WIRED in v3.0 (`MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED`).
- `spawn-ipc.ts` — operator-driven spawn fires immediately on `workstation:spawn-requested`; no quick-pick gate.
- `chat-panel.tsx:170-194` — QUICK_PICK rendering is purely orchestrator-driven (renderer is passive; orchestrator decides whether to emit `QUICK_PICK:` markers).

**There is no existing dispatch-mode-aware code path** for me to wire MB-T24's toggle into. Acceptance bullets 2 + 3 (Auto bypasses / Ask surfaces) require either:

- (a) **Soft gate via system-prompt injection** — orchestrator reads `dispatchMode` from context, emits/omits `QUICK_PICK:` markers based on directive. Adherence is LLM-directive-conditional, not load-bearing. **Tentative recommended.**
- (b) **Hard gate at action-fire route** — intercept `kind: 'action-fire-without-card'` when `dispatchMode === 'ask'`, emit synthetic `QUICK_PICK:` chat message, defer real fire until operator clicks "confirm." Hard gate; non-trivial state-threading; can't be exercised against orchestrator-fired spawn (which throws).
- (c) **Hard gate at operator-driven spawn** — wire at `spawn-ipc.ts` `workstation:spawn-requested` handler. Confirmation modal/quick-pick before tmux spawn. Greenfield gate at the only currently-firing spawn surface.
- (d) **Defer all spawn-flow wiring** — UI + persistence + bridge only; bullets 2 + 3 deferred via `MB-F-T24-SPAWN-FLOW-WIRING` Tier 1. Honest "Capability enabled with known limitations" framing.

**My tentative: (a) + Tier 1 followup `MB-F-T24-SPAWN-FLOW-HARD-GATE`.** Reasoning:
1. (a) is the lightest touch that delivers visible "Auto vs Ask" semantics through the orchestrator's existing QUICK_PICK mechanism.
2. The hard-gate work (b) and (c) is best authored as a separate ticket with its own ladder; conflating it into MB-T24 inflates scope past "5 WBs single session."
3. Honest framing per CLAUDE.md §2.11: "Capability enabled with known limitations" — toggle ships, persistence ships, bridge ships, soft gate ships, hard gate is followup.

**If operator wants stricter scope**, escalate to (c) as the testable-today path: gate at `spawn-ipc.ts`. Bullets 2+3 then become testable end-to-end via integration test that spawns and asserts modal-vs-no-modal. WB ladder grows to 6 WBs (WB4 splits: 4a wires the gate, 4b authors the integration test).

---

## Open ack-needed items

For each of the 7 questions: "ack tentative" or "re-dispose to (X)".

For Q-MBT24-5 specifically: please pick (a), (b), (c), or (d). Affects WB ladder size + frozen-territory scope.

---

## What changes if operator re-disposes Q-MBT24-5

| Re-disposition | WB ladder impact | New file/territory touched |
|---|---|---|
| (b) hard gate at action-fire | +0 WBs (fits in WB4); +scope in coarchitect-ipc.ts | coarchitect-ipc.ts (action-fire route, +20-40 lines, sentinel-zoned) |
| (c) hard gate at operator-driven spawn | +1 WB (WB4 splits 4a/4b); spawn-ipc.ts territory | spawn-ipc.ts (sentinel zone), maybe a new modal renderer or extend existing |
| (d) defer all wiring | -1 WB (skip WB4 wiring); ship UI+persistence+bridge only | None — followup-only |

---

## What does NOT change regardless of Q-MBT24-5 disposition

- Q-MBT24-1 persistence backend (file-JSON)
- Q-MBT24-2 default mode (Ask)
- Q-MBT24-3 toggle UI shape (segmented)
- Q-MBT24-4 slot ordering (far-left)
- Q-MBT24-6 bridge object (`dispatchModeBridge`)
- Q-MBT24-7 naming (`'auto' | 'ask'`)
- Sentinel zone in chat-shell.tsx (sibling to MB-T26/T27 inside MB-T22 outer zone)
- WB1 RED scaffold scope
- WB5 docs scope

---

## Commit + push plan post-ack

After ack:
1. WB1 RED — scaffold + RED probes + sentinel zones. Atomic-chain commit per §1.4. Push to `origin mbt24-worktree`.
2. WB2 GREEN — persistence module impl + probe-01 GREEN.
3. WB3 GREEN — toggle UI + bridge methods + IPC handlers + probe-06 GREEN.
4. WB4 GREEN — spawn-flow wiring per Q-MBT24-5 disposition + integration test + runtime smoke per CLAUDE.md §4.6.
5. WB5 docs — findings + followups + outcome classification.

Per §1.5 every commit uses explicit per-path `git add`, never `-A`.
Per §1.8 every commit body answers Q1-Q9 self-check; Q7 cites worktree isolation per Round 4 §3.12.
Per §1.4 atomic-chain template handles push-rebase contention with Terminal B's parallel pushes to its own branch (which lands operator-side at integration time anyway).
