// MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB2 GREEN — ActionBar
// React component for the Frame C detail-pane footer.
//
// Pure React, RENDERER-INTEGRATED per audit §4.1 three-tier discipline:
// no `window.frameCBridge.*` access here, no IPC awareness. Three callback
// props (`onDiff` / `onMerge` / `onFocus`) — the detail-pane host (Frame C
// root or detail-pane component) catches each callback and invokes the
// `frameCBridge.*` method at the integration seam, then plumbs any failure
// result down via the WB6-scope `failureState` prop (Sub-Q-MBTWBDPFA-C=α
// inline-banner UX; deferred to WB5/WB6 — not in this commit).
//
// Operator-arbitrated Sub-Q resolutions encoded (orchestrator-relay
// autonomous-mode (b)-pattern 2026-05-11; coord note `9fe6358`):
//   Sub-Q-MBTWBDPFA-A=(β-consolidated): consolidated §6 amendment landed
//     at `0f0e762` enumerating frame-c:{diff,merge,focus} channels.
//   Sub-Q-MBTWBDPFA-B=(i)/(i)/(i): main-process executor semantics
//     (`git diff main...<branch>` / `git merge --no-commit --no-ff
//     <branch>` / `writeFrameMode('A')` + scroll emit) — not visible at
//     the component layer; host invokes the bridge method which routes
//     to the main-process FrameCIpcController (WB4 GREEN).
//   Sub-Q-MBTWBDPFA-C=(α): failureState/banner UX shipped at WB6 GREEN;
//     this commit ships the buttons + disabled-state only.
//   Sub-Q-MBTWBDPFA-D=(α): NEW `frameCBridge` exposed at WB4 GREEN via
//     `preload.mts` — separate from `workstationBridge.readSwarmState`
//     (Wave B `525c502`) per per-IPC-family convention.

import { createElement } from 'react';
import type { FrameCActionError } from '../main/frame-c-ipc.js';

/** Sub-Q-MBTWBDPFA-C=(α) inline-banner failure-UX shape per coord note
 *  `9fe6358` §4. Host (Frame C detail-pane) catches non-ok results from
 *  any `frameCBridge.*` call + plumbs the tagged failure down via this
 *  prop. ActionBar renders a `role="alert"` banner inline with action
 *  name + error_type + message + Dismiss button + optional conflict-
 *  files `<ul>` for `MergeConflict` results. */
export interface ActionBarFailureState {
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB2 GREEN — union extended to
  // include 'kill'. DetailPane host (WB4) catches SessionKillReply from
  // `window.workstationBridge.killSession` and adapts via WB6
  // `adaptSessionKillFailure` into this shape so the existing failure-
  // banner UX (renderFailureBanner below) renders kill failures without
  // component-layer changes beyond the union widening.
  readonly action: 'diff' | 'merge' | 'focus' | 'kill';
  readonly result: FrameCActionError;
}

export interface ActionBarProps {
  /** Currently-selected session in the Frame C detail-pane, or `null`
   *  when no session is selected. When `null`, all three buttons render
   *  in the `disabled` state per body §1.1 bullet 1 no-op posture. */
  readonly sessionName: string | null;
  /** Fired with `sessionName` when the [Diff] button is clicked. Host
   *  catches + invokes `window.frameCBridge.diff(sessionName)` per
   *  per-IPC-family bridge convention (Sub-Q-MBTWBDPFA-D=α). */
  readonly onDiff: (sessionName: string) => void;
  /** Fired with `sessionName` on [Merge] click. Host routes to
   *  `window.frameCBridge.merge(sessionName)`. Destructive-op safety
   *  per Sub-Q-MBTWBDPFA-B-merge=(i): main-process executor uses
   *  `--no-commit --no-ff`; conflicts surface via inline banner. */
  readonly onMerge: (sessionName: string) => void;
  /** Fired with `sessionName` on [Focus] click. Host routes to
   *  `window.frameCBridge.focus(sessionName)`. Per Sub-Q-MBTWBDPFA-B-
   *  focus=(i): toggles FrameMode='A' + emits scroll-to-session event.
   *  Full Frame A render-coherence pending
   *  `MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11`. */
  readonly onFocus: (sessionName: string) => void;
  /** MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB2 GREEN — fired with
   *  `sessionName` on [Kill] click. Host routes to existing
   *  `window.workstationBridge.killSession({sessionName})` (MB-T11 WB3
   *  channel; Sub-Q-MBTWFT3-A=(α) reuse — no new IPC channel). Two-step
   *  kill: tmux kill-session, then PATCH /v2/sessions/:name/state with
   *  state='killed'. SessionKillReply discriminated union returned;
   *  DetailPane host adapts SessionKillError → ActionBarFailureState
   *  via WB6 `adaptSessionKillFailure`. */
  readonly onKill: (sessionName: string) => void;
  /** Sub-Q-MBTWBDPFA-C=(α) inline-banner state. When non-null, ActionBar
   *  renders the failure banner per coord note `9fe6358` §4. Host clears
   *  to null on next successful action (auto-dismiss-on-recovery). */
  readonly failureState?: ActionBarFailureState | null;
  /** Fired when operator clicks the Dismiss button inside the failure
   *  banner. Host sets `failureState` to null in response. */
  readonly onDismissFailure?: () => void;
  /** MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB8 GREEN — Sub-Q-MBTWFT3-E=(ii)
   *  per-session spawn-mode data source for the bypass-perms indicator.
   *  `'auto'` ↔ session spawned with `--dangerously-skip-permissions`
   *  flag (spawn-handler.ts:225-245); indicator renders. `'ask'` OR
   *  undefined → indicator hidden (operator-supervised OR no-data
   *  ship-shy default per Sub-Q-E=(ii) fallback (b)). DetailPane host
   *  passes undefined at HEAD `e56f63c` because
   *  TileGridSessionEntry.spawnMode field is absent — tracked at
   *  `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2 (WB9 docs). */
  readonly spawnMode?: 'auto' | 'ask';
}

export function ActionBar({
  sessionName,
  onDiff,
  onMerge,
  onFocus,
  onKill,
  failureState,
  onDismissFailure,
  spawnMode,
}: ActionBarProps): JSX.Element {
  const disabled = sessionName === null;
  // Wrap each callback so it only fires when a session IS selected. The
  // buttons are also `disabled` when sessionName === null, so this is
  // defense-in-depth — guards the callback contract from any host that
  // accidentally invokes via keyboard / programmatic dispatch on a
  // disabled button.
  const fireDiff = (): void => {
    if (sessionName !== null) onDiff(sessionName);
  };
  const fireMerge = (): void => {
    if (sessionName !== null) onMerge(sessionName);
  };
  const fireFocus = (): void => {
    if (sessionName !== null) onFocus(sessionName);
  };
  const fireKill = (): void => {
    if (sessionName !== null) onKill(sessionName);
  };
  // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB8 GREEN — bypass-perms
  // indicator (Sub-Q-E=ii spawn-mode-per-session) + dispatch-workstation
  // source label. Left-anchored per wireframe target; buttons stay
  // right-anchored via flex space-between in the row container below.
  const bypassPermsIndicator =
    spawnMode === 'auto'
      ? createElement(
          'span',
          {
            'data-testid': 'action-bar-bypass-perms-indicator',
            role: 'img',
            'aria-label': 'bypass-perms warning',
            style: {
              color: '#ff8888',
              fontSize: '14px',
              lineHeight: 1,
            },
          },
          '⚠',
        )
      : null;
  const sourceLabel = createElement(
    'span',
    {
      'data-testid': 'action-bar-source-label',
      style: { fontSize: '11px', color: '#9ca3af' },
    },
    'dispatch-workstation',
  );
  const leftSection = createElement(
    'div',
    { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
    bypassPermsIndicator,
    sourceLabel,
  );
  const rightSection = createElement(
    'div',
    { style: { display: 'flex', gap: '4px' } },
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'action-bar-diff-btn',
        disabled,
        onClick: fireDiff,
      },
      'Diff',
    ),
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'action-bar-merge-btn',
        disabled,
        onClick: fireMerge,
      },
      'Merge',
    ),
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'action-bar-focus-btn',
        disabled,
        onClick: fireFocus,
      },
      'Focus',
    ),
    // MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB2 GREEN — kill button.
    // Routes via DetailPane host (WB4) to existing
    // `window.workstationBridge.killSession({sessionName})` per
    // Sub-Q-MBTWFT3-A=(α) reuse default — no new IPC channel.
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'action-bar-kill-btn',
        disabled,
        onClick: fireKill,
      },
      'Kill',
    ),
  );
  const row = createElement(
    'div',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
      },
    },
    leftSection,
    rightSection,
  );
  return createElement(
    'div',
    {
      'data-testid': 'frame-c-action-bar',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
      },
    },
    row,
    // WB6 GREEN — inline failure banner (Sub-Q-MBTWBDPFA-C=α per coord
    // note `9fe6358` §4 render expectations). React renders nothing
    // for null/undefined children, so the null/undefined-default case
    // is a no-op (probe-05a baseline).
    failureState !== null && failureState !== undefined
      ? renderFailureBanner(failureState, onDismissFailure)
      : null,
  );
}

// MergeConflict-specific narrowing helper. The `result` discriminated
// union (DiffResult|MergeResult|FocusResult) carries `conflictFiles?:
// readonly string[]` only on the `MergeConflict` error_type branch.
// `failureState.result` is typed as the base `FrameCActionError`; we
// runtime-narrow to surface conflictFiles when present.
function extractConflictFiles(
  result: FrameCActionError,
): readonly string[] | undefined {
  if (result.error_type !== 'MergeConflict') return undefined;
  const maybe = (result as unknown as { conflictFiles?: unknown }).conflictFiles;
  if (!Array.isArray(maybe)) return undefined;
  return maybe.filter((x): x is string => typeof x === 'string');
}

function renderFailureBanner(
  failureState: ActionBarFailureState,
  onDismissFailure: (() => void) | undefined,
): JSX.Element {
  const conflictFiles = extractConflictFiles(failureState.result);
  return createElement(
    'div',
    {
      role: 'alert',
      'data-testid': 'action-bar-failure-banner',
    },
    createElement(
      'strong',
      null,
      `${failureState.action} failed:`,
    ),
    ` ${failureState.result.error_type} — ${failureState.result.message}`,
    conflictFiles !== undefined && conflictFiles.length > 0
      ? createElement(
          'ul',
          null,
          ...conflictFiles.map((f) => createElement('li', { key: f }, f)),
        )
      : null,
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'action-bar-failure-dismiss',
        onClick: () => {
          if (onDismissFailure !== undefined) onDismissFailure();
        },
      },
      'Dismiss',
    ),
  );
}
