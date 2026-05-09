// MB-T38 WB1 RED stub — swarm-state.md write protocol + handoff document
// generation. Full implementation deferred to WB2 GREEN (after Terminal A
// WB2 GREEN ships the real action-variant-ipc emitter protocol).
//
// Two distinct write triggers per D9 (separate triggers, separate artifacts):
//   1. Continuous: action-variant:fired | tile-grid:session-add | tile-grid:session-remove
//                  | halt:emitted | error:recorded | peer:turn-complete
//      → overwrites docs/swarm-state.md atomically (temp+rename)
//   2. One-shot:   handoff:triggered
//      → writes docs/coordination/handoff-<timestamp>.md (5 §8.2 sections)
//      → does NOT touch docs/swarm-state.md
//
// These are separate call stacks. writeSwarmState() and writeHandoffDoc() are
// NEVER called from the same handler.

import { EventEmitter } from 'node:events';

export type HaltUrgency = 'high' | 'medium' | 'low';
export type CompletionStatus = 'complete' | 'TURN_INCOMPLETE' | 'error';
export type HandoffTriggerType = 'token-threshold' | 'marker';

export interface ActionVariantFiredPayload {
  actionType: string;
  payload: unknown;
  sessionName: string;
  firedAt: string;
}

export interface TileGridSessionAddPayload {
  sessionName: string;
}

export interface TileGridSessionRemovePayload {
  sessionName: string;
}

export interface HaltEmittedPayload {
  reason: string;
  halt_urgency: HaltUrgency;
  halt_emitted_at: string;
  halt_blocking: string[];
}

export interface ErrorRecordedPayload {
  message: string;
  sessionName?: string;
  timestamp: string;
}

export interface PeerTurnCompletePayload {
  sessionName: string;
  task: string;
  filesTouched: string[];
  result: string;
  completionStatus: CompletionStatus;
  noFollowUp: boolean;
  followUpAction?: string;
}

export interface HandoffTriggeredPayload {
  triggerType: HandoffTriggerType;
  marker?: string;
}

export interface SwarmStateWriterConfig {
  /** Absolute path to swarm-state.md (e.g., <repo>/docs/swarm-state.md) */
  swarmStatePath: string;
  /** Absolute path to handoff document directory (e.g., <repo>/docs/coordination/) */
  handoffDir: string;
}

/**
 * Subscribes to action-variant and tile-grid events emitted by the workstation
 * IPC layer. Maintains docs/swarm-state.md per orchestrator.md §1 schema and
 * generates docs/coordination/handoff-<timestamp>.md per §8.2 at handoff trigger.
 *
 * D9 constraint: continuous swarm-state.md writes and handoff document generation
 * are SEPARATE triggers and SEPARATE artifacts. writeSwarmState() and
 * writeHandoffDoc() are never called from the same event handler.
 */
export class SwarmStateWriter {
  constructor(_emitter: EventEmitter, _config: SwarmStateWriterConfig) {
    // WB1 RED stub — no event listeners attached, no writes implemented.
    // WB2 GREEN: attach listeners, implement writeSwarmState + writeHandoffDoc.
  }

  dispose(): void {
    // WB1 RED stub — no listeners to remove.
    // WB2 GREEN: remove all attached listeners.
  }
}
