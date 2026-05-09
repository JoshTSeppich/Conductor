// MB-T39 WB1 stub — PeerSummaryHarvester.
// Constructor + start() + dispose() are no-ops. All probes RED.
// WB2 GREEN ships full quiescence detection + YAML parser + state machine.
//
// HALT-STAGING-FOR-X: WB2 GREEN unblocks when Terminal X ships
// ConsoleIpcController.addStdoutObserver on origin/main (MB-T37 WB2 GREEN).
// Anti-fabrication: verify actual addStdoutObserver signature in
// src/main/console-ipc.ts before encoding WB2 GREEN.

import { EventEmitter } from 'node:events';

// ─────────────────────────────────────────────────────────────────────────────
// Dependency interfaces (dep-injected seams for unit testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Terminal X tap interface — authored by MB-T37 WB2 GREEN on ConsoleIpcController.
 * Arbitrated at HALT 0 (operator): fan-out observer, non-redirecting; returns disposer.
 */
export interface IConsoleBroadcaster {
  addStdoutObserver(
    observerFn: (sessionName: string, chunk: string) => void,
  ): () => void;
}

/**
 * MB-T09 prompt-injection surface — WorkstationSessionSendPromptRequest envelope.
 * Confirmed KNOWN at HALT 0 PF2: session-send-prompt-ipc.ts:SessionSendPromptIpcController.
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
  /** Default 3000ms per Q-MBT39-2=(c) */
  quiescenceThresholdMs?: number;
  /** Default 30000ms per HALT 1 TIMEOUT ratification */
  awaitingResponseTimeoutMs?: number;
  /** Default /^__orchestrator_/ per Q-MBT39-4 */
  orchestratorNamePattern?: RegExp;
  /** Default per Q-MBT39-1 ratified prose text */
  summaryPromptText?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PeerSummaryHarvester — WB1 no-op stub
// ─────────────────────────────────────────────────────────────────────────────

export class PeerSummaryHarvester {
  constructor(_deps: PeerSummaryHarvesterDeps) {}

  start(): void {}

  dispose(): void {}
}
