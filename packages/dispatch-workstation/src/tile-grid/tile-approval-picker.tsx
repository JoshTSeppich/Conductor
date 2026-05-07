// MB-T16 WB3 — TileApprovalPicker chrome implementation.
//
// Native <select> dropdown for the per-session approval-policy picker.
// Per Q-MBT16-1=a (native <select>) + Q-MBT16-2=a (disabled +
// tooltip on error) + Q-MBT16-3=a (optimistic UI + silent rollback
// on PUT error + tooltip).
//
// State machine (data-state attribute reflects the active branch):
//   'loading'     — initial fetch in flight; select disabled, value
//                   shows 'medium' as best-guess placeholder
//   'ready'       — fetch succeeded; select enabled with current policy
//   'unavailable' — bridge missing OR initial fetch errored; select
//                   disabled, tooltip surfaces reason
//
// PUT-error path (Q-MBT16-3=a): from 'ready', operator changes value
// → optimistic update → PUT fires. On success: state confirms with
// server response. On error: state reverts to previous policy + sets
// `lastError`; the select stays ENABLED so the operator can retry,
// with a tooltip surfacing the error message.
//
// Per Q-MBT16-5=a: separate file (mirrors tile-header.tsx).
// Per Q-MBT16-6=a: bridge prop optional; null/undefined → disabled
// 'unavailable' state at mount.

import { useEffect, useState } from 'react';
import type {
  ApprovalPolicy,
  ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';

/** Slim bridge shape consumed by the picker. TileGridApp (WB4) adapts
 *  the WorkstationBridgeShape's optional methods into this required
 *  shape only when both are defined; otherwise the picker receives null
 *  and renders the 'unavailable' state. */
export interface TileApprovalPickerBridge {
  getSessionApprovalPolicy(
    sessionName: string,
  ): Promise<ApprovalPolicyGetResponse>;
  putSessionApprovalPolicy(
    sessionName: string,
    policy: ApprovalPolicy,
  ): Promise<ApprovalPolicyGetResponse>;
}

export interface TileApprovalPickerProps {
  readonly sessionName: string;
  /** Optional bridge — null/undefined → picker renders disabled
   *  'unavailable' state per Q-MBT16-2=a. */
  readonly workstationBridge?: TileApprovalPickerBridge | null;
}

type PickerState =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      policy: ApprovalPolicy;
      updatedAt: string | null;
      lastError?: string;
    }
  | { kind: 'unavailable'; reason: string };

const POLICY_OPTIONS: ApprovalPolicy[] = ['tight', 'medium', 'loose'];

const SELECT_STYLE: React.CSSProperties = {
  fontSize: '10px',
  padding: '1px 4px',
  borderRadius: '3px',
  border: '1px solid #303030',
  background: '#1f2937',
  color: '#e0e0e0',
  cursor: 'pointer',
  flexShrink: 0,
};

const SELECT_DISABLED_STYLE: React.CSSProperties = {
  ...SELECT_STYLE,
  cursor: 'not-allowed',
  opacity: 0.5,
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.length > 0) return err;
  return 'unknown error';
}

export function TileApprovalPicker(
  props: TileApprovalPickerProps,
): JSX.Element {
  const { sessionName, workstationBridge } = props;

  const [state, setState] = useState<PickerState>(
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
      .getSessionApprovalPolicy(sessionName)
      .then((res) => {
        if (cancelled) return;
        setState({
          kind: 'ready',
          policy: res.approval_policy,
          updatedAt: res.updated_at,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ kind: 'unavailable', reason: errorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [workstationBridge, sessionName]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    if (state.kind !== 'ready' || !workstationBridge) return;
    const next = e.target.value as ApprovalPolicy;
    if (!POLICY_OPTIONS.includes(next)) return;
    const prevPolicy = state.policy;
    const prevUpdatedAt = state.updatedAt;
    // Optimistic update — immediately reflect the new value.
    setState({
      kind: 'ready',
      policy: next,
      updatedAt: prevUpdatedAt,
    });
    workstationBridge
      .putSessionApprovalPolicy(sessionName, next)
      .then((res) => {
        // Confirm with server response (server-assigned updated_at).
        setState({
          kind: 'ready',
          policy: res.approval_policy,
          updatedAt: res.updated_at,
        });
      })
      .catch((err: unknown) => {
        // Rollback: revert to previous policy + surface error tooltip.
        // Keep state.kind === 'ready' (select stays enabled per
        // Q-MBT16-3=a so operator can retry).
        setState({
          kind: 'ready',
          policy: prevPolicy,
          updatedAt: prevUpdatedAt,
          lastError: errorMessage(err),
        });
      });
  }

  const isDisabled = state.kind !== 'ready';
  const value: ApprovalPolicy = state.kind === 'ready' ? state.policy : 'medium';

  let title = '';
  if (state.kind === 'unavailable') {
    title = `policy unavailable — ${state.reason}`;
  } else if (state.kind === 'ready' && state.lastError) {
    title = `policy update failed — ${state.lastError}`;
  }

  return (
    <select
      data-testid="tile-approval-picker"
      data-state={state.kind}
      aria-label={`Approval policy for ${sessionName}`}
      title={title}
      value={value}
      disabled={isDisabled}
      onChange={handleChange}
      style={isDisabled ? SELECT_DISABLED_STYLE : SELECT_STYLE}
    >
      <option value="tight">tight</option>
      <option value="medium">medium</option>
      <option value="loose">loose</option>
    </select>
  );
}
