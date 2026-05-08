// MB-T24 WB1 RED — DispatchModeToggle component (scaffold).
//
// Operator-confirmed Q-MBT24-3=a (two-button segmented control) +
// Q-MBT24-6=c (NEW dispatchModeBridge — additive surface, mirrors
// commitsBridge precedent) + Q-MBT24-7=a (DispatchMode = 'auto' | 'ask')
// 2026-05-08.
//
// Renders a two-button segmented control [Auto][Ask] in the chat-shell
// header-bar slot — sibling to MB-T26 cost-meter slot per t26-t27-coord.md
// slot ordering left-to-right (per Q-MBT24-4=a, MB-T24 lands FAR-LEFT):
//   [Auto/Ask MB-T24] | [plan-usage MB-T25] | [cost-meter MB-T26] | [model-mix MB-T27]
//
// Bridge surface (Q-MBT24-6=c — NEW dispatchModeBridge):
//   - getDispatchMode(): Promise<DispatchMode>
//       Read persisted toggle state. preload.mts MB-T24 zone routes via
//       ipcRenderer.invoke('dispatch-mode:get') → main-process
//       dispatch-mode-ipc.ts handler → dispatch-mode-store.readDispatchMode().
//   - setDispatchMode(mode): Promise<DispatchMode>
//       Persist new state and return the persisted value (echo-back).
//       Routes via ipcRenderer.invoke('dispatch-mode:set', mode) →
//       dispatch-mode-store.writeDispatchMode(mode) →
//       dispatch-mode-store.readDispatchMode() echo.
//
// data-testid contract (probe-06-dispatch-mode-toggle):
//   - chat-shell-dispatch-mode-toggle-slot — wrapper element
//   - chat-shell-dispatch-mode-toggle-auto — Auto button (segmented control)
//   - chat-shell-dispatch-mode-toggle-ask — Ask button (segmented control)
//
// WB1 RED: scaffold renders only the slot wrapper; segmented buttons +
// bridge subscription deferred to WB3 GREEN. probe-06 asserts the eventual
// GREEN behavior; tests fail at WB1 (no buttons rendered, no bridge calls).
// WB3 GREEN fills in.

import type { ReactNode } from 'react';
import type { DispatchMode } from '../main/dispatch-mode-store.js';

/**
 * Bridge surface for DispatchModeToggle. Two async methods:
 *
 *   - getDispatchMode: read persisted state at mount. Fail-safe — if the
 *     IPC call rejects, the toggle defaults to 'ask' per Q-MBT24-2=a.
 *   - setDispatchMode: persist new state on click. Returns the persisted
 *     value for echo-confirmation; supports optimistic-UI rollback if the
 *     persist fails (mirrors MB-T16 TileApprovalPicker rollback per
 *     Q-MBT16-3=a).
 *
 * Optional in props so existing tests + production fallbacks (no bridge
 * yet exposed) render the toggle in a non-interactive default state.
 */
export interface DispatchModeBridge {
  readonly getDispatchMode: () => Promise<DispatchMode>;
  readonly setDispatchMode: (mode: DispatchMode) => Promise<DispatchMode>;
}

export interface DispatchModeToggleProps {
  /** Optional bridge — null/undefined → static default 'ask' display. */
  readonly bridge?: DispatchModeBridge | null;
}

/**
 * WB1 RED scaffold: renders only the slot wrapper (no segmented buttons,
 * no bridge subscription). probe-06 asserts the eventual GREEN behavior;
 * all interaction tests fail at WB1.
 *
 * WB3 GREEN: replaces this scaffold with full segmented-control render +
 * useEffect bridge.getDispatchMode() at mount + click handlers calling
 * bridge.setDispatchMode() with optimistic-UI updates.
 */
export function DispatchModeToggle(
  _props: DispatchModeToggleProps = {},
): ReactNode {
  return (
    <div
      data-testid="chat-shell-dispatch-mode-toggle-slot"
      title="Dispatch mode — Auto fires spawns immediately; Ask surfaces a confirmation modal"
    >
      {/* WB1 RED: segmented buttons + bridge subscription land at WB3 GREEN. */}
    </div>
  );
}
