import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react';
import type {
  ConsoleBridge,
  GapPayload,
  ErrorPayload,
  SignalName,
} from '../main/console-bridge.js';
import type { TerminalAdapter } from './terminal-adapter.js';

// CONSOLE-T03 / MB-T12 WB4 — operator-facing CC-console panel.
//
// Pre-MB-T12 (single-panel): the panel held a single sessionName in state
// and rebound on every console:open event from the bridge — opening a
// second session overwrote the first. That single-panel constraint was
// MB-F-CONSOLE-T03-MULTI-PANEL.
//
// Post-MB-T12 WB4 (multi-mount): the panel is bound to a targetSessionName
// at mount time. The parent (the tile-grid React tree, WB6) renders one
// ConsolePanel per tile, each with a distinct targetSessionName prop.
// Listener handlers FILTER bridge events by `p.sessionName === targetSessionName`,
// so a console:open / stdout-chunk / gap / error / close event only affects
// the tile bound to that session — no cross-talk.
//
// State semantics:
//   - `open: boolean` — true after console:open for THIS targetSessionName,
//     false initially and after console:close. Drives idle vs bound render.
//   - `gap`, `error` — last gap / error payload received for THIS session.

export interface ConsolePanelProps {
  /** Session this panel renders. Set by the tile-grid parent (MB-T12).
   *  Bridge events with a different sessionName are ignored. */
  readonly targetSessionName: string;
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
  open: boolean;
  gap: GapPayload | null;
  error: ErrorPayload | null;
}

const INITIAL_STATE: PanelState = { open: false, gap: null, error: null };

export function ConsolePanel({
  targetSessionName,
  consoleBridge,
  createTerminal,
}: ConsolePanelProps): JSX.Element {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  const terminalContainerRef: RefObject<HTMLDivElement | null> = useRef(null);
  const terminalAdapterRef = useRef<TerminalAdapter | null>(null);
  const inputRef: RefObject<HTMLTextAreaElement | null> = useRef(null);

  async function handleSendPrompt(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!state.open) return;
    const text = inputRef.current?.value ?? '';
    if (text.length === 0) return;
    if (inputRef.current) inputRef.current.value = '';
    await consoleBridge.sendStdin(targetSessionName, text, 'utf8');
  }

  async function handleSignal(signal: SignalName): Promise<void> {
    if (!state.open) return;
    await consoleBridge.signal(targetSessionName, signal);
  }

  useEffect(() => {
    const cleanups = [
      consoleBridge.onConsoleOpen((p) => {
        if (p.sessionName !== targetSessionName) return;
        setState({ open: true, gap: null, error: null });
      }),
      consoleBridge.onConsoleClose((p) => {
        if (p.sessionName !== targetSessionName) return;
        setState(INITIAL_STATE);
      }),
      consoleBridge.onStdoutChunk((p) => {
        if (p.sessionName !== targetSessionName) return;
        const t = terminalAdapterRef.current;
        if (!t) return;
        const data =
          p.encoding === 'base64' ? decodeBase64Utf8(p.bytes) : p.bytes;
        t.write(data);
      }),
      consoleBridge.onGap((p) => {
        if (p.sessionName !== targetSessionName) return;
        setState((s) => ({ ...s, gap: p }));
      }),
      consoleBridge.onError((p) => {
        if (p.sessionName !== targetSessionName) return;
        setState((s) => ({ ...s, error: p }));
      }),
    ];
    return () => {
      for (const c of cleanups) c();
    };
  }, [consoleBridge, targetSessionName]);

  useEffect(() => {
    if (!state.open) return undefined;
    const container = terminalContainerRef.current;
    if (!container) return undefined;

    const adapter = createTerminal();
    adapter.open(container);
    terminalAdapterRef.current = adapter;
    return () => {
      adapter.dispose();
      terminalAdapterRef.current = null;
    };
  }, [state.open, createTerminal]);

  if (!state.open) {
    return (
      <div data-testid="console-panel-root">
        <div data-testid="console-panel-empty">No console session bound.</div>
      </div>
    );
  }

  return (
    <div data-testid="console-panel-root">
      <div data-testid="console-panel-header">
        <span>{targetSessionName}</span>
        <button
          type="button"
          data-testid="signal-sigint"
          onClick={() => void handleSignal('SIGINT')}
        >
          Ctrl-C (SIGINT)
        </button>
        <button
          type="button"
          data-testid="signal-sigterm"
          onClick={() => void handleSignal('SIGTERM')}
        >
          SIGTERM
        </button>
        <button
          type="button"
          data-testid="signal-sighup"
          onClick={() => void handleSignal('SIGHUP')}
        >
          SIGHUP
        </button>
      </div>
      {state.gap && (
        <div role="alert" data-testid="console-gap-warning">
          Some output dropped while disconnected (lines{' '}
          {state.gap.availableFromSeq}+ available; {state.gap.currentSeq} latest).
        </div>
      )}
      {state.error && (
        <div role="alert" data-testid="console-error-banner">
          Error: {state.error.message}
        </div>
      )}
      <div data-testid="console-terminal" ref={terminalContainerRef} />
      <form data-testid="console-prompt-form" onSubmit={handleSendPrompt}>
        <textarea
          ref={inputRef}
          data-testid="console-prompt-input"
          rows={2}
          placeholder="Type a prompt; Send writes to STDIN."
        />
        <button type="submit" data-testid="console-prompt-send">
          Send
        </button>
      </form>
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
  return Buffer.from(b64, 'base64').toString('utf8');
}
