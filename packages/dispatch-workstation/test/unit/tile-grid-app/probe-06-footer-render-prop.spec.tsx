// @vitest-environment happy-dom
//
// MB-T18 WB3 probe-06 — TileGridApp footer-render-prop integration.
//
// Verifies that:
//   - TileGridApp constructs a renderFooterSlot closure that looks up
//     cwd from the session entry and renders <TileFooter cwd /> inside
//     the per-tile footer slot wrapper (Q-MBT18-4=a render-prop +
//     Q-MBT18-6=a NO bridge — pure renderer-side data).
//   - When session entry has cwd: footer renders the cwd span with
//     full path text + title= tooltip (Q-MBT18-7=d).
//   - When session entry has no cwd: footer renders without cwd span;
//     uptime line still renders (footer never hides entirely).
//   - workstationBridge.onSpawnResult({result: {sessionName, cwd}})
//     populates TileGridSessionEntry.cwd → footer reflects it.
//   - workstationBridge.onSpawnResult({result: {sessionName}}) (no cwd)
//     leaves TileGridSessionEntry.cwd undefined → footer omits cwd line.
//   - Multiple tiles each get their own footer with their session's cwd
//     (per-tile keyed render).

import { describe, it, expect } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

interface FakeWorkstationBridge extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
}

function makeFakeBridge(): FakeWorkstationBridge {
  const handlers = new Set<(reply: unknown) => void>();
  return {
    onSpawnResult: (cb) => {
      handlers.add(cb);
      return () => {
        handlers.delete(cb);
      };
    },
    emitSpawnResult: (reply) => {
      handlers.forEach((h) => h(reply));
    },
  };
}

function renderApp(
  bridge: WorkstationBridgeShape,
  initialSessions: { name: string; cwd?: string }[] = [],
): void {
  const consoleBridge = makeFakeConsoleBridge().bridge;
  render(
    <TileGridApp
      workstationBridge={bridge}
      consoleBridge={consoleBridge}
      createTerminal={() => makeFakeTerminalAdapter()}
      initialSessions={initialSessions}
    />,
  );
}

describe('MB-T18 WB3 — TileGridApp renderFooterSlot closure (Q-MBT18-4=a + Q-MBT18-6=a)', () => {
  it('initialSessions with cwd: footer renders cwd span with full path text + title=', () => {
    renderApp(makeFakeBridge(), [
      { name: 'sess-cwd', cwd: '/Users/op/Desktop/foo' },
    ]);
    const footerSlot = screen.getByTestId('tile-footer-slot-sess-cwd');
    const cwdSpan = within(footerSlot).getByTestId('tile-footer-cwd');
    expect(cwdSpan.textContent).toBe('/Users/op/Desktop/foo');
    expect(cwdSpan.getAttribute('title')).toBe('/Users/op/Desktop/foo');
  });

  it('initialSessions without cwd: footer renders WITHOUT cwd span (uptime still renders)', () => {
    renderApp(makeFakeBridge(), [{ name: 'sess-no-cwd' }]);
    const footerSlot = screen.getByTestId('tile-footer-slot-sess-no-cwd');
    expect(within(footerSlot).queryByTestId('tile-footer-cwd')).toBeNull();
    // Uptime line is unconditional — footer never disappears entirely.
    expect(within(footerSlot).getByTestId('tile-footer-uptime')).toBeInTheDocument();
  });

  it('spawn-result with cwd populates TileGridSessionEntry.cwd → footer shows cwd', () => {
    const bridge = makeFakeBridge();
    renderApp(bridge);
    act(() => {
      bridge.emitSpawnResult({
        type: 'success',
        result: {
          sessionName: 'spawned-with-cwd',
          sessionId: 'spawned-with-cwd',
          panelMounted: false,
          cwd: '/tmp/repo',
        },
      });
    });
    const footerSlot = screen.getByTestId('tile-footer-slot-spawned-with-cwd');
    const cwdSpan = within(footerSlot).getByTestId('tile-footer-cwd');
    expect(cwdSpan.textContent).toBe('/tmp/repo');
    expect(cwdSpan.getAttribute('title')).toBe('/tmp/repo');
  });

  it('spawn-result WITHOUT cwd → TileGridSessionEntry.cwd stays undefined → footer omits cwd', () => {
    const bridge = makeFakeBridge();
    renderApp(bridge);
    act(() => {
      bridge.emitSpawnResult({
        type: 'success',
        result: {
          sessionName: 'spawned-no-cwd',
          sessionId: 'spawned-no-cwd',
          panelMounted: false,
          // cwd field intentionally omitted (defensive: pre-WB2 reply
          // shape or partial test fixture)
        },
      });
    });
    const footerSlot = screen.getByTestId('tile-footer-slot-spawned-no-cwd');
    expect(within(footerSlot).queryByTestId('tile-footer-cwd')).toBeNull();
    expect(within(footerSlot).getByTestId('tile-footer-uptime')).toBeInTheDocument();
  });

  it('multiple tiles each render their own footer with their session cwd', () => {
    renderApp(makeFakeBridge(), [
      { name: 'a', cwd: '/path/a' },
      { name: 'b', cwd: '/path/b' },
      { name: 'c' }, // no cwd
    ]);
    const slotA = screen.getByTestId('tile-footer-slot-a');
    const slotB = screen.getByTestId('tile-footer-slot-b');
    const slotC = screen.getByTestId('tile-footer-slot-c');
    expect(within(slotA).getByTestId('tile-footer-cwd').textContent).toBe('/path/a');
    expect(within(slotB).getByTestId('tile-footer-cwd').textContent).toBe('/path/b');
    expect(within(slotC).queryByTestId('tile-footer-cwd')).toBeNull();
    // All three render the uptime line.
    expect(within(slotA).getByTestId('tile-footer-uptime')).toBeInTheDocument();
    expect(within(slotB).getByTestId('tile-footer-uptime')).toBeInTheDocument();
    expect(within(slotC).getByTestId('tile-footer-uptime')).toBeInTheDocument();
  });
});
