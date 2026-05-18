// MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB2 (GREEN) — production
// mount-entry. Imports tryAutoMountConductorChat from mount.ts and
// auto-mounts on DOMContentLoaded targeting the shell.html anchor
// `#chat-region #root` (workstation-shell.html lines 297-299).
//
// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB11 — bridge replaced
// from `null` (Q1=(d) render-only stub) to a real orchestratorState-
// Bridge-backed ConductorChatBridge per dispatch §3 WB11 + operator
// Frame B disposition 2026-05-18:
//
//   getInitialState() → DEFAULT_INITIAL placeholder (sync); async
//     getSnapshot() kicked off inside onStateChange fires the first
//     real-data cb shortly after mount.
//   onStateChange(cb)  → orchestratorStateBridge.onUpdate(snapshot
//     => cb(mapSnapshotToChatState(snapshot))) returning unsubscribe.
//     ALSO kicks off bridge.getSnapshot() once at subscription time
//     so the renderer doesn't have to wait for the next 3s poll-
//     cadence to see live data.
//   send/attach/detach/dispatchNext/togglePause/cancel — STUB
//     no-ops (Ticket C territory per `MB-T-CONDUCTOR-CHAT-ACTION-
//     WIRING-PENDING` Tier-1 forward-pointer filed at WB-final).
//
// FRAME B DISPATCH-DEGRADATION (operator disposition 2026-05-18):
// OrchestratorMessage flat-text shape doesn't carry step/total/
// target/task that ConductorMessageVariant.dispatch requires.
// dispatch-role narration entries degrade to `system` variant
// carrying message.text verbatim. Tier-2 followup MB-F-MVP-W4-
// CONDUCTOR-MESSAGE-DISPATCH-VARIANT-STRUCTURED-FIELDS-PENDING
// filed at WB-final: §6.6 amendment extending OrchestratorMessage
// with `step? total? target? task?` optional fields + Ticket C
// narration appender writes structured fields + this mapper
// preferentially synthesizes dispatch variant when fields present.
//
// Q1=(d) render-only original Ticket A behavior preserved when
// orchestratorStateBridge is unavailable (preload bundle failed to
// load OR test environment without bridge stub): tryAutoMountConductor
// Chat receives bridge=null and falls back to DEFAULT_IDLE_STATE.

import { tryAutoMountConductorChat } from './mount.js';
import type {
  ConductorChatBridge,
  ConductorChatState,
} from './mount.js';
import type { ConductorMessageVariant } from './conductor-message.js';

// ─── Bridge interface (mirrors preload.mts orchestratorStateBridge) ──

interface OrchestratorSessionLite {
  readonly name: string;
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?:
    | 'idle'
    | 'running'
    | 'awaiting_review'
    | 'stale';
}

interface AttachedBuildMdState {
  readonly name: string;
  readonly path: string;
  readonly steps: number;
  readonly queue: number;
  readonly done: number;
  readonly running: number;
  readonly errored: number;
}

interface OrchestratorMessage {
  readonly role: 'user' | 'assistant' | 'dispatch' | 'system' | 'typing';
  readonly text?: string;
  readonly running?: number;
  readonly id?: string;
}

interface OrchestratorStateSnapshot {
  readonly seq: number;
  readonly polledAt: string | null;
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  readonly attached: AttachedBuildMdState | null;
  readonly messages: ReadonlyArray<OrchestratorMessage>;
  readonly paused: boolean;
  readonly daemonReachable: boolean;
}

export interface OrchestratorStateBridgeShape {
  getSnapshot(): Promise<OrchestratorStateSnapshot>;
  onUpdate(cb: (snapshot: OrchestratorStateSnapshot) => void): () => void;
}

// ─── Message variant mapper (Frame B degradation) ───────────────────

/**
 * Map a single OrchestratorMessage to a ConductorMessageVariant.
 *
 * - user / assistant / system: 1:1 with text fallback to '' when absent
 * - typing: 1:1 with running fallback to 0
 * - dispatch: DEGRADED to `system` variant per WB11 Frame B operator
 *   disposition 2026-05-18 — OrchestratorMessage has no step/total/
 *   target/task fields. Ticket C narration appender convention:
 *   message.text should follow "dispatch: step {step}/{total} · target
 *   {target} · task {task}" so the operator-visible system text
 *   matches design intent. Verbatim text passthrough acceptable when
 *   structured format absent.
 */
export function mapOrchestratorMessageToConductorVariant(
  m: OrchestratorMessage,
): ConductorMessageVariant {
  const text = m.text ?? '';
  switch (m.role) {
    case 'user': {
      const base = { role: 'user' as const, text };
      return m.id !== undefined ? { ...base, id: m.id } : base;
    }
    case 'assistant': {
      const base = { role: 'assistant' as const, text };
      return m.id !== undefined ? { ...base, id: m.id } : base;
    }
    case 'system': {
      const base = { role: 'system' as const, text };
      return m.id !== undefined ? { ...base, id: m.id } : base;
    }
    case 'typing': {
      const base = { role: 'typing' as const, running: m.running ?? 0 };
      return m.id !== undefined ? { ...base, id: m.id } : base;
    }
    case 'dispatch': {
      // Frame B degradation — render dispatch as system variant.
      const base = { role: 'system' as const, text };
      return m.id !== undefined ? { ...base, id: m.id } : base;
    }
  }
}

// ─── Snapshot → ConductorChatState mapper ───────────────────────────

/**
 * Project OrchestratorStateSnapshot into ConductorChatState per §6.6
 * derived-fields contract + operator dispatch WB11 mapping:
 *
 *   queue   = synthesized array of length attached.queue (so
 *             queue.length carries the count; consistent with the
 *             ConductorChatState.queue: ReadonlyArray<unknown> shape)
 *   total   = attached?.steps ?? 0
 *   running = attached?.running ?? sessionRunningCount (attached
 *             preferred when present; mirrors WB10 OrchestratorStrip
 *             derivation)
 *   paused  = snapshot.paused
 *   attached = { name, steps } projection from snapshot.attached
 *   messages = snapshot.messages.map(mapOrchestratorMessageToConductor
 *             Variant) with Frame B dispatch-degradation
 */
export function mapSnapshotToChatState(
  snapshot: OrchestratorStateSnapshot,
): ConductorChatState {
  const sessionRunning = snapshot.sessions.filter(
    (s) => s.computed_status === 'running',
  ).length;
  const running = snapshot.attached?.running ?? sessionRunning;
  const total = snapshot.attached?.steps ?? 0;
  const queueCount = snapshot.attached?.queue ?? 0;
  // Synthesized array — only .length is load-bearing at render today
  // (ConductorChat doesn't render queue contents). Forward-compat for
  // future operator-visible queue-task surface; the count semantic is
  // preserved via queue.length.
  const queue: ReadonlyArray<unknown> = Array.from({ length: queueCount });
  const attached =
    snapshot.attached !== null
      ? { name: snapshot.attached.name, steps: snapshot.attached.steps }
      : null;
  const messages = snapshot.messages.map(
    mapOrchestratorMessageToConductorVariant,
  );
  return {
    messages,
    attached,
    queue,
    running,
    total,
    paused: snapshot.paused,
  };
}

// ─── Default initial state (sync placeholder pre-getSnapshot) ───────

const CANONICAL_INTRO_TEXT =
  "Conductor ready. Attach a build.md and I'll plan it into ordered steps, " +
  'hand them to the Orchestrator one at a time, and watch the agent panes for failures.';

const DEFAULT_INITIAL: ConductorChatState = {
  messages: [{ role: 'assistant', text: CANONICAL_INTRO_TEXT }],
  attached: null,
  queue: [],
  running: 0,
  total: 0,
  paused: false,
};

// ─── ConductorChatBridge factory (orchestratorStateBridge-backed) ───

export function createConductorChatBridgeFromOrchestratorState(
  orchestratorBridge: OrchestratorStateBridgeShape,
): ConductorChatBridge {
  return {
    getInitialState(): ConductorChatState {
      // Sync placeholder. The real snapshot is fetched async inside
      // onStateChange's subscription kickoff — the first cb fires
      // shortly after mount and React re-renders with live data.
      return DEFAULT_INITIAL;
    },
    onStateChange(cb): () => void {
      // Kick off async getSnapshot to get the first real-data cb
      // ASAP without waiting for the next 3s poll-cadence.
      orchestratorBridge
        .getSnapshot()
        .then((snapshot) => cb(mapSnapshotToChatState(snapshot)))
        .catch(() => {
          // Initial fetch failure — wait for next onUpdate broadcast.
        });
      // Subscribe to live broadcasts.
      const unsubscribe = orchestratorBridge.onUpdate((snapshot) => {
        cb(mapSnapshotToChatState(snapshot));
      });
      return unsubscribe;
    },
    // Action callbacks — STUB no-ops per Ticket B scope. Operator
    // gestures route through Ticket C IPC family (`MB-T-CONDUCTOR-
    // CHAT-ACTION-WIRING-PENDING` Tier-1 forward-pointer filed at
    // WB-final). Production behavior pre-Ticket C: clickable-but-
    // inert (matches Ticket A Q1=(d) render-only posture).
    send(): void {},
    attach(): void {},
    detach(): void {},
    dispatchNext(): void {},
    togglePause(): void {},
    cancel(): void {},
  };
}

// ─── Bridge resolution (production reads window.orchestratorState-
// Bridge; tests inject via mount options) ──────────────────────────

function resolveOrchestratorBridge(): OrchestratorStateBridgeShape | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = (window as any).orchestratorStateBridge;
  if (!b || typeof b.getSnapshot !== 'function' || typeof b.onUpdate !== 'function') {
    return null;
  }
  return b as OrchestratorStateBridgeShape;
}

// ─── Auto-mount on DOMContentLoaded ────────────────────────────────

function autoMount(): void {
  const orchestratorBridge = resolveOrchestratorBridge();
  // When orchestratorStateBridge is unavailable (preload failed OR
  // test env without stub), fall back to bridge=null path —
  // tryAutoMountConductorChat renders DEFAULT_IDLE_STATE
  // (matches Ticket A WB-final Q1=(d) render-only behavior).
  const bridge =
    orchestratorBridge !== null
      ? createConductorChatBridgeFromOrchestratorState(orchestratorBridge)
      : null;
  tryAutoMountConductorChat({ rootElementId: 'root', bridge });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoMount();
    });
  } else {
    autoMount();
  }
}
