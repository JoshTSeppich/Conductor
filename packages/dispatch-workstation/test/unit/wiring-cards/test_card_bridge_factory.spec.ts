// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — F1 unit specs.
//
// WORKSTATION_CONTRACT.md §6.2: webview→shell IPC for orchestrator card
// operator responses. Shell-side handlers in card-ipc.ts (frozen at
// b45b93b) listen on `card:approved`, `card:declined`, and
// `card:multi-choice-selected`. The webview side (where the kanban
// dispatch-web React app lives) reaches main-process IPC via
// `window.cardBridge.approve(...)` etc., which a webview-scoped
// preload script exposes via contextBridge.
//
// makeCardBridge is a pure factory of the bridge object so the channel
// names + payload pass-through can be unit-tested without booting
// Electron. The actual contextBridge.exposeInMainWorld call lives in
// card-bridge-preload.mts.
//
// Channel-name choice rationale: coord file §4.3 — the brief said
// `workstation:card-*` but card-ipc.ts is frozen at `card:*` (MB-T07
// GREEN at b45b93b). GREEN-shipped contract wins.
//
// Method-name choice rationale (MB-T07 Phase 2 WB1 alignment, operator
// A7): the bridge exposes approve/decline/multiChoiceSelect (not
// emitCardApproved/etc) to match the web-side CardBridge interface
// at packages/dispatch-web/src/orchestrator-cards/card-ipc-bridge.ts:63-70.
//
// Wire envelope shape: payload pass-through is verbatim — type +
// card_id + timestamp + content fields all flow from web emit helper
// to ipc.send unchanged.
import { describe, it, expect } from 'vitest';
import {
  makeCardBridge,
  type CardBridgeIpc,
} from '../../../src/main/card-bridge.js';

class CaptureIpc implements CardBridgeIpc {
  public sends: Array<{ channel: string; args: unknown[] }> = [];
  send(channel: string, ...args: unknown[]): void {
    this.sends.push({ channel, args });
  }
  on(): void {
    /* not exercised in emit-side specs */
  }
  removeListener(): void {
    /* not exercised in emit-side specs */
  }
}

describe('MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — makeCardBridge factory', () => {
  it('approve fires ipc.send("card:approved", envelope)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const envelope = {
      type: 'card-approved' as const,
      card_id: 'card-1',
      free_form_text: 'go',
      timestamp: '2026-05-05T12:00:00.000Z',
    };
    bridge.approve(envelope);
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:approved');
    expect(ipc.sends[0]?.args[0]).toEqual(envelope);
  });

  it('decline fires ipc.send("card:declined", envelope)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const envelope = {
      type: 'card-declined' as const,
      card_id: 'card-2',
      reason: 'not now',
      timestamp: '2026-05-05T12:00:00.000Z',
    };
    bridge.decline(envelope);
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:declined');
    expect(ipc.sends[0]?.args[0]).toEqual(envelope);
  });

  it('multiChoiceSelect fires ipc.send("card:multi-choice-selected", envelope)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const envelope = {
      type: 'multi-choice-selected' as const,
      card_id: 'card-3',
      selected_index: 1,
      free_form_text: null,
      timestamp: '2026-05-05T12:00:00.000Z',
    };
    bridge.multiChoiceSelect(envelope);
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:multi-choice-selected');
    expect(ipc.sends[0]?.args[0]).toEqual(envelope);
  });

  it('multiChoiceSelect with free-form fallback envelope passes through verbatim', () => {
    // The web-side card-ipc-bridge.ts:125 clamps the renderer's -1
    // sentinel to 0 BEFORE calling bridge.multiChoiceSelect, so the
    // bridge never sees -1 in production. This spec exercises the
    // post-clamp envelope (selected_index=0 + non-null free_form_text)
    // to assert the bridge is a faithful pass-through.
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const envelope = {
      type: 'multi-choice-selected' as const,
      card_id: 'card-4',
      selected_index: 0,
      free_form_text: 'none of the above; do X instead',
      timestamp: '2026-05-05T12:00:00.000Z',
    };
    bridge.multiChoiceSelect(envelope);
    expect(ipc.sends[0]?.args[0]).toEqual(envelope);
  });
});
