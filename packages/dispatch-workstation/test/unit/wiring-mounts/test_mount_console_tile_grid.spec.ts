// MB-F-CONSOLE-T03-SHELL-INTEGRATION — Cluster 2 RED.
//
// mountConsoleTileGrid is the main-process wiring helper that confirms
// the shell-to-console-panel bridge is set up after createWindow returns.
// In production it subscribes to ConsoleIpcController panel-state changes
// (or, equivalently, mirrors the existing emitToWebview call into a
// dedicated console-tile:show / console-tile:hide IPC channel the shell
// listens for) so the tile region's visibility tracks panel count.
//
// For v3.0 single-panel-in-shell scope (vision §10.10 ship-gate; multi-
// panel tiling deferred to MB-T12 per re-scope), the helper is intentionally
// thin: it logs a CONSOLE_TILE_GRID_MOUNTED sentinel under MB_TEST_HOOKS
// for smoke-harness validation, returns a dispose() so the lifecycle is
// explicit, and accepts injected deps so unit tests run without booting
// Electron.
//
// Acceptance criterion (followup body): "RED: test asserts mountConsoleTileGrid
// not called." Until src/main/console-mount.ts exists, import fails → FAIL.
import { describe, it, expect } from 'vitest';
import {
  mountConsoleTileGrid,
  type ConsoleMountDeps,
} from '../../../src/main/console-mount.js';

function makeDeps(overrides: Partial<ConsoleMountDeps> = {}): ConsoleMountDeps {
  return {
    onPanelOpen: () => () => {},
    onPanelClose: () => () => {},
    sendToShell: () => {},
    emitTestSentinel: () => {},
    ...overrides,
  };
}

describe('MB-F-CONSOLE-T03 — mountConsoleTileGrid factory', () => {
  it('returns a dispose function that is callable + idempotent', () => {
    const dispose = mountConsoleTileGrid(makeDeps());
    expect(typeof dispose).toBe('function');
    // Idempotent: a second call must not throw.
    expect(() => {
      dispose();
      dispose();
    }).not.toThrow();
  });

  it('subscribes to onPanelOpen and onPanelClose at mount time', () => {
    let openSubs = 0;
    let closeSubs = 0;
    mountConsoleTileGrid(
      makeDeps({
        onPanelOpen: () => {
          openSubs += 1;
          return () => {};
        },
        onPanelClose: () => {
          closeSubs += 1;
          return () => {};
        },
      }),
    );
    expect(openSubs).toBe(1);
    expect(closeSubs).toBe(1);
  });

  it('sends `console-tile:show` to the shell on first onPanelOpen fire', () => {
    let openHandler!: (sessionName: string) => void;
    const sendCalls: Array<{ channel: string; payload: unknown }> = [];

    mountConsoleTileGrid(
      makeDeps({
        onPanelOpen: (h) => {
          openHandler = h;
          return () => {};
        },
        sendToShell: (channel, payload) => {
          sendCalls.push({ channel, payload });
        },
      }),
    );

    openHandler('alpha');
    expect(sendCalls).toEqual([
      { channel: 'console-tile:show', payload: { sessionName: 'alpha' } },
    ]);
  });

  it('sends `console-tile:hide` to the shell when the last panel closes', () => {
    let openHandler!: (sessionName: string) => void;
    let closeHandler!: (sessionName: string) => void;
    const sendCalls: Array<{ channel: string; payload: unknown }> = [];

    mountConsoleTileGrid(
      makeDeps({
        onPanelOpen: (h) => {
          openHandler = h;
          return () => {};
        },
        onPanelClose: (h) => {
          closeHandler = h;
          return () => {};
        },
        sendToShell: (channel, payload) => {
          sendCalls.push({ channel, payload });
        },
      }),
    );

    openHandler('alpha');
    expect(sendCalls.at(-1)?.channel).toBe('console-tile:show');

    closeHandler('alpha');
    expect(sendCalls.at(-1)).toEqual({
      channel: 'console-tile:hide',
      payload: { sessionName: 'alpha' },
    });
  });

  it('emits CONSOLE_TILE_GRID_MOUNTED sentinel on mount (for smoke harness)', () => {
    const sentinels: string[] = [];
    mountConsoleTileGrid(
      makeDeps({
        emitTestSentinel: (s) => sentinels.push(s),
      }),
    );
    expect(sentinels).toContain('CONSOLE_TILE_GRID_MOUNTED');
  });

  it('dispose() releases both subscriptions', () => {
    let openCleanups = 0;
    let closeCleanups = 0;
    const dispose = mountConsoleTileGrid(
      makeDeps({
        onPanelOpen: () => () => {
          openCleanups += 1;
        },
        onPanelClose: () => () => {
          closeCleanups += 1;
        },
      }),
    );

    dispose();
    expect(openCleanups).toBe(1);
    expect(closeCleanups).toBe(1);
  });
});
