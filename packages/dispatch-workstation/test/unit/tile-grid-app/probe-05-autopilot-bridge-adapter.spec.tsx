// @vitest-environment happy-dom
//
// MB-T17 WB4 probe-05 — TileGridApp autopilot-bridge adapter integration.
//
// Verifies that:
//   - When workstationBridge has BOTH getSessionAutopilotEnabled +
//     setSessionAutopilotEnabled: TileGridApp constructs the slim
//     TileAutopilotToggleBridge adapter and passes it to each tile's
//     TileAutopilotToggle → toggle renders 'ready' state after fetch.
//   - When EITHER method is missing: adapter is null, toggle renders
//     'unavailable' state (Q-MBT17-2=a).
//   - The bridge adapter is keyed by sessionName (each tile gets its
//     own toggle fetch).

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function noop(): void {
  /* noop */
}

function makeBaseBridge(): WorkstationBridgeShape {
  return {
    onSpawnResult: () => noop,
  };
}

function makeBridgeWithAutopilotMethods(
  overrides: {
    get?: (name: string) => Promise<{ enabled: boolean }>;
    set?: (name: string, enabled: boolean) => Promise<{ enabled: boolean }>;
  } = {},
): WorkstationBridgeShape {
  return {
    onSpawnResult: () => noop,
    getSessionAutopilotEnabled:
      overrides.get ?? ((_name: string) => Promise.resolve({ enabled: false })),
    setSessionAutopilotEnabled:
      overrides.set ??
      ((_name: string, enabled: boolean) => Promise.resolve({ enabled })),
  };
}

function renderApp(
  bridge: WorkstationBridgeShape,
  initialSessions: { name: string }[] = [{ name: 'sess-x' }],
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

describe('MB-T17 WB4 — TileGridApp autopilot-bridge adapter (Q-MBT17-2=a + Q-MBT17-6=a)', () => {
  it('with both bridge methods: toggle renders inside the autopilot slot in ready state', async () => {
    renderApp(makeBridgeWithAutopilotMethods());
    await waitFor(() => {
      const toggle = screen.getByTestId('tile-autopilot-toggle');
      expect(toggle.getAttribute('data-state')).toBe('ready');
    });
  });

  it('with only getSessionAutopilotEnabled: adapter is null → toggle renders unavailable', () => {
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => noop,
      getSessionAutopilotEnabled: () => Promise.resolve({ enabled: false }),
      // setSessionAutopilotEnabled intentionally omitted
    };
    renderApp(bridge);
    const toggle = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(toggle.getAttribute('data-state')).toBe('unavailable');
    expect(toggle.disabled).toBe(true);
  });

  it('with only setSessionAutopilotEnabled: adapter is null → toggle renders unavailable', () => {
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => noop,
      // getSessionAutopilotEnabled intentionally omitted
      setSessionAutopilotEnabled: (_name, enabled) =>
        Promise.resolve({ enabled }),
    };
    renderApp(bridge);
    const toggle = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(toggle.getAttribute('data-state')).toBe('unavailable');
    expect(toggle.disabled).toBe(true);
  });

  it('with neither bridge method: toggle renders unavailable', () => {
    renderApp(makeBaseBridge());
    const toggle = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(toggle.getAttribute('data-state')).toBe('unavailable');
    expect(toggle.disabled).toBe(true);
  });

  it('bridge methods called with correct sessionName (per-tile keying)', async () => {
    const get = vi.fn((name: string) => Promise.resolve({ enabled: name === 'sess-a' }));
    renderApp(
      makeBridgeWithAutopilotMethods({ get }),
      [{ name: 'sess-a' }, { name: 'sess-b' }],
    );
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('sess-a');
      expect(get).toHaveBeenCalledWith('sess-b');
    });
  });

  it('multiple tiles each get their own toggle (keyed by sessionName)', async () => {
    renderApp(makeBridgeWithAutopilotMethods(), [
      { name: 'a' },
      { name: 'b' },
      { name: 'c' },
    ]);
    await waitFor(() => {
      const toggles = screen.getAllByTestId('tile-autopilot-toggle');
      expect(toggles).toHaveLength(3);
      toggles.forEach((t) => {
        expect(t.getAttribute('data-state')).toBe('ready');
      });
    });
  });
});
