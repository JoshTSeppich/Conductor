# Wave C #3 — channel signatures for consolidated `WORKSTATION_CONTRACT.md` §6 amendment

**Date:** 2026-05-11
**Ticket:** MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS (body `32c7eee`)
**Operator-arbitrated Sub-Qs (orchestrator-relay autonomous-mode (b)-pattern 2026-05-11):**
- Sub-Q-MBTWBDPFA-A=(β-consolidated): single §6 reframing commit covers Wave B's 1 channel + Wave C #3's 3 channels
- Sub-Q-MBTWBDPFA-B=(i)/(i)/(i): action semantics per channel (§3 below)
- Sub-Q-MBTWBDPFA-C=(α): inline-banner failure UX (result-type discriminated union per §4)
- Sub-Q-MBTWBDPFA-D=(α): NEW `frameCBridge` (per-IPC-family convention)

**Coord audience:** T4-successor consolidating §6 amendment (currently HALTED at `HALT-WORKSTATION-CONTRACT-§6-AMENDMENT-PRE-COMMIT`). T4-successor merges this file's §1+§2+§4 content into the amendment alongside Wave B's `workstation:read-swarm-state` channel.

---

## §1 — Channel inventory

Three new IPC channels under `frame-c:*` namespace; renderer→main `invoke` (request/reply) pattern matching `dispatch-mode:get/set` (MB-T24) + `commits:list` (MB-T22) precedent.

| # | Channel | Direction | Payload-in | Result-out | Renderer caller | Main-process executor |
|---|---|---|---|---|---|---|
| 1 | `frame-c:diff` | `invoke` (req/reply) | `{ sessionName: string }` | `DiffResult` (discriminated union per §4) | `frameCBridge.diff(sessionName)` from `ActionBar` callback | `FrameCIpcController.handleDiff` → `child_process.exec('git diff main...<branch>')` |
| 2 | `frame-c:merge` | `invoke` (req/reply) | `{ sessionName: string }` | `MergeResult` (discriminated union per §4) | `frameCBridge.merge(sessionName)` from `ActionBar` callback | `FrameCIpcController.handleMerge` → `child_process.exec('git merge --no-commit <branch>')` |
| 3 | `frame-c:focus` | `invoke` (req/reply) | `{ sessionName: string }` | `FocusResult` (discriminated union per §4) | `frameCBridge.focus(sessionName)` from `ActionBar` callback | `FrameCIpcController.handleFocus` → `writeFrameMode('A')` + `webContents.send('frame-c:scroll-to-session', {sessionName})` |

**Bridge surface:** `window.frameCBridge` exposed via `contextBridge.exposeInMainWorld` in `preload.mts`. NOT extended into `workstationBridge` (Sub-Q-D=(α) per-IPC-family convention; coexists with Wave B's `workstationBridge.readSwarmState`).

**Bridge-coexistence note for T4-successor's `preload.mts` edit ordering:** T4-successor's `workstationBridge.readSwarmState` and my `frameCBridge.{diff,merge,focus}` are ADDITIVE to separate top-level world bindings. No shared symbol; no `contextBridge.exposeInMainWorld` collision. T4-successor's `preload.mts` edit lands first (with consolidated §6 amendment commit); my WB4 GREEN's `preload.mts` edit then adds the `frameCBridge` block as a separate `exposeInMainWorld` call.

---

## §2 — TypeScript signatures (bridge + handler)

### §2.1 — `frameCBridge` (renderer-side, exposed via `preload.mts`)

```typescript
// packages/dispatch-workstation/src/main/preload.mts (Wave C #3 WB4 additive block)

declare global {
  interface Window {
    /** Frame C ActionBar IPC surface — diff/merge/focus per-session actions.
     *  Per-IPC-family convention (Sub-Q-MBTWBDPFA-D=α); coexists with
     *  workstationBridge (Wave B) + dispatchModeBridge (MB-T24) +
     *  commitsBridge (MB-T22) + coarchitectBridge (chat-shell). */
    readonly frameCBridge: FrameCBridge;
  }
}

export interface FrameCBridge {
  /** Invoke `git diff main...<branch>` against the selected session's
   *  cwd. Returns full diff text on success; structured error on failure. */
  diff(sessionName: string): Promise<DiffResult>;

  /** Invoke `git merge --no-commit <branch>` from session's branch into
   *  current branch of session's cwd. On conflict: returns `MergeResult`
   *  with `error_type: 'MergeConflict'` and conflict file list; operator
   *  resolves manually (no auto-rollback). On clean merge: returns success
   *  with staged-but-uncommitted state for operator confirm-then-commit
   *  flow per Sub-Q-MBTWBDPFA-B-merge=(i) safety posture. */
  merge(sessionName: string): Promise<MergeResult>;

  /** Toggle workstation FrameMode to 'A' (compact tile mode per
   *  MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE at `30e362c`) AND emit
   *  `frame-c:scroll-to-session` event to the renderer for tile-grid
   *  to scroll/highlight the named session.
   *
   *  Note: end-to-end Frame A render-coherence requires
   *  `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11`
   *  (Tier 2, open) closure. Until that lands, focus toggles
   *  frame-mode-state but tile.tsx does not yet receive the prop
   *  through TileGridApp subscription; full chrome renders
   *  unconditionally. Operator can verify FrameMode persistence
   *  via `readFrameMode()` even pre-closure. */
  focus(sessionName: string): Promise<FocusResult>;
}
```

### §2.2 — `FrameCIpcController` (main-process, `src/main/frame-c-ipc.ts`)

```typescript
// packages/dispatch-workstation/src/main/frame-c-ipc.ts (Wave C #3 WB4 NEW file)

import { spawn } from 'node:child_process';
import { writeFrameMode } from './frame-mode-state.js';

/** Minimal shape of Electron's ipcMain we depend on. Tests inject a fake. */
export interface FrameCIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

/** Session-to-cwd-and-branch lookup. Production wiring: closure-captures
 *  TileGridApp's session entries (cwd from SpawnSessionResult; branchName
 *  from TileGridSessionEntry per Q-MBT15-2 stub or MB-T15-followup once
 *  branch IPC ships). Tests inject a stub.
 *
 *  Returns null if session is not registered with the workstation (e.g.,
 *  operator-killed session; race; stale selection). Handlers translate
 *  null → result-type error_type='SessionNotFound'. */
export interface SessionLookupFn {
  (sessionName: string): { cwd: string; branchName: string } | null;
}

/** Renderer-side scroll-event sink. Production: BrowserWindow webContents
 *  fan-out via `mainWindow.webContents.send('frame-c:scroll-to-session',
 *  payload)`. Tests inject a recording spy. */
export interface ScrollEmitter {
  (payload: { sessionName: string }): void;
}

export interface FrameCIpcDeps {
  readonly lookupSession: SessionLookupFn;
  readonly emitScroll: ScrollEmitter;
  readonly writeFrameMode: typeof writeFrameMode;
  /** Override for tests; production uses real `node:child_process.spawn`. */
  readonly runGit?: (
    args: readonly string[],
    cwd: string,
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
}

export class FrameCIpcController {
  constructor(private readonly deps: FrameCIpcDeps) {}

  registerHandlers(ipcMain: FrameCIpcMain): void {
    ipcMain.handle('frame-c:diff', async (_event, payload: unknown) => {
      // payload validation → handleDiff → DiffResult
    });
    ipcMain.handle('frame-c:merge', async (_event, payload: unknown) => {
      // payload validation → handleMerge → MergeResult
    });
    ipcMain.handle('frame-c:focus', async (_event, payload: unknown) => {
      // payload validation → handleFocus → FocusResult
    });
  }

  // handleDiff / handleMerge / handleFocus implementations per §3 below.
}

/** Production factory. main.ts new sentinel zone (Wave C #3 WB-after-
 *  T4's-WB10) calls this with closure-captured deps. */
export function createDefaultFrameCIpcController(
  deps: FrameCIpcDeps,
): FrameCIpcController {
  return new FrameCIpcController(deps);
}
```

---

## §3 — Action semantics per channel (Sub-Q-B resolutions in detail)

### §3.1 — `frame-c:diff` (Sub-Q-MBTWBDPFA-B-diff=(i))

**Argv:** `['diff', `main...${branchName}`]` (note triple-dot — symmetric difference against merge base)
**Cwd:** session's cwd (from `lookupSession(sessionName).cwd`)
**Exec:** `child_process.spawn('git', argv, { cwd })` — collect stdout (diff text) + stderr; await exit code
**Success:** exit code 0 → `DiffResult` `{ ok: true, diffText: <stdout> }`
**Failure modes:**
- `lookupSession(sessionName) === null` → `{ ok: false, error_type: 'SessionNotFound', message }`
- Exit non-zero with `stderr` containing "Not a git repository" → `{ ok: false, error_type: 'NotARepository', message: stderr }`
- Exit non-zero with `stderr` containing "unknown revision" (main branch absent OR session branch absent) → `{ ok: false, error_type: 'BranchNotFound', message: stderr }`
- Exit non-zero, other → `{ ok: false, error_type: 'GitInvocationFailed', message: stderr }`
- spawn-system error (e.g., git binary missing) → `{ ok: false, error_type: 'GitInvocationFailed', message: <thrown error message> }`

**Note on output handling:** diff text may be large (thousands of lines). Renderer-side handling (display in ActionBar's failure-banner OR in a separate detail sub-region OR via external diff tool) is renderer concern; this channel just delivers the raw text. Operator UX may pivot per dogfood evidence to `git difftool` if inline rendering is unwieldy — that's a future Tier 3 followup (`MB-F-FRAME-C-DIFF-MERGE-ENV-FALLBACK` per body §5.2).

### §3.2 — `frame-c:merge` (Sub-Q-MBTWBDPFA-B-merge=(i))

**Argv:** `['merge', '--no-commit', '--no-ff', branchName]`
**Cwd:** session's cwd
**Exec:** `child_process.spawn('git', argv, { cwd })` — collect stdout + stderr; await exit code

**Success (clean merge, staged-not-committed):** exit code 0 → `MergeResult` `{ ok: true, state: 'staged', message: 'Merge staged successfully; no commit made. Operator must commit or abort manually.' }`. Operator confirms via terminal (commits or aborts via `git merge --abort`). This ticket does NOT provide a confirm-commit UI — staged-not-committed posture is the safety stop.

**Failure modes:**
- `lookupSession(sessionName) === null` → `{ ok: false, error_type: 'SessionNotFound', message }`
- Exit non-zero with `stderr`/`stdout` containing "Automatic merge failed" or "CONFLICT" → `{ ok: false, error_type: 'MergeConflict', message: <conflict summary>, conflictFiles: <parsed list> }`. Working tree left in conflict state; operator resolves manually OR runs `git merge --abort`.
- Exit non-zero with `stderr` containing "Not a git repository" → `{ ok: false, error_type: 'NotARepository', message: stderr }`
- Exit non-zero with `stderr` containing "Already up to date" or "merge requires a single non-option" → `{ ok: false, error_type: 'NothingToMerge', message: stderr }`
- Exit non-zero with `stderr` containing "Your local changes" (dirty tree pre-merge) → `{ ok: false, error_type: 'DirtyWorkingTree', message: stderr }`
- Exit non-zero, other → `{ ok: false, error_type: 'GitInvocationFailed', message: stderr }`

**Conflict file parsing:** parse `stderr`/`stdout` for `CONFLICT (content): Merge conflict in <path>` lines; return matched paths in `conflictFiles: string[]`. Operator's chat-banner UX (Sub-Q-C=α) displays the list inline.

### §3.3 — `frame-c:focus` (Sub-Q-MBTWBDPFA-B-focus=(i))

**Action:** two-step:
1. `this.deps.writeFrameMode('A')` — persist FrameMode to `frame-mode-state.json` (`44764fd` Frame Router contract)
2. `this.deps.emitScroll({ sessionName })` — emit `frame-c:scroll-to-session` event to renderer for tile-grid to scroll/highlight the named session's tile in Frame A

**Success:** both steps complete → `FocusResult` `{ ok: true, message: 'Focused to compact-tile mode; tile scrolled/highlighted.' }`

**Failure modes:**
- `lookupSession(sessionName) === null` → `{ ok: false, error_type: 'SessionNotFound', message }` (do NOT toggle FrameMode if session unknown — avoids operator-visible mode-flip with no apparent effect)
- `writeFrameMode` throws (disk full, perms, etc.) → `{ ok: false, error_type: 'FrameModeWriteFailed', message: <thrown error> }`. NOTE: `writeFrameMode` at `frame-mode-state.ts:26-33` swallows errors silently and returns void — to surface FrameMode write failures, deps would need to wrap `writeFrameMode` with a try/catch that re-throws OR check `readFrameMode()` post-write to verify. **Defer this:** initial WB ship treats `writeFrameMode` as best-effort (matches its source-level posture); add a Tier 3 followup `MB-F-FRAME-C-FOCUS-FRAMEMODE-WRITE-FAILURE-DETECTION` for post-dogfood ratcheting if surfaced.
- `emitScroll` failure: out-of-scope (renderer-side problem; main-process emit is fire-and-forget). If `mainWindow.webContents` is null/destroyed, the emit is a no-op; not an error.

**Production-wiring dependency:** end-to-end Frame A render-coherence requires `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11` (Tier 2, FOLLOWUPS.md row at `6217ea0`) closure. Pre-closure, `writeFrameMode('A')` persists but `tile-grid-app.tsx` does not subscribe → `tile.tsx`'s `frameMode` prop stays undefined → full chrome renders. **The focus action ships its component contract regardless**; full operator effect arrives when the upstream subscription gap closes. Renderer-side scroll/highlight via `frame-c:scroll-to-session` event consumption: ticket #2 territory (T4-successor) OR new sibling scope; recommend WB-final note for operator decision.

---

## §4 — Result-type discriminated-union shape (failure-UX surface per Sub-Q-C=α)

Each result is a discriminated union on the `ok` boolean tag. Inline-banner UX in `ActionBar` (Sub-Q-MBTWBDPFA-C=(α)) renders a `<div role="alert">` element below the button row when `ok === false`, displaying `error_type` + `message` + a Dismiss button.

```typescript
// packages/dispatch-workstation/src/main/frame-c-ipc.ts (Wave C #3 WB4 — exported types)

export interface FrameCActionSuccess {
  readonly ok: true;
}

export interface FrameCActionError {
  readonly ok: false;
  readonly error_type: string;
  readonly message: string;
}

// ── diff ──────────────────────────────────────────────────────────────
export type DiffResult =
  | (FrameCActionSuccess & { readonly diffText: string })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'NotARepository'
        | 'BranchNotFound'
        | 'GitInvocationFailed';
    });

// ── merge ─────────────────────────────────────────────────────────────
export type MergeResult =
  | (FrameCActionSuccess & {
      readonly state: 'staged';
      readonly message: string;
    })
  | (FrameCActionError & {
      readonly error_type:
        | 'SessionNotFound'
        | 'MergeConflict'
        | 'NotARepository'
        | 'NothingToMerge'
        | 'DirtyWorkingTree'
        | 'GitInvocationFailed';
      /** Present only when `error_type === 'MergeConflict'`. */
      readonly conflictFiles?: readonly string[];
    });

// ── focus ─────────────────────────────────────────────────────────────
export type FocusResult =
  | (FrameCActionSuccess & { readonly message: string })
  | (FrameCActionError & {
      readonly error_type: 'SessionNotFound' | 'FrameModeWriteFailed';
    });
```

**Inline-banner UX render expectations (ActionBar component):**

When the host (Frame C detail-pane) catches a non-`ok` result from any `frameCBridge.*` call, it passes the result down to `ActionBar` via a `failureState` prop:

```typescript
interface ActionBarProps {
  // ... existing props from body §1.1 ...
  readonly failureState: { action: 'diff'|'merge'|'focus'; result: FrameCActionError } | null;
  readonly onDismissFailure: () => void;
}
```

`ActionBar` renders inline-banner when `failureState !== null`:
```jsx
{failureState !== null && (
  <div role="alert" data-testid="action-bar-failure-banner">
    <strong>{failureState.action} failed:</strong> {failureState.result.error_type} — {failureState.result.message}
    {failureState.result.error_type === 'MergeConflict' && failureState.result.conflictFiles && (
      <ul>{failureState.result.conflictFiles.map(f => <li key={f}>{f}</li>)}</ul>
    )}
    <button type="button" onClick={onDismissFailure} data-testid="action-bar-failure-dismiss">Dismiss</button>
  </div>
)}
```

**Auto-dismiss on next successful action:** when any of the three actions completes successfully, the host clears `failureState` (sets to null) before invoking the next action's callback. Persistent-on-error semantics per body §3.3 (α).

---

## §5 — Closing notes for T4-successor consolidation

When T4-successor merges this content into the consolidated `WORKSTATION_CONTRACT.md §6` amendment:

1. **Channel naming convention check:** Wave B uses `workstation:read-swarm-state` (workstation-prefix singular). My channels use `frame-c:*` (frame-c-prefix; matches `dispatch-mode:*`, `commits:*`, MB-T16 `approval-policy:*` precedent). T4-successor may prefer to normalize the Wave B channel to `workstation:read-swarm-state` OR `frame-shell:read-swarm-state` — operator decision in consolidated amendment review.

2. **Bridge convention check:** Wave B's `workstationBridge.readSwarmState` is a getter-style method (no args, returns content). My `frameCBridge.{diff,merge,focus}` are action-style methods (take `sessionName`, return discriminated-union result). The amendment text should clarify both shapes are §6-compliant (consistent with MB-T22 commits `listCommits()` getter-style vs MB-T24 dispatch-mode `set(payload)` action-style).

3. **Cross-reference at landing:** consolidated amendment commit body cites THIS coord note (`docs/coordination/wave-c-3-channel-signatures-2026-05-11.md`) + Wave B `2bc5cda` WB7 RED commit + Wave C #3 body `32c7eee` as the three sources the amendment integrates.

4. **`MB-F-WORKSTATION-CONTRACT-SECTION-6-DRIFT-AUDIT`:** Per body §3.1 (β) trade-off table, the consolidated amendment may queue a Tier 2 followup auditing prior shipped tickets (MB-T16/17/22/24) that added IPC channels without §6 amendment. Operator-arbitrated whether to file at consolidated-amendment commit OR defer to a separate audit-doc workstream. Recommend: file at consolidated-amendment commit body so the queued review surface is visible.

---

**End of Wave C #3 channel-signatures coord note.**

T4-successor: this document is the authoritative source for the 3 `frame-c:*` channel signatures + semantics + result types. Merge into consolidated §6 amendment at your discretion. After consolidated amendment lands on origin/main, I (T3) proceed with WB1 RED + subsequent WBs per ticket body `32c7eee` §4.
