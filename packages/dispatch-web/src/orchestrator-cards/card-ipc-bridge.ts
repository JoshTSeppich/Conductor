// MB-T07 webview-side IPC bridge for orchestrator cards.
//
// Per WORKSTATION_CONTRACT.md §7.1, the webview emits card-approved /
// card-declined / multi-choice-selected to the shell. The shell exposes
// window.cardBridge (via Electron contextBridge in
// packages/dispatch-workstation/src/main/preload.mts; the factory itself
// lives in src/main/card-bridge.ts). This module is a thin adapter that
// constructs the v3-schema-shaped envelope and forwards via the bridge.
//
// When window.cardBridge is undefined (dispatch-web standalone in
// browser dev), all emit calls are no-ops. Subscription helpers return
// no-op cleanup functions. dispatch-web stays runnable outside Electron.

import type {
  CardOutput,
  MultiChoiceCardOutput,
} from 'dispatch-core/src/v3/schema.js';

/** Shell→Webview card-rendered envelope shape. */
export interface CardRenderedPayload {
  type: 'orchestrator-card-rendered';
  card_id: string;
  card: CardOutput | MultiChoiceCardOutput;
}

/** Shell→Webview card-superseded envelope shape. */
export interface CardSupersededPayload {
  type: 'orchestrator-card-superseded';
  superseding_card_id: string;
  superseded_card_ids: string[];
}

/** Shell→Webview card-update envelope shape. */
export interface CardUpdatePayload {
  type: 'orchestrator-card-update';
  card_id: string;
  patch: Record<string, unknown>;
}

/** Webview→Shell envelope shapes (constructed here, validated at the boundary). */
export interface CardApprovedEnvelope {
  type: 'card-approved';
  card_id: string;
  free_form_text: string | null;
  timestamp: string;
}
export interface CardDeclinedEnvelope {
  type: 'card-declined';
  card_id: string;
  reason: string;
  timestamp: string;
}
export interface MultiChoiceSelectedEnvelope {
  type: 'multi-choice-selected';
  card_id: string;
  selected_index: number;
  free_form_text: string | null;
  timestamp: string;
}

export type Cleanup = () => void;

export interface CardBridge {
  approve(message: CardApprovedEnvelope): void;
  decline(message: CardDeclinedEnvelope): void;
  multiChoiceSelect(message: MultiChoiceSelectedEnvelope): void;
  onCardRendered(handler: (payload: CardRenderedPayload) => void): Cleanup;
  onCardSuperseded(handler: (payload: CardSupersededPayload) => void): Cleanup;
  onCardUpdate(handler: (payload: CardUpdatePayload) => void): Cleanup;
}

export interface CardBridgeWindow {
  cardBridge?: CardBridge;
}

function getBridge(): CardBridge | undefined {
  return (globalThis as unknown as CardBridgeWindow).cardBridge;
}

/**
 * Emit a `card-approved` IPC envelope to the shell. free_form_text is
 * stored as null (per CardApprovedMessage's nullable field) when the
 * operator approves without modification — the schema distinguishes
 * "no input" from "empty string". Trimming is the caller's
 * responsibility.
 */
export function emitCardApproved(
  card_id: string,
  free_form_text: string,
): void {
  const bridge = getBridge();
  if (!bridge) return;
  bridge.approve({
    type: 'card-approved',
    card_id,
    free_form_text: free_form_text === '' ? null : free_form_text,
    timestamp: new Date().toISOString(),
  });
}

export function emitCardDeclined(card_id: string, reason: string): void {
  const bridge = getBridge();
  if (!bridge) return;
  bridge.decline({
    type: 'card-declined',
    card_id,
    reason,
    timestamp: new Date().toISOString(),
  });
}

export function emitMultiChoiceSelected(
  card_id: string,
  selected_index: number,
  free_form_text: string | null,
): void {
  const bridge = getBridge();
  if (!bridge) return;
  // WebviewToShellMessageSchema (v3/schema.ts:424-432) constrains
  // selected_index to int 0..3. The renderer uses -1 as a sentinel
  // for the "none of the above" free-form path; clamp at the
  // boundary so the wire envelope respects the schema. The
  // shell-side audit-row builder discriminates the free-form path
  // via free_form_text non-null + maps to operator_response='pending'.
  const clamped = Math.max(0, Math.min(3, Math.trunc(selected_index)));
  bridge.multiChoiceSelect({
    type: 'multi-choice-selected',
    card_id,
    selected_index: clamped,
    free_form_text,
    timestamp: new Date().toISOString(),
  });
}

export function subscribeCardRendered(
  handler: (payload: CardRenderedPayload) => void,
): Cleanup {
  const bridge = getBridge();
  if (!bridge) return () => {};
  return bridge.onCardRendered(handler);
}

export function subscribeCardSuperseded(
  handler: (payload: CardSupersededPayload) => void,
): Cleanup {
  const bridge = getBridge();
  if (!bridge) return () => {};
  return bridge.onCardSuperseded(handler);
}

export function subscribeCardUpdate(
  handler: (payload: CardUpdatePayload) => void,
): Cleanup {
  const bridge = getBridge();
  if (!bridge) return () => {};
  return bridge.onCardUpdate(handler);
}
