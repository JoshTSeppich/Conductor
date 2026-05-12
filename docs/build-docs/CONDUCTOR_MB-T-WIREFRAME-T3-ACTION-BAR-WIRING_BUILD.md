# MB-T-WIREFRAME-T3-ACTION-BAR-WIRING — Detail-pane action bar end-to-end wiring (kill + diff + merge + focus + bypass-perms indicator + source label)

**Status:** DRAFT-PENDING-OPERATOR-REVIEW
**Date authored:** 2026-05-12
**Authored under:** §3.2 operator-supervised mechanical translation discipline per full-build-mode dispatch `4f0bbde` §3.2. Round 9 of cairn-under-stress.
**Authoring delegate:** T3 sub-session (Opus 4.7) spawned by orchestrator-2026-05-11-1257 (gen-3 PRIMARY) for Phase 1 ticket-body authoring, workstream T3 (Action bar) per dispatch §2 + §4 Phase 1.
**Authoring anchor commit (HEAD at authoring time):** `8eab991`
**Cairn ladder anchor:** Wireframe-parity workstream T3 (Action bar). Builds DIRECTLY on Wave C #3 `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` (body `32c7eee`, WB6 banner `cdf05db`, WB7 docs `3347f48`) which shipped the ActionBar component + 3 IPC channels + failure banner UX. T3 EXTENDS that surface to end-to-end production wiring inside DetailPane plus kill action + bypass-perms indicator + source label.
**Closes:**
- Full-build-mode dispatch `4f0bbde` §2 workstream T3 verbatim scope (lines 94-99).
- Right-pane bottom action bar per dispatch §1 "kill · diff · merge · focus / bypass-perms indicator / dispatch-workstation source label".
- POTENTIALLY co-closes `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 (FOLLOWUPS row at HEAD; filed `3347f48`) IFF Sub-Q-MBTWFT3-F=(i) in-scope is selected. Default is (ii) defer-to-separate-ticket per ship-shy posture.

**Depends on (already merged):**
- Wave C #3 `MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS` — ships `action-bar.tsx` component + `frame-c-ipc.ts` controller + `frameCBridge.{diff,merge,focus}` preload bridge + `WORKSTATION_CONTRACT.md §6.6` consolidated amendment (`0f0e762`) + inline failure banner UX (`cdf05db`).
- `workstation:session-kill` IPC — shipped at MB-T11 WB3 (`session-kill-ipc.ts` + `WorkstationSessionKillRequestSchema` in dispatch-core v3 schema §12 + `workstationBridge.killSession` in `preload.mts:137`). Channel listed in §6.6 preamble line 301 as "predates §6.6"; documentation-debt tracked at `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (Tier 2). **No new §6 amendment required for kill action under Sub-Q-A=(α) — see §3.1.**
- `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE` Wave B — ships `FrameCRoot` + `DetailPane` + `SessionList` + `workstationBridge.readSwarmState`. DetailPane is the integration host for ActionBar mount per dispatch §1 right-pane bottom layout.

**Depends on (NOT YET MERGED but coordinating in parallel):**
- T1 workstream (Session data flow) — owns tile-grid renderer territory. Consumes `frame-c:scroll-to-session` event emitted by `frame-c:focus` handler (`main.ts:577`). Coordination: T3 plumbs the bridge call; T1 ships the tile-grid `ipcRenderer.on('frame-c:scroll-to-session', ...)` subscription (Sub-Q-MBTWFT3-D — operator decides whether T3 or T1 owns subscription).
- T2 workstream (Terminal stream) — owns DetailPane structural changes. ActionBar mount placement INSIDE DetailPane (Sub-Q-MBTWFT3-B=(i) default) is path-overlapping. Coordination via shared FrameCRoot prop chain or DetailPane sub-region; HALT at WB2-PRE-COMMIT if T2 mid-flight on DetailPane.

**Downstream gates:**
- `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` closure (separate ticket per Sub-Q-F=(ii) default) — until lookupSession threads real `{cwd, branchName}` per session, diff/merge/focus button clicks surface `SessionNotFound` in the failure banner. KILL action does NOT depend on lookupSession (uses `tmux has-session` directly via dispatch-core transport — see §1.1 kill semantics).
- Wireframe-target visual diff verification per dispatch §3.5 added auto-ack envelope §C visual-comparison gate.

**Estimated WB count:** 7-9 WBs (1 kill-button RED+GREEN pair + 1 DetailPane-mount RED+GREEN pair + 1 bridge-wiring RED+GREEN pair + 1 bypass-perms-indicator+source-label RED+GREEN pair + 1 docs). Adjustable per Sub-Q-A outcome (β adds WB0 contract commit; γ adds bridge-extension WB).

---

## §0 — Reading protocol

1. Read §1 (scope) + §2 (arbitration anchor — what's binding) first.
2. Read §3 (sub-arbitrations) — SIX operator decisions are pre-execution prerequisites. Sub-Q-A is LOAD-BEARING (potentially gates a `contract:` commit per CLAUDE.md §2.4 BEFORE any GREEN WB). Sub-Q-B + C + D + E + F bind probe + implementation shape OR ticket scope.
3. Read §4 (WB ladder) for execution order. WB0 conditional contract commit gated on Sub-Q-A=(β) OR =(γ).
4. §5-§9 are operational supports — cross-references, self-check expectations, definition-of-done, risk register.
5. §9 closing posture (anomalies surfaced at HALT-TICKET-BODY-PRE-COMMIT).

Confidence labels per CLAUDE.md §2.2 apply throughout: `[KNOWN]` observed in this session via direct source/git read; `[MODELED]` reasoned from observed facts plus a stated model; `[SPECULATIVE]` hypothesis without evidence. Operator-frozen-envelope outcomes are `[KNOWN-OPERATOR-ARBITRATED]` and binding for ticket scope.

---

## §1 — Scope

### §1.1 — What this ticket DOES

`[KNOWN-OPERATOR-ARBITRATED]` per full-build-mode dispatch `4f0bbde` §2 T3 + §1 right-pane bottom action bar:

1. **Add `kill` button to existing `ActionBar` component** (`packages/dispatch-workstation/src/frame-c/action-bar.tsx`). New callback prop `onKill: (sessionName: string) => void`. Renders alongside existing Diff/Merge/Focus buttons. Disabled when `sessionName === null` (same posture as existing 3 buttons). Test-id `action-bar-kill-btn`.

   **Kill semantics:** routes to existing `window.workstationBridge.killSession({sessionName})` per `preload.mts:135-138`. Main-process handler at `session-kill-ipc.ts:229` performs two-step kill: (a) `tmux kill-session -t <sessionName>` via execFile; (b) PATCH `/v2/sessions/:name/state` with `{state:'killed'}` to daemon. SessionKillReply discriminated union: `{ok:true}` OR `{ok:false, error:{error_type:'SchemaValidationError'|'SessionNotFoundError'|'TmuxKillError'|'DaemonUnreachable', ...}}`. **Sub-Q-A=(α) RECOMMENDED**: reuse this existing channel — no §6 amendment required because the channel predates §6.6 per line 301.

2. **Mount `ActionBar` inside `DetailPane`** (`packages/dispatch-workstation/src/frame-c/detail-pane.tsx`). Currently `DetailPane` renders only the swarm-state section content (`extractSwarmStateSection`-output `<pre>`). T3 extends DetailPane to render `ActionBar` at the bottom (Sub-Q-B=(i) default: inside DetailPane bottom-right). DetailPane becomes the integration host for all four `window.frameCBridge.*` + `window.workstationBridge.killSession` calls per audit §4.1 three-tier discipline (DetailPane is MOUNTED-VIA-RENDER-PROP / RENDERER-INTEGRATED-HOST; ActionBar stays bridge-free).

3. **Wire the 4 bridge calls in DetailPane** (or a host-level effect):
   - `onDiff(sessionName)` → `await window.frameCBridge.diff(sessionName)` → on `{ok:true}` show diffText (per Sub-Q-C=(i) default inline-expansion below ActionBar); on `{ok:false}` set `failureState={action:'diff', result}` and pass down to ActionBar's existing failure-banner UX (shipped `cdf05db`).
   - `onMerge(sessionName)` → `await window.frameCBridge.merge(sessionName)` → on `{ok:true, state:'staged'}` show success toast/banner (Sub-Q-C=(i) default inline-success-state); on `{ok:false}` plumb to `failureState` (MergeConflict banner includes `conflictFiles` list per shipped UX).
   - `onFocus(sessionName)` → `await window.frameCBridge.focus(sessionName)` → on `{ok:true}` no UI action needed (writeFrameMode('A') + emit happen main-side); on `{ok:false}` plumb to `failureState`.
   - `onKill(sessionName)` → `await window.workstationBridge.killSession({sessionName})` → on `{ok:true}` clear DetailPane selection (session no longer exists; FrameCRoot's `selectedSessionName` should null-out — handled via host-level effect); on `{ok:false}` plumb SessionKillError to ActionBar failure banner. **Note shape difference**: SessionKillReply uses `error: {error_type, ...}` nested shape; FrameCActionError uses flat `error_type, message`. T3 must adapt SessionKillError → ActionBarFailureState shape (Sub-Q-A binds the adapter shape).

4. **Add bypass-perms indicator** to ActionBar bottom-left. Renders a red triangle warning icon + label "bypass-perms" when the currently-selected session was spawned with `--dangerously-skip-permissions` (i.e., spawn-mode='auto' per `spawn-handler.ts:225-245`). Sub-Q-E determines the data source for the indicator state.

5. **Add `dispatch-workstation` source label** to ActionBar bottom-left (next to bypass-perms indicator). Static text "dispatch-workstation" per wireframe dispatch §1. Renders unconditionally (no Sub-Q).

6. **Coordinate `frame-c:scroll-to-session` consumer** with T1 sibling workstream. Two options under Sub-Q-D: (i) T3 ships the `tile-grid-app.tsx` `ipcRenderer.on(...)` subscription as a one-line additive change (path-overlap with T1); (ii) T3 defers subscription to T1 and surfaces unmet-consumer state at HALT-WB-FOCUS-WIRING-PRE-COMMIT. Default per ship-shy posture: (ii).

7. **Failure-UX plumb-through** for kill action: extend `ActionBarFailureState` type to include `action: 'diff' | 'merge' | 'focus' | 'kill'` and accept a `SessionKillError`-shape result. Per audit §4.1, ActionBar stays bridge-free; DetailPane host catches the SessionKillReply and adapts to ActionBarFailureState. WB ladder includes a RED+GREEN pair for the adapter.

### §1.2 — What this ticket DOES NOT

`[KNOWN-OPERATOR-ARBITRATED]` constraints:

- Does NOT close `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11`. The diff/merge/focus button click paths still surface `SessionNotFound` in the failure banner under realistic dogfood — that's the EXPECTED behavior pre-lookupSession-closure. Closure is separate-ticket territory unless Sub-Q-F=(i) explicitly in-scopes lookupSession wiring (RECOMMENDED: (ii) defer).
- Does NOT modify `frame-c-ipc.ts` handler logic (Wave C #3 territory). Action semantics + result-type discriminated unions + git invocation + writeFrameMode wiring are all shipped + stable.
- Does NOT modify `WORKSTATION_CONTRACT.md §6.6` channel-table entries for `frame-c:diff` / `:merge` / `:focus` (Wave C #3 amendment shipped at `0f0e762`).
- Does NOT modify `session-kill-ipc.ts` handler logic OR `WorkstationSessionKillRequestSchema` (MB-T11 territory; shipped + stable).
- Does NOT amend `WORKSTATION_CONTRACT.md §6` UNLESS Sub-Q-A=(β) [retroactive amendment for kill channel] OR =(γ) [new kill action under frameCBridge]. Default (α) requires no amendment.
- Does NOT implement the diff result rendering as a separate detail-pane sub-region OR external git-difftool launch. Sub-Q-C default (i) inline-expansion-below-ActionBar; (ii) modal / (iii) external are alternates.
- Does NOT modify `session-list.tsx` (T1 territory) OR `tile.tsx`/`tile-grid-app.tsx` chrome (T1+T7 territory). The kill button in ActionBar is the Frame C detail-pane kill control; a SessionList-row-level kill button is T1 scope if desired.
- Does NOT modify `dispatch-core/src/v3/schema.ts` (frozen). All payload shapes already defined: `WorkstationSessionKillRequest` (schema.ts:1030) + frame-c IPC payloads (workstation-local per Wave C #3 territory note).
- Does NOT measure perceptual-density thresholds or run visual-diff against wireframe target. Visual evaluation is operator-driven at WB-FINAL smoke per dispatch §3.5 visual-comparison gate.
- Does NOT modify `chat-shell/`, kanban webview, splitter, header-bar, or any non-Frame-C surface.

---

## §2 — Arbitration anchor (operator-frozen 2026-05-12)

### §2.1 — Dispatch §2 T3 workstream binds scope

`[KNOWN-OPERATOR-ARBITRATED]`

Full-build-mode dispatch `4f0bbde` §2 T3 enumerates verbatim:
> **T3 — Action bar (kill/diff/merge/focus)**
> - `kill` action wiring (new IPC: `workstation:kill-session` — requires contract amendment per §3.4)
> - `diff` action wiring (`frame-c:diff` shipped in 0f0e762; needs UI button + result rendering)
> - `merge` action wiring (`frame-c:merge` shipped; needs UI button + conflict UX inline-banner per Sub-Q-MBTWBDPFA-C=α)
> - `focus` action wiring (`frame-c:focus` shipped; needs UI button + writeFrameMode('A') + scroll)

Dispatch §1 right-pane bottom action bar adds:
> - `kill · diff · merge · focus`
> - `bypass-perms` indicator (red triangle warning)
> - `dispatch-workstation` source label

**Pre-authoring correction observed (anti-fabrication)**: dispatch §2 line 95 says "new IPC: `workstation:kill-session` — requires contract amendment". `[KNOWN]` direct grep of `packages/dispatch-workstation/src/main/preload.mts:135-138` + `session-kill-ipc.ts:229` confirms the channel name is `workstation:session-kill` (hyphenation order: `session-kill`, NOT `kill-session`) AND it ALREADY EXISTS — shipped at MB-T11 WB3. The dispatch text under-recognized the existing channel. This ticket body resolves the discrepancy: Sub-Q-A=(α) RECOMMENDED reuse of existing `workstation:session-kill` channel; NO new IPC amendment required. Operator-arbitrated at HALT-TICKET-BODY-PRE-COMMIT.

### §2.2 — Audit §4.1 three-tier integration discipline is binding

`[KNOWN-AUDIT-FILED-2026-05-09]` + reinforced by Wave C #3 body `32c7eee` §2.2

ActionBar STAYS RENDERER-INTEGRATED tier — receives callback props from DetailPane host; DetailPane (new host for ActionBar mount per Sub-Q-B=(i)) holds the `window.frameCBridge` + `window.workstationBridge` references. ActionBar MUST NOT directly import either bridge.

DetailPane's tier classification: currently RENDERER-INTEGRATED with single bridge access (`workstationBridge.readSwarmState`). T3 promotes DetailPane to MOUNTED-VIA-RENDER-PROP-WITH-MULTI-BRIDGE OR keeps it RENDERER-INTEGRATED with bridge access via `globalThis.window` lookup (current pattern at `detail-pane.tsx:186-192`). Sub-Q-B-implementation-style (RECOMMENDED: same pattern as existing bridge access — RENDERER-INTEGRATED keeps consistency).

### §2.3 — Existing infrastructure ratchets scope

`[KNOWN]` direct source reads at HEAD `8eab991`:
- `action-bar.tsx` 187L — pure React, 3 callback props + failureState — extending by 1 callback + 1 button + 1 indicator + 1 label is ~30-50 line additive change.
- `detail-pane.tsx` 233L — has bridge-lookup pattern (`detail-pane.tsx:186-192`) ready for extension; ActionBar mount is a single `<ActionBar ... />` JSX addition + state management for failureState + bridge call useCallbacks.
- `frame-c-ipc.ts` 364L — handlers stable; no T3 modification.
- `session-kill-ipc.ts` 233L — handlers stable; no T3 modification.
- `main.ts:571-575` — `createDefaultFrameCIpcController({ lookupSession: () => null, ... })` — STUB tracked at `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11`. Diff/Merge/Focus all return `SessionNotFound` under dogfood until production lookup ships (separate ticket).

`[MODELED]` Scope is **structural + wiring**, not algorithmic. Estimated total LOC: ~80-150 lines spread across `action-bar.tsx` (+30L), `detail-pane.tsx` (+50L), `main.ts` (+15L for bypass-perms indicator data source IF Sub-Q-E=(ii) spawn-mode-IPC), `preload.mts` (0L if Sub-Q-A=α; +5L if Sub-Q-A=γ extends frameCBridge with kill), plus probes.

---

## §3 — Sub-arbitrations REQUIRED before specific WBs

SIX operator decisions are pre-execution prerequisites. Surface at HALT-TICKET-BODY-PRE-COMMIT for operator resolution. Sub-Q-A is LOAD-BEARING (gates contract-commit posture). Sub-Q-B + C + D + E bind probe + implementation shape. Sub-Q-F binds ticket scope (defer-vs-include lookupSession wiring).

### §3.1 — Sub-Q-MBTWFT3-A: Kill action IPC channel choice (LOAD-BEARING)

Required **BEFORE ANY GREEN WB**. Default if unresolved: **(α) reuse existing `workstation:session-kill` channel**.

`[KNOWN]` direct evidence:
- `workstation:session-kill` channel exists, registered at `session-kill-ipc.ts:229`.
- `WorkstationSessionKillRequestSchema` in `dispatch-core/src/v3/schema.ts:1030`.
- Bridge: `window.workstationBridge.killSession(payload)` at `preload.mts:137`.
- Reply shape: `SessionKillReply` = `{ok:true} | {ok:false, error: SessionKillError}` where SessionKillError is one of 4 variants (`SchemaValidationError`, `SessionNotFoundError`, `TmuxKillError`, `DaemonUnreachable`).
- §6.6 preamble line 301: channel listed as "predates §6.6"; documentation-debt at `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` Tier 2.

| Option | Posture | Action |
|---|---|---|
| **(α) Reuse `workstation:session-kill` via `workstationBridge.killSession` (RECOMMENDED — ship-shy + zero frozen-surface touch)** | Existing channel suffices. T3 adapts SessionKillReply → ActionBarFailureState (`{action:'kill', result: {ok:false, error_type, message}}`) at the DetailPane host layer. No bridge surface change; no §6 amendment. | DetailPane host catches SessionKillReply, maps `error.error_type` + freeform `reason`/`sessionName` fields → `ActionBarFailureState.result = {ok:false, error_type, message}`. WB ladder unchanged (no WB0). |
| **(β) Reuse channel + retroactively document in §6.6 (additive amendment)** | Channel already exists; T3 closes the §6.6 documentation gap for `workstation:session-kill` specifically (defers other "predates" channels). Operator-arbitrated `contract(MB-T-WIREFRAME-T3-§6-kill-documentation): document workstation:session-kill in §6.6 channel-table form` commit BEFORE WB1. | Adds WB0 `contract:` commit; potentially triggers broader §6.6 drift-audit pull-forward (out-of-scope hard; surface via existing `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT`). |
| **(γ) Add `frameCBridge.kill(sessionName)` as a NEW bridge method routed to existing `workstation:session-kill` channel** | Bridge-surface symmetry: all 4 detail-pane actions go through `frameCBridge`. Renderer-side adapter wraps the existing channel; bridge method signature is `kill(sessionName: string): Promise<KillResult>` where KillResult is a frame-c-shape adapter type. No new IPC channel; bridge-only addition. | Requires §6.6 amendment for the new bridge method (additive — under MB-T17 / MB-T22 / MB-T24 precedent of "renderer↔main IPC channels need §6 documentation only for new channels, not new bridge method names on existing channels"). Defensible to skip §6 amendment if operator considers bridge methods workstation-internal extension points. Operator decision. |

`[MODELED]` Recommend **(α)** because:
1. Zero frozen-surface touch — matches existing shipped precedent (MB-T22/T24/T16/T17 all added IPC without §6 amendment under the lenient interpretation, per Wave C #3 body §3.1).
2. Channel already exists, schema already in dispatch-core v3 (`schema.ts:1030`), bridge already exposed in preload.
3. Asymmetry of bridge surface (kill via `workstationBridge`, diff/merge/focus via `frameCBridge`) is cosmetic; both bridges are present in `globalThis.window` for DetailPane to consume. (β) and (γ) both add WBs without functional benefit.

If (β) or (γ): WB0 contract commit lands BEFORE any GREEN WB per CLAUDE.md §2.4. Amendment text in this body §3.1 appendix [authored as DRAFT under (β) for operator review].

### §3.1.A — DRAFT §6.6 amendment text (for Sub-Q-A=(β) or =(γ) reference)

`[DRAFT-PROVIDED-FOR-OPERATOR-REVIEW]` Operator MAY ratify under (β) OR (γ). Under (α), this draft is unused.

> **§6.6 amendment addendum (T3 contribution under Sub-Q-MBTWFT3-A=(β))**
>
> Per operator-arbitrated amendment 2026-05-12 (under §3.2 operator-supervised mechanical translation framing per CLAUDE.md §3.4 + §2.4 + Wave C #3 amendment `0f0e762` precedent). Adds Channel #5 to the §6.6 table — `workstation:session-kill` retroactive documentation (closes the §6.6-preamble-line-301 documentation-debt entry for this specific channel; other "predates" channels remain queued under `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT`).
>
> #### Channel #5 — `workstation:session-kill` (MB-T11 WB3, retroactive)
>
> | Field | Value |
> |---|---|
> | **Channel name** | `workstation:session-kill` |
> | **Direction** | renderer → main (invoke/handle) |
> | **Payload** | `WorkstationSessionKillRequest` per `dispatch-core/src/v3/schema.ts:1030` — `{ sessionName: string }` (z.object with sessionName non-empty string) |
> | **Response** | `Promise<SessionKillReply>` (discriminated union — see Result Types appendix below) |
> | **Bridge surface** | `window.workstationBridge.killSession(payload: WorkstationSessionKillRequest): Promise<SessionKillReply>` |
> | **Bridge style** | action — extends EXISTING `workstationBridge` (matches `:audit-modal-fetch`, `:open-repo-dialog`, etc.) |
> | **Action** | Two-step: (1) `tmux kill-session -t <sessionName>` via `child_process.execFile`; (2) PATCH `/v2/sessions/:name/state` with `{state:'killed'}` to daemon (DAEMON_URL = `FOXWORKS_DAEMON_URL` env or `http://localhost:7878`). Order: tmux first, daemon second; tmux failure short-circuits before daemon call. |
> | **Pre-check** | `hasSession(sessionName)` via `dispatch-core/dist/transport/tmux.js` — returns `SessionNotFoundError` if not alive (avoids no-op tmux invocation) |
> | **Success** | both steps complete → `{ok: true}` |
> | **Failure modes** | `SchemaValidationError` (invalid payload shape — `field_path` + `reason`); `SessionNotFoundError` (tmux says no such session at hasSession check — `sessionName`); `TmuxKillError` (tmux kill-session returned non-zero — `sessionName` + `reason`); `DaemonUnreachable` (tmux step succeeded BUT daemon PATCH failed — `sessionName` + `reason` + `tmuxKillSucceeded: true` so caller can decide retry-daemon vs surface-inconsistency) |
> | **Consumer** | `src/main/orchestrator-action-handler.ts` (MB-T11 WB5 orchestrator-callable) + `src/frame-c/detail-pane.tsx` callback (T3 territory, this ticket) |
> | **Authoring ticket (original)** | `MB-T11` WB3 (Q-MBT11-3=a) — `session-kill-ipc.ts:1` |
> | **Documentation ticket** | `MB-T-WIREFRAME-T3-ACTION-BAR-WIRING` (this ticket, Sub-Q-A=(β)) — retroactive §6.6 enumeration |
>
> #### Result-type addendum
>
> ```typescript
> // packages/dispatch-workstation/src/main/session-kill-ipc.ts (MB-T11 WB3 exported types)
>
> export type SessionKillError =
>   | { error_type: 'SchemaValidationError'; field_path: string; reason: string }
>   | { error_type: 'SessionNotFoundError'; sessionName: string }
>   | { error_type: 'TmuxKillError'; sessionName: string; reason: string }
>   | { error_type: 'DaemonUnreachable'; sessionName: string; reason: string; tmuxKillSucceeded: boolean };
>
> export type SessionKillReply =
>   | { ok: true }
>   | { ok: false; error: SessionKillError };
> ```
>
> **Shape difference vs FrameCActionError**: SessionKillReply nests error fields under `error: SessionKillError`; FrameCActionError flattens to `{ok:false, error_type, message}`. T3 adapter (`DetailPane` host) maps SessionKillError → `{action:'kill', result: {ok:false, error_type: e.error.error_type, message: e.error.reason ?? e.error.sessionName ?? String(e.error)}}` so ActionBar's existing failure-banner UX (Wave C #3 WB6 `cdf05db`) renders without component changes.
>
> **Frozen-surface authority:** operator-arbitrated per CLAUDE.md §2.4 — Sub-Q-MBTWFT3-A=(β) ratification gate. CC-authored implementation under §3.2 mechanical translation; single `contract(MB-T-WIREFRAME-T3-§6-kill-documentation): retroactively document workstation:session-kill in §6.6` commit per operator-arbitrated commit-grammar 2026-05-12.

### §3.2 — Sub-Q-MBTWFT3-B: ActionBar placement inside DetailPane

Required before **WB1 RED**. Default if unresolved: **(i) inside DetailPane bottom-right (RECOMMENDED).**

Wireframe target shows action bar at bottom-right of right-pane (DetailPane region). Three placement options:

| Option | Layout | Trade-off |
|---|---|---|
| **(i) Inside DetailPane bottom-right (RECOMMENDED)** | `DetailPane` renders `<div>` with flex column: swarm-state `<pre>` (flex:1, overflow:auto) on top + `<ActionBar />` on bottom (`flex-shrink:0`, `border-top`). Bridge calls + failureState live in DetailPane state. | Matches wireframe; DetailPane owns the action bar's lifecycle (mount/unmount when selection changes). Single host component; no FrameCRoot churn. |
| **(ii) Separate footer component mounted by FrameCRoot** | New `frame-c-footer.tsx` component mounted by FrameCRoot in a separate row below the two columns. ActionBar lives inside `FrameCFooter`. Bridge calls + failureState live in FrameCFooter or are lifted to FrameCRoot. | Cleaner separation; FrameCRoot becomes 3-row layout (header / two-col / footer). Adds component file + FrameCRoot churn. |
| **(iii) Header bar (top-right of DetailPane)** | ActionBar lives at top of DetailPane next to session name. | Misfits wireframe; rejected as non-default. |

`[MODELED]` Recommend **(i)** because:
1. Wireframe target shows action bar at bottom-right.
2. DetailPane already has the `selectedSessionName` (mount-gated by FrameCRoot at `frame-c-root.tsx:120-126`). No prop-drilling needed.
3. Minimal scope — single file extension; matches Wave C #3 § "ActionBar integration: ticket #2's detail-pane host calls `window.frameCBridge.diff(sessionName)`" expected seam.
4. T2 (Terminal stream) sibling workstream may add live-terminal rendering to DetailPane; if that lands in parallel, T3 + T2 path-overlap on `detail-pane.tsx`. Coordination at WB2-PRE-COMMIT.

### §3.3 — Sub-Q-MBTWFT3-C: Diff result rendering

Required before **WB-DIFF-WIRING-GREEN**. Default if unresolved: **(i) inline expansion below ActionBar.**

`frame-c:diff` returns `{ok:true, diffText: string}`. Diff text may be thousands of lines. Three rendering options:

| Option | UX | Component complexity |
|---|---|---|
| **(i) Inline expansion below ActionBar (RECOMMENDED default)** | DetailPane renders an additional `<pre data-testid="frame-c-diff-output">` below ActionBar when diff result is present. `<pre>` is scrollable (max-height + overflow). Operator dismisses via a "Clear diff" button or by re-clicking Diff. | Minimal infrastructure; matches existing `<pre>` swarm-state rendering pattern. Long diffs scroll within the pane. |
| **(ii) Modal dialog** | Click Diff → opens modal `<dialog>` with diff text + Close button. Blocks DetailPane interaction until closed. | Adds modal infrastructure; matches existing audit-modal pattern (separate BrowserWindow per `audit-modal/` directory). Heavier scope. |
| **(iii) External `git difftool` launch** | Click Diff → spawns operator's external diff tool via `git difftool`; workstation backgrounds. | Lightest workstation scope; operator-environment-dependent. Pre-shipped Tier 3 followup `MB-F-FRAME-C-DIFF-MERGE-ENV-FALLBACK` (Wave C #3 §5.2 — file at: docs/FOLLOWUPS.md if exists, else surface to T3 closure). |

`[MODELED]` Recommend **(i)** because:
1. Pre-lookupSession-closure (Tier 2 followup unresolved), diff results land as `SessionNotFound` failure-banner; (ii) modal infrastructure churn is wasted scope until lookupSession ships.
2. Inline expansion is the lowest-scope path to operator-visible diff under realistic dogfood.
3. Operator can ratchet to (ii) or (iii) post-dogfood if (i) proves insufficient. Surface Tier 3 `MB-F-FRAME-C-DIFF-RENDERING-RATCHET` if so.

### §3.4 — Sub-Q-MBTWFT3-D: `frame-c:scroll-to-session` consumer

Required before **WB-FOCUS-WIRING**. Default if unresolved: **(ii) defer to T1 sibling.**

`frame-c:focus` handler (`frame-c-ipc.ts:305-340`) emits `frame-c:scroll-to-session` event via `mainWindow.webContents.send('frame-c:scroll-to-session', payload)` (`main.ts:577`). No renderer-side subscriber exists yet — confirmed via grep at HEAD `8eab991`.

| Option | Subscription | Trade-off |
|---|---|---|
| **(i) T3 ships subscription in tile-grid-app.tsx** | `tile-grid-app.tsx` adds `useEffect(() => { ipcRenderer.on('frame-c:scroll-to-session', handler); return () => ipcRenderer.off(...); }, [])` + handler scrolls to / highlights the named session's tile. | T3 owns the renderer wiring end-to-end. Path-overlap with T1 (tile-grid territory) — needs coord. |
| **(ii) Defer to T1 sibling (RECOMMENDED default)** | T3 ships focus button wiring; clicks issue the IPC + writeFrameMode toggles + scroll event fires, but tile-grid does not react until T1 ships subscription. Operator sees Frame A appear (FrameMode toggle) but no scroll-highlight until T1. | Path-disjoint; ship-shy. Surface dependency at WB-FINAL HALT for operator awareness. |
| **(iii) T3 + T1 co-author cross-session commit** | Subscription change lands as part of T1's WB ladder; T3 references the dependency without owning the patch. | Lowest churn; depends on T1 scheduling — possibly out-of-cycle. |

`[MODELED]` Recommend **(ii)** because:
1. T3's primary scope is action bar wiring; tile-grid subscription is T1's territory per dispatch §2 T1 "Tile selection persistence across re-renders + ... real-data wiring".
2. Pre-`MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` closure, even the FrameMode='A' toggle doesn't reach tile-grid subscribers — so even if T3 ships scroll subscription, the user-visible effect is incomplete. Defer is the honest default.
3. `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` will surface as a Tier 3 followup at WB-FINAL if not closed by T1 in this cycle.

### §3.5 — Sub-Q-MBTWFT3-E: bypass-perms indicator data source

Required before **WB-BYPASS-PERMS-INDICATOR-GREEN**. Default if unresolved: **(ii) spawn-mode per session (read from session entry).**

`[KNOWN]` direct source reads:
- `spawn-handler.ts:225-245` — `args.push('--dangerously-skip-permissions')` when spawn-mode='auto'.
- `dispatch-mode-store.ts:33` — `--dangerously-skip-permissions` flag relationship to dispatch-mode.

The wireframe target shows a red triangle "bypass-perms" warning. Three data source options:

| Option | Source | Trade-off |
|---|---|---|
| **(i) Per-session approval policy** | Read `window.workstationBridge.approvalPolicyGet({sessionName})` per MB-T13 approval-policy IPC. Indicator shows when policy = 'bypass' (if such policy exists). | Per-session granularity; requires policy-shape audit (may not have a 'bypass' enum value). |
| **(ii) Spawn-mode per session (RECOMMENDED default)** | Read from the session entry's spawn-mode field (TileGridSessionEntry or spawn-result). Indicator shows when spawn-mode='auto' (i.e., session spawned with `--dangerously-skip-permissions`). | Direct mapping to `--dangerously-skip-permissions` flag; data already in session-state shape per `TileGridSessionEntry`. Need to verify field exists at WB1 — may require small IPC extension OR can be threaded through existing entry shape. |
| **(iii) Global flag from dispatch-mode-store** | Read `window.workstationBridge.dispatchModeGet()`; indicator shows when dispatch-mode='auto'. | Workstation-global indicator (not per-session). Misfits per-session selection semantics. |

`[MODELED]` Recommend **(ii)** because:
1. Direct mapping to wireframe semantics ("bypass perms" = `--dangerously-skip-permissions` flag = spawn-mode='auto').
2. Per-session granularity matches the selected-session context (DetailPane already has `selectedSessionName`).
3. If `TileGridSessionEntry` lacks a `spawnMode` field at HEAD `8eab991`, surface as Tier 2 `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` and either (a) thread through, OR (b) ship-shy default (no indicator, surface gap as followup) — operator decision at WB1.

**Pre-WB1 verification:** read `tile-grid.ts` `TileGridSessionEntry` shape; confirm whether `spawnMode` is present. If absent, raise to HALT-WB1-PRE-RED-GREEN for operator scope decision.

### §3.6 — Sub-Q-MBTWFT3-F: Include lookupSession wiring closure in this ticket?

Required before **WB1 RED scope determination**. Default if unresolved: **(ii) defer to separate ticket.**

`MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 is OPEN at FOLLOWUPS.md row 329. Closure means threading `{cwd, branchName}` per session from TileGridApp's session entries through to `createDefaultFrameCIpcController({lookupSession: ...})` at `main.ts:571-575`.

| Option | Scope | Trade-off |
|---|---|---|
| **(i) Include lookupSession closure in T3 ticket** | Adds 2-3 WBs: (a) probe asserts production `lookupSession` returns non-null for live sessions; (b) GREEN wires session-entry-to-lookup-table in main.ts; (c) integration probe asserts diff/merge/focus button clicks succeed end-to-end (no SessionNotFound). | T3 ships fully-functional Frame C action bar end-to-end. Larger scope; touches main.ts + potentially spawn-handler.ts + IPC channels for cwd/branchName retrieval. |
| **(ii) Defer to separate ticket (RECOMMENDED default)** | T3 ships button-wiring + bridge-call-plumbing + failure-banner UX. Click paths surface `SessionNotFound` until separate ticket closes lookupSession. | Tighter T3 scope; ship-shy. Honest failure-banner UX validates structurally; production action invocation pending. Tier 2 row stays open at FOLLOWUPS row 329. |

`[MODELED]` Recommend **(ii)** because:
1. lookupSession closure requires understanding TileGridApp's session-entry shape + branchName real-data wiring (T1 territory: dispatch §2 T1 "Filter dropdowns → actual filter logic" + "Tile selection persistence"). Possible cross-session coordination with T1.
2. T3 sub-session's primary scope per dispatch §2 is "kill/diff/merge/focus" UI wiring; lookupSession is a known-tracked SEPARATE concern.
3. T3 + lookupSession bundled would expand T3 from 7-9 WBs to 10-12+ WBs, increasing rotation-pressure risk per CLAUDE.md memory `feedback_ladder_internal_three_source.md`.

If (i): WBs 7-9 add probes + GREEN for lookupSession; WB ladder grows accordingly.

---

## §4 — WB ladder

WB count: **7-9 WBs default** under Sub-Q-A=(α) + Sub-Q-B=(i) + Sub-Q-C=(i) + Sub-Q-D=(ii) + Sub-Q-E=(ii) + Sub-Q-F=(ii). Adjustments:
- +1 WB0 contract commit if Sub-Q-A=(β) OR =(γ).
- +1-2 WBs if Sub-Q-D=(i) (T3 ships subscription).
- +2-3 WBs if Sub-Q-F=(i) (T3 closes lookupSession).
- -1 WB if Sub-Q-E=(iii) ship-shy (no indicator, surface as followup).

### WB0 (CONDITIONAL on Sub-Q-A=(β) or =(γ)) — `contract(MB-T-WIREFRAME-T3-§6-kill-documentation): retroactive §6.6 enumeration`

**Type:** contract
**Scope:** Amend `WORKSTATION_CONTRACT.md §6.6` with Channel #5 `workstation:session-kill` per draft text in §3.1.A above. Pathspec-restricted to `WORKSTATION_CONTRACT.md`. Per CLAUDE.md §2.4 operator-arbitrated.
**Acceptance:** Single docs commit; cairn-grammar `contract:` prefix; operator review at HALT-WB0-PRE-COMMIT before any GREEN WB ships.
**Frozen contracts touched:** YES — `WORKSTATION_CONTRACT.md §6` (operator-arbitrated).

### WB1 — `red(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): probe asserts ActionBar accepts onKill callback + renders kill button`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft3-01-kill-button.spec.tsx` (NEW file; happy-dom env via per-file pragma). Render `<ActionBar sessionName='session-foo' onDiff={vi.fn()} onMerge={vi.fn()} onFocus={vi.fn()} onKill={vi.fn()} />` and assert:
- **probe-01a** `[data-testid="action-bar-kill-btn"]` element exists.
- **probe-01b** When `sessionName === null`, kill button renders in `disabled` state.
- **probe-01c** When `sessionName !== null`, kill button renders enabled.
- **probe-01d** Clicking kill button invokes `onKill(sessionName)` with `sessionName` as the argument.
- **probe-01e** Failure banner renders for `failureState = {action: 'kill', result: {ok:false, error_type: 'TmuxKillError', message: 'tmux not running'}}` (extending existing `ActionBarFailureState.action` union to include `'kill'`).

**Acceptance:** Probe RED at HEAD pre-WB2 because `onKill` prop does not exist + `action` union excludes `'kill'`. Per MB-T-HSO-WIRE WB4-revised precedent, use `@ts-expect-error WB1 RED:` comment in probe source.

**Frozen contracts touched:** none — probe-only.

### WB2 — `green(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): ActionBar kill button + extended ActionBarFailureState`

**Type:** green
**Scope:** Extend `packages/dispatch-workstation/src/frame-c/action-bar.tsx`:
- Add `onKill: (sessionName: string) => void` to `ActionBarProps`.
- Add a `[Kill]` button next to existing Diff/Merge/Focus; `data-testid="action-bar-kill-btn"`; disabled when `sessionName === null`.
- Extend `ActionBarFailureState.action` union to include `'kill'`.
- Wrap `onKill` callback with `fireKill` guard mirroring `fireDiff`/`fireMerge`/`fireFocus` pattern.
- Failure-banner rendering re-uses existing `renderFailureBanner` (no changes needed if `action` is just `string` in the banner text).

**Acceptance:** WB1 probes flip RED → GREEN. Workstation typecheck CLEAN.

**Frozen contracts touched:** none.

### WB3 — `red(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): probe asserts DetailPane mounts ActionBar + plumbs callbacks`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft3-03-detail-pane-mounts-action-bar.spec.tsx`. Render `<DetailPane selectedSessionName='session-foo' />` (happy-dom) with `window.frameCBridge` + `window.workstationBridge` stubs that record calls. Assert:
- **probe-03a** `[data-testid="frame-c-action-bar"]` element renders inside DetailPane.
- **probe-03b** Clicking `[data-testid="action-bar-diff-btn"]` invokes `window.frameCBridge.diff` with `'session-foo'`.
- **probe-03c** Clicking `[data-testid="action-bar-merge-btn"]` invokes `window.frameCBridge.merge` with `'session-foo'`.
- **probe-03d** Clicking `[data-testid="action-bar-focus-btn"]` invokes `window.frameCBridge.focus` with `'session-foo'`.
- **probe-03e** Clicking `[data-testid="action-bar-kill-btn"]` invokes `window.workstationBridge.killSession` with `{sessionName: 'session-foo'}` (note payload shape vs frameCBridge which takes bare sessionName).

**Acceptance:** RED at HEAD pre-WB4 because DetailPane does not mount ActionBar.

**Frozen contracts touched:** none — probe-only.

### WB4 — `green(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): DetailPane mounts ActionBar + bridge call plumbing`

**Type:** green
**Scope:** Extend `packages/dispatch-workstation/src/frame-c/detail-pane.tsx`:
- Import `ActionBar` from `./action-bar.js`.
- Add `useState<ActionBarFailureState | null>` for failureState.
- Add `useCallback`s for onDiff/onMerge/onFocus/onKill that:
  - Resolve bridge via `globalThis.window` lookup (mirror existing `WindowWithBridge` pattern at `detail-pane.tsx:106-108`).
  - Call bridge method; await result.
  - On `{ok:true}` clear failureState (Sub-Q-C=(i): for diff, also set diffOutput state for inline render).
  - On `{ok:false}` set failureState (kill adapter: SessionKillError → `{action:'kill', result: {ok:false, error_type: e.error.error_type, message: <derived>}}`).
- Render layout: flex column with swarm-state pre on top (existing) + ActionBar at bottom (new) + optional `[data-testid="frame-c-diff-output"]` pre below ActionBar when diffOutput is non-null.

**Acceptance:** WB3 probes flip RED → GREEN. Workstation typecheck CLEAN.

**Frozen contracts touched:** none (Sub-Q-A=α).

**Pre-WB4 territory check:** `git status --short packages/dispatch-workstation/src/frame-c/detail-pane.tsx` — if T2 sibling has unstaged edits, HALT-WB4-PRE-COMMIT for orchestrator coordination.

### WB5 — `red(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): probe asserts failure-banner plumbing for all 4 actions`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft3-05-failure-banner-plumb.spec.tsx`. Render `<DetailPane>` with bridge stubs that return failure results. Click each action button; assert that ActionBar's failure banner appears with the correct `action` + `error_type` + `message`. Specifically:
- **probe-05a** Diff stub returns `{ok:false, error_type:'NotARepository', message:'not a git repo'}` → banner shows "diff failed: NotARepository — not a git repo".
- **probe-05b** Merge stub returns `{ok:false, error_type:'MergeConflict', message:'auto merge failed', conflictFiles:['a.ts','b.ts']}` → banner shows conflict list `<ul>` with both files (re-uses Wave C #3 WB6 `cdf05db` UX).
- **probe-05c** Focus stub returns `{ok:false, error_type:'FrameModeWriteFailed', message:'disk full'}` → banner shows "focus failed: FrameModeWriteFailed — disk full".
- **probe-05d** Kill stub returns `{ok:false, error:{error_type:'TmuxKillError', sessionName:'session-foo', reason:'tmux not running'}}` → DetailPane adapter maps to `{action:'kill', result:{ok:false, error_type:'TmuxKillError', message:'tmux not running'}}`; banner shows "kill failed: TmuxKillError — tmux not running".
- **probe-05e** Dismiss button on banner clears failureState (banner unmounts).

**Acceptance:** RED at HEAD pre-WB6 because DetailPane adapter does not exist.

**Frozen contracts touched:** none.

### WB6 — `green(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): failure-banner adapter for kill + bridge result handling`

**Type:** green
**Scope:** WB4's GREEN implementation likely already covers most of WB5 via the `useCallback`s. WB6 explicitly:
- Author the SessionKillError → ActionBarFailureState adapter as a top-level pure function at the top of `detail-pane.tsx`:
  ```ts
  function adaptSessionKillFailure(reply: SessionKillReply): ActionBarFailureState | null {
    if (reply.ok) return null;
    const e = reply.error;
    let message: string;
    switch (e.error_type) {
      case 'SchemaValidationError': message = `${e.field_path}: ${e.reason}`; break;
      case 'SessionNotFoundError': message = `session "${e.sessionName}" not found`; break;
      case 'TmuxKillError': message = e.reason; break;
      case 'DaemonUnreachable': message = `daemon unreachable (tmux kill ${e.tmuxKillSucceeded ? 'succeeded' : 'failed'}): ${e.reason}`; break;
    }
    return {action: 'kill', result: {ok: false, error_type: e.error_type, message}};
  }
  ```
- Wire `onKill` callback to call adapter on bridge failure.
- Render diffOutput state for Sub-Q-C=(i) inline-expansion (separate `<pre data-testid="frame-c-diff-output">`).

**Acceptance:** WB5 probes flip RED → GREEN. Consumer non-regression per CLAUDE.md memory: existing frame-c/detail-pane probes (Wave B), action-bar probes (Wave C #3) stay GREEN.

**Frozen contracts touched:** none.

### WB7 — `red(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): probe asserts bypass-perms indicator + source label render`

**Type:** red
**Scope:** RED probe at `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft3-07-bypass-perms-indicator.spec.tsx`. Render `<ActionBar sessionName='session-foo' spawnMode='auto' ... />` (new prop) and assert:
- **probe-07a** `[data-testid="action-bar-bypass-perms-indicator"]` renders when `spawnMode === 'auto'`.
- **probe-07b** Indicator does NOT render when `spawnMode === 'ask'` or `undefined`.
- **probe-07c** `[data-testid="action-bar-source-label"]` renders text "dispatch-workstation" unconditionally.
- **probe-07d** Indicator includes accessible warning role (`role="img" aria-label="bypass-perms warning"` or similar).

**Acceptance:** RED at HEAD pre-WB8 because `spawnMode` prop + indicator + source label do not exist in ActionBar.

**Frozen contracts touched:** none.

### WB8 — `green(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): bypass-perms indicator + source label + DetailPane spawnMode thread-through`

**Type:** green
**Scope:**
- Extend `ActionBarProps` with `spawnMode?: 'auto' | 'ask'` (or matching enum from `dispatch-mode-store.ts`).
- Render bypass-perms indicator (red-triangle SVG OR Unicode `⚠`) + source label per WB7 probe assertions.
- Extend `DetailPane` to thread `spawnMode` to ActionBar. Source per Sub-Q-E=(ii) default: look up from `TileGridSessionEntry` for the selected session. **Pre-WB1 verification finding from §3.5 surfaces here**: if `TileGridSessionEntry.spawnMode` field is absent at HEAD, ship-shy: pass `spawnMode={undefined}` (indicator hidden); file Tier 2 `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` for follow-on.

**Acceptance:** WB7 probes flip RED → GREEN. Workstation typecheck CLEAN.

**Frozen contracts touched:** none.

### WB9 — `docs(MB-T-WIREFRAME-T3-ACTION-BAR-WIRING): findings doc + FOLLOWUPS closures + audit-doc append`

**Type:** docs
**Scope:** Single docs commit (pathspec-restricted per CLAUDE.md §2.7):
1. Findings doc at `docs/coordination/mb-t-wireframe-t3-action-bar-wiring-findings-<date>.md` documenting:
   - Sub-Q resolutions (A-F).
   - lookupSession STUB confirmation (banner-visible SessionNotFound under dogfood).
   - bypass-perms indicator data-source verification (TileGridSessionEntry.spawnMode present/absent at HEAD).
   - Wireframe-target visual-comparison evidence (operator screenshot OR headless if T6 ships first).
2. FOLLOWUPS edits:
   - Re-affirm `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` remains OPEN (Tier 2) — T3 did NOT close it under Sub-Q-F=(ii) default.
   - File Tier 3 `MB-F-FRAME-C-DIFF-RENDERING-RATCHET` if Sub-Q-C=(i) inline shipped (deferred-ratchet placeholder).
   - File Tier 3 `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` if Sub-Q-D=(ii) deferred (T1 territory).
   - File Tier 2 `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` if WB8 surfaces absent field.
3. Audit doc (`docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md`) §6.F append OR new subsection for action-bar wiring shipped.

**Acceptance:** Single docs commit body Q1-Q9.

**Frozen contracts touched:** none.

### WB-FINAL (verification, no commit) — runtime-launch smoke per CLAUDE.md §4.6

Per CLAUDE.md §4.6 runtime-launch smoke discipline:
```
pnpm --filter dispatch-core build
pnpm --filter dispatch-workstation build
pnpm --filter dispatch-workstation exec electron dist/main/main.js
# Observe WINDOW_READY sentinel within ~10 seconds
# Toggle to Frame C (FrameMode='C' via existing toggle)
# Select a session in left rail
# Verify ActionBar renders in DetailPane bottom-right
# Click each button; verify failure banner appears with appropriate message (SessionNotFound expected for diff/merge/focus under lookupSession STUB; TmuxKillError or success for kill if no tmux session exists yet)
# Verify bypass-perms indicator + source label render at bottom-left
```

If runtime-launch smoke surfaces unexpected behavior, file Tier 1 `MB-F-MBTWFT3-RUNTIME-SURFACE-<DESCRIPTOR>` and HALT.

---

## §5 — Cross-references

### §5.1 — Followups closed by this ticket

This ticket closes the dispatch §2 T3 workstream verbatim. Under Sub-Q-F=(ii) default, it does NOT close `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` — that closure is separate-ticket territory.

### §5.2 — Followups likely to surface during this ticket

`[MODELED-SPECULATIVE]`:
- `MB-F-FRAME-C-DIFF-RENDERING-RATCHET` (Tier 3) — placeholder for inline → modal → external-tool escalation if (i) proves insufficient under dogfood.
- `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` (Tier 3) — if Sub-Q-D=(ii) defer, surface this row at WB9 docs.
- `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` (Tier 2) — if WB8 finds the field absent at HEAD, file at WB9 docs.
- `MB-F-MBTWFT3-FAILURE-BANNER-DISMISS-RACE` (Tier 3) — if rapid action-clicking races banner-dismiss state under realistic UI.

### §5.3 — Related shipped tickets (read-required at WB1 start)

| Ticket | Anchor | Read scope at WB1 |
|---|---|---|
| MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS (Wave C #3) | `32c7eee` body + `0f0e762` §6.6 amendment + `cdf05db` WB6 banner + `3347f48` WB7 docs | ActionBar component + frame-c-ipc.ts + §6.6 channel signatures — REQUIRED understanding for kill-button add + DetailPane mount |
| MB-T11 WB3 session-kill IPC | `session-kill-ipc.ts:1-233` + `WorkstationSessionKillRequestSchema` at `dispatch-core/src/v3/schema.ts:1030` + `preload.mts:135-138` | Kill bridge surface + reply shape — REQUIRED for adapter authoring |
| MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE (Wave B) | `frame-c-root.tsx` + `detail-pane.tsx` + `session-list.tsx` | DetailPane host + mount-gating semantics — REQUIRED for WB4 mount |
| MB-T13 approval-policy IPC | `approval-policy-ipc.ts` shipped | (Sub-Q-E=(i) alternate path; only if operator selects (i)) |
| §C.1′ Frame Router (44764fd) | `44764fd` `frame-mode-state.ts` | Background context for `frame-c:focus` action's writeFrameMode('A') call |

### §5.4 — Related FOLLOWUPS rows (read-required)

- `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` (Tier 2, OPEN) — diff/merge/focus dogfood failure path until separate-ticket closure.
- `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2, OPEN) — Frame A render-coherence gap that the focus action exercises end-to-end.
- `MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT` (Tier 2) — relevant if Sub-Q-A=(β) partial-closure path selected.

### §5.5 — Files this ticket READS but DOES NOT MODIFY

- `packages/dispatch-workstation/src/main/frame-c-ipc.ts` — handler logic stable (Wave C #3 territory).
- `packages/dispatch-workstation/src/main/session-kill-ipc.ts` — handler logic stable (MB-T11 territory).
- `packages/dispatch-workstation/src/main/main.ts` — `lookupSession` stub stays per Sub-Q-F=(ii); no T3 modification of `main.ts` IPC registration zone (READ ONLY for territory check; modify only if Sub-Q-E=(ii) requires spawnMode thread-through wiring).
- `packages/dispatch-core/src/v3/schema.ts` — frozen; READ ONLY at §12 for SessionKill schema verification.
- `WORKSTATION_CONTRACT.md §6.6` — READ ONLY (no amendment under Sub-Q-A=(α) default).

### §5.6 — Files this ticket MODIFIES

- `packages/dispatch-workstation/src/frame-c/action-bar.tsx` — kill button + spawnMode prop + bypass-perms indicator + source label + extended ActionBarFailureState.action union.
- `packages/dispatch-workstation/src/frame-c/detail-pane.tsx` — ActionBar mount + bridge call useCallbacks + failureState management + SessionKillError adapter + (optional) inline diff output state.
- `packages/dispatch-workstation/test/unit/frame-c/probe-mbtwft3-*.spec.tsx` (5 NEW probe files per WB1/3/5/7 + future).
- (CONDITIONAL on Sub-Q-A=(β)) `WORKSTATION_CONTRACT.md` §6.6 — Channel #5 addendum.
- `docs/coordination/mb-t-wireframe-t3-action-bar-wiring-findings-<date>.md` (NEW findings doc at WB9).
- `docs/coordination/wireframe-vs-shipped-audit-2026-05-09.md` — §6.F append at WB9.
- `docs/FOLLOWUPS.md` — Tier 2/3 followup rows at WB9.

### §5.7 — Anchor commit at ticket-authoring time

`8eab991` (HEAD at authoring time per gitStatus). Origin/main may advance during this body's authoring; the body's `[KNOWN]` cites are from sources read this session at HEAD `8eab991`.

---

## §6 — Self-check Q1-Q9 per WB commit (CONDUCTOR_API_CONTRACT.md §10.5)

| WB | Q1 (spike?) | Q2 (mocks?) | Q3 (impl-deleted-passes?) | Q4 (outside contract?) | Q5 (frozen mod?) | Q6 (labels?) | Q7 (parallel territory?) | Q8 (bypass PATCH?) | Q9 (halt-unauth?) |
|---|---|---|---|---|---|---|---|---|---|
| WB0 (β/γ only) | N/A | N/A | N/A | No — single docs commit on frozen surface (operator-arbitrated) | YES (§6.6) — operator-arbitrated | KNOWN/MODELED applied | WORKSTATION_CONTRACT.md path-disjoint | N/A | No |
| WB1 RED | N/A — probe-only | BEHAVIOR (happy-dom React render) | No — impl absent | No | No | KNOWN/MODELED applied | test/unit/frame-c/ path-disjoint from T1/T2 territories | N/A | No |
| WB2 GREEN | (see WB1) | BEHAVIOR (real React; no mocks at component layer) | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/action-bar.tsx; path-disjoint | N/A | No |
| WB3 RED | N/A | BEHAVIOR (bridge stubs at window-level; happy-dom env) | No — impl absent | No | No | KNOWN/MODELED applied | test/unit/frame-c/ path-disjoint | N/A | No |
| WB4 GREEN | (see WB3) | BEHAVIOR (real DetailPane; window-bridge stubs only in test env) | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/detail-pane.tsx — coord with T2 if mid-flight | N/A | No |
| WB5 RED | N/A | BEHAVIOR | No — impl absent | No | No | KNOWN/MODELED applied | test/unit/frame-c/ path-disjoint | N/A | No |
| WB6 GREEN | (see WB5) | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/detail-pane.tsx — coord with T2 | N/A | No |
| WB7 RED | N/A | BEHAVIOR | No — impl absent | No | No | KNOWN/MODELED applied | test/unit/frame-c/ path-disjoint | N/A | No |
| WB8 GREEN | (see WB7) | BEHAVIOR | No — impl load-bearing | No | No | KNOWN/MODELED applied | frame-c/action-bar.tsx + detail-pane.tsx + (optional) main.ts; coord with T1 if main.ts | N/A | No |
| WB9 docs | N/A | N/A | N/A | No — docs/coordination/ + docs/FOLLOWUPS.md | No | KNOWN per direct execution evidence | docs paths path-disjoint | N/A | No |

---

## §7 — Definition of done

The ticket is DONE when ALL of the following hold:

1. **(Conditional WB0)** If Sub-Q-A=(β) or =(γ), §6.6 amended via operator-arbitrated `contract:` commit BEFORE any GREEN WB.
2. **WB1+WB2** kill button ships in ActionBar; ActionBarFailureState.action union includes `'kill'`; probes RED→GREEN.
3. **WB3+WB4** DetailPane mounts ActionBar + plumbs all 4 bridge callbacks; probes RED→GREEN.
4. **WB5+WB6** Failure-banner UX renders for all 4 actions including kill (via SessionKillError adapter); probes RED→GREEN.
5. **WB7+WB8** bypass-perms indicator + dispatch-workstation source label render in ActionBar; probes RED→GREEN.
6. **WB9 docs** findings doc + audit-doc append + FOLLOWUPS edits committed.
7. **Consumer non-regression** verified per CLAUDE.md memory `feedback_consumer_non_regression_per_wb.md`: existing frame-c probes (Wave B + Wave C #3) stay GREEN at every WB; tile-grid probes (T1 territory) stay GREEN.
8. **Workstation typecheck CLEAN** per CLAUDE.md §4.4 (`pnpm --filter dispatch-workstation typecheck`).
9. **Dispatch-core build fresh** per CLAUDE.md §3.4 (`pnpm --filter dispatch-core build`) BEFORE workstation typecheck if dispatch-core schemas re-exported (unlikely under (α) default but defensive).
10. **Runtime-launch smoke** per CLAUDE.md §4.6 confirms: launch workstation; toggle to Frame C; select session; ActionBar renders bottom-right with kill button + bypass-perms indicator + source label; clicks surface expected failure banner (SessionNotFound for diff/merge/focus under lookupSession STUB; TmuxKillError or success for kill).
11. **Operator visual verification** against wireframe target image per dispatch §3.5 visual-comparison gate: action bar visible at bottom-right of right-pane; kill+diff+merge+focus buttons present; red-triangle bypass-perms indicator + "dispatch-workstation" label at bottom-left.

---

## §8 — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Dispatch §2 line 95 channel-name miscite (`workstation:kill-session` vs actual `workstation:session-kill`)** | `[KNOWN]` — confirmed via grep this session | `[MODELED-LOW]` — body resolves at §2.1 + §3.1 with Sub-Q-A=(α) reuse default | Anti-fabrication discipline observed at authoring time; body cites direct source. Operator-arbitrated at HALT-TICKET-BODY-PRE-COMMIT. |
| **Sub-Q-A=(β) or =(γ) creates frozen-surface authorship workstream that delays execution** | `[MODELED-LOW]` if (α) default | `[MODELED-MEDIUM]` if (β)/(γ) — adds WB0 + amendment-text review cycle | Default (α). DRAFT amendment text in §3.1.A for operator review at HALT-TICKET-BODY-PRE-COMMIT — minimal additional cycle if operator ratifies. |
| **T2 sibling workstream holds `detail-pane.tsx` territory at WB4/WB6** | `[MODELED-MEDIUM]` — T2 owns DetailPane structural changes per dispatch §2 T2 | `[MODELED-MEDIUM]` (merge friction; per-path commit discipline mitigates) | Pre-WB4 territory check (`git status --short detail-pane.tsx`). HALT-WB4-PRE-COMMIT if contended; coordinate via orchestrator for serialized window. Use pathspec git add (CLAUDE.md §2.7). |
| **`TileGridSessionEntry.spawnMode` field absent at HEAD** | `[MODELED-MEDIUM]` (need to verify at WB1) | `[MODELED-MEDIUM]` (Sub-Q-E=(ii) default fails; need fallback) | At WB1 verification, grep `TileGridSessionEntry` for `spawnMode`. If absent: ship-shy default (`spawnMode={undefined}` → indicator hidden) + file Tier 2 `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` for follow-on. Surface at HALT-WB1-VERIFICATION. |
| **lookupSession STUB makes diff/merge/focus button-click dogfood unsuccessful end-to-end** | `[KNOWN-MEDIUM]` — Tier 2 followup confirms | `[MODELED-MEDIUM]` (operator-visible SessionNotFound under realistic clicks; expected pre-closure) | Sub-Q-F=(ii) default: explicit dogfood expectation = failure banner surfaces. Document in WB9 findings doc + reaffirm followup row. Operator visual verification accepts this as ship-shy state. |
| **Failure-banner shape divergence (FrameCActionError flat vs SessionKillError nested) creates adapter complexity** | `[KNOWN]` — confirmed via direct source read at session-kill-ipc.ts | `[MODELED-LOW]` — adapter is a top-level pure function ~15 lines (§4 WB6 sketch) | Adapter authored at WB6 GREEN as a top-level pure function; unit-testable in isolation. Probe coverage at WB5 ensures regression-detection. |
| **`frame-c:scroll-to-session` consumer-missing creates focus-action half-functional state** | `[KNOWN-MEDIUM]` — confirmed via grep at HEAD | `[MODELED-MEDIUM]` (focus toggles FrameMode but no scroll/highlight until T1 ships subscription) | Sub-Q-D=(ii) default: defer to T1. File Tier 3 `MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING` at WB9 if T1 has not closed in this cycle. Surface at WB-FINAL HALT for operator awareness. |
| **WB7+WB8 bypass-perms indicator data source (Sub-Q-E=(ii)) requires `TileGridSessionEntry` thread-through or new IPC** | `[MODELED-MEDIUM]` | `[MODELED-MEDIUM]` (adds 1-2 WBs if new IPC needed) | Verify at WB1 (§3.5). If new IPC needed, surface at HALT-WB1-VERIFICATION for scope decision (in-scope vs separate-ticket vs ship-shy=hide-indicator). |
| **DetailPane mount + state-management refactor accidentally regresses Wave B swarm-state rendering** | `[MODELED-LOW]` if useEffect on selectedSessionName preserved | `[MODELED-MEDIUM]` (Wave B consumer probes catch regression) | Consumer non-regression per CLAUDE.md memory `feedback_consumer_non_regression_per_wb.md`: run Wave B detail-pane probes at every WB. Surface regression immediately. |
| **Action button click-races (rapid double-click; mid-flight action overlapped by new click)** | `[MODELED-LOW]` under realistic dogfood; `[MODELED-MEDIUM]` under stress | `[MODELED-LOW]` (worst case: failure banner shows wrong action's error) | Out of T3 scope as a hard requirement; file Tier 3 `MB-F-MBTWFT3-FAILURE-BANNER-DISMISS-RACE` at WB9 if surfaced. |

---

## §9 — Closing posture

### §9.1 — Anomalies surfaced at HALT-TICKET-BODY-PRE-COMMIT (for operator awareness)

1. **Dispatch §2 line 95 channel-name miscite resolved**: `workstation:kill-session` per dispatch ≠ actual `workstation:session-kill` channel name shipped at MB-T11 WB3. Sub-Q-MBTWFT3-A=(α) RECOMMENDED reuse — NO new IPC channel + NO §6 amendment.
2. **Sub-Q-MBTWFT3-A operator-pending** (§3.1, LOAD-BEARING): kill IPC channel choice. (α) reuse RECOMMENDED. (β) retroactive §6.6 amendment for kill OR (γ) new frameCBridge.kill method both add WB0.
3. **Sub-Q-MBTWFT3-B operator-pending** (§3.2): ActionBar placement. (i) inside DetailPane bottom-right RECOMMENDED.
4. **Sub-Q-MBTWFT3-C operator-pending** (§3.3): diff result rendering. (i) inline-expansion RECOMMENDED.
5. **Sub-Q-MBTWFT3-D operator-pending** (§3.4): `frame-c:scroll-to-session` consumer. (ii) defer-to-T1 RECOMMENDED.
6. **Sub-Q-MBTWFT3-E operator-pending** (§3.5): bypass-perms indicator data source. (ii) spawn-mode-per-session RECOMMENDED; verification of `TileGridSessionEntry.spawnMode` field required at WB1.
7. **Sub-Q-MBTWFT3-F operator-pending** (§3.6): include lookupSession closure in T3? (ii) defer-to-separate-ticket RECOMMENDED.
8. **Stale-dispatch detection per CLAUDE.md memory `feedback_stale_dispatch_detection.md`**: confirmed dispatch §2 T3 work is OPEN at HEAD — `8eab991` HEAD shows action-bar.tsx but no DetailPane mount, no kill button, no bypass-perms indicator. Dispatch is current, not stale.

### §9.2 — Authoring-time stats (for HALT-TICKET-BODY-PRE-COMMIT surface)

| Stat | Value |
|---|---|
| Authoring-anchor HEAD | `8eab991` |
| Files READ (no modification) | 9: `full-build-mode-dispatch.md` (§§0-9, 369L), `action-bar.tsx` (187L), `frame-c-ipc.ts` (364L), `session-kill-ipc.ts` (233L), `preload.mts` (peek for killSession), `WORKSTATION_CONTRACT.md` §6.6 (~150L), `CONDUCTOR_MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS_BUILD.md` (440L; format anchor), `detail-pane.tsx` (233L), `frame-c-root.tsx` (131L) |
| Files GREP'd | main.ts (sentinel zones + lookupSession + scroll-to-session), preload.mts (kill bridge), session-kill, bypass-perms, FOLLOWUPS.md (lookupSession stub row) |
| Sub-Qs surfaced for operator decision | 6 (A: kill IPC choice; B: ActionBar placement; C: diff rendering; D: scroll-to-session consumer; E: bypass-perms data source; F: lookupSession scope) |
| WB count range | 7-12 (default 7-9; +1 if WB0 contract commit; +2 if Sub-Q-F=(i) lookupSession included) |
| Estimated total LOC for GREEN WBs | ~120-180 lines (action-bar.tsx +40L kill+indicator+label; detail-pane.tsx +70L mount+bridge+adapter+failureState; main.ts +0-15L conditional on Sub-Q-E spawnMode path) + ~150-250 lines of probes |
| Frozen surface touches | 0 if (α); 1 if (β); 1 if (γ) — `WORKSTATION_CONTRACT.md §6.6` amendment via WB0 |
| Anti-fabrication catch | Dispatch §2 channel-name `workstation:kill-session` (incorrect) → actual `workstation:session-kill`. Verified via direct grep. Body resolves at §2.1 + §3.1. |

### §9.3 — Parallel-CC viability

T3 ticket-body authoring (this commit) IS path-disjoint and parallel-CC viable: touches NEW `docs/build-docs/CONDUCTOR_MB-T-WIREFRAME-T3-ACTION-BAR-WIRING_BUILD.md` only.

T3 EXECUTION path-overlap analysis:
- `frame-c/action-bar.tsx` — path-disjoint from T1/T2/T4-T7.
- `frame-c/detail-pane.tsx` — PATH-OVERLAP with T2 (Terminal stream) — coord required at WB4/WB6/WB8.
- `tile-grid-app.tsx` — PATH-OVERLAP with T1 (Session data flow) — coord required IFF Sub-Q-D=(i) (default (ii) avoids overlap).
- `main.ts` — PATH-OVERLAP with multiple sessions (high contention zone) — coord required IFF Sub-Q-E spawnMode IPC needs new wiring OR Sub-Q-F=(i) lookupSession in-scope (default (ii) avoids overlap).
- `dispatch-core/src/v3/schema.ts` — NO TOUCH (frozen).
- `WORKSTATION_CONTRACT.md` — NO TOUCH if Sub-Q-A=(α) (default); TOUCH if (β)/(γ).

Path-overlap mitigations: per-path `git add` (CLAUDE.md §2.7), pre-WB territory check (`git status --short`), pathspec-restricted commits.

---

**End of MB-T-WIREFRAME-T3-ACTION-BAR-WIRING ticket body.**

Pending operator resolutions before execution: Sub-Q-A (§3.1 kill IPC channel choice; LOAD-BEARING) + Sub-Q-B (§3.2 ActionBar placement) + Sub-Q-C (§3.3 diff rendering) + Sub-Q-D (§3.4 scroll-to-session consumer) + Sub-Q-E (§3.5 bypass-perms data source) + Sub-Q-F (§3.6 lookupSession scope).
