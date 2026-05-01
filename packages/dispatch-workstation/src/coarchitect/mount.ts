import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { DaemonClient } from './daemon-client.js';
import { ChatPanel } from './chat-panel.js';
import { createStubDaemonClient } from './daemon-client.js';

export interface ChatPanelMountOptions {
  readonly rootElementId: string;
  readonly daemonClient: DaemonClient;
}

/**
 * Mounts ChatPanel into the DOM element identified by rootElementId using
 * React 18's createRoot API. Returns an unmount function.
 *
 * In production (post-Zipper-2), callers pass a contextBridge adapter as
 * daemonClient (RESOLUTION-3 Pattern B). In Round 2, the auto-mount at the
 * bottom of this module uses the stub client directly.
 */
export function mountChatPanel(opts: ChatPanelMountOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root = createRoot(rootEl);
  root.render(createElement(ChatPanel, { daemonClient: opts.daemonClient }));
  return () => root.unmount();
}

// Round 2 dev entry: auto-mount at renderer bundle load using stub client.
// Zipper-2 replaces this block with a contextBridge adapter call.
mountChatPanel({ rootElementId: 'root', daemonClient: createStubDaemonClient() });
