// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB10 — OrchestratorStrip
// mount entry.
//
// Mirrors src/topbar/mount.ts pattern with two additions specific to
// OrchestratorStrip:
//   (1) SlotSession mapping — projects snapshot.sessions
//       (OrchestratorSessionLite) → SlotSession[] for SlotGrid.
//   (2) Throughput history accumulation — renderer-side rolling array
//       of {t, done} samples passed to computeThroughputAndEta per
//       WORKSTATION_CONTRACT.md §6.6 derived-fields contract:
//         "OrchestratorStrip.ratePerMin / etaSeconds — derived in-
//          renderer via computeThroughputAndEta against a rolling
//          history accumulated from snapshot.attached.done"
//
// Per dispatch §3 WB10 + §6.6 derived-fields contract:
//   sessions         = sessions mapped to SlotSession[]
//   runningCount     = sessions.filter(s => s.computed_status === 'running').length
//   queuedCount      = attached?.queue ?? undefined
//   done             = attached?.done ?? undefined
//   totalSteps       = attached?.steps ?? undefined
//   erroredCount     = attached?.errored ?? undefined
//   attached         = attached !== null
//   attachedName     = attached?.name
//   ratePerMin/etaSeconds = computeThroughputAndEta(history, queued, 30000)

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  OrchestratorStrip,
  computeThroughputAndEta,
  type OrchestratorStripProps,
  type SlotSession,
  type SlotSessionStatus,
  type ThroughputSample,
} from './orchestrator-strip.js';

const DEFAULT_AUTO_MOUNT_ROOT_ID = 'orchestrator-strip-mount-root';

// 30-second rolling window per design jsx:76 + §6.6 derived-fields rule.
const THROUGHPUT_WINDOW_MS = 30_000;

// ── Bridge interface ────────────────────────────────────────────────

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

interface OrchestratorStateSnapshot {
  readonly seq: number;
  readonly polledAt: string | null;
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  readonly attached: AttachedBuildMdState | null;
  readonly messages: ReadonlyArray<unknown>;
  readonly paused: boolean;
  readonly daemonReachable: boolean;
}

export interface OrchestratorStateBridgeShape {
  getSnapshot(): Promise<OrchestratorStateSnapshot>;
  onUpdate(cb: (snapshot: OrchestratorStateSnapshot) => void): () => void;
}

// ── SlotSession projection ──────────────────────────────────────────

/**
 * Map OrchestratorSessionLite → SlotSession for SlotGrid rendering.
 * Mapping rules (mirrors session-status-source-derive.ts spirit):
 *   - killed state OR stale computed_status → 'error'
 *   - computed_status === 'running'         → 'running'
 *   - computed_status === 'awaiting_review' → 'done'
 *   - everything else (idle / armed / etc.) → 'starting'
 */
function mapToSlotStatus(
  s: OrchestratorSessionLite,
): SlotSessionStatus {
  if (s.state === 'killed' || s.computed_status === 'stale') return 'error';
  if (s.computed_status === 'running') return 'running';
  if (s.computed_status === 'awaiting_review') return 'done';
  return 'starting';
}

function projectSlotSessions(
  sessions: ReadonlyArray<OrchestratorSessionLite>,
): SlotSession[] {
  return sessions.map((s) => ({
    id: s.name,
    name: s.name,
    status: mapToSlotStatus(s),
  }));
}

// ── Throughput history accumulator ──────────────────────────────────

interface ThroughputAccumulator {
  push(done: number, nowMs: number): void;
  history(): ThroughputSample[];
}

function createThroughputAccumulator(): ThroughputAccumulator {
  let history: ThroughputSample[] = [];
  return {
    push(done, nowMs): void {
      history.push({ t: nowMs, done });
      // Prune samples older than THROUGHPUT_WINDOW_MS. Keep at least
      // one sample (the latest) so callers can always reason about
      // current state; computeThroughputAndEta requires >=2 samples
      // for a rate.
      const cutoff = nowMs - THROUGHPUT_WINDOW_MS;
      history = history.filter((h) => h.t >= cutoff);
    },
    history(): ThroughputSample[] {
      return history.slice();
    },
  };
}

// ── Prop derivation per §6.6 derived-fields contract ────────────────

export function deriveOrchestratorStripProps(
  snapshot: OrchestratorStateSnapshot,
  history: ThroughputSample[],
): OrchestratorStripProps {
  const sessions = projectSlotSessions(snapshot.sessions);
  // runningCount derivation: attached.running (build-md task domain) when
  // attached, else fall back to sessions-with-computed_status-running
  // count (operator-visible "panes currently running" when no build-md is
  // driving). Production 1:1 task↔session mapping makes the two equal
  // when both attached and driving. Per §6.6 derived-fields contract:
  // "runningCount/queuedCount/done/erroredCount — derived from sessions
  // + attached" (interpretation: prefer attached when present).
  const sessionRunning = snapshot.sessions.filter(
    (s) => s.computed_status === 'running',
  ).length;
  const props: OrchestratorStripProps = {
    sessions,
    runningCount: snapshot.attached?.running ?? sessionRunning,
    attached: snapshot.attached !== null,
  };
  if (snapshot.attached !== null) {
    props.attachedName = snapshot.attached.name;
    props.queuedCount = snapshot.attached.queue;
    props.done = snapshot.attached.done;
    props.totalSteps = snapshot.attached.steps;
    props.erroredCount = snapshot.attached.errored;
  }
  // Throughput / ETA — null history → ratePerMin: 0, etaSeconds: null
  // (per computeThroughputAndEta guards).
  const queued = snapshot.attached?.queue ?? 0;
  const tp = computeThroughputAndEta({
    history,
    queued,
    windowMs: THROUGHPUT_WINDOW_MS,
  });
  props.ratePerMin = tp.ratePerMin;
  props.etaSeconds = tp.etaSeconds;
  return props;
}

// ── Mount lifecycle ─────────────────────────────────────────────────

export interface OrchestratorStripMountOptions {
  rootElementId?: string;
  bridge?: OrchestratorStateBridgeShape | null;
  /** Wall-clock provider for throughput samples — injectable for tests. */
  nowMs?: () => number;
}

export type OrchestratorStripMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-document' };

function resolveBridge(
  injected: OrchestratorStateBridgeShape | null | undefined,
): OrchestratorStateBridgeShape | null {
  if (injected !== undefined) return injected;
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = (window as any).orchestratorStateBridge;
  if (!b || typeof b.getSnapshot !== 'function' || typeof b.onUpdate !== 'function') {
    return null;
  }
  return b as OrchestratorStateBridgeShape;
}

export function tryAutoMountOrchestratorStrip(
  opts: OrchestratorStripMountOptions = {},
): OrchestratorStripMountResult {
  if (typeof document === 'undefined') {
    return { mounted: false, reason: 'no-document' };
  }

  const rootId = opts.rootElementId ?? DEFAULT_AUTO_MOUNT_ROOT_ID;
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  const reactRoot: Root = createRoot(root);
  const bridge = resolveBridge(opts.bridge);
  const nowMs = opts.nowMs ?? (() => Date.now());
  const accumulator = createThroughputAccumulator();

  // flushSync forces React 18's createRoot.render to commit synchronously
  // per conductor-chat/mount.ts:227 precedent.
  flushSync(() => {
    reactRoot.render(React.createElement(OrchestratorStrip, {}));
  });

  if (bridge === null) {
    return {
      mounted: true,
      dispose: () => {
        reactRoot.unmount();
      },
    };
  }

  let disposed = false;
  function renderFromSnapshot(snapshot: OrchestratorStateSnapshot): void {
    if (snapshot.attached !== null) {
      accumulator.push(snapshot.attached.done, nowMs());
    }
    const props = deriveOrchestratorStripProps(snapshot, accumulator.history());
    flushSync(() => {
      reactRoot.render(React.createElement(OrchestratorStrip, props));
    });
  }

  bridge
    .getSnapshot()
    .then((snapshot) => {
      if (disposed) return;
      renderFromSnapshot(snapshot);
    })
    .catch(() => {
      // Initial fetch failure — wait for next onUpdate.
    });

  const unsubscribe = bridge.onUpdate((snapshot) => {
    if (disposed) return;
    renderFromSnapshot(snapshot);
  });

  return {
    mounted: true,
    dispose: () => {
      disposed = true;
      unsubscribe();
      reactRoot.unmount();
    },
  };
}

// Bundle entry — production renderer invokes auto-mount on DOM ready.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      tryAutoMountOrchestratorStrip();
    });
  } else {
    tryAutoMountOrchestratorStrip();
  }
}
