import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { DaemonClient, ChatMessage, ChatMessageInput } from './daemon-client.js';
import { ChatPanel, type StreamingBridge } from './chat-panel.js';
import { createStubDaemonClient } from './daemon-client.js';

export interface ChatPanelMountOptions {
  readonly rootElementId: string;
  readonly daemonClient: DaemonClient;
  readonly streamingBridge?: StreamingBridge | null;
}

/**
 * Mounts ChatPanel into the DOM element identified by rootElementId using
 * React 18's createRoot API. Returns an unmount function.
 */
export function mountChatPanel(opts: ChatPanelMountOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root = createRoot(rootEl);
  root.render(createElement(ChatPanel, {
    daemonClient: opts.daemonClient,
    streamingBridge: opts.streamingBridge,
  }));
  return () => root.unmount();
}

// Bridge interface matching coarchitectBridge exposed by preload.mts (COARCH-T03).
interface CoarchitectBridge extends StreamingBridge {
  fetchHistory(): Promise<ChatMessage[]>;
  postMessage(msg: ChatMessageInput): Promise<ChatMessage>;
}

declare global {
  interface Window {
    coarchitectBridge?: CoarchitectBridge;
  }
}

function createBridgeAdapter(bridge: CoarchitectBridge): DaemonClient {
  return {
    fetchHistory: () => bridge.fetchHistory(),
    postMessage: (msg) => bridge.postMessage(msg),
  };
}

// Auto-mount: use bridge adapter when running inside Electron shell (COARCH-T03+),
// fall back to stub for standalone chat-panel.html context (COARCH-T02 compat).
const bridge = window.coarchitectBridge;
if (bridge) {
  mountChatPanel({
    rootElementId: 'root',
    daemonClient: createBridgeAdapter(bridge),
    streamingBridge: bridge,
  });
} else {
  mountChatPanel({ rootElementId: 'root', daemonClient: createStubDaemonClient() });
}
