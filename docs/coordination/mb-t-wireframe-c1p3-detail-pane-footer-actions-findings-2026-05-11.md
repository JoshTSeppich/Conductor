# MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS Findings — 2026-05-11

**Ticket:** MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS — `diff` / `merge` / `focus` ActionBar in the Frame C detail-pane footer
**Body anchor:** `32c7eee docs(MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS): authored ticket body per Gate-W3 Batch 1 PHASE 1 continuation 2026-05-11`
**Executing session:** `c5-ticket-wb1` (Wave C #3 executor; T3)
**Orchestrator:** `orchestrator-2026-05-11-1257` (gen-3)
**WB ladder:** 7 commits across coord note + 6 WBs (WB1 RED + WB2 GREEN + WB3 RED + WB4 GREEN + WB5 RED + WB6 GREEN + WB4-followup + WB7 docs); WB0 contract commit not needed under Sub-Q-A=(β-consolidated) since the consolidated §6 amendment landed at `0f0e762` as a shared ship with Wave B.

**Operator-arbitrated Sub-Q resolutions (orchestrator-relay autonomous-mode (b)-pattern 2026-05-11):**

| Sub-Q | Resolution | Notes |
|---|---|---|
| Sub-Q-MBTWBDPFA-A | **(β-consolidated)** | 1 Wave B `workstation:read-swarm-state` + 3 Wave C #3 `frame-c:{diff,merge,focus}` channels merged into single §6 amendment `0f0e762` |
| Sub-Q-MBTWBDPFA-B-diff | **(i)** | `git diff main...<branch>` via child_process |
| Sub-Q-MBTWBDPFA-B-merge | **(i)** | `git merge --no-commit --no-ff <branch>` + operator-confirm-on-conflict |
| Sub-Q-MBTWBDPFA-B-focus | **(i)** | `writeFrameMode('A')` + scroll-to-session event emit |
| Sub-Q-MBTWBDPFA-C | **(α)** | Inline-banner failure-UX inside ActionBar (role="alert" + conflictFiles `<ul>`) |
| Sub-Q-MBTWBDPFA-D | **(α)** | NEW `frameCBridge` (per-IPC-family convention; coexists with `workstationBridge.readSwarmState`) |

**Cairn ladder (8 commits total):**

| Step | Commit | Type | Surface |
|---|---|---|---|
| Coord note | `9fe6358` | docs | Channel signatures for T4-successor's consolidated §6 amendment |
| WB1 | `07a7d93` | red | probe-mbtwbdpfa-01 ActionBar render contract (6 it-blocks) |
| WB2 | `cde9308` | green | `frame-c/action-bar.tsx` — RENDERER-INTEGRATED bridge-free component |
| WB3 | `c631d74` | red | probe-mbtwbdpfa-03 IPC controller + 3-channel contract (6 it-blocks) |
| WB4 | `48032cf` | green | `main/frame-c-ipc.ts` (NEW, 363 LOC) + `preload.mts` `frameCBridge` |
| WB5 | `9524372` | red | probe-mbtwbdpfa-05 inline-banner failure-UX (6 it-blocks; 5 RED + 1 trivial-pass) |
| WB6 | `cdf05db` | green | `action-bar.tsx` extension — `failureState` + `onDismissFailure` props + banner JSX |
| WB4-followup | `3347f48` | green | `main.ts` registerFrameCIpc call site (post-Wave-B-WB10-GREEN unblock `ea11bc7`) |
| WB7 | (this commit) | docs | findings + audit §6.F append + `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB` Tier 2 filing |

**Sequencing notes:**

1. **Hard external dependencies** (cleared during execution):
   - WB1 RED + body §0 Depends-On: Wave B WB8 GREEN (DetailPane component) MUST land before WB1 RED authoring. Cleared at `525c502` 2026-05-11.
   - WB4-followup main.ts wiring: Wave B WB10 GREEN MUST land before main.ts edit. Cleared at `ea11bc7` 2026-05-11.
   - §6 amendment: T4-successor's consolidated commit must land before any GREEN WB. Cleared at `0f0e762` 2026-05-11.

2. **Out-of-order ship:** WB4-followup main.ts wiring shipped AFTER WB5+WB6 failure-UX (rather than immediately after WB4 GREEN) because of the Wave B WB10 GREEN hard-dependency. WB5+WB6 was path-disjoint from Wave B WB10 (action-bar.tsx extension only); shipped during the wait window per dispatch envelope.

---

## I — What Shipped

`[KNOWN]` Per direct read + probe evidence at HEAD `3347f48`:

**Renderer-side component** (`packages/dispatch-workstation/src/frame-c/action-bar.tsx`):
- `ActionBar` React component: RENDERER-INTEGRATED + bridge-free per audit §4.1 three-tier discipline.
- Props: `sessionName: string | null`, `onDiff` / `onMerge` / `onFocus: (string) => void` callbacks, optional `failureState: ActionBarFailureState | null` (WB6 extension), optional `onDismissFailure: () => void` (WB6 extension).
- Three buttons with stable testids: `action-bar-{diff,merge,focus}-btn`. `disabled={sessionName === null}` for no-op posture. Callback wrappers (`fireDiff`/`fireMerge`/`fireFocus`) guard against accidental keyboard/programmatic invocation on disabled buttons.
- Inline failure-banner (WB6): conditional `role="alert"` + `data-testid="action-bar-failure-banner"` element with action-name + error_type + message + optional `<ul><li>` for `MergeConflict.conflictFiles` + Dismiss button (`data-testid="action-bar-failure-dismiss"`).
- `extractConflictFiles` runtime-narrowing helper for the MergeConflict sub-branch (FrameCActionError base typing carries optional `conflictFiles` only on MergeConflict per discriminated union).

**Main-process IPC controller** (`packages/dispatch-workstation/src/main/frame-c-ipc.ts`):
- `FrameCIpcController` class: Controller-with-DI-seam pattern mirroring `dispatch-mode-ipc.ts` (MB-T24) + `commits-ipc.ts` (MB-T22).
- `FrameCIpcDeps` interface: 4 fields — `lookupSession` + `emitScroll` + `writeFrameMode` + optional `runGit`.
- Three handlers (`handleDiff` / `handleMerge` / `handleFocus`) wired via `ipcMain.handle('frame-c:diff'|'frame-c:merge'|'frame-c:focus', ...)`.
- `DiffResult` / `MergeResult` / `FocusResult` discriminated-union types on `ok: boolean` tag per coord note `9fe6358` §4 schema.
- Error taxonomies per coord note `9fe6358` §3:
  - `DiffResult` errors: `SessionNotFound` / `NotARepository` / `BranchNotFound` / `GitInvocationFailed`
  - `MergeResult` errors: `SessionNotFound` / `MergeConflict` (with `conflictFiles[]` parsed from stdout/stderr) / `NotARepository` / `NothingToMerge` / `DirtyWorkingTree` / `GitInvocationFailed`
  - `FocusResult` errors: `SessionNotFound` / `FrameModeWriteFailed`
- `defaultRunGit` production executor: `child_process.spawn('git', args, { cwd })` with stdout/stderr collection + exit-code handling + spawn-system-error fallthrough.
- `createDefaultFrameCIpcController(deps)` factory.

**Renderer-side bridge** (`packages/dispatch-workstation/src/main/preload.mts` `frameCBridge` addition):
- `contextBridge.exposeInMainWorld('frameCBridge', {diff, merge, focus})` — each method invokes `ipcRenderer.invoke('frame-c:<action>', {sessionName})`.
- Sentinel-zoned per CLAUDE.md §3.3. Coexists with `workstationBridge.readSwarmState` (Wave B `525c502`) per per-IPC-family convention.

**Main-process wiring** (`packages/dispatch-workstation/src/main/main.ts`):
- Imports zone: `createDefaultFrameCIpcController` from `./frame-c-ipc.js`.
- Body zone (inside `app.whenReady().then(...)` block, after Wave B's WB10 `MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE wiring` zone): `createDefaultFrameCIpcController({...}).registerHandlers(ipcMain)` factory call.
- Deps wired: STUB `lookupSession: () => null` (production hookup deferred per `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB` Tier 2 filed in this WB7 commit); real production `emitScroll` via `mainWindow.webContents.send('frame-c:scroll-to-session', ...)`; real production `writeFrameMode` from `frame-mode-state.ts`; `runGit` omitted → defaults to `defaultRunGit` in `frame-c-ipc.ts`.

**Tests** (3 new probes, 18 it-blocks total):
- `test/unit/frame-c/probe-mbtwbdpfa-01-action-bar-renders.spec.tsx` — 6 it-blocks (ActionBar render contract + callback invocation)
- `test/unit/frame-c-ipc/probe-mbtwbdpfa-03-ipc-channels.spec.ts` — 6 it-blocks (FrameCIpcController contract + 3-channel registration + discriminated-union result shape)
- `test/unit/frame-c/probe-mbtwbdpfa-05-failure-ux.spec.tsx` — 6 it-blocks (inline-banner failure UX)

---

## II — Q-disposition (sub-arbitrations)

All 4 Sub-Q resolutions surfaced at HALT-MBTWBDPFA-AUTHORED + resolved at orchestrator-relay 2026-05-11 (autonomous-mode (b)-pattern). No new arbitration surfaced during execution.

One **deferral** acknowledged in WB4-followup commit body: `lookupSession` production hookup requires TileGridApp ↔ main session-shape exposure that doesn't exist today. Filed as Tier 2 followup in this WB7 commit (`MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB`). Component contract + IPC contract + bridge contract all shipped; production end-to-end action invocation requires the lookup wire-up.

---

## III — Architectural deltas

`[KNOWN]` direct-read summary:

1. **Three new IPC channels under `frame-c:*` namespace** per consolidated §6 amendment `0f0e762`. Per-IPC-family bridge convention preserved: `frameCBridge` is a top-level world binding separate from `workstationBridge` (which Wave B extended with `readSwarmState`). Bridge ratio: `frameCBridge` for Frame-C-specific actions; `workstationBridge` for workstation-meta-info.

2. **Discriminated-union result types** as a new pattern in the workstation IPC catalog. Prior IPC controllers (MB-T16/22/24) returned typed-error envelopes per WORKSTATION_CONTRACT.md §6.5; this ticket's `DiffResult` / `MergeResult` / `FocusResult` extend that convention with action-specific success-shape fields (`diffText` / `state` + `message` / `message`) and action-specific error-taxonomy enums. The shape is consumed by ActionBar's `failureState` prop for inline-banner rendering (Sub-Q-C=α).

3. **Three-tier integration discipline preserved** per audit §4.1 strategic finding. ActionBar is RENDERER-INTEGRATED (no `window.frameCBridge.*` access at component layer; host catches callbacks and routes to bridge). Bridge access lives at the detail-pane host level (T4-successor's territory; integration site is the future call chain).

4. **No frozen-surface modifications in this ticket** beyond consuming `0f0e762`'s amendment. REGISTRY.md §2 + CONDUCTOR_API_CONTRACT.md + `dispatch-core/src/v3/schema.ts` §1-§13 untouched. WORKSTATION_CONTRACT.md §6 was amended in the consolidated Wave B + Wave C #3 ship at `0f0e762` (HARD ESCALATION operator-arbitrated).

5. **Production deps deferral pattern** mirrors ticket #4 (`MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE` `30e362c`): component + IPC + bridge contracts ship; cross-component integration deferred to a follow-on commit/ticket gated on existing surfaces (`tile-grid-app.tsx` FrameMode subscription for #4; `lookupSession` host-bridge for #3). Same posture, same Tier 2 followup filing pattern.

---

## IV — Probe distribution

| Probe file | Location | it-blocks | Behavior covered |
|---|---|---|---|
| probe-mbtwbdpfa-01 | `test/unit/frame-c/` | 6 | ActionBar render contract (data-testid root + 3 button testids + disabled-when-null + enabled-when-non-null + callback-invocation-with-sessionName) |
| probe-mbtwbdpfa-03 | `test/unit/frame-c-ipc/` (NEW dir) | 6 | FrameCIpcController class + registerHandlers + 3 channel registrations + discriminated-union result-shape per channel |
| probe-mbtwbdpfa-05 | `test/unit/frame-c/` | 6 | inline-banner failure UX (no-banner default + banner role=alert + banner text + Dismiss testid + Dismiss callback + MergeConflict `<ul><li>` rendering) |

**Total: 18/18 GREEN at HEAD `3347f48`** (vitest 16:44:06, 404ms across 3 probes).

---

## V — Followups filed at this commit

| Followup | Tier | Rationale |
|---|---|---|
| `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` | 2 | `lookupSession` stub returns null → every action invocation returns `SessionNotFound` until TileGridApp ↔ main session-shape exposure ships. Component contract + IPC contract + bridge contract all shipped; production wiring deferred. Same posture as ticket #4's `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11`. |

No other followups surfaced during execution. The body §5.2 speculative followups (`MB-F-FRAME-C-DIFF-MERGE-ENV-FALLBACK` etc.) did not materialize at this ship — diff/merge action semantics are pinned to `child_process` git invocation per Sub-Q-B=(i); operator-environment-dependent fallback would only surface during dogfood evidence under production lookup.

---

## VI — Outcome classification

**Capability enabled with known deferred production wiring** (per CLAUDE.md §2.11):

- Component contract: KNOWN GREEN per 6 probes (probe-mbtwbdpfa-01).
- IPC controller contract: KNOWN GREEN per 6 probes (probe-mbtwbdpfa-03).
- Failure-UX inline-banner: KNOWN GREEN per 6 probes (probe-mbtwbdpfa-05).
- Bridge exposure (`frameCBridge`): KNOWN per direct preload.mts read.
- main.ts wiring registered: KNOWN per direct main.ts read.
- Production-action end-to-end: NOT KNOWN per stub `lookupSession`. Operator click in detail-pane will surface `SessionNotFound` inline banner; visual UX verifies end-to-end IPC roundtrip + banner rendering. Real diff/merge/focus action execution requires `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` Tier 2 closure (separate follow-on commit/ticket).

---

**End of MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS findings doc.**
