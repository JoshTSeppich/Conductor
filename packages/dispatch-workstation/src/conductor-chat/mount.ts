// MB-T-MVP-W3-CONDUCTOR-CHAT WB4 (gen-7 lane) — renderer mount + bridge wiring.
//
// Mounts <ConductorChat> into a renderer DOM root. Subscribes to an
// optional window.conductorChatBridge to source aggregated chat state
// (messages / attached / queue / running / total / paused) and to wire
// action callbacks (send / attach / detach / dispatchNext / togglePause /
// cancel) into the main process.
//
// Path-B per gen-7 HALT-0 ARBITRATION (session-start directive ~19:50
// MDT): renderer-side wiring only at WB4; the production IPC layer in
// src/main/conductor-chat-ipc.ts is deferred to MB-F-CONDUCTOR-CHAT-
// PROD-WIRING-DEFERRED Tier-1 followup (filed at WB-final). The bridge
// is treated as optional — if window.conductorChatBridge is absent the
// surface still mounts with default empty state.
//
// Mount-root pattern mirrors orchestrator-focus-pane/mount.ts:81-126
// (renderer-created div). workstation-shell.html is READ-ONLY for W3
// per manifest (deferred to W3-final sweep coordinated with W1
// EXPANSION-2). The auto-mount block at the bottom of this file is a
// no-op in production until shell.html loads this bundle — that is the
// MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED tracking item.
//
// Composer integration: this mount imports the operator-CC Composer
// (f46649d) and renders it in the conductor-chat-composer slot via the
// renderComposer render-prop on ConductorChat. The Header equivalent is
// left as a render-prop opts.renderHeader so operator-CC's Header (their
// WB4) can be wired in by either session once it lands; WB4 default =
// no header content.

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  ConductorChat,
  type ConductorChatProps,
} from './conductor-chat.js';
import { type ConductorMessageVariant } from './conductor-message.js';
import { Composer } from './composer.js';

// ─── State + Bridge contracts ──────────────────────────────────────────

export interface ConductorChatState {
  messages: ReadonlyArray<ConductorMessageVariant>;
  attached: { name: string; steps: number } | null;
  queue: ReadonlyArray<unknown>;
  running: number;
  total: number;
  paused: boolean;
}

/**
 * Renderer-side bridge to the main-process conductor-chat IPC layer.
 * All methods optional per Path-B stub-only IPC: production wiring is
 * deferred to the MB-F-CONDUCTOR-CHAT-PROD-WIRING-DEFERRED followup.
 *
 * The renderer treats bridge=absent as "empty state, no-op actions" and
 * bridge=present as "use what is provided; ignore what is not".
 */
export interface ConductorChatBridge {
  getInitialState?(): ConductorChatState;
  onStateChange?(cb: (state: ConductorChatState) => void): () => void;
  send?(text: string): void;
  attach?(): void;
  detach?(): void;
  dispatchNext?(): void;
  togglePause?(): void;
  cancel?(): void;
}

// ─── Mount options + result types ──────────────────────────────────────

export interface ConductorChatMountOptions {
  /**
   * ID of an existing root element to mount into. If absent, a new body-
   * level `<div id="conductor-chat-mount-root">` is created and appended
   * (mirrors orchestrator-focus-pane/mount.ts:81-92 pattern; required
   * because workstation-shell.html is READ-ONLY for W3 and provides no
   * `#conductor-chat-root` anchor — that gap is the MB-F-CONDUCTOR-CHAT-
   * PROD-WIRING-DEFERRED Tier-1 followup at WB-final).
   */
  rootElementId?: string;
  /**
   * Optional explicit bridge override (test injection). Production reads
   * window.conductorChatBridge; tests bypass the global to keep the
   * probe deterministic.
   */
  bridge?: ConductorChatBridge | null;
  /**
   * Optional render-prop forwarded to ConductorChat for the header slot.
   * Default = no header content (operator-CC's Header has not yet
   * shipped at WB4 author time; the slot is intentionally left empty
   * until cross-session integration ships).
   */
  renderHeader?: () => React.ReactNode;
}

export type ConductorChatMountResult =
  | { mounted: true; dispose: () => void }
  | { mounted: false; reason: 'no-document' };

const DEFAULT_AUTO_MOUNT_ROOT_ID = 'conductor-chat-mount-root';

const EMPTY_STATE: ConductorChatState = {
  messages: [],
  attached: null,
  queue: [],
  running: 0,
  total: 0,
  paused: false,
};

// ─── Internal app component (uses React state to track bridge emissions) ──

interface ConductorChatAppProps {
  bridge: ConductorChatBridge | null;
  renderHeader?: () => React.ReactNode;
}

function ConductorChatApp(props: ConductorChatAppProps): React.ReactElement {
  const { bridge, renderHeader } = props;
  const initial = React.useMemo(() => {
    if (bridge?.getInitialState) return bridge.getInitialState();
    return EMPTY_STATE;
  }, [bridge]);
  const [state, setState] = React.useState<ConductorChatState>(initial);

  React.useEffect(() => {
    if (!bridge?.onStateChange) return;
    const unsub = bridge.onStateChange((next) => setState(next));
    return () => {
      unsub();
    };
  }, [bridge]);

  const onSend = React.useCallback(
    (text: string) => {
      bridge?.send?.(text);
    },
    [bridge],
  );
  const onAttach = React.useCallback(() => {
    bridge?.attach?.();
  }, [bridge]);
  const onDetach = React.useCallback(() => {
    bridge?.detach?.();
  }, [bridge]);
  const onDispatchNext = React.useCallback(() => {
    bridge?.dispatchNext?.();
  }, [bridge]);
  const onTogglePause = React.useCallback(() => {
    bridge?.togglePause?.();
  }, [bridge]);
  const onCancel = React.useCallback(() => {
    bridge?.cancel?.();
  }, [bridge]);

  const chatProps: ConductorChatProps = {
    messages: state.messages,
    attached: state.attached,
    queue: state.queue,
    running: state.running,
    total: state.total,
    paused: state.paused,
    onSend,
    onAttach,
    onDetach,
    onDispatchNext,
    onTogglePause,
    onCancel,
    renderHeader,
    renderComposer: () =>
      React.createElement(Composer, {
        attached: state.attached,
        queue: state.queue,
        paused: state.paused,
        onSend,
        onAttach,
        onDetach,
        onDispatchNext,
      }),
  };

  return React.createElement(ConductorChat, chatProps);
}

// ─── Public mount API ──────────────────────────────────────────────────

export function tryAutoMountConductorChat(
  opts: ConductorChatMountOptions = {},
): ConductorChatMountResult {
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

  const bridge: ConductorChatBridge | null =
    opts.bridge !== undefined
      ? opts.bridge
      : ((window as unknown as { conductorChatBridge?: ConductorChatBridge })
          .conductorChatBridge ?? null);

  const reactRoot: Root = createRoot(root);

  // flushSync forces the initial render to commit before tryAutoMount
  // returns, which keeps the mounted DOM observable to synchronous
  // callers (probe-05 + WB6 screenshot oracle). React 18 createRoot
  // otherwise batches the first render and tests would observe an
  // empty root until the next tick.
  flushSync(() => {
    reactRoot.render(
      React.createElement(ConductorChatApp, {
        bridge,
        renderHeader: opts.renderHeader,
      }),
    );
  });

  return {
    mounted: true,
    dispose: () => {
      // reactRoot.unmount() triggers the ConductorChatApp useEffect
      // cleanup, which calls the bridge.onStateChange unsubscribe
      // exactly once. Calling unsubscribe here would double-fire.
      reactRoot.unmount();
    },
  };
}

// Note: module-load auto-mount intentionally omitted at WB4. The
// orchestrator-focus-pane pattern (mount.ts:129-137) auto-mounts on
// DOMContentLoaded; replicating that here would double-mount under
// test imports (probe-05 imports this module and then calls
// tryAutoMountConductorChat() explicitly). The production entry point —
// when shell.html is amended to load this bundle per MB-F-CONDUCTOR-
// CHAT-PROD-WIRING-DEFERRED Tier-1 followup at WB-final — should call
// tryAutoMountConductorChat() at bundle-script load time.
