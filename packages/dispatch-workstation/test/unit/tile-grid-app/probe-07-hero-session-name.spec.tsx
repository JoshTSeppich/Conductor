// @vitest-environment happy-dom
//
// MB-T19 WB4 probe-07 — TileGridApp heroSessionName passthrough.
//
// Verifies that:
//   - heroSessionName prop on TileGridApp is passed through to
//     <TileGrid>, observable via the data-hero-mode attribute on
//     tile-grid-root (set by TileGrid in WB3).
//   - Default (prop absent / null / undefined): TileGrid receives null
//     and renders uniform mode.
//   - Matching prop: hero mode activates.
//   - Non-matching prop: TileGrid handles the missing-session case
//     and falls back to uniform mode.
//   - heroSessionName persists through spawn-result events (the
//     prop is render-time read-only; spawning a new session doesn't
//     reset hero designation).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function noop(): void {
  /* noop */
}

function makeBridge(): WorkstationBridgeShape & {
  __spawnHandlers: Array<(reply: unknown) => void>;
} {
  const handlers: Array<(reply: unknown) => void> = [];
  return {
    onSpawnResult: (cb) => {
      handlers.push(cb);
      return () => {
        const idx = handlers.indexOf(cb);
        if (idx >= 0) handlers.splice(idx, 1);
      };
    },
    __spawnHandlers: handlers,
  };
}

function renderApp(
  props: Partial<React.ComponentProps<typeof TileGridApp>> = {},
): { bridge: ReturnType<typeof makeBridge> } {
  const bridge = makeBridge();
  const consoleBridge = makeFakeConsoleBridge().bridge;
  render(
    <TileGridApp
      workstationBridge={bridge}
      consoleBridge={consoleBridge}
      createTerminal={() => makeFakeTerminalAdapter()}
      initialSessions={[{ name: 'a' }, { name: 'b' }, { name: 'c' }]}
      {...props}
    />,
  );
  return { bridge };
}

describe('MB-T19 WB4 — TileGridApp heroSessionName passthrough', () => {
  it('without heroSessionName prop: TileGrid renders uniform mode', () => {
    renderApp();
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName=null: TileGrid renders uniform mode', () => {
    renderApp({ heroSessionName: null });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName=undefined: TileGrid renders uniform mode', () => {
    renderApp({ heroSessionName: undefined });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('heroSessionName matching an initial session: hero mode active', () => {
    renderApp({ heroSessionName: 'b' });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
  });

  it('heroSessionName non-matching: TileGrid falls back to uniform mode', () => {
    renderApp({ heroSessionName: 'nonexistent' });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('false');
  });

  it('hero designation survives a spawn-result auto-mount', async () => {
    const { bridge } = renderApp({ heroSessionName: 'b' });
    let root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
    expect(root.getAttribute('data-tile-count')).toBe('3');

    // Fire spawn-result for a new session 'd'. tile count grows to 4;
    // heroSessionName stays 'b'.
    await act(async () => {
      bridge.__spawnHandlers.forEach((h) =>
        h({ type: 'success', result: { sessionName: 'd' } }),
      );
    });

    root = screen.getByTestId('tile-grid-root');
    expect(root.getAttribute('data-tile-count')).toBe('4');
    expect(root.getAttribute('data-hero-mode')).toBe('true');
  });

  it('hero applies layout: gridTemplateRows = "75% 25%" when active', () => {
    renderApp({ heroSessionName: 'a' });
    const root = screen.getByTestId('tile-grid-root');
    expect(root.style.gridTemplateRows).toBe('75% 25%');
  });

  // Suppress unused-imports for noop helper retained for fixture parity
  // with sibling probes.
  void noop;
});
