import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { ConsoleBridge } from '../main/console-bridge.js';
import type { TerminalAdapter } from './terminal-adapter.js';

// CONSOLE-T03 — operator-facing CC-console panel.
//
// Vision §10 (frozen at eac381e) + WORKSTATION_CONTRACT.md (frozen at
// cf1848a) + CONDUCTOR_API_CONTRACT.md §4.7 (frozen at a7e8d4f, v2.2.0).
//
// Cluster 1 scope (this commit): mount, idle/empty state, console:open
// surfacing the session name in a header + creating the xterm.js terminal
// container, console:close returning to idle + disposing the adapter, and
// registering exactly one listener per shell→webview channel. Cluster 2
// (STDOUT routing), cluster 3 (prompt input), and cluster 4 (signals + gap +
// error) extend this skeleton — the cluster 2-4 listener bodies are no-ops
// here so each cluster's RED tests fail until that cluster's GREEN lands.

export interface ConsolePanelProps {
  readonly consoleBridge: ConsoleBridge;
  /**
   * Factory for the terminal adapter. In production this is wired in
   * mount.ts to the xterm.js-backed adapter from terminal-adapter.ts; in
   * unit tests it is injected as a synchronous fake to avoid the Canvas
   * requirement xterm.js places on its host DOM (happy-dom 15 does not
   * implement Canvas).
   */
  readonly createTerminal: () => TerminalAdapter;
}

interface PanelState {
  sessionName: string | null;
}

const INITIAL_STATE: PanelState = { sessionName: null };

export function ConsolePanel({
  consoleBridge,
  createTerminal,
}: ConsolePanelProps): JSX.Element {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  const terminalContainerRef: RefObject<HTMLDivElement | null> = useRef(null);
  const terminalAdapterRef = useRef<TerminalAdapter | null>(null);

  // Bridge subscriptions — five listeners, one per shell→webview channel.
  // Cluster 1 only acts on open/close; chunk/gap/error are intentional no-ops
  // so cluster 2-4 RED tests can fail before each GREEN expands the body.
  useEffect(() => {
    const cleanups = [
      consoleBridge.onConsoleOpen((p) => {
        setState({ sessionName: p.sessionName });
      }),
      consoleBridge.onConsoleClose(() => {
        setState(INITIAL_STATE);
      }),
      consoleBridge.onStdoutChunk((p) => {
        const t = terminalAdapterRef.current;
        if (!t) return; // No adapter yet — chunk arrived before console:open.
        const data =
          p.encoding === 'base64' ? decodeBase64Utf8(p.bytes) : p.bytes;
        t.write(data);
      }),
      consoleBridge.onGap(() => {
        // Cluster 4 fills this in.
      }),
      consoleBridge.onError(() => {
        // Cluster 4 fills this in.
      }),
    ];
    return () => {
      for (const c of cleanups) c();
    };
  }, [consoleBridge]);

  // Terminal lifecycle — runs whenever a session becomes bound or unbound.
  useEffect(() => {
    if (!state.sessionName) return undefined;
    const container = terminalContainerRef.current;
    if (!container) return undefined;

    const adapter = createTerminal();
    adapter.open(container);
    terminalAdapterRef.current = adapter;
    return () => {
      adapter.dispose();
      terminalAdapterRef.current = null;
    };
  }, [state.sessionName, createTerminal]);

  if (!state.sessionName) {
    return (
      <div data-testid="console-panel-root">
        <div data-testid="console-panel-empty">No console session bound.</div>
      </div>
    );
  }

  return (
    <div data-testid="console-panel-root">
      <div data-testid="console-panel-header">
        <span>{state.sessionName}</span>
      </div>
      <div data-testid="console-terminal" ref={terminalContainerRef} />
    </div>
  );
}

/** Base64 → UTF-8 decoder usable in browser + Node. atob handles bytes; we
 * then re-decode through TextDecoder for valid UTF-8. Used by the
 * onStdoutChunk handler when the daemon tags a chunk as base64-encoded
 * (CONDUCTOR_API_CONTRACT.md §4.7.3: lines containing invalid UTF-8 sequences
 * are sent base64 so the JSON envelope stays well-formed). xterm.js
 * tolerates malformed UTF-8 via its own decoder + replacement-character
 * fallback, so the worst case for an actually-malformed chunk is rendered
 * U+FFFDs in the terminal — never a panel crash. */
function decodeBase64Utf8(b64: string): string {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: false }).decode(arr);
  }
  // Node fallback (build target is browser; this branch is defensive for
  // unit-test environments where atob may be absent on older Node releases).
  return Buffer.from(b64, 'base64').toString('utf8');
}
