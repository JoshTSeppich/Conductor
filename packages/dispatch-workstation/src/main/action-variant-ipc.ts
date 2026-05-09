// MB-T35-revised — Action variant IPC dispatcher.
//
// Consumes a ParsedActionMarker (output of parseActionMarker in
// src/coarchitect/chat-content-markers.ts), validates fields against
// marker-specific inline schemas (resolution (a): field names match MB-T41 §2
// text-block format, NOT §12 tool-use schemas), maps fields to §12 IPC
// payloads, consults the approval-policy resolver, and routes to the
// correct downstream surface:
//
//   send-prompt-to-session    → fireSendPrompt dep (session-send-prompt-ipc)
//   spawn-session             → fireSpawn dep (orchestrator-fire-spawn)
//   kill-session              → fireKill dep (session-kill-ipc)
//   pull-handoff-from-session → firePullHandoff dep (daemon GET /v2/sessions/:name/handoff)
//   assign-task               → fireAssignTask dep (autopilot startIntent)
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
// This module bridges the gap via marker-specific field validation + dispatch-layer
// field mapping. Future operator-arbitrated alignment may unify them.
//
// F-MBT35R-B: spawn-session marker does not include repoPath (required by
// §12 SpawnSessionActionPayloadSchema). Production wiring resolves repoPath
// from session-context defaults via the fireSpawn dep. Halt-and-surface if
// context-default is not viable.
//
// F-MBT35R-C: dispatch-workstation does not declare zod as a direct dependency.
// Inline manual validation is used here instead of Zod (field set is required/optional
// strings only; manual validation is complete and correct for MB-T35-revised scope).
// Followup: add zod to dispatch-workstation package.json to enable Zod-backed
// marker schemas at a future ticket.
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
// Marker field validation (inline — F-MBT35R-A + F-MBT35R-C)
// ─────────────────────────────────────────────────────────────────────────────

type FieldValidation<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

function requireStr(fields: Record<string, string>, key: string): string | null {
  const val = (fields[key] ?? '').trim();
  return val.length > 0 ? val : null;
}

function optionalStr(fields: Record<string, string>, key: string): string | undefined {
  const val = (fields[key] ?? '').trim();
  return val.length > 0 ? val : undefined;
}

interface SendPromptFields { sessionName: string; prompt: string; rationale?: string }
interface SpawnSessionFields { sessionName: string; initialPrompt: string; rationale?: string }
interface KillSessionFields { sessionName: string; rationale?: string }
interface PullHandoffFields { sessionName: string; rationale?: string }
interface AssignTaskFields { sessionName: string; ticketScope: string; rationale?: string }

function validateSendPromptFields(f: Record<string, string>): FieldValidation<SendPromptFields> {
  const sessionName = requireStr(f, 'sessionName');
  if (!sessionName) return { ok: false, message: 'send-prompt-to-session: sessionName is required' };
  const prompt = requireStr(f, 'prompt');
  if (!prompt) return { ok: false, message: 'send-prompt-to-session: prompt is required' };
  return { ok: true, data: { sessionName, prompt, rationale: optionalStr(f, 'rationale') } };
}

function validateSpawnSessionFields(f: Record<string, string>): FieldValidation<SpawnSessionFields> {
  const sessionName = requireStr(f, 'sessionName');
  if (!sessionName) return { ok: false, message: 'spawn-session: sessionName is required' };
  const initialPrompt = requireStr(f, 'initialPrompt');
  if (!initialPrompt) return { ok: false, message: 'spawn-session: initialPrompt is required' };
  return { ok: true, data: { sessionName, initialPrompt, rationale: optionalStr(f, 'rationale') } };
}

function validateKillSessionFields(f: Record<string, string>): FieldValidation<KillSessionFields> {
  const sessionName = requireStr(f, 'sessionName');
  if (!sessionName) return { ok: false, message: 'kill-session: sessionName is required' };
  return { ok: true, data: { sessionName, rationale: optionalStr(f, 'rationale') } };
}

function validatePullHandoffFields(f: Record<string, string>): FieldValidation<PullHandoffFields> {
  const sessionName = requireStr(f, 'sessionName');
  if (!sessionName) return { ok: false, message: 'pull-handoff-from-session: sessionName is required' };
  return { ok: true, data: { sessionName, rationale: optionalStr(f, 'rationale') } };
}

function validateAssignTaskFields(f: Record<string, string>): FieldValidation<AssignTaskFields> {
  const sessionName = requireStr(f, 'sessionName');
  if (!sessionName) return { ok: false, message: 'assign-task: sessionName is required' };
  const ticketScope = requireStr(f, 'ticketScope');
  if (!ticketScope) return { ok: false, message: 'assign-task: ticketScope is required' };
  return { ok: true, data: { sessionName, ticketScope, rationale: optionalStr(f, 'rationale') } };
}

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
 *
 * Steps:
 *   1. Reject unknown action types immediately (kind:'error').
 *   2. Validate marker fields against the action-type-specific inline schema.
 *   3. Consult approval resolver; return kind:'pending-approval' if required.
 *   4. Route to the correct dep with field-mapped payload.
 *   5. Emit ACTION_VARIANT_FIRED_EVENT on actionVariantEmitter.
 *   6. Return kind:'fired' with sessionName + ISO firedAt timestamp.
 */
export async function dispatchActionVariant(
  parsed: ParsedActionMarker,
  deps: ActionVariantDispatchDeps,
): Promise<ActionVariantDispatchResult> {
  const { actionType, fields } = parsed;

  if (!(MARKER_ACTION_TYPES as readonly string[]).includes(actionType)) {
    return { kind: 'error', message: `unknown action type: ${actionType}` };
  }

  const knownType = actionType as MarkerActionType;

  try {
    switch (knownType) {
      case 'send-prompt-to-session': {
        const v = validateSendPromptFields(fields);
        if (!v.ok) return { kind: 'error', message: v.message };
        const { sessionName, prompt, rationale } = v.data;
        const approval = await deps.resolveApproval({ actionType: knownType, sessionName });
        if (approval.approvalRequired) {
          return { kind: 'pending-approval', actionType: knownType, sessionName, reason: approval.reason };
        }
        await deps.fireSendPrompt(sessionName, prompt, rationale);
        const firedAt = new Date().toISOString();
        const firedPayload: ActionVariantFiredPayload = { actionType: knownType, payload: v.data, sessionName, firedAt };
        actionVariantEmitter.emit(ACTION_VARIANT_FIRED_EVENT, firedPayload);
        return { kind: 'fired', actionType: knownType, sessionName, firedAt };
      }

      case 'spawn-session': {
        const v = validateSpawnSessionFields(fields);
        if (!v.ok) return { kind: 'error', message: v.message };
        const { sessionName, initialPrompt, rationale } = v.data;
        const approval = await deps.resolveApproval({ actionType: knownType, sessionName });
        if (approval.approvalRequired) {
          return { kind: 'pending-approval', actionType: knownType, sessionName, reason: approval.reason };
        }
        const spawnResult = await deps.fireSpawn(sessionName, initialPrompt, rationale);
        if ('declined' in spawnResult) {
          return { kind: 'error', message: `spawn-session: operator declined for ${sessionName}` };
        }
        const firedAt = new Date().toISOString();
        const firedPayload: ActionVariantFiredPayload = {
          actionType: knownType,
          payload: v.data,
          sessionName: spawnResult.sessionName,
          firedAt,
        };
        actionVariantEmitter.emit(ACTION_VARIANT_FIRED_EVENT, firedPayload);
        return { kind: 'fired', actionType: knownType, sessionName: spawnResult.sessionName, firedAt };
      }

      case 'kill-session': {
        const v = validateKillSessionFields(fields);
        if (!v.ok) return { kind: 'error', message: v.message };
        const { sessionName, rationale } = v.data;
        const approval = await deps.resolveApproval({ actionType: knownType, sessionName });
        if (approval.approvalRequired) {
          return { kind: 'pending-approval', actionType: knownType, sessionName, reason: approval.reason };
        }
        // rationale maps to §12 KillSessionActionPayloadSchema.reason (F-MBT35R-A)
        await deps.fireKill(sessionName, rationale);
        const firedAt = new Date().toISOString();
        const firedPayload: ActionVariantFiredPayload = { actionType: knownType, payload: v.data, sessionName, firedAt };
        actionVariantEmitter.emit(ACTION_VARIANT_FIRED_EVENT, firedPayload);
        return { kind: 'fired', actionType: knownType, sessionName, firedAt };
      }

      case 'pull-handoff-from-session': {
        const v = validatePullHandoffFields(fields);
        if (!v.ok) return { kind: 'error', message: v.message };
        const { sessionName } = v.data;
        const approval = await deps.resolveApproval({ actionType: knownType, sessionName });
        if (approval.approvalRequired) {
          return { kind: 'pending-approval', actionType: knownType, sessionName, reason: approval.reason };
        }
        await deps.firePullHandoff(sessionName);
        const firedAt = new Date().toISOString();
        const firedPayload: ActionVariantFiredPayload = { actionType: knownType, payload: v.data, sessionName, firedAt };
        actionVariantEmitter.emit(ACTION_VARIANT_FIRED_EVENT, firedPayload);
        return { kind: 'fired', actionType: knownType, sessionName, firedAt };
      }

      case 'assign-task': {
        const v = validateAssignTaskFields(fields);
        if (!v.ok) return { kind: 'error', message: v.message };
        const { sessionName, ticketScope, rationale } = v.data;
        const approval = await deps.resolveApproval({ actionType: knownType, sessionName });
        if (approval.approvalRequired) {
          return { kind: 'pending-approval', actionType: knownType, sessionName, reason: approval.reason };
        }
        // ticketScope maps to intent_summary (§12 AssignTaskActionPayloadSchema name — F-MBT35R-A)
        await deps.fireAssignTask(sessionName, ticketScope, rationale);
        const firedAt = new Date().toISOString();
        const firedPayload: ActionVariantFiredPayload = { actionType: knownType, payload: v.data, sessionName, firedAt };
        actionVariantEmitter.emit(ACTION_VARIANT_FIRED_EVENT, firedPayload);
        return { kind: 'fired', actionType: knownType, sessionName, firedAt };
      }

      default: {
        const _exhaustive: never = knownType;
        void _exhaustive;
        return { kind: 'error', message: `unhandled action type: ${knownType as string}` };
      }
    }
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
