// @vitest-environment happy-dom
//
// CONSOLE-T03 Cluster 4 — Test 2/3: gap-warning banner renders on
// console:gap-detected.
//
// Authority chain:
//  - CONDUCTOR_API_CONTRACT.md §4.7.3 — backfill_meta with
//    backfill_complete:false signals an eviction-window gap (some lines were
//    evicted before the client reconnected).
//  - vision §10.5 — operator-visible gap warning is the contract surface;
//    rendering belongs to CONSOLE-T03.
//  - CONSOLE-T02 forwards backfill-incomplete events as console:gap-detected
//    with {sessionName, availableFromSeq, currentSeq}.
//
// RED state: pre-cluster-4 the onGap handler is a no-op; no banner renders.
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConsolePanel } from '../../../src/console-panel/console-panel.js';
import { makeFakeConsoleBridge } from './fake-console-bridge.js';
import { makeFakeTerminalAdapter } from './fake-terminal-adapter.js';

describe('CONSOLE-T03 cluster 4 — gap-warning rendering', () => {
  it('emitGap renders [data-testid=console-gap-warning] banner', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
    });

    expect(screen.queryByTestId('console-gap-warning')).not.toBeInTheDocument();

    act(() => {
      fake.emitGap({ sessionName: 'alpha', availableFromSeq: 1500, currentSeq: 9000 });
    });

    const banner = screen.getByTestId('console-gap-warning');
    expect(banner).toBeInTheDocument();
    // Vision §10.5: banner copy must surface the gap concept to the operator.
    expect(banner.textContent ?? '').toMatch(/dropped|gap/i);
  });

  it('opening a fresh session clears any prior gap banner', () => {
    const fake = makeFakeConsoleBridge();
    render(
      <ConsolePanel
        consoleBridge={fake.bridge}
        createTerminal={() => makeFakeTerminalAdapter()}
      />,
    );
    act(() => {
      fake.emitOpen({ sessionName: 'alpha' });
      fake.emitGap({ sessionName: 'alpha', availableFromSeq: 1, currentSeq: 100 });
    });
    expect(screen.getByTestId('console-gap-warning')).toBeInTheDocument();

    act(() => {
      fake.emitClose({ sessionName: 'alpha' });
      fake.emitOpen({ sessionName: 'beta' });
    });
    // New panel session = clean slate; the prior session's gap should not
    // bleed into the rebound view.
    expect(screen.queryByTestId('console-gap-warning')).not.toBeInTheDocument();
  });
});
