// MB-T35-revised — Action variant IPC dispatcher.
//
// Consumes a ParsedActionMarker (output of parseActionMarker in
// src/coarchitect/chat-content-markers.ts), validates fields against
// marker-specific Zod schemas (resolution (a): schemas match MB-T41 §2
// text-block format, NOT §12 tool-use schemas), maps fields to §12 IPC
// payloads, consults the approval-policy resolver, and routes to the
// correct downstream surface:
//
//   send-prompt-to-session  → fireSendPrompt dep (session-send-prompt-ipc)
//   spawn-session           → fireSpawn dep (orchestrator-fire-spawn)
//   kill-session            → fireKill dep (session-kill-ipc)
//   pull-handoff-from-session → firePullHandoff dep (daemon GET /v2/sessions/:name/handoff)
//   assign-task             → fireAssignTask dep (autopilot startIntent)
//
// Field mapping (per operator-arbitrated resolution (a), 2026-05-08):
//   send-prompt-to-session: marker.sessionName → IPC target; marker.prompt → payload;
//                           marker.rationale → optional audit
//   spawn-session:          marker.sessionName → IPC sessionName; marker.initialPrompt →
//                           initialPrompt; repoPath resolved by dep (F-MBT35R-B)
//   kill-session:           marker.sessionName → IPC; marker.rationale → IPC.reason
//   pull-handoff-from-session: marker.sessionName → IPC; marker.rationale → audit log
//   assign-task:            marker.sessionName → IPC; marker.ticketScope → intent_summary
//                           (§12 AssignTaskPayloadSchema field name); marker.rationale → audit
//
// F-MBT35R-A: §12 schemas and MB-T41 §2 text-block fields have drifted.
// This module bridges the gap via marker-specific schemas + dispatch-layer
// field mapping. Future operator-arbitrated alignment may unify them.
//
// F-MBT35R-B: spawn-session marker does not include repoPath (required by
// §12 SpawnSessionActionPayloadSchema). Production wiring resolves repoPath
// from session-context defaults via the fireSpawn dep. Halt-and-surface if
// context-default is not viable at WB2 GREEN.
//
// Emission protocol (Terminal B reads after WB2 GREEN):
//   Event name:    action-variant:fired  (ACTION_VARIANT_FIRED_EVENT)
//   Payload shape: { actionType, payload, sessionName, firedAt }
//   Emitter:       actionVariantEmitter (singleton EventEmitter; import directly)
//
// Pure module — no Electron, no ipcMain. All downstream IPC/HTTP calls
// are expressed as narrow injectable deps on ActionVariantDispatchDeps.
// Fully unit-testable without Electron runtime.

import { EventEmitter } from 'node:events';
import type { ParsedActionMarker } from '../coarchitect/chat-content-markers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Known marker action types (v3.5 names per MB-T41 §2 / orchestrator.md §2)
// ─────────────────────────────────────────────────────────────────────────────

export const MARKER_ACTION_TYPES = [
  'send-prompt-to-session',
  'spawn-session',
  'kill-session',
  'pull-handoff-from-session',
  'assign-task',
] as const;

export type MarkerActionType = (typeof MARKER_ACTION_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Dep-injection surface
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionVariantDispatchDeps {
  /**
   * Approval policy resolver. Called with the v3.5 marker action type name
   * (not v3.0 MBT11ActionType). Production wiring maps to resolveApprovalShim.
   */
  resolveApproval: (input: {
    actionType: string;
    sessionName: string;
  }) => Promise<{ approvalRequired: boolean; reason: string }>;

  /**
   * Send-prompt fire. Forwards sessionName + prompt (mapped from marker.prompt).
   * marker.rationale is optional third argument for audit context.
   */
  fireSendPrompt: (
    sessionName: string,
    prompt: string,
    rationale?: string,
  ) => Promise<void>;

  /**
   * Spawn-session fire. Forwards sessionName + initialPrompt.
   * repoPath is resolved by the dep (F-MBT35R-B); not in marker format.
   * Returns { sessionName } on success or { declined: true } on operator cancel.
   */
  fireSpawn: (
    sessionName: string,
    initialPrompt: string,
    rationale?: string,
  ) => Promise<{ sessionName: string } | { declined: true }>;

  /**
   * Kill-session fire. marker.rationale maps to the optional reason param
   * (per §12 KillSessionActionPayloadSchema.reason).
   */
  fireKill: (sessionName: string, reason?: string) => Promise<void>;

  /**
   * Pull-handoff HTTP fire — GET /v2/sessions/:name/handoff.
   */
  firePullHandoff: (sessionName: string) => Promise<{
    content: string;
    written_at: string;
    archived_to: string;
  }>;

  /**
   * Assign-task fire. marker.ticketScope maps to intent_summary (per §12
   * AssignTaskActionPayloadSchema.intent_summary field — F-MBT35R-A mapping).
   */
  fireAssignTask: (
    sessionName: string,
    intent_summary: string,
    rationale?: string,
  ) => Promise<{ intent_id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export type ActionVariantDispatchResult =
  | {
      kind: 'fired';
      actionType: MarkerActionType;
      sessionName: string;
      firedAt: string;
    }
  | {
      kind: 'pending-approval';
      actionType: string;
      sessionName: string;
      reason: string;
    }
  | {
      kind: 'error';
      message: string;
    };

// ─────────────────────────────────────────────────────────────────────────────
// Emission protocol (Terminal B integration point)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_VARIANT_FIRED_EVENT = 'action-variant:fired' as const;

/** Payload emitted on ACTION_VARIANT_FIRED_EVENT after a successful action fire. */
export interface ActionVariantFiredPayload {
  actionType: MarkerActionType;
  payload: unknown;
  sessionName: string;
  firedAt: string;
}

/**
 * Singleton EventEmitter. Terminal B (swarm-state-writer) subscribes:
 *   import { actionVariantEmitter, ACTION_VARIANT_FIRED_EVENT } from './action-variant-ipc.js';
 *   actionVariantEmitter.on(ACTION_VARIANT_FIRED_EVENT, (p: ActionVariantFiredPayload) => { ... });
 */
export const actionVariantEmitter = new EventEmitter();

// ─────────────────────────────────────────────────────────────────────────────
// Core dispatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a parsed action variant marker to the appropriate IPC surface.
 * Validates marker fields against marker-specific schemas, consults approval
 * resolver, routes to dep, emits fired event on success.
 *
 * WB1 RED stub — returns { kind: 'error', message: 'not implemented' }
 * unconditionally until WB2 GREEN implementation.
 */
export async function dispatchActionVariant(
  _parsed: ParsedActionMarker,
  _deps: ActionVariantDispatchDeps,
): Promise<ActionVariantDispatchResult> {
  return { kind: 'error', message: 'not implemented' };
}
