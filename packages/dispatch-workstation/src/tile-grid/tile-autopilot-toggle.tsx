// MB-T17 WB3 — TileAutopilotToggle chrome implementation.
//
// Native <input type="checkbox" role="switch"> for the per-session
// autopilot enabled toggle. Per Q-MBT17-1=a (native checkbox switch) +
// Q-MBT17-2=a (disabled + tooltip on bridge-missing or fetch error) +
// Q-MBT17-3=a (optimistic UI + silent rollback on PUT error + tooltip).
//
// State machine (data-state attribute reflects the active branch):
//   'loading'     — initial fetch in flight; checkbox disabled, value
//                   shows `false` as best-guess placeholder
//   'ready'       — fetch succeeded; checkbox enabled with current value
//   'unavailable' — bridge missing OR initial fetch errored; checkbox
//                   disabled, tooltip surfaces reason
//
// PUT-error path (Q-MBT17-3=a): from 'ready', operator flips checkbox
// → optimistic update → PUT fires. On success: state confirms with
// server response. On error: state reverts to previous value + sets
// `lastError`; the checkbox stays ENABLED so the operator can retry,
// with a tooltip surfacing the error message.
//
// Per Q-MBT17-5=a: separate file (mirrors tile-approval-picker.tsx).
// Per Q-MBT17-6=a: bridge prop optional; null/undefined → disabled
// 'unavailable' state at mount.
//
// Significant DEVIATION from MB-T16 pattern (KNOWN): toggle bridge
// methods return `{ enabled: boolean }` (no `updated_at` because
// autopilot state is workstation-side only — autopilot-state-store.ts
// doesn't track per-write timestamps in the toggle field; LastActionFire
// dAt tracks orchestrator-action firings, not toggle changes).

import { useEffect, useState } from 'react';

/** Slim bridge shape consumed by the toggle. TileGridApp (WB4) adapts
 *  the WorkstationBridgeShape's optional methods into this required
 *  shape only when both are defined; otherwise the toggle receives null
 *  and renders the 'unavailable' state. */
export interface TileAutopilotToggleBridge {
  getSessionAutopilotEnabled(
    sessionName: string,
  ): Promise<{ enabled: boolean }>;
  setSessionAutopilotEnabled(
    sessionName: string,
    enabled: boolean,
  ): Promise<{ enabled: boolean }>;
}

export interface TileAutopilotToggleProps {
  readonly sessionName: string;
  /** Optional bridge — null/undefined → toggle renders disabled
   *  'unavailable' state per Q-MBT17-2=a. */
  readonly workstationBridge?: TileAutopilotToggleBridge | null;
}

type ToggleState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      enabled: boolean;
      lastError?: string;
    }
  | { kind: 'unavailable'; reason: string };

const CHECKBOX_STYLE: React.CSSProperties = {
  cursor: 'pointer',
  flexShrink: 0,
};

const CHECKBOX_DISABLED_STYLE: React.CSSProperties = {
  ...CHECKBOX_STYLE,
  cursor: 'not-allowed',
  opacity: 0.5,
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.length > 0) return err;
  return 'unknown error';
}

export function TileAutopilotToggle(
  props: TileAutopilotToggleProps,
): JSX.Element {
  const { sessionName, workstationBridge } = props;

  const [state, setState] = useState<ToggleState>(
    workstationBridge
      ? { kind: 'loading' }
      : { kind: 'unavailable', reason: 'bridge unavailable' },
  );

  useEffect(() => {
    if (!workstationBridge) {
      setState({ kind: 'unavailable', reason: 'bridge unavailable' });
      return undefined;
    }
    setState({ kind: 'loading' });
    let cancelled = false;
    workstationBridge
      .getSessionAutopilotEnabled(sessionName)
      .then((res) => {
        if (cancelled) return;
        setState({ kind: 'ready', enabled: res.enabled });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ kind: 'unavailable', reason: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [workstationBridge, sessionName]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (state.kind !== 'ready' || !workstationBridge) return;
    const next = e.target.checked;
    const prevEnabled = state.enabled;
    // Optimistic update — immediately reflect the new value.
    setState({ kind: 'ready', enabled: next });
    workstationBridge
      .setSessionAutopilotEnabled(sessionName, next)
      .then((res) => {
        // Confirm with server response.
        setState({ kind: 'ready', enabled: res.enabled });
      })
      .catch((err: unknown) => {
        // Rollback: revert to previous value + surface error tooltip.
        // Keep state.kind === 'ready' (checkbox stays enabled per
        // Q-MBT17-3=a so operator can retry).
        setState({
          kind: 'ready',
          enabled: prevEnabled,
          lastError: errorMessage(err),
        });
      });
  }

  const isDisabled = state.kind !== 'ready';
  const checked: boolean = state.kind === 'ready' ? state.enabled : false;

  let title = '';
  if (state.kind === 'unavailable') {
    title = `autopilot unavailable — ${state.reason}`;
  } else if (state.kind === 'ready' && state.lastError) {
    title = `autopilot update failed — ${state.lastError}`;
  } else if (state.kind === 'ready') {
    title = state.enabled ? 'autopilot ON' : 'autopilot OFF';
  }

  return (
    <input
      type="checkbox"
      role="switch"
      data-testid="tile-autopilot-toggle"
      data-state={state.kind}
      aria-label={`Autopilot for ${sessionName}`}
      title={title}
      checked={checked}
      disabled={isDisabled}
      onChange={handleChange}
      style={isDisabled ? CHECKBOX_DISABLED_STYLE : CHECKBOX_STYLE}
    />
  );
}
