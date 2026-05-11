// MB-T11 WB6 — per-session autopilot state machine.
//
// Per Q-MBT11-2=a + Q-MBT11-9=a: per-session autopilot toggle persisted to
// JSON file in userData (autopilot-state-store.ts).
//
// Per Q-MBT11-8=a: pending_intents + last_action_fired_at live workstation-
// side; the WB7 Tier4 fan-out merges this state INTO each
// SessionContextSnapshot after the daemon fetch. The daemon's
// /v3/sessions/:name/context-snapshot continues to return [] / null for
// these fields (KNOWN per context-snapshot.ts:167 hardcode); the workstation
// authoritatively overwrites them from this module's getPendingIntents +
// state.lastActionFiredAt.
//
// Per Q-MBT11-5=a: assign-task is a metadata-only marker. startIntent
// creates an intent_id (UUIDv7 for sortability) and registers a
// PendingIntent on the targeted session's state. Subsequent send-prompt
// actions emitted by the orchestrator carry the SendPromptEnvelope
// referencing this intent_id; recordAction advances the step counter
// when the envelope's intent_id matches an existing PendingIntent.
//
// Inline UUIDv7 helper mirrors dispatch-daemon/src/events/history.ts:135
// (the daemon's UUIDv7 generator). Replicated rather than imported because
// dispatch-workstation does not import from dispatch-daemon today; copying
// 25 lines avoids introducing the cross-package dep just for autopilot.

import { randomBytes } from 'node:crypto';
import type {
  PendingIntent,
  AssignTaskActionPayload,
  SendPromptActionPayload,
} from 'dispatch-core/dist/v3/schema.js';
import type { MBT11ActionType } from './orchestrator-action-types.js';
import {
  defaultAutopilotState,
  readAutopilotState,
  writeAutopilotState,
  type AutopilotState,
} from './autopilot-state-store.js';

// ─────────────────────────────────────────────────────────────────────────────
// UUIDv7 generator (copy of dispatch-daemon/src/events/history.ts:135)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hand-rolled UUIDv7 per RFC 9562 §5.7. Workstation copy of the daemon's
 * uuidv7 helper; replicated to avoid a cross-package import for a 25-line
 * function. Outputs are KNOWN-compatible: same algorithm, same byte
 * layout, same RFC version + variant bits.
 *
 * Time-prefix property is what we want for autopilot intent_ids: when
 * startIntent fires N times in a row, the resulting ids sort
 * lexicographically by creation time, which makes the audit log easier
 * to read.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);
  const now = BigInt(Date.now());
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);
  // Version 7 in high nibble of byte 6.
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Variant 10xx in top 2 bits of byte 8.
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20, 32)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AutopilotLoop — per-session state machine consumed by the v3.5 caller
// (dispatchActionVariant via action-marker-router) and the renderer-side
// AutopilotIpcController.
// ─────────────────────────────────────────────────────────────────────────────

export interface AutopilotLoopDeps {
  /** Inject for unit-test determinism; defaults to () => new Date().toISOString(). */
  now?: () => string;
  /** Inject for unit-test determinism; defaults to uuidv7. */
  uuidGen?: () => string;
  /** Inject for unit-test isolation; defaults to readAutopilotState. */
  read?: (sessionName: string) => AutopilotState;
  /** Inject for unit-test isolation; defaults to writeAutopilotState. */
  write?: (sessionName: string, state: AutopilotState) => void;
}

export interface StartIntentResult {
  intent_id: string;
}

/**
 * Per-session autopilot state machine. Stateless class — every method
 * reads + writes through the injected store deps so multiple instances
 * (e.g., across renderer-side IPC and main-process consumers) see the
 * same persisted state.
 */
export class AutopilotLoop {
  private readonly now: () => string;
  private readonly uuidGen: () => string;
  private readonly read: (sessionName: string) => AutopilotState;
  private readonly write: (sessionName: string, state: AutopilotState) => void;

  constructor(deps: AutopilotLoopDeps = {}) {
    this.now = deps.now ?? (() => new Date().toISOString());
    this.uuidGen = deps.uuidGen ?? uuidv7;
    this.read = deps.read ?? readAutopilotState;
    this.write = deps.write ?? writeAutopilotState;
  }

  /** Toggle autopilot on/off for a session. Persists immediately. */
  setEnabled(sessionName: string, enabled: boolean): void {
    const state = this.read(sessionName);
    state.enabled = enabled;
    this.write(sessionName, state);
  }

  /** Read the autopilot toggle for a session. Default is `false`. */
  isEnabled(sessionName: string): boolean {
    return this.read(sessionName).enabled;
  }

  /**
   * Start a multi-step intent on the targeted session. Creates a UUIDv7
   * intent_id, registers a PendingIntent at step=1 (or expected_steps if
   * known), advances currentIntentId / currentStep / totalSteps. Returns
   * the new intent_id for the orchestrator to thread through subsequent
   * send-prompt envelopes.
   */
  startIntent(payload: AssignTaskActionPayload): StartIntentResult {
    const intent_id = this.uuidGen();
    const total_steps = payload.expected_steps ?? 1;

    const state = this.read(payload.sessionName);
    const newIntent: PendingIntent = {
      intent_id,
      step: 1,
      total_steps,
      intent_summary: payload.intent_summary,
    };
    state.pendingIntents.push(newIntent);
    state.currentIntentId = intent_id;
    state.currentStep = 1;
    state.totalSteps = total_steps;
    state.lastActionFiredAt = this.now();
    this.write(payload.sessionName, state);

    return { intent_id };
  }

  /**
   * Record that an action fired against `sessionName`. Updates
   * `lastActionFiredAt` always. When `actionType === 'send'` AND the
   * payload carries an envelope referencing an existing PendingIntent,
   * advances that intent's step counter to the envelope's step value.
   */
  recordAction(
    sessionName: string,
    actionType: MBT11ActionType,
    payload: unknown,
  ): void {
    const state = this.read(sessionName);
    state.lastActionFiredAt = this.now();

    // Step-advance path: send action with envelope.
    if (actionType === 'send') {
      const sendPayload = payload as SendPromptActionPayload;
      const envelope = sendPayload.envelope;
      if (envelope) {
        const idx = state.pendingIntents.findIndex(
          (i) => i.intent_id === envelope.intent_id,
        );
        if (idx >= 0) {
          state.pendingIntents[idx]!.step = envelope.step;
          // Mirror onto current* fields when this is the active intent.
          if (state.currentIntentId === envelope.intent_id) {
            state.currentStep = envelope.step;
          }
        }
      }
    }

    this.write(sessionName, state);
  }

  /**
   * Return the PendingIntent[] for a session — the array shape matches
   * dispatch-core PendingIntentSchema (§11) exactly so the WB7 Tier4
   * fan-out can splice these into SessionContextSnapshot.pending_intents
   * without reshaping. Empty array when no intents are active.
   */
  getPendingIntents(sessionName: string): PendingIntent[] {
    return this.read(sessionName).pendingIntents;
  }

  /**
   * Return the most-recent action timestamp for a session (or null if no
   * action has fired yet). Used by WB7 Tier4 fan-out merge to overwrite
   * the daemon-snapshot hardcoded null per Q-MBT11-8=a.
   */
  getLastActionFiredAt(sessionName: string): string | null {
    return this.read(sessionName).lastActionFiredAt;
  }

  /**
   * Clear an intent from a session's pendingIntents — invoked when the
   * multi-step plan finishes (or operator declines). If the cleared
   * intent is the current one, also clears currentIntentId / currentStep
   * / totalSteps. No-op when the intent_id is not in pendingIntents.
   */
  clearIntent(sessionName: string, intentId: string): void {
    const state = this.read(sessionName);
    const before = state.pendingIntents.length;
    state.pendingIntents = state.pendingIntents.filter(
      (i) => i.intent_id !== intentId,
    );
    if (state.pendingIntents.length === before) {
      // Nothing matched — return without touching disk.
      return;
    }
    if (state.currentIntentId === intentId) {
      state.currentIntentId = null;
      state.currentStep = null;
      state.totalSteps = null;
    }
    this.write(sessionName, state);
  }

  /**
   * Reset the entire state for a session (used for testing + debugging).
   * Production callers should rely on setEnabled(false) + clearIntent()
   * instead.
   */
  resetSession(sessionName: string): void {
    this.write(sessionName, defaultAutopilotState());
  }
}
