// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB10 — Topbar mount entry.
//
// Mirrors src/orchestrator-focus-pane/mount.ts:81-126 DOMContentLoaded
// auto-mount pattern. Body-level fixed-position overlay (the Topbar's
// own `position: fixed; top: 0` style is already set inside the
// component); the mount root is appended to document.body when the
// shell.html doesn't expose a named anchor.
//
// Per dispatch §3 WB10 + WORKSTATION_CONTRACT.md §6.6 STAMPED 5a782f4
// derived-fields contract:
//   paneCount       = sessions.length
//   runningCount    = sessions.filter(s => s.computed_status === 'running').length
//   buildMdAttached = attached !== null
//   buildMdQueue    = attached?.queue ?? undefined  (em-dash when not attached)
//   buildMdDone     = attached?.done ?? undefined
//
// Out-of-scope for §6.6 snapshot — left as em-dash placeholders:
//   envLabel             — Tier-2 followup MB-F-MVP-W4-TOPBAR-BUDGET-
//   budgetUsedDollars       ENVLABEL-CHANNELS-PENDING at WB-final
//   budgetTotalDollars

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Topbar, type TopbarProps } from './topbar.js';

const DEFAULT_AUTO_MOUNT_ROOT_ID = 'topbar-mount-root';

// ── Bridge interface ────────────────────────────────────────────────
// Minimal shape we depend on from `window.orchestratorStateBridge`
// (exposed by preload.mts at MB-T-MVP-W4 sentinel zone, commit bf901ce).

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

// ── Prop derivation per §6.6 derived-fields contract ────────────────

export function deriveTopbarProps(
  snapshot: OrchestratorStateSnapshot,
): TopbarProps {
  const paneCount = snapshot.sessions.length;
  const runningCount = snapshot.sessions.filter(
    (s) => s.computed_status === 'running',
  ).length;
  const buildMdAttached = snapshot.attached !== null;
  const props: TopbarProps = {
    paneCount,
    runningCount,
    buildMdAttached,
  };
  if (snapshot.attached !== null) {
    props.buildMdQueue = snapshot.attached.queue;
    props.buildMdDone = snapshot.attached.done;
  }
  // envLabel / budgetUsedDollars / budgetTotalDollars intentionally
  // omitted — Tier-2 followup MB-F-MVP-W4-TOPBAR-BUDGET-ENVLABEL-
  // CHANNELS-PENDING filed at WB-final. Em-dash placeholder behavior
  // per Topbar.tsx renderEnvLabelOrDash / renderBudgetOrDash.
  return props;
}

// ── Mount lifecycle ─────────────────────────────────────────────────

export interface TopbarMountOptions {
  /**
   * ID of an existing root element to mount into. If absent, a new
   * body-level `<div id="topbar-mount-root">` is created (overlay
   * strategy mirroring orchestrator-focus-pane/mount.ts:88-92).
   */
  rootElementId?: string;
  /**
   * Optional bridge injection for tests. Production reads
   * window.orchestratorStateBridge. Returns null when bridge is
   * unavailable (e.g. preload bundle didn't load — null-mount path).
   */
  bridge?: OrchestratorStateBridgeShape | null;
}

export type TopbarMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-document' | 'no-bridge' };

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

export function tryAutoMountTopbar(
  opts: TopbarMountOptions = {},
): TopbarMountResult {
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

  // Initial render — em-dash placeholders until first snapshot arrives.
  // flushSync forces React 18's createRoot.render to commit synchronously
  // so callers (probes + screenshot oracles + downstream subscribers)
  // see the DOM populated before this function returns. Mirrors
  // conductor-chat/mount.ts:227 flushSync precedent.
  flushSync(() => {
    reactRoot.render(React.createElement(Topbar, {}));
  });

  if (bridge === null) {
    // Bridge unavailable (preload failed OR explicit null in tests).
    // Mounted with em-dash placeholders; dispose unmounts the root.
    return {
      mounted: true,
      dispose: () => {
        reactRoot.unmount();
      },
    };
  }

  // Async initial fetch — once getSnapshot resolves, re-render with
  // derived props. Errors swallowed; we'll wait for the next onUpdate
  // broadcast (matches workstationBridge / coarchitectBridge precedent
  // patterns at preload.mts onCostUpdate / onRateLimitUpdate).
  let disposed = false;
  bridge
    .getSnapshot()
    .then((snapshot) => {
      if (disposed) return;
      flushSync(() => {
        reactRoot.render(
          React.createElement(Topbar, deriveTopbarProps(snapshot)),
        );
      });
    })
    .catch(() => {
      // Initial fetch failure — wait for next onUpdate.
    });

  const unsubscribe = bridge.onUpdate((snapshot) => {
    if (disposed) return;
    flushSync(() => {
      reactRoot.render(
        React.createElement(Topbar, deriveTopbarProps(snapshot)),
      );
    });
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
      tryAutoMountTopbar();
    });
  } else {
    tryAutoMountTopbar();
  }
}
