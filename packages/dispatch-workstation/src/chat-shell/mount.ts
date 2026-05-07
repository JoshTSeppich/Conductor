// MB-T20 WB3 — Conductor chat panel shell mount adapter.
//
// Mirrors src/coarchitect/mount.ts shape (Q-MBT20-5=a reuse
// coarchitectBridge — preload.mts unchanged). Auto-mount block at
// module bottom gates on window.coarchitectBridge existence so unit
// tests can import this module without triggering DOM mount.
//
// WB3 ships: testable mountChatShell factory + default stub
// renderChatTab + bridge-gated auto-mount. WB4 replaces the default
// stub with a renderChatTab closure that imports + renders
// coarchitect/chat-panel.js's ChatPanel inline (Q-MBT20-3=a wrap;
// Q-MBT20-4=a single renderer per region — workstation-shell.html
// line 555 script-tag swap is also WB4 territory).

import { createRoot, type Root } from 'react-dom/client';
import { createElement, type ReactNode } from 'react';
import { ChatShell } from './chat-shell.js';

// CoarchitectBridge type-shape mirror (kept local to avoid coupling
// chat-shell to coarchitect/ source). Source of truth lives at
// src/coarchitect/mount.ts:29-32 + src/coarchitect/chat-panel.tsx:4-9.
// Only the methods chat-shell will use at WB4 are typed here.
interface CoarchitectStreamingBridge {
  readonly sendAndStream: (content: string) => void;
  readonly onStreamChunk: (cb: (chunk: string) => void) => () => void;
  readonly onStreamDone: (cb: (preview: string) => void) => () => void;
  readonly onStreamError: (
    cb: (err: { readonly code: string; readonly message: string }) => void,
  ) => () => void;
}

interface CoarchitectBridge extends CoarchitectStreamingBridge {
  readonly fetchHistory: () => Promise<readonly unknown[]>;
  readonly postMessage: (msg: unknown) => Promise<unknown>;
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

export function mountChatShell(opts: MountChatShellOptions): () => void {
  const rootEl = document.getElementById(opts.rootElementId);
  if (!rootEl) throw new Error(`#${opts.rootElementId} not found`);
  const root: Root = createRoot(rootEl);
  const renderChatTab = opts.renderChatTab ?? defaultChatTabStub;
  root.render(createElement(ChatShell, { renderChatTab }));
  return () => root.unmount();
}

function defaultChatTabStub(): ReactNode {
  return createElement(
    'span',
    { 'data-testid': 'chat-shell-chat-tab-stub' },
    'Chat tab body — WB4 wires ChatPanel here',
  );
}

// Auto-mount on module import — gates on window.coarchitectBridge
// presence so test files importing mount.js do NOT trigger DOM mount.
// In Electron (preload.mts exposes coarchitectBridge), the WB4 line-555
// swap routes this renderer into workstation-shell.html#root. Standalone
// harness contexts (no bridge) also no-op (deferred to a future ticket
// if a standalone HTML harness is needed).
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
