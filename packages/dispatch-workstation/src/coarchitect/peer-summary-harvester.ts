// MB-T39 WB2 GREEN — PeerSummaryHarvester: quiescence detection, summary
// prompt injection, TURN_INCOMPLETE honoring, §7 YAML validation + translation,
// per-peer state machine (IDLE/AWAITING_RESPONSE), TIMEOUT path.
//
// Subscribed to ConsoleIpcController.addStdoutObserver tap (Terminal X,
// MB-T37 WB2 GREEN SHA 38b1a03). Verified at HALT-STAGING-FOR-X clearance:
// addStdoutObserver(fn: (sessionName, chunk) => void): () => void — matches
// IConsoleBroadcaster exactly. Fan-out non-redirecting; fires after emitToWebview.
//
// Emission protocol (Wave 1, 70674e1): stateEmitter EventEmitter receives:
//   peer:turn-complete — PeerTurnCompletePayload (camelCase)
//   error:recorded     — ErrorRecordedPayload { sessionName, message, timestamp }
// SwarmStateWriter consumes both via emitter.on() in constructor.
//
// snake_case→camelCase translation (ratified HALT 0 PF4):
//   YAML keys: peer_session/task/files_touched/result/completion_status/no_follow_up/follow_up_action
//   Payload:   sessionName/task/filesTouched/result/completionStatus/noFollowUp/followUpAction?

import { EventEmitter } from 'node:events';
import jsYaml from 'js-yaml';
import type {
  CompletionStatus,
  PeerTurnCompletePayload,
} from './swarm-state-writer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Dependency interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Terminal X tap interface (MB-T37 WB2 GREEN, console-ipc.ts:169).
 * Fan-out observer; non-redirecting; returns disposer.
 */
export interface IConsoleBroadcaster {
  addStdoutObserver(
    observerFn: (sessionName: string, chunk: string) => void,
  ): () => void;
}

/**
 * MB-T09 prompt-injection surface (session-send-prompt-ipc.ts:38, HALT 0 PF2 KNOWN).
 */
export interface IPromptInjector {
  handleSendPrompt(payload: {
    sessionName: string;
    prompt: string;
    envelope?: unknown;
  }): Promise<{ ok: true } | { ok: false; error: unknown }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructor deps
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerSummaryHarvesterDeps {
  ptyBroadcaster: IConsoleBroadcaster;
  promptInjector: IPromptInjector;
  stateEmitter: EventEmitter;
  /** No-stdout-chunk window before firing summary prompt. Default 3000ms per Q-MBT39-2=(c). */
  quiescenceThresholdMs?: number;
  /** Max wait for peer summary response after prompt sent. Default 30000ms per HALT 1 ratification. */
  awaitingResponseTimeoutMs?: number;
  /** Sessions matching this pattern are never harvested. Default /^__orchestrator_/ per Q-MBT39-4. */
  orchestratorNamePattern?: RegExp;
  /** Injected prompt text per Q-MBT39-1 ratification. */
  summaryPromptText?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal state machine
// ─────────────────────────────────────────────────────────────────────────────

type PeerHarvestState = 'IDLE' | 'AWAITING_RESPONSE';

interface PeerEntry {
  state: PeerHarvestState;
  quiescenceTimer: ReturnType<typeof setTimeout> | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema constants (§7 field names; HALT 0 PF3 KNOWN)
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_YAML_FIELDS = [
  'peer_session',
  'task',
  'files_touched',
  'result',
  'completion_status',
  'no_follow_up',
] as const;

const ALL_KNOWN_YAML_FIELDS = new Set<string>([
  'peer_session',
  'task',
  'files_touched',
  'result',
  'completion_status',
  'no_follow_up',
  'follow_up_action',
]);

const VALID_COMPLETION_STATUSES = new Set<string>(['complete', 'TURN_INCOMPLETE', 'error']);

const DEFAULT_SUMMARY_PROMPT =
  '[SYSTEM-METADATA] Peer summary harvester request. Per MB-T41 §3 + §7: if your current turn is mid-work (incomplete sentence, mid-tool-call, thinking indicator, peer process still writing), output exactly the literal string "TURN_INCOMPLETE" with no trailing newline. Otherwise, emit your turn summary in §7 YAML format with exact parser-anchored field names: peer_session, task, files_touched, result, completion_status, no_follow_up, follow_up_action.';

// ─────────────────────────────────────────────────────────────────────────────
// PeerSummaryHarvester
// ─────────────────────────────────────────────────────────────────────────────

export class PeerSummaryHarvester {
  private readonly ptyBroadcaster: IConsoleBroadcaster;
  private readonly promptInjector: IPromptInjector;
  private readonly stateEmitter: EventEmitter;
  private readonly quiescenceThresholdMs: number;
  private readonly awaitingResponseTimeoutMs: number;
  private readonly orchestratorNamePattern: RegExp;
  private readonly summaryPromptText: string;

  private readonly peers = new Map<string, PeerEntry>();
  private disposeObserver: (() => void) | null = null;

  constructor(deps: PeerSummaryHarvesterDeps) {
    this.ptyBroadcaster = deps.ptyBroadcaster;
    this.promptInjector = deps.promptInjector;
    this.stateEmitter = deps.stateEmitter;
    this.quiescenceThresholdMs = deps.quiescenceThresholdMs ?? 3000;
    this.awaitingResponseTimeoutMs = deps.awaitingResponseTimeoutMs ?? 30000;
    this.orchestratorNamePattern = deps.orchestratorNamePattern ?? /^__orchestrator_/;
    this.summaryPromptText = deps.summaryPromptText ?? DEFAULT_SUMMARY_PROMPT;
  }

  start(): void {
    this.disposeObserver = this.ptyBroadcaster.addStdoutObserver(
      (sessionName, chunk) => { this._onPtyChunk(sessionName, chunk); },
    );
  }

  dispose(): void {
    if (this.disposeObserver !== null) {
      this.disposeObserver();
      this.disposeObserver = null;
    }
    for (const peer of this.peers.values()) {
      this._clearTimers(peer);
    }
    this.peers.clear();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _getOrCreate(sessionName: string): PeerEntry {
    let entry = this.peers.get(sessionName);
    if (entry === undefined) {
      entry = { state: 'IDLE', quiescenceTimer: null, timeoutTimer: null };
      this.peers.set(sessionName, entry);
    }
    return entry;
  }

  private _clearTimers(peer: PeerEntry): void {
    if (peer.quiescenceTimer !== null) {
      clearTimeout(peer.quiescenceTimer);
      peer.quiescenceTimer = null;
    }
    if (peer.timeoutTimer !== null) {
      clearTimeout(peer.timeoutTimer);
      peer.timeoutTimer = null;
    }
  }

  private _onPtyChunk(sessionName: string, chunk: string): void {
    // Q-MBT39-4: orchestrator sessions are never harvested
    if (this.orchestratorNamePattern.test(sessionName)) return;

    const peer = this._getOrCreate(sessionName);

    // Debounce: every chunk resets the quiescence timer (IDLE and AWAITING_RESPONSE)
    if (peer.quiescenceTimer !== null) {
      clearTimeout(peer.quiescenceTimer);
    }
    peer.quiescenceTimer = setTimeout(() => {
      peer.quiescenceTimer = null;
      this._onQuiescence(sessionName, peer);
    }, this.quiescenceThresholdMs);

    // Q-MBT39-3: in AWAITING_RESPONSE, parse chunk as candidate response
    if (peer.state === 'AWAITING_RESPONSE') {
      this._parseResponse(sessionName, peer, chunk);
    }
  }

  private _onQuiescence(sessionName: string, peer: PeerEntry): void {
    // Q-MBT39-3 concurrent lock: ignore if already AWAITING_RESPONSE
    if (peer.state !== 'IDLE') return;

    peer.state = 'AWAITING_RESPONSE';

    // TIMEOUT: if no valid response within awaitingResponseTimeoutMs → error + IDLE
    peer.timeoutTimer = setTimeout(() => {
      peer.timeoutTimer = null;
      if (peer.state === 'AWAITING_RESPONSE') {
        peer.state = 'IDLE';
        this.stateEmitter.emit('error:recorded', {
          sessionName,
          message: `peer summary response timeout after ${this.awaitingResponseTimeoutMs}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    }, this.awaitingResponseTimeoutMs);

    // Q-MBT39-5: fire-and-forget; each peer's prompt is independent
    void this.promptInjector.handleSendPrompt({
      sessionName,
      prompt: this.summaryPromptText,
    });
  }

  private _parseResponse(sessionName: string, peer: PeerEntry, chunk: string): void {
    const text = chunk.trim();

    // Cancel timeout — response chunk arrived
    if (peer.timeoutTimer !== null) {
      clearTimeout(peer.timeoutTimer);
      peer.timeoutTimer = null;
    }

    peer.state = 'IDLE';

    // §3 TURN_INCOMPLETE protocol: hold for next quiescence window; no emit
    if (text === 'TURN_INCOMPLETE') return;

    // Attempt §7 YAML parse
    let parsed: unknown;
    try {
      parsed = jsYaml.load(text);
    } catch {
      this._emitError(sessionName, `YAML parse error in peer summary response`);
      return;
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      this._emitError(sessionName, `peer summary response is not a YAML object`);
      return;
    }

    const obj = parsed as Record<string, unknown>;
    const validation = this._validateSummary(sessionName, obj);

    if (!validation.valid) {
      this._emitError(sessionName, validation.error);
      return;
    }

    // Q-MBT39-6: emit validated + translated payload; writer handles persistence
    this.stateEmitter.emit('peer:turn-complete', validation.payload);
  }

  private _validateSummary(
    sessionName: string,
    obj: Record<string, unknown>,
  ):
    | { valid: true; payload: PeerTurnCompletePayload }
    | { valid: false; error: string } {

    // Required fields present
    for (const field of REQUIRED_YAML_FIELDS) {
      if (!(field in obj)) {
        return { valid: false, error: `missing required field '${field}' in peer summary` };
      }
    }

    // No unexpected fields (schema drift)
    for (const key of Object.keys(obj)) {
      if (!ALL_KNOWN_YAML_FIELDS.has(key)) {
        return { valid: false, error: `unexpected field '${key}' in peer summary (schema drift)` };
      }
    }

    // Type validation + snake_case→camelCase translation (HALT 0 PF4)
    const peerSession = obj['peer_session'];
    const task = obj['task'];
    const filesTouched = obj['files_touched'];
    const result = obj['result'];
    const completionStatus = obj['completion_status'];
    const noFollowUp = obj['no_follow_up'];
    const followUpAction = obj['follow_up_action'];

    if (typeof peerSession !== 'string')
      return { valid: false, error: `peer_session must be a string` };
    if (typeof task !== 'string')
      return { valid: false, error: `task must be a string` };
    if (!Array.isArray(filesTouched) || !filesTouched.every((f) => typeof f === 'string'))
      return { valid: false, error: `files_touched must be a list of strings` };
    if (typeof result !== 'string')
      return { valid: false, error: `result must be a string` };
    if (typeof completionStatus !== 'string' || !VALID_COMPLETION_STATUSES.has(completionStatus))
      return { valid: false, error: `completion_status must be one of: complete, TURN_INCOMPLETE, error` };
    if (typeof noFollowUp !== 'boolean')
      return { valid: false, error: `no_follow_up must be a boolean` };
    if (followUpAction !== undefined && typeof followUpAction !== 'string')
      return { valid: false, error: `follow_up_action must be a string when present` };

    const payload: PeerTurnCompletePayload = {
      sessionName,           // from PTY observer (authoritative), not YAML peer_session
      task,
      filesTouched: filesTouched as string[],
      result,
      completionStatus: completionStatus as CompletionStatus,
      noFollowUp,
      ...(followUpAction !== undefined && { followUpAction }),
    };

    return { valid: true, payload };
  }

  private _emitError(sessionName: string, message: string): void {
    this.stateEmitter.emit('error:recorded', {
      sessionName,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
