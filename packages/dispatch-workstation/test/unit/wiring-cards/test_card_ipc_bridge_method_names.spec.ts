// MB-T07 Phase 2 — WB1-2 RED: shell-side CardBridge emit method naming.
//
// The web-side card-ipc-bridge.ts (packages/dispatch-web/src/orchestrator-
// cards/card-ipc-bridge.ts:87-133) routes operator clicks via
// `bridge.approve(...)`, `bridge.decline(...)`, `bridge.multiChoiceSelect(...)`.
// Phase 1 §G1 documented that the shell-side makeCardBridge returns
// `emitCardApproved/emitCardDeclined/emitMultiChoiceSelected` instead, so
// in production every operator click is a TypeError because
// `cardBridge.approve` is undefined.
//
// Per operator A7 the rename direction is web→shell (the web-side has the
// bigger consumer surface — five spec files plus the React component
// onClick handlers — and renaming there would touch more files; renaming
// shell-side is the minimum-LOC alignment).
//
// This RED asserts the post-rename shell shape: the bridge object exposes
// canonical names `approve/decline/multiChoiceSelect` and they route to
// the existing card:* IPC channels (`card-ipc.ts:193,209,220` frozen
// MB-T07 GREEN at b45b93b — channel names DO NOT change).
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
    /* not exercised here */
  }
  removeListener(): void {
    /* not exercised here */
  }
}

describe('MB-T07 WB1-2 — shell makeCardBridge canonical method names', () => {
  it('exposes approve (not emitCardApproved) per web-side card-ipc-bridge.ts', () => {
    const bridge = makeCardBridge(new CaptureIpc());
    expect(typeof (bridge as { approve?: unknown }).approve).toBe('function');
  });

  it('exposes decline (not emitCardDeclined) per web-side card-ipc-bridge.ts', () => {
    const bridge = makeCardBridge(new CaptureIpc());
    expect(typeof (bridge as { decline?: unknown }).decline).toBe('function');
  });

  it('exposes multiChoiceSelect (not emitMultiChoiceSelected) per web-side card-ipc-bridge.ts', () => {
    const bridge = makeCardBridge(new CaptureIpc());
    expect(
      typeof (bridge as { multiChoiceSelect?: unknown }).multiChoiceSelect,
    ).toBe('function');
  });

  it('approve fires ipc.send("card:approved") — channel name unchanged from b45b93b', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    (bridge as unknown as { approve: (p: unknown) => void }).approve({
      type: 'card-approved',
      card_id: 'card-1',
      free_form_text: 'go',
      timestamp: '2026-05-05T12:00:00.000Z',
    });
    expect(ipc.sends).toHaveLength(1);
    expect(ipc.sends[0]?.channel).toBe('card:approved');
  });

  it('decline fires ipc.send("card:declined") — channel name unchanged', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    (bridge as unknown as { decline: (p: unknown) => void }).decline({
      type: 'card-declined',
      card_id: 'card-1',
      reason: 'not now',
      timestamp: '2026-05-05T12:00:00.000Z',
    });
    expect(ipc.sends[0]?.channel).toBe('card:declined');
  });

  it('multiChoiceSelect fires ipc.send("card:multi-choice-selected") — channel name unchanged', () => {
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    (
      bridge as unknown as { multiChoiceSelect: (p: unknown) => void }
    ).multiChoiceSelect({
      type: 'multi-choice-selected',
      card_id: 'mc-1',
      selected_index: 1,
      free_form_text: null,
      timestamp: '2026-05-05T12:00:00.000Z',
    });
    expect(ipc.sends[0]?.channel).toBe('card:multi-choice-selected');
  });

  it('payload pass-through: shell forwards the web-side envelope verbatim (type + timestamp included)', () => {
    // Wire envelope shape comes from card-ipc-bridge.ts:41-59 (WebviewToShell).
    // The shell's card-ipc.ts handler reads card_id and free_form_text/reason
    // from the payload and ignores the surrounding envelope fields, so the
    // bridge is a faithful pass-through — no field stripping at this layer.
    const ipc = new CaptureIpc();
    const bridge = makeCardBridge(ipc);
    const envelope = {
      type: 'card-approved' as const,
      card_id: 'card-1',
      free_form_text: 'modified prompt',
      timestamp: '2026-05-05T12:00:00.000Z',
    };
    (bridge as unknown as { approve: (p: unknown) => void }).approve(envelope);
    expect(ipc.sends[0]?.args[0]).toEqual(envelope);
  });
});
