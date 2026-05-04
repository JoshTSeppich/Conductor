// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — F1 unit specs.
//
// WORKSTATION_CONTRACT.md §6.2: webview→shell IPC for orchestrator card
// operator responses. Shell-side handlers in card-ipc.ts (frozen at
// b45b93b) listen on `card:approved`, `card:declined`, and
// `card:multi-choice-selected`. The webview side (where the kanban
// dispatch-web React app lives) reaches main-process IPC via
// `window.cardBridge.emitCardApproved(...)` etc., which a webview-scoped
// preload script exposes via contextBridge.
//
// makeCardBridge is a pure factory of the bridge object so the channel
// names + payload pass-through can be unit-tested without booting
// Electron. The actual contextBridge.exposeInMainWorld call lives in
// card-bridge-preload.mts (the esbuild entry that builds to
// dist/main/card-bridge.cjs).
//
// Channel-name choice rationale: coord file §4.3 — the brief said
// `workstation:card-*` but card-ipc.ts is frozen at `card:*` (MB-T07
// GREEN at b45b93b). GREEN-shipped contract wins.
//
// RED state: src/main/card-bridge.ts absent → import fails → FAIL.
// GREEN state: makeCardBridge returns three emit methods that send on
// the card-ipc.ts channels with the operator's payload pass-through.
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
}

describe('MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — makeCardBridge factory', () => {
  it('emitCardApproved fires ipc.send("card:approved", payload)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.emitCardApproved({ card_id: 'card-1', free_form_text: 'go' });
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:approved');
    expect(ipc.sends[0]?.args[0]).toEqual({
      card_id: 'card-1',
      free_form_text: 'go',
    });
  });

  it('emitCardDeclined fires ipc.send("card:declined", payload)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.emitCardDeclined({ card_id: 'card-2', reason: 'not now' });
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:declined');
    expect(ipc.sends[0]?.args[0]).toEqual({
      card_id: 'card-2',
      reason: 'not now',
    });
  });

  it('emitMultiChoiceSelected fires ipc.send("card:multi-choice-selected", payload)', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.emitMultiChoiceSelected({
      card_id: 'card-3',
      selected_index: 1,
      free_form_text: null,
    });
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:multi-choice-selected');
    expect(ipc.sends[0]?.args[0]).toEqual({
      card_id: 'card-3',
      selected_index: 1,
      free_form_text: null,
    });
  });

  it('emitMultiChoiceSelected with selected_index=-1 (free-form fallback) passes through', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    bridge.emitMultiChoiceSelected({
      card_id: 'card-4',
      selected_index: -1,
      free_form_text: 'none of the above; do X instead',
    });
    expect(ipc.sends[0]?.args[0]).toEqual({
      card_id: 'card-4',
      selected_index: -1,
      free_form_text: 'none of the above; do X instead',
    });
  });
});
