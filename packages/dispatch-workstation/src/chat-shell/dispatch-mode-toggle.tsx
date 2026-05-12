// MB-T24 WB3 GREEN — DispatchModeToggle component.
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
//       Routes via ipcRenderer.invoke('dispatch-mode:set', { mode }) →
//       dispatch-mode-store.writeDispatchMode(mode) →
//       dispatch-mode-store.readDispatchMode() echo.
//
// data-testid contract (probe-06-dispatch-mode-toggle):
//   - chat-shell-dispatch-mode-toggle-slot — wrapper element
//   - chat-shell-dispatch-mode-toggle-auto — Auto button
//   - chat-shell-dispatch-mode-toggle-ask — Ask button
//
// State machine (Q-MBT24-2=a default 'ask'):
//   1. Initial render: useState 'ask' (Q-MBT24-2=a default-active state).
//   2. useEffect on mount: if bridge supplied, fetch via getDispatchMode;
//      on success, setState to fetched value. On reject, retain default.
//   3. Click on inactive button:
//      a. Optimistic: setState to clicked mode (UI flips immediately).
//      b. Async: bridge.setDispatchMode(clicked); on success, reconcile
//         with returned value (typically the same as clicked).
//      c. On reject (rare — write fail-safe in store), the state is
//         already optimistic; next mount will re-fetch.
//   4. Click on already-active button: no-op (no setState, no bridge call).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { DispatchMode } from '../main/dispatch-mode-store.js';

/**
 * Bridge surface for DispatchModeToggle. Two async methods:
 *
 *   - getDispatchMode: read persisted state at mount. Fail-safe — if the
 *     IPC call rejects, the toggle retains 'ask' default per Q-MBT24-2=a.
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
  /** Optional bridge — null/undefined → static 'ask' default display. */
  readonly bridge?: DispatchModeBridge | null;
}

const DEFAULT_MODE: DispatchMode = 'ask'; // Q-MBT24-2=a — operator opts INTO 'auto'.

const SLOT_STYLE: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85em',
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '2px',
  padding: '2px 4px',
};

const BUTTON_STYLE: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: '0.85em',
  padding: '1px 6px',
  border: '1px solid #4b5563',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
};

// MB-F-CHATSHELL-POLISH-REMAINING WB1 — active-state hex brightened
// per T7 row 357 polish target. `#4a7fb8` matches T7 WB4 SessionList
// selected-tile borderLeft accent (session-list.tsx ROW_STYLE_SELECTED)
// → visual unity across "selected/active" states between Frame C
// SessionList rows and chat-shell dispatch-mode toggle. Brighter than
// prior `#374151` slate-grey so "Auto highlighted = autonomous"
// wireframe intent reads cleanly at glance.
const BUTTON_ACTIVE_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  background: '#4a7fb8',
  fontWeight: 600,
};

export function DispatchModeToggle({
  bridge,
}: DispatchModeToggleProps = {}): ReactNode {
  const [mode, setMode] = useState<DispatchMode>(DEFAULT_MODE);

  useEffect(() => {
    if (!bridge) return;
    let cancelled = false;
    bridge
      .getDispatchMode()
      .then((m) => {
        if (!cancelled) setMode(m);
      })
      .catch(() => {
        // initial fetch failure — retain default 'ask'
      });
    return () => {
      cancelled = true;
    };
  }, [bridge]);

  const handleClick = (clicked: DispatchMode): void => {
    if (clicked === mode) return; // no-op on already-active
    setMode(clicked); // optimistic UI
    if (!bridge) return;
    bridge.setDispatchMode(clicked).then(
      (echoed) => {
        // Reconcile with persisted value (typically === clicked).
        setMode(echoed);
      },
      () => {
        // Persist failure — retain optimistic state. Next mount re-fetches.
      },
    );
  };

  return (
    <div
      data-testid="chat-shell-dispatch-mode-toggle-slot"
      style={SLOT_STYLE}
      role="group"
      aria-label="Dispatch mode"
      title="Dispatch mode — Auto fires spawns immediately; Ask surfaces a confirmation modal"
    >
      <button
        type="button"
        data-testid="chat-shell-dispatch-mode-toggle-auto"
        aria-pressed={mode === 'auto' ? 'true' : 'false'}
        style={mode === 'auto' ? BUTTON_ACTIVE_STYLE : BUTTON_STYLE}
        onClick={() => handleClick('auto')}
      >
        Auto
      </button>
      <button
        type="button"
        data-testid="chat-shell-dispatch-mode-toggle-ask"
        aria-pressed={mode === 'ask' ? 'true' : 'false'}
        style={mode === 'ask' ? BUTTON_ACTIVE_STYLE : BUTTON_STYLE}
        onClick={() => handleClick('ask')}
      >
        Ask
      </button>
    </div>
  );
}
