// MB-T07 Phase 2 — WB1-1 RED: shell-side CardBridge subscribe surface.
//
// The web-side CardBridge interface (packages/dispatch-web/src/orchestrator-
// cards/card-ipc-bridge.ts:63-70) declares onCardRendered, onCardSuperseded,
// and onCardUpdate alongside approve/decline/multiChoiceSelect. The shell
// factory at this point only emits — it does not expose subscribe-side
// methods, so the existing useOrchestratorCards hook in dispatch-web sees
// undefined for bridge.onCardRendered at runtime and crashes (or silently
// fails if guarded). Phase 1 §G2 documented this gap.
//
// This RED asserts the post-alignment surface:
//   - makeCardBridge(ipc) exposes onCardRendered, onCardSuperseded, onCardUpdate
//   - each registers a listener via ipc.on(channel, listener)
//   - each returns a cleanup that calls ipc.removeListener(channel, listener)
//   - channels match the WORKSTATION_CONTRACT.md §7.1 Shell→Webview names
//
// Per operator arbitration A7, bridge-interface alignment is part of MB-T07
// GREEN. The factory rename (emit*→approve/decline/multiChoiceSelect) is
// covered by updating the existing test_card_bridge_factory.spec.ts in the
// same GREEN commit.
import { describe, it, expect, vi } from 'vitest';
import { makeCardBridge, type CardBridgeIpc } from '../../../src/main/card-bridge.js';

class CaptureIpc implements CardBridgeIpc {
  public sends: Array<{ channel: string; args: unknown[] }> = [];
  public listeners: Array<{
    channel: string;
    listener: (event: unknown, payload: unknown) => void;
  }> = [];
  public removed: Array<{
    channel: string;
    listener: (event: unknown, payload: unknown) => void;
  }> = [];
  send(channel: string, ...args: unknown[]): void {
    this.sends.push({ channel, args });
  }
  on(
    channel: string,
    listener: (event: unknown, payload: unknown) => void,
  ): void {
    this.listeners.push({ channel, listener });
  }
  removeListener(
    channel: string,
    listener: (event: unknown, payload: unknown) => void,
  ): void {
    this.removed.push({ channel, listener });
  }
}

describe('MB-T07 WB1-1 — makeCardBridge subscribe-side surface', () => {
  it('exposes onCardRendered as a function', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    expect(typeof bridge.onCardRendered).toBe('function');
  });

  it('exposes onCardSuperseded as a function', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    expect(typeof bridge.onCardSuperseded).toBe('function');
  });

  it('exposes onCardUpdate as a function', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    expect(typeof bridge.onCardUpdate).toBe('function');
  });

  it('onCardRendered registers handler on ipc.on for "orchestrator-card-rendered"', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const handler = vi.fn();
    bridge.onCardRendered(handler);
    expect(ipc.listeners).toHaveLength(1);
    expect(ipc.listeners[0]?.channel).toBe('orchestrator-card-rendered');
  });

  it('onCardSuperseded registers handler on ipc.on for "orchestrator-card-superseded"', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.onCardSuperseded(vi.fn());
    expect(ipc.listeners[0]?.channel).toBe('orchestrator-card-superseded');
  });

  it('onCardUpdate registers handler on ipc.on for "orchestrator-card-update"', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.onCardUpdate(vi.fn());
    expect(ipc.listeners[0]?.channel).toBe('orchestrator-card-update');
  });

  it('onCardRendered passes the operator handler the unwrapped payload (drops the ipc event arg)', () => {
    // ipcRenderer.on listeners receive (event, ...args). The web-side
    // useOrchestratorCards hook expects onCardRendered's handler to receive
    // just the payload — so the bridge unwraps the ipc event before
    // forwarding. Asserting this is the contract the web-side reducer relies
    // on (see card-state.ts:35-39 'rendered' action shape).
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const operatorHandler = vi.fn();
    bridge.onCardRendered(operatorHandler);
    const ipcListener = ipc.listeners[0]!.listener;
    const payload = {
      type: 'orchestrator-card-rendered' as const,
      card_id: 'card-1',
      card: { type: 'card', action: 'send' },
    };
    ipcListener({ /* opaque ipc event */ }, payload);
    expect(operatorHandler).toHaveBeenCalledWith(payload);
  });

  it('onCardRendered cleanup calls ipc.removeListener with the same listener it registered', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const cleanup = bridge.onCardRendered(vi.fn());
    expect(ipc.removed).toHaveLength(0);
    cleanup();
    expect(ipc.removed).toHaveLength(1);
    expect(ipc.removed[0]?.channel).toBe('orchestrator-card-rendered');
    // Same listener reference passed on both register and remove paths so
    // ipcRenderer.removeListener actually unregisters it.
    expect(ipc.removed[0]?.listener).toBe(ipc.listeners[0]?.listener);
  });

  it('onCardSuperseded cleanup unregisters the right channel', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const cleanup = bridge.onCardSuperseded(vi.fn());
    cleanup();
    expect(ipc.removed[0]?.channel).toBe('orchestrator-card-superseded');
  });

  it('onCardUpdate cleanup unregisters the right channel', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const cleanup = bridge.onCardUpdate(vi.fn());
    cleanup();
    expect(ipc.removed[0]?.channel).toBe('orchestrator-card-update');
  });
});
