// MB-T16 WB1 — TileApprovalPicker skeleton.
//
// React dropdown component for the per-session approval-policy picker
// (MB-T16 ticket). WB1 ships a skeleton component that renders a
// placeholder div; WB3 fills in the real chrome (native <select> with
// tight/medium/loose options + onChange handler + disabled state on
// error per Q-MBT16-2=a + optimistic UI on change per Q-MBT16-3=a).
//
// Per Q-MBT16-4=a operator-confirmed slot-population mechanism:
// TileApprovalPicker is rendered by TileGridApp via a `renderPickerSlot`
// render-prop closure passed down through Tile. It is NOT a child of
// the existing tile-header div directly — it lives inside the
// `<div data-slot="picker">` wrapper that survives in tile.tsx.
//
// Per Q-MBT16-5=a: separate file (mirrors tile-header.tsx).
// Per Q-MBT16-6=a: bridge methods are OPTIONAL on the renderer-side
// WorkstationBridgeShape; this picker degrades gracefully when the
// bridge prop is null/undefined (Q-MBT16-2=a "policy unavailable").

import type {
  ApprovalPolicy,
  ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';

/** Slim bridge shape consumed by the picker. TileGridApp adapts the
 *  WorkstationBridgeShape's optional methods into this required shape
 *  only when both are defined; otherwise the picker receives null. */
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
  /** Optional bridge — null/undefined → picker renders disabled per
   *  Q-MBT16-2=a. WB3 implements the disabled-with-tooltip path. */
  readonly workstationBridge?: TileApprovalPickerBridge | null;
}

export function TileApprovalPicker(_props: TileApprovalPickerProps): JSX.Element {
  // WB1 placeholder render — WB3 replaces with real <select> chrome.
  return (
    <div data-testid="tile-approval-picker-content" data-mb-t16-stub="true" />
  );
}
