// MB-T20 WB4 — Conductor chat panel shell mount adapter.
//
// Mirrors src/coarchitect/mount.ts shape (Q-MBT20-5=a reuse
// coarchitectBridge — preload.mts unchanged). WB4 wires the renderChatTab
// closure to import + render coarchitect/chat-panel.js's ChatPanel inline
// (Q-MBT20-3=a wrap; coarchitect/chat-panel.tsx is NOT modified).
//
// Renderer routing at runtime:
//   workstation-shell.html line 555 loads ../chat-shell/renderer.js
//   (the esbuild bundle of this module). Auto-mount block below mounts
//   ChatShell into workstation-shell.html#chat-region #root with
//   renderChatTab returning <ChatPanel /> wired through coarchitectBridge.
//
// Auto-mount block gates on window.coarchitectBridge so unit tests can
// import mount.js without triggering DOM mount.

import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ReactNode } from 'react';
import { ChatShell } from './chat-shell.js';
import { ChatPanel, type StreamingBridge } from '../coarchitect/chat-panel.js';
import type {
  DaemonClient,
  ChatMessage,
  ChatMessageInput,
} from '../coarchitect/daemon-client.js';

// CoarchitectBridge type mirrors src/coarchitect/mount.ts:29-32. Source of
// truth: preload.mts contextBridge.exposeInMainWorld('coarchitectBridge',
// {...}). chat-shell extends StreamingBridge (imported from coarchitect/
// chat-panel.js — the wrapped consumer's contract surface).
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
  readonly renderChatTab?: () => ReactNode;
}

// Adapter from coarchitectBridge → ChatPanel's DaemonClient interface.
// Mirrors src/coarchitect/mount.ts:40-45.
function createDaemonClientAdapter(bridge: CoarchitectBridge): DaemonClient {
  return {
    fetchHistory: () => bridge.fetchHistory(),
    postMessage: (msg) => bridge.postMessage(msg),
  };
}

// renderChatTab closure that wraps ChatPanel for the Chat tab body.
// Q-MBT20-3=a (wrap) + Q-MBT20-5=a (coarchitectBridge passthrough).
function makeChatPanelRenderChatTab(bridge: CoarchitectBridge): () => ReactNode {
  const daemonClient = createDaemonClientAdapter(bridge);
  return () =>
    createElement(ChatPanel, {
      daemonClient,
      streamingBridge: bridge,
    });
}

export function mountChatShell(opts: MountChatShellOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root: Root = createRoot(rootEl);
  // Resolution order: explicit renderChatTab → bridge wrap → default stub.
  const renderChatTab =
    opts.renderChatTab ??
    (opts.bridge ? makeChatPanelRenderChatTab(opts.bridge) : defaultChatTabStub);
  root.render(createElement(ChatShell, { renderChatTab }));
  return () => root.unmount();
}

function defaultChatTabStub(): ReactNode {
  return createElement(
    'span',
    { 'data-testid': 'chat-shell-chat-tab-stub' },
    'Chat tab body — provide bridge or renderChatTab to wire ChatPanel',
  );
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
