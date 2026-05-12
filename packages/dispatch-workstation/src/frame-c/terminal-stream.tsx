// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB2+WB10 — TerminalStream
// per-selected-session live PTY scrollback for Frame C DetailPane with
// auto-scroll + operator-pause + resume affordance.
//
// WB2 (green) — initial mount + subscription per ticket §1.1 item 1 +
//   §4 WB2 + WB2 SPIKE outcome 2 (ADR docs/coordination/mb-t-wireframe-
//   t2-console-stream-spike-2026-05-12.md):
//   - Subscribes to consoleBridge.onStdoutChunk; per-session filter via
//     p.sessionName === targetSessionName (precedent: console-panel.tsx:
//     92-99).
//   - Invokes consoleBridge.openPanel(targetSessionName) on mount + on
//     targetSessionName change. WS subscription is the SOLE source of
//     stdout-chunk events per spike outcome 2.
//   - Swallows PanelAlreadyOpen + PanelCapExceeded per main.ts:349-352
//     precedent.
//   - Writes decoded chunk bytes to injected TerminalAdapter.
//
// WB10 (green) — auto-scroll + operator-pause + resume affordance per
//   ticket §4 WB10:
//   - Root div uses overflow-y: auto so the operator can scroll.
//   - useState<boolean> paused (default false). onScroll listener on
//     root: if scrollTop < scrollHeight - clientHeight - tolerance
//     (PAUSED_TOLERANCE_PX), setPaused(true).
//   - When !paused AND a chunk arrives: set scrollTop = scrollHeight
//     after adapter.write (auto-scroll to bottom).
//   - When paused: render `<span data-testid="frame-c-autoscroll-
//     paused" />` indicator + `<button data-testid="frame-c-
//     autoscroll-resume">` resume affordance.
//   - Resume click: setPaused(false) + scroll to bottom on next chunk.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
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

const ROOT_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

const SCROLL_AREA_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const RESUME_BUTTON_STYLE: CSSProperties = {
  position: 'absolute',
  right: '12px',
  bottom: '12px',
  padding: '6px 10px',
  fontFamily: 'inherit',
  fontSize: '11px',
  background: '#1f2937',
  color: '#dddddd',
  border: '1px solid #303030',
  borderRadius: '4px',
  cursor: 'pointer',
};

/** Operator must scroll up at least this many pixels from the bottom
 *  before the paused state activates. Absorbs sub-pixel jitter and
 *  programmatic-scroll round-trips. */
const PAUSED_TOLERANCE_PX = 4;

export function TerminalStream({
  targetSessionName,
  consoleBridge,
  createTerminal,
}: TerminalStreamProps): JSX.Element {
  const scrollAreaRef: RefObject<HTMLDivElement | null> = useRef(null);
  const terminalContainerRef: RefObject<HTMLDivElement | null> = useRef(null);
  const [paused, setPaused] = useState<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  pausedRef.current = paused;

  const scrollToBottom = useCallback((): void => {
    const area = scrollAreaRef.current;
    if (!area) return;
    area.scrollTop = area.scrollHeight;
  }, []);

  const handleResume = useCallback((): void => {
    setPaused(false);
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(() => {
    const terminalContainer = terminalContainerRef.current;
    if (!terminalContainer) return undefined;

    // Adapter mount.
    const adapter = createTerminal();
    adapter.open(terminalContainer);

    // WS subscription.
    consoleBridge.openPanel(targetSessionName).catch(() => {
      /* non-fatal — see ADR §3.1 */
    });

    const cleanupSubscription = consoleBridge.onStdoutChunk((p) => {
      if (p.sessionName !== targetSessionName) return;
      const data =
        p.encoding === 'base64' ? decodeBase64Utf8(p.bytes) : p.bytes;
      adapter.write(data);
      if (!pausedRef.current) {
        // Auto-scroll to bottom only when not paused. Read pausedRef
        // (not the captured `paused` from React closure) to get the
        // current value without re-binding the listener every state
        // change.
        const area = scrollAreaRef.current;
        if (area) {
          area.scrollTop = area.scrollHeight;
        }
      }
    });

    return () => {
      cleanupSubscription();
      adapter.dispose();
    };
  }, [consoleBridge, targetSessionName, createTerminal]);

  const handleScroll = useCallback((): void => {
    const area = scrollAreaRef.current;
    if (!area) return;
    const distanceFromBottom =
      area.scrollHeight - area.clientHeight - area.scrollTop;
    if (distanceFromBottom > PAUSED_TOLERANCE_PX) {
      setPaused(true);
    }
  }, []);

  return (
    <div style={ROOT_WRAPPER_STYLE}>
      <div
        data-testid="frame-c-terminal-stream-root"
        ref={scrollAreaRef}
        onScroll={handleScroll}
        style={SCROLL_AREA_STYLE}
      >
        <div ref={terminalContainerRef} />
      </div>
      {paused && (
        <>
          <span data-testid="frame-c-autoscroll-paused" hidden aria-hidden />
          <button
            type="button"
            data-testid="frame-c-autoscroll-resume"
            onClick={handleResume}
            style={RESUME_BUTTON_STYLE}
          >
            Auto-scroll paused · Resume
          </button>
        </>
      )}
    </div>
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
