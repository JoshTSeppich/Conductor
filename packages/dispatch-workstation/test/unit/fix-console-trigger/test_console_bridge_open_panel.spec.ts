// Fix-C / cairn finding #82 — Cluster 2 RED.
//
// Adds consoleBridge.openPanel(sessionName) so a renderer-driven path
// can trigger a CC-console panel open. The native menu trigger
// (closed by the menu-subscription cluster) is the primary surface;
// this bridge method exists for the optional renderer-side surfaces
// (per-card "Open console" button, future spawn-auto-mount, etc.) and
// for parity-with-design from the finding-#82 recommendation block.
//
// IPC seam (KNOWN — code-confirmed at console-ipc.ts:429-432 on
// branch fix-C/console-panel-trigger HEAD b0fe707):
//
//   ipc.handle('console:open-panel', async (_event, payload: unknown) => {
//     const p = payload as { sessionName: string };
//     await controller.openConsolePanel(p.sessionName);
//   });
//
// So the bridge method translates 1-to-1: openPanel(sessionId) →
// ipc.invoke('console:open-panel', {sessionName: sessionId}).
//
// RED state: ConsoleBridge surface (console-bridge.ts:58-66) does not
// declare openPanel; makeConsoleBridge factory (console-bridge.ts:78-90)
// does not return one. Importing { ConsoleBridge } and accessing
// .openPanel succeeds at the type level only because TypeScript erases;
// at runtime, bridge.openPanel is undefined → test fails on `typeof`
// assertion + invokeCalls assertion.
import { describe, it, expect, vi } from 'vitest';
import {
  makeConsoleBridge,
  type ConsoleBridgeIpc,
} from '../../../src/main/console-bridge.js';

interface InvokeCall {
  channel: string;
  args: unknown[];
}

function makeFakeIpc(): {
  ipc: ConsoleBridgeIpc;
  invokeCalls: InvokeCall[];
  setInvokeResult(result: unknown): void;
} {
  const invokeCalls: InvokeCall[] = [];
  let invokeResult: unknown = undefined;
  const ipc: ConsoleBridgeIpc = {
    invoke: vi.fn(async (channel: string, ...args: unknown[]) => {
      invokeCalls.push({ channel, args });
      return invokeResult;
    }),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
  return {
    ipc,
    invokeCalls,
    setInvokeResult(result) {
      invokeResult = result;
    },
  };
}

describe('Fix-C #82 — consoleBridge.openPanel', () => {
  it('exposes openPanel as a function on the bridge surface', () => {
    const { ipc } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    // RED state: bridge.openPanel is undefined → typeof === 'undefined'.
    expect(typeof (bridge as unknown as { openPanel?: unknown }).openPanel).toBe(
      'function',
    );
  });

  it('openPanel(sessionId) invokes "console:open-panel" with {sessionName}', async () => {
    const { ipc, invokeCalls } = makeFakeIpc();
    const bridge = makeConsoleBridge(ipc);

    await (bridge as unknown as {
      openPanel: (s: string) => Promise<void>;
    }).openPanel('alpha');

    expect(invokeCalls).toEqual([
      {
        channel: 'console:open-panel',
        args: [{ sessionName: 'alpha' }],
      },
    ]);
  });

  it('openPanel returns a Promise that resolves when IPC resolves', async () => {
    const harness = makeFakeIpc();
    harness.setInvokeResult(undefined);
    const bridge = makeConsoleBridge(harness.ipc);

    const result = (bridge as unknown as {
      openPanel: (s: string) => unknown;
    }).openPanel('beta');

    expect(result).toBeInstanceOf(Promise);
    await expect(result as Promise<unknown>).resolves.toBeUndefined();
  });

  it('openPanel propagates rejection from IPC (e.g. PanelCapExceeded)', async () => {
    const invokeCalls: InvokeCall[] = [];
    const ipc: ConsoleBridgeIpc = {
      invoke: vi.fn(async (channel: string, ...args: unknown[]) => {
        invokeCalls.push({ channel, args });
        throw new Error('PanelCapExceeded: console panel cap (4) reached');
      }),
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    };
    const bridge = makeConsoleBridge(ipc);

    await expect(
      (bridge as unknown as {
        openPanel: (s: string) => Promise<void>;
      }).openPanel('gamma'),
    ).rejects.toThrow(/PanelCapExceeded/);
    expect(invokeCalls).toHaveLength(1);
    expect(invokeCalls[0].channel).toBe('console:open-panel');
  });
});
