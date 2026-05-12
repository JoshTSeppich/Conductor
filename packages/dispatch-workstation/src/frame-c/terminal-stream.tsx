// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB2 (green) — TerminalStream
// per-selected-session live PTY scrollback for Frame C DetailPane.
//
// Per ticket body 30ab109 §1.1 item 1 + §4 WB2 + WB2 SPIKE outcome 2
// (ADR at docs/coordination/mb-t-wireframe-t2-console-stream-spike-2026-05-12.md):
//   - Subscribes to consoleBridge.onStdoutChunk; per-session filter via
//     p.sessionName === targetSessionName (precedent: console-panel.tsx:92-99).
//   - Invokes consoleBridge.openPanel(targetSessionName) on mount + on
//     targetSessionName change. WS subscription is the SOLE source of
//     stdout-chunk events per spike outcome 2: ConsoleIpcController
//     console-ipc.ts:200-225 establishes the WebSocket in
//     openConsolePanel, and that WS is the only emitter of
//     console:stdout-chunk (console-ipc.ts:350).
//   - Swallows PanelAlreadyOpen + PanelCapExceeded per main.ts:349-352
//     precedent. PanelAlreadyOpen is non-fatal (another surface — tile-
//     grid ConsolePanel or native menu — has already opened the WS;
//     chunks still flow). PanelCapExceeded is non-fatal here (operator-
//     facing menu surfaces the cap; out of T2 scope; tracked as Tier 3
//     followup candidate MB-F-T2-PANEL-CAP-AWARE-UX per ADR §3.3).
//   - Writes decoded chunk bytes to injected TerminalAdapter (xterm.js-
//     backed in production via createXtermAdapter; fake in unit tests
//     per CONSOLE-T03 fixture pattern).
//
// Adapter + subscription share a single useEffect so both are torn down
// together on unmount / selection-change. On selection-change, the
// adapter is re-created (fresh scrollback for the newly-selected
// session — operator should not see the previous session's terminal
// carry-over in the right pane).
//
// WB9-WB10 auto-scroll with operator-pause is layered on this
// component in a follow-on WB.

import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';

export interface TerminalStreamProps {
  /** Session this terminal pane renders. Set by Frame C DetailPane to
   *  the currently-selected session name. Bridge events with a different
   *  sessionName are ignored (per-session filter). */
  readonly targetSessionName: string;
  /** CONSOLE-T02 bridge — exposes per-session console:stdout-chunk +
   *  console:open-panel via contextBridge. Injected so unit tests can
   *  swap in a fake bridge (see
   *  test/unit/console-t03/fake-console-bridge.ts). */
  readonly consoleBridge: ConsoleBridge;
  /** Terminal adapter factory. Production wires the xterm.js-backed
   *  adapter (createXtermAdapter). Tests inject a fake adapter to avoid
   *  xterm's Canvas requirement under happy-dom. */
  readonly createTerminal: () => TerminalAdapter;
}

const STREAM_ROOT_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

export function TerminalStream({
  targetSessionName,
  consoleBridge,
  createTerminal,
}: TerminalStreamProps): JSX.Element {
  const containerRef: RefObject<HTMLDivElement | null> = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Adapter mount: creates the xterm.js (or fake) renderer bound to
    // the container element. Disposed on cleanup.
    const adapter = createTerminal();
    adapter.open(container);

    // WS subscription: openPanel establishes the daemon-side WebSocket
    // that emits console:stdout-chunk events for this session (spike
    // outcome 2). Swallow PanelAlreadyOpen + PanelCapExceeded.
    consoleBridge.openPanel(targetSessionName).catch(() => {
      /* non-fatal — see ADR §3.1 */
    });

    // Per-session chunk subscription. Filter at the listener (matches
    // ConsolePanel pattern); mismatching chunks are silently dropped.
    const cleanupSubscription = consoleBridge.onStdoutChunk((p) => {
      if (p.sessionName !== targetSessionName) return;
      const data =
        p.encoding === 'base64' ? decodeBase64Utf8(p.bytes) : p.bytes;
      adapter.write(data);
    });

    return () => {
      cleanupSubscription();
      adapter.dispose();
    };
  }, [consoleBridge, targetSessionName, createTerminal]);

  return (
    <div
      data-testid="frame-c-terminal-stream-root"
      ref={containerRef}
      style={STREAM_ROOT_STYLE}
    />
  );
}

/** Base64 → UTF-8 decoder usable in browser + Node. Mirrors
 *  console-panel.tsx:189-205 decoder pattern; needed when the daemon
 *  tags a chunk as base64 for invalid-UTF-8 transport per
 *  CONDUCTOR_API_CONTRACT.md §4.7.3. */
function decodeBase64Utf8(b64: string): string {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(arr);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}
