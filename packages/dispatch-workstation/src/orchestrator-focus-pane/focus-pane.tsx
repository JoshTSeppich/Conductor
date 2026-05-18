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

export interface FocusPaneProps {
  /**
   * Factory that produces a TerminalAdapter instance. Production wires
   * `createXtermAdapter` from console-panel/terminal-adapter.ts; tests inject
   * a fake adapter (test/unit/console-t03/fake-terminal-adapter.ts) so happy-dom
   * does not need a Canvas-capable DOM.
   */
  createTerminal: () => TerminalAdapter;
}

export function FocusPane({ createTerminal }: FocusPaneProps): React.ReactElement {
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
    <div data-testid="orchestrator-focus-pane-root">
      <div data-testid="orchestrator-focus-pane-header" />
      <div data-testid="orchestrator-focus-pane-body" ref={bodyRef} />
    </div>
  );
}
