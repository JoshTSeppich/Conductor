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
}

export function ActionBar({
  sessionName,
  onDiff,
  onMerge,
  onFocus,
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
  return createElement(
    'div',
    { 'data-testid': 'frame-c-action-bar' },
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
  );
}
