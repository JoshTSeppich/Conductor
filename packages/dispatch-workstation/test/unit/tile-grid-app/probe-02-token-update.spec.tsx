// @vitest-environment happy-dom
//
// §C.5 WB3 red — TileGridApp onTileTokenUpdate subscription
//   - workstationBridge.onTileTokenUpdate fires → session tokensUsed updates
//   - tile-header-token-meter title reflects updated count
//   - update for unknown sessionName is a no-op (no crash)
//   - cleanup on unmount

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fake bridge with onTileTokenUpdate ──────────────────────────────────────

interface FakeWorkstationBridge extends WorkstationBridgeShape {
  emitSpawnResult: (reply: unknown) => void;
  emitTokenUpdate: (payload: { sessionName: string; tokensUsed: number }) => void;
}

function makeFakeBridge(): FakeWorkstationBridge {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  const tokenHandlers = new Set<(payload: { sessionName: string; tokensUsed: number }) => void>();

  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => { spawnHandlers.delete(cb); };
    },
    onTileTokenUpdate: (cb) => {
      tokenHandlers.add(cb);
      return () => { tokenHandlers.delete(cb); };
    },
    emitSpawnResult: (reply) => { spawnHandlers.forEach((h) => h(reply)); },
    emitTokenUpdate: (payload) => { tokenHandlers.forEach((h) => h(payload)); },
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeBridge(),
    console: makeFakeConsoleBridge(),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('§C.5 TileGridApp — onTileTokenUpdate wiring', () => {
  it('token update for a session updates tile-header-token-meter title', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a', model: 'claude-sonnet-4-6' }]}
      />,
    );

    const meterBefore = within(screen.getByTestId('tile-cell-sess-a')).getByTestId(
      'tile-header-token-meter',
    );
    // Before update: tokensUsed defaults to 0
    expect(meterBefore.title).toContain('0');

    act(() => {
      f.workstation.emitTokenUpdate({ sessionName: 'sess-a', tokensUsed: 24220 });
    });

    const meterAfter = within(screen.getByTestId('tile-cell-sess-a')).getByTestId(
      'tile-header-token-meter',
    );
    expect(meterAfter.title).toContain('24,220');
  });

  it('token update for a different session does not affect other sessions', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[
          { name: 'sess-a', model: 'claude-sonnet-4-6' },
          { name: 'sess-b', model: 'claude-opus-4-7' },
        ]}
      />,
    );

    act(() => {
      f.workstation.emitTokenUpdate({ sessionName: 'sess-a', tokensUsed: 50000 });
    });

    const meterA = within(screen.getByTestId('tile-cell-sess-a')).getByTestId(
      'tile-header-token-meter',
    );
    const meterB = within(screen.getByTestId('tile-cell-sess-b')).getByTestId(
      'tile-header-token-meter',
    );
    expect(meterA.title).toContain('50,000');
    expect(meterB.title).toContain('0'); // sess-b unchanged
  });

  it('token update for unknown sessionName is a no-op (no crash)', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );

    expect(() =>
      act(() => {
        f.workstation.emitTokenUpdate({ sessionName: 'does-not-exist', tokensUsed: 9999 });
      }),
    ).not.toThrow();

    // sess-a meter is unchanged
    const meter = within(screen.getByTestId('tile-cell-sess-a')).getByTestId(
      'tile-header-token-meter',
    );
    expect(meter.title).toContain('0');
  });

  it('multiple sequential updates reflect the latest count', () => {
    const f = makeFixtures();
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );

    act(() => { f.workstation.emitTokenUpdate({ sessionName: 'sess-a', tokensUsed: 1000 }); });
    act(() => { f.workstation.emitTokenUpdate({ sessionName: 'sess-a', tokensUsed: 24220 }); });

    const meter = within(screen.getByTestId('tile-cell-sess-a')).getByTestId(
      'tile-header-token-meter',
    );
    expect(meter.title).toContain('24,220');
    expect(meter.title).not.toContain('1,000');
  });
});
