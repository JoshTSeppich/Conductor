// MB-T38 WB2 GREEN — swarm-state.md write protocol + handoff document
// generation. Subscribes to action-variant and tile-grid events; maintains
// docs/swarm-state.md (continuous atomic overwrites per §1 schema) and
// generates docs/coordination/handoff-<timestamp>.md at handoff trigger
// (one-shot per §8.2 structure).
//
// D9 constraint (load-bearing): two triggers → two artifacts → two separate
// call stacks. writeSwarmState() and writeHandoffDoc() are NEVER called from
// the same event handler.
//
//   Continuous trigger → writeSwarmState() → docs/swarm-state.md (atomic)
//   Handoff trigger    → writeHandoffDoc() → docs/coordination/handoff-*.md
//
// Atomic write pattern (Probe 09): writeFileSync(path + '.tmp', ...) followed
// by renameSync(path + '.tmp', path). POSIX-atomic on same filesystem; no
// partial-write race possible across synchronous emissions.

import { EventEmitter } from 'node:events';
import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type {
  ActionVariantFiredPayload,
  MarkerActionType,
} from '../main/action-variant-ipc.js';

// ─────────────────────────────────────────────────────────────────────────────
// Event payload interfaces
// ─────────────────────────────────────────────────────────────────────────────

export type HaltUrgency = 'high' | 'medium' | 'low';
export type CompletionStatus = 'complete' | 'TURN_INCOMPLETE' | 'error';
export type HandoffTriggerType = 'token-threshold' | 'marker';

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
  /** Absolute path to swarm-state.md output file (e.g., <repo>/docs/swarm-state.md) */
  swarmStatePath: string;
  /** Absolute path to handoff document directory (e.g., <repo>/docs/coordination/) */
  handoffDir: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal state records
// ─────────────────────────────────────────────────────────────────────────────

interface PeerState {
  sessionName: string;
}

interface ActionRecord {
  actionType: string;
  sessionName: string;
  firedAt: string;
  payload: unknown;
}

interface HaltRecord {
  reason: string;
  halt_urgency: HaltUrgency;
  halt_emitted_at: string;
  halt_blocking: readonly string[];
}

interface ErrorRecord {
  message: string;
  sessionName?: string;
  timestamp: string;
}

interface SelfSummaryRecord {
  sessionName: string;
  task: string;
  filesTouched: readonly string[];
  result: string;
  completionStatus: CompletionStatus;
  noFollowUp: boolean;
  followUpAction?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SwarmStateWriter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribes to action-variant and tile-grid events; maintains
 * docs/swarm-state.md per orchestrator.md §1 schema via atomic writes, and
 * generates docs/coordination/handoff-<timestamp>.md per §8.2 at handoff
 * trigger. D9: separate triggers, separate artifacts, separate call stacks.
 */
export class SwarmStateWriter {
  private readonly config: SwarmStateWriterConfig;
  private readonly emitter: EventEmitter;

  private readonly peers = new Map<string, PeerState>();
  private readonly actions: ActionRecord[] = [];
  private readonly halts: HaltRecord[] = [];
  private readonly errors: ErrorRecord[] = [];
  private readonly selfSummaries: SelfSummaryRecord[] = [];

  // Bound listener references held for dispose()
  private readonly onSessionAdd: (p: TileGridSessionAddPayload) => void;
  private readonly onSessionRemove: (p: TileGridSessionRemovePayload) => void;
  private readonly onActionVariantFired: (p: ActionVariantFiredPayload) => void;
  private readonly onHaltEmitted: (p: HaltEmittedPayload) => void;
  private readonly onErrorRecorded: (p: ErrorRecordedPayload) => void;
  private readonly onPeerTurnComplete: (p: PeerTurnCompletePayload) => void;
  private readonly onHandoffTriggered: (p: HandoffTriggeredPayload) => void;

  constructor(emitter: EventEmitter, config: SwarmStateWriterConfig) {
    this.emitter = emitter;
    this.config = config;

    this.onSessionAdd = (p) => {
      this.peers.set(p.sessionName, { sessionName: p.sessionName });
      this.writeSwarmState();
    };

    this.onSessionRemove = (p) => {
      this.peers.delete(p.sessionName);
      this.writeSwarmState();
    };

    this.onActionVariantFired = (p) => {
      this.actions.push({
        actionType: p.actionType as MarkerActionType,
        sessionName: p.sessionName,
        firedAt: p.firedAt,
        payload: p.payload,
      });
      this.writeSwarmState();
    };

    this.onHaltEmitted = (p) => {
      this.halts.push({
        reason: p.reason,
        halt_urgency: p.halt_urgency,
        halt_emitted_at: p.halt_emitted_at,
        halt_blocking: p.halt_blocking,
      });
      this.writeSwarmState();
    };

    this.onErrorRecorded = (p) => {
      this.errors.push({
        message: p.message,
        sessionName: p.sessionName,
        timestamp: p.timestamp,
      });
      this.writeSwarmState();
    };

    this.onPeerTurnComplete = (p) => {
      this.selfSummaries.push({
        sessionName: p.sessionName,
        task: p.task,
        filesTouched: p.filesTouched,
        result: p.result,
        completionStatus: p.completionStatus,
        noFollowUp: p.noFollowUp,
        followUpAction: p.followUpAction,
      });
      this.writeSwarmState();
    };

    // D9: handoff trigger calls writeHandoffDoc() ONLY — never writeSwarmState()
    this.onHandoffTriggered = (_p) => {
      this.writeHandoffDoc();
    };

    emitter.on('tile-grid:session-add', this.onSessionAdd);
    emitter.on('tile-grid:session-remove', this.onSessionRemove);
    emitter.on('action-variant:fired', this.onActionVariantFired);
    emitter.on('halt:emitted', this.onHaltEmitted);
    emitter.on('error:recorded', this.onErrorRecorded);
    emitter.on('peer:turn-complete', this.onPeerTurnComplete);
    emitter.on('handoff:triggered', this.onHandoffTriggered);
  }

  dispose(): void {
    this.emitter.off('tile-grid:session-add', this.onSessionAdd);
    this.emitter.off('tile-grid:session-remove', this.onSessionRemove);
    this.emitter.off('action-variant:fired', this.onActionVariantFired);
    this.emitter.off('halt:emitted', this.onHaltEmitted);
    this.emitter.off('error:recorded', this.onErrorRecorded);
    this.emitter.off('peer:turn-complete', this.onPeerTurnComplete);
    this.emitter.off('handoff:triggered', this.onHandoffTriggered);
  }

  // D9 call stack 1: continuous trigger → swarm-state.md overwrite
  private writeSwarmState(): void {
    mkdirSync(dirname(this.config.swarmStatePath), { recursive: true });
    writeAtomic(this.config.swarmStatePath, this.formatSwarmState());
  }

  // D9 call stack 2: handoff trigger → new handoff doc (never touches swarm-state.md)
  private writeHandoffDoc(): void {
    mkdirSync(this.config.handoffDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(this.config.handoffDir, `handoff-${ts}.md`);
    writeFileSync(filePath, this.formatHandoffDoc(), 'utf8');
  }

  private formatSwarmState(): string {
    const lines: string[] = [];

    lines.push('# swarm-state.md — Conductor v3.5 Swarm State');
    lines.push('');
    lines.push(`**Last updated:** ${new Date().toISOString()}`);
    lines.push('');

    lines.push('## Active Peers');
    lines.push('');
    if (this.peers.size === 0) {
      lines.push('(none)');
    } else {
      for (const peer of this.peers.values()) {
        lines.push(`- sessionName: ${peer.sessionName}`);
      }
    }
    lines.push('');

    lines.push('## Actions Fired Since Last Update');
    lines.push('');
    if (this.actions.length === 0) {
      lines.push('(none)');
    } else {
      for (const action of this.actions) {
        lines.push(`- [${action.firedAt}] ${action.sessionName} fired ${action.actionType}`);
      }
    }
    lines.push('');

    lines.push('## Active HALTs');
    lines.push('');
    if (this.halts.length === 0) {
      lines.push('(none)');
    } else {
      for (const halt of this.halts) {
        lines.push(`### HALT: ${halt.reason}`);
        lines.push(`- halt_urgency: ${halt.halt_urgency}`);
        lines.push(`- halt_emitted_at: ${halt.halt_emitted_at}`);
        lines.push('- halt_blocking:');
        if (halt.halt_blocking.length === 0) {
          lines.push('  - (none)');
        } else {
          for (const ticket of halt.halt_blocking) {
            lines.push(`  - ${ticket}`);
          }
        }
        lines.push('');
      }
    }

    lines.push('## Unresolved Errors');
    lines.push('');
    if (this.errors.length === 0) {
      lines.push('(none)');
    } else {
      for (const err of this.errors) {
        const prefix = err.sessionName !== undefined ? `${err.sessionName}: ` : '';
        lines.push(`- [${err.timestamp}] ${prefix}${err.message}`);
      }
    }
    lines.push('');

    lines.push('## Outstanding Decisions');
    lines.push('');
    lines.push('(none)');
    lines.push('');

    lines.push('## Peer Self-Summaries');
    lines.push('');
    if (this.selfSummaries.length === 0) {
      lines.push('(none)');
    } else {
      for (const s of this.selfSummaries) {
        lines.push('```yaml');
        lines.push(`peer_session: ${s.sessionName}`);
        lines.push(`task: ${s.task}`);
        lines.push('files_touched:');
        if (s.filesTouched.length === 0) {
          lines.push('  []');
        } else {
          for (const f of s.filesTouched) {
            lines.push(`  - ${f}`);
          }
        }
        lines.push(`result: ${s.result}`);
        lines.push(`completion_status: ${s.completionStatus}`);
        lines.push(`no_follow_up: ${s.noFollowUp}`);
        if (s.followUpAction !== undefined) {
          lines.push(`follow_up_action: ${s.followUpAction}`);
        }
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatHandoffDoc(): string {
    const lines: string[] = [];

    lines.push('# Handoff Document — Conductor v3.5 Swarm');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');

    // §8.2 Section 1: Where I was (state summary)
    lines.push('## Section 1: Where I was (state summary)');
    lines.push('');
    lines.push(
      'Swarm state at handoff (faithful echo of swarm-state.md; successor should ' +
        're-read swarm-state.md in full per §8.4 successor read protocol):',
    );
    lines.push(`- Active peers: ${this.peers.size}`);
    if (this.peers.size > 0) {
      for (const peer of this.peers.values()) {
        lines.push(`  - ${peer.sessionName}`);
      }
    }
    lines.push(`- Actions fired: ${this.actions.length}`);
    lines.push(`- Active HALTs: ${this.halts.length}`);
    lines.push(`- Unresolved errors: ${this.errors.length}`);
    lines.push('');

    // §8.2 Section 2: Verbatim unsent prompts
    lines.push('## Section 2: Verbatim unsent prompts');
    lines.push('');
    lines.push('(none)');
    lines.push('');

    // §8.2 Section 3: Sequencing intent
    lines.push('## Section 3: Sequencing intent');
    lines.push('');
    lines.push('(per BUILD.md dependencies)');
    lines.push('');

    // §8.2 Section 4: HALT severity rationale
    lines.push('## Section 4: HALT severity rationale (if active HALTs)');
    lines.push('');
    if (this.halts.length === 0) {
      lines.push('(no active HALTs at handoff)');
    } else {
      for (let i = 0; i < this.halts.length; i++) {
        const halt = this.halts[i]!;
        lines.push(
          `HALT-${i + 1}: halt_urgency was chosen as ${halt.halt_urgency} because ` +
            `${halt.reason}. Successor should treat this as blocking; specifically, do NOT ` +
            `proceed with any scope in halt_blocking: [${halt.halt_blocking.join(', ')}].`,
        );
        lines.push('');
      }
    }
    lines.push('');

    // §8.2 Section 5: Explicit "do not" list
    lines.push('## Section 5: Explicit "do not" list');
    lines.push('');
    lines.push('- Do not re-spawn peer sessions that are alive in swarm-state.md');
    lines.push('- Do not send prompts to peer sessions whose state is idle-halted');
    lines.push('- Do not modify frozen-contract files (CONDUCTOR_API_CONTRACT.md, schema.ts, orchestrator.md)');
    lines.push('- Do not start tickets blocked per BUILD.md dependency graph');
    lines.push('- Do not emit a new handoff before reading this document and swarm-state.md in full');

    return lines.join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Atomic write helper (Probe 09)
// ─────────────────────────────────────────────────────────────────────────────

function writeAtomic(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, content, 'utf8');
  renameSync(tmpPath, filePath);
}
