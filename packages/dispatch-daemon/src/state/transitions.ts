/**
 * State machine primitives for v2 daemon.
 *
 * Pure `validateTransition` locks contract §6.1 rules at unit level.
 * `transitionSessionState` is the shared helper consumed by two
 * call sites:
 *   - DAEMON-T08 PATCH /v2/sessions/:name/state (triggeredBy='operator')
 *   - DAEMON-T17a POST /v2/sessions/:name/violations (future;
 *     triggeredBy='cairn_violation' | 'gate_trip' per RA-01 resolution)
 *
 * Both consumers pass different triggeredBy; helper behavior is
 * identical otherwise. Event emission (which uses triggeredBy per
 * §5.3 event data) arrives later at T12 WS + T17 ring buffer.
 *
 * tmux side effects injected via TmuxOps for testability. Default
 * implementations shell out to `tmux` via execFile (no shell, no
 * interpolation; KNOWN pattern from SPIKES.md §Spike 01/03).
 *
 * Failure semantics: both Ctrl-C and kill-session failures are
 * TOLERATED (warn-logged; registry still updates). Symmetric
 * MODELED decision per operator ack; DAEMON-F10 filed to
 * reconsider Ctrl-C distinction post-MVP.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { State, SessionV2 } from 'dispatch-core/src/v2/schema.js';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../migration/schema-v2.js';

const execFileP = promisify(execFile);

// ─── TmuxOps ─────────────────────────────────────────────────────────────

export interface TmuxOps {
  sendCtrlC(target: string): Promise<void>;
  killSession(target: string): Promise<void>;
}

/**
 * Default production TmuxOps. `sendCtrlC` uses tmux's key-name
 * lookup (C-c is sent as a keypress, not literal "C-c" text);
 * `killSession` targets the session portion of a fully-qualified
 * target.
 */
export const defaultTmuxOps: TmuxOps = {
  async sendCtrlC(target: string) {
    await execFileP('tmux', ['send-keys', '-t', target, 'C-c']);
  },
  async killSession(target: string) {
    const sessionName = target.split(':')[0];
    await execFileP('tmux', ['kill-session', '-t', sessionName]);
  },
};

// ─── Typed errors ────────────────────────────────────────────────────────

export class SessionNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(name: string) {
    super(`no session registered as "${name}"`);
    this.name = 'SessionNotFoundError';
  }
}

export class InvalidTransitionError extends Error {
  readonly statusCode = 422;
  constructor(from: State, to: State, name: string) {
    super(
      `invalid state transition for "${name}": ${from} → ${to} (per contract §6.1)`,
    );
    this.name = 'InvalidTransitionError';
  }
}

// ─── Transition matrix ───────────────────────────────────────────────────

/** §6.1 valid transitions. Self-transitions + killed-outbound are invalid. */
const validTransitions: Record<State, readonly State[]> = {
  armed: ['paused', 'held', 'killed'],
  paused: ['armed', 'killed'],
  held: ['armed', 'killed'],
  killed: [],
};

export function validateTransition(from: State, to: State): boolean {
  return validTransitions[from].includes(to);
}

// ─── Shared helper ───────────────────────────────────────────────────────

export type TriggeredBy = 'operator' | 'cairn_violation' | 'gate_trip';

export interface TransitionRequest {
  name: string;
  targetState: State;
  triggeredBy: TriggeredBy;
  registryPath?: string;
  tmuxOps?: TmuxOps;
  /** Minimal logger shape; Fastify request.log satisfies this. */
  logger?: { warn: (...args: unknown[]) => void };
}

export interface TransitionResult {
  session: SessionV2;
  previousState: State;
  sideEffect: 'ctrl_c' | 'tmux_kill' | 'none';
}

export async function transitionSessionState(
  req: TransitionRequest,
): Promise<TransitionResult> {
  const tmuxOps = req.tmuxOps ?? defaultTmuxOps;
  const registry = await readRegistryV2(req.registryPath);
  const session = registry.sessions[req.name];
  if (!session) {
    throw new SessionNotFoundError(req.name);
  }
  const previousState = session.state;
  if (!validateTransition(previousState, req.targetState)) {
    throw new InvalidTransitionError(previousState, req.targetState, req.name);
  }

  let sideEffect: 'ctrl_c' | 'tmux_kill' | 'none' = 'none';
  if (previousState === 'armed' && req.targetState === 'held') {
    sideEffect = 'ctrl_c';
    try {
      await tmuxOps.sendCtrlC(session.tmux_target);
    } catch (err) {
      req.logger?.warn?.(
        { target: session.tmux_target, err: (err as Error).message },
        'tmux sendCtrlC failed; tolerating per T08 MODELED decision (DAEMON-F10)',
      );
    }
  } else if (req.targetState === 'killed') {
    sideEffect = 'tmux_kill';
    try {
      await tmuxOps.killSession(session.tmux_target);
    } catch (err) {
      req.logger?.warn?.(
        { target: session.tmux_target, err: (err as Error).message },
        'tmux killSession failed; tolerating per T08 MODELED decision',
      );
    }
  }

  session.state = req.targetState;
  await writeRegistryV2(req.registryPath, registry);

  return { session, previousState, sideEffect };
}
