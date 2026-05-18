// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE — Component 1 surface (operator-vision 23b4362).
//
// Minimum-shape FocusPane: a single React component that mounts the xterm-style
// streaming primitive (createTerminal -> TerminalAdapter) into a body container,
// rendered alongside a header chrome anchor and wrapped by a root sentinel div.
//
// WB1 scope (this file): mount + adapter-bridge ONLY. The component is a thin
// shell over the existing console-panel/terminal-adapter.ts contract; no IPC
// subscription, no header chrome details, no layout dimensions, no step
// counters at this WB. Subsequent WBs layer:
//   WB2 -> IPC consumer (coarchitect:ptyChunk filtered for __orchestrator_active)
//   WB3 -> focus-pane-header.tsx (uptime live; pid/cpu/budget placeholders per Q3)
//   WB4 -> ~60% width overlay layout + main.ts sentinel mount (per Q6=(c) overlay)
//   WB5 -> step counters (filename/total/ready; running/done placeholders per Q4)

import * as React from 'react';
import type { TerminalAdapter } from '../console-panel/terminal-adapter.js';
import { FocusPaneHeader } from './focus-pane-header.js';

export interface FocusPaneProps {
  /**
   * Factory that produces a TerminalAdapter instance. Production wires
   * `createXtermAdapter` from console-panel/terminal-adapter.ts; tests inject
   * a fake adapter (test/unit/console-t03/fake-terminal-adapter.ts) so happy-dom
   * does not need a Canvas-capable DOM.
   */
  createTerminal: () => TerminalAdapter;
  /**
   * Wall-clock millis at which the __orchestrator_active session was spawned.
   * Threaded through to FocusPaneHeader for the live uptime label per
   * Q-MVP-W1-3=(a). Undefined → header uptime renders em-dash placeholder.
   */
  spawnedAtMs?: number;
  /**
   * Current wall-clock millis injection for deterministic uptime tests.
   * Production callers may omit; FocusPaneHeader falls back to Date.now().
   */
  nowMs?: number;
}

// Overlay layout per Q-MVP-W1-6=(c). Fixed-position above existing shell DOM
// (kanban / tab-strip / chat-region) so the focus-pane mounts cleanly without
// editing READ-ONLY workstation-shell.html. Subsequent waves REPLACE the
// shell UI per operator vision §Component 3 ("REPLACES current tab-strip");
// overlay-obscuring is an acceptable trajectory per gen-7 V4 §C(VIII).
const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: '10vh',
  left: '5vw',
  width: '60vw',
  height: '70vh',
  zIndex: 1000,
  border: '1px solid #333',
  background: '#0a0a0a',
  color: '#e0e0e0',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
};

const BODY_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
};

export function FocusPane({
  createTerminal,
  spawnedAtMs,
  nowMs,
}: FocusPaneProps): React.ReactElement {
  const bodyRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const adapter = createTerminal();
    if (bodyRef.current) {
      adapter.open(bodyRef.current);
    }
    return () => {
      adapter.dispose();
    };
  }, [createTerminal]);

  return (
    <div data-testid="orchestrator-focus-pane-root" style={OVERLAY_STYLE}>
      <FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={nowMs} />
      <div data-testid="orchestrator-focus-pane-body" ref={bodyRef} style={BODY_STYLE} />
    </div>
  );
}
