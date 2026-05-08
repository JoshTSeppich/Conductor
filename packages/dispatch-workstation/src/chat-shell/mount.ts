// MB-T22 WB2 — Conductor chat panel shell mount adapter (multi-tab).
//
// Migrates the MB-T20 single-tab `renderChatTab?` slot to the multi-tab
// `tabs: TabConfig[]` API per Q-MBT22-3=a (decisions doc 2026-05-07).
// Closes MB-F-T20-FAMILY-B-ADDITIONAL-TABS.
//
// Public mountChatShell({ rootElementId, bridge }) signature preserved
// — A's MB-T21 quick-pick integration test
// (test/integration/chat-shell/quick-pick-roundtrip.test.tsx) and the
// MB-T20 probe-02 / probe-03 suites all call this shape and continue to
// work without modification. The new `tabs` option overrides the
// default Chat-tab construction (used by probe-02 test 5 after
// migration to the new API).
//
// preload.mts UNCHANGED at WB2. The new `commitsBridge` exposure +
// `commits-ipc.ts` IPC handler land at WB3 per the MB-T22 ladder
// (decisions doc §5-WB ladder).
//
// Renderer routing at runtime:
//   workstation-shell.html line 555 loads ../chat-shell/renderer.js
//   (the esbuild bundle of this module). Auto-mount block below mounts
//   ChatShell into workstation-shell.html#chat-region #root with a
//   tabs array containing the Chat tab built from coarchitectBridge
//   (Q-MBT20-5=a coarchitectBridge passthrough preserved).
//
// Auto-mount block gates on window.coarchitectBridge so unit tests can
// import mount.js without triggering DOM mount.

import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ReactNode } from 'react';
import { ChatShell, type TabConfig } from './chat-shell.js';
import { ChatPanel, type StreamingBridge } from '../coarchitect/chat-panel.js';
import type {
  DaemonClient,
  ChatMessage,
  ChatMessageInput,
} from '../coarchitect/daemon-client.js';

// Re-export TabConfig for downstream tab-config authors (e.g. WB4
// commits TabConfig wiring; future MB-T23 Tasks tab).
export type { TabConfig };

// CoarchitectBridge type mirrors src/coarchitect/mount.ts:29-32. Source
// of truth: preload.mts contextBridge.exposeInMainWorld('coarchitect-
// Bridge', {...}). chat-shell extends StreamingBridge (imported from
// coarchitect/chat-panel.js — the wrapped consumer's contract surface).
export interface CoarchitectBridge extends StreamingBridge {
  readonly fetchHistory: () => Promise<ChatMessage[]>;
  readonly postMessage: (msg: ChatMessageInput) => Promise<ChatMessage>;
}

declare global {
  interface Window {
    coarchitectBridge?: CoarchitectBridge;
  }
}

export interface MountChatShellOptions {
  readonly rootElementId: string;
  readonly bridge?: CoarchitectBridge | null;
  /**
   * Explicit tabs override. When omitted, mountChatShell builds a
   * single Chat tab from `bridge` (if supplied) or from
   * `defaultChatTabStub` (otherwise). When supplied, used verbatim.
   */
  readonly tabs?: readonly TabConfig[];
}

// Adapter from coarchitectBridge → ChatPanel's DaemonClient interface.
// Mirrors src/coarchitect/mount.ts:40-45.
function createDaemonClientAdapter(bridge: CoarchitectBridge): DaemonClient {
  return {
    fetchHistory: () => bridge.fetchHistory(),
    postMessage: (msg) => bridge.postMessage(msg),
  };
}

// renderChatTabBody closure that wraps ChatPanel for the Chat tab body.
// Q-MBT20-3=a (wrap) + Q-MBT20-5=a (coarchitectBridge passthrough).
function makeChatPanelRender(bridge: CoarchitectBridge): () => ReactNode {
  const daemonClient = createDaemonClientAdapter(bridge);
  return () =>
    createElement(ChatPanel, {
      daemonClient,
      streamingBridge: bridge,
    });
}

function defaultChatTabStub(): ReactNode {
  return createElement(
    'span',
    { 'data-testid': 'chat-shell-chat-tab-stub' },
    'Chat tab body — provide bridge or tabs to wire ChatPanel',
  );
}

// Resolution order (preserves MB-T20 probe-02 + probe-03 + A's
// quick-pick integration test behavior under the new API):
//   1. Explicit `opts.tabs` — used verbatim (probe-02 test 5 path).
//   2. `opts.bridge` — build single Chat tab wrapping ChatPanel via
//      coarchitectBridge passthrough (probe-03 + integration path).
//   3. Neither — build single Chat tab with defaultChatTabStub
//      (probe-02 tests 1-4 path; production fallback when bridge is
//      not yet exposed).
function resolveTabs(opts: MountChatShellOptions): readonly TabConfig[] {
  if (opts.tabs) return opts.tabs;
  if (opts.bridge) {
    return [
      {
        id: 'chat',
        label: 'Chat',
        render: makeChatPanelRender(opts.bridge),
      },
    ];
  }
  return [
    {
      id: 'chat',
      label: 'Chat',
      render: defaultChatTabStub,
    },
  ];
}

export function mountChatShell(opts: MountChatShellOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root: Root = createRoot(rootEl);
  const tabs = resolveTabs(opts);
  root.render(createElement(ChatShell, { tabs }));
  return () => root.unmount();
}

if (
  typeof window !== 'undefined' &&
  window.coarchitectBridge &&
  typeof document !== 'undefined' &&
  document.getElementById('root')
) {
  mountChatShell({
    rootElementId: 'root',
    bridge: window.coarchitectBridge,
  });
  console.log('CHAT_SHELL_MOUNTED');
}
