// MB-F-MB-T07-MAIN-IPC-WIRING — F2 unit specs.
//
// main.ts's sentinel-marked region calls a single helper `wireCardIpc`
// (Session C-pattern: extract-and-call so main.ts edit stays narrow + the
// composition logic is unit-testable without booting Electron).
//
// wireCardIpc composes the deps registerCardIpcHandlers needs:
// - daemonClient: imported singleton from coarchitect-ipc.ts (refactored
//   to `export` in commit ab6576f)
// - cardContext: cardContextCache singleton from card-context-cache.ts
//   (frozen by F4 GREEN at e933498)
// - ipcOn: injected by caller; production passes
//   `(ch, l) => ipcMain.on(ch, l)`; tests pass a capture fn
//
// Field name `cardContext` (not `contextLookup`) per coord §4.1.
// `ipcOn` required per coord §4.2.
//
// Per coord §4.3: card-ipc.ts listens on `card:approved`,
// `card:declined`, `card:multi-choice-selected` (frozen MB-T07 GREEN at
// b45b93b). wireCardIpc must register exactly those three channels.
//
// RED state: src/main/card-wiring.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { wireCardIpc } from '../../../src/main/card-wiring.js';

function captureChannels(): {
  channels: string[];
  ipcOn: (
    channel: string,
    listener: (event: unknown, payload: unknown) => Promise<void> | void,
  ) => void;
} {
  const channels: string[] = [];
  return {
    channels,
    ipcOn: (channel) => {
      channels.push(channel);
    },
  };
}

describe('MB-F-MB-T07-MAIN-IPC-WIRING — wireCardIpc', () => {
  it('registers card:approved handler on the injected ipcOn', () => {
    const cap = captureChannels();
    wireCardIpc({ ipcOn: cap.ipcOn });
    expect(cap.channels).toContain('card:approved');
  });

  it('registers card:declined handler', () => {
    const cap = captureChannels();
    wireCardIpc({ ipcOn: cap.ipcOn });
    expect(cap.channels).toContain('card:declined');
  });

  it('registers card:multi-choice-selected handler', () => {
    const cap = captureChannels();
    wireCardIpc({ ipcOn: cap.ipcOn });
    expect(cap.channels).toContain('card:multi-choice-selected');
  });

  it('registers exactly the three card:* handlers (no extras, no missing)', () => {
    const cap = captureChannels();
    wireCardIpc({ ipcOn: cap.ipcOn });
    expect(cap.channels.slice().sort()).toEqual([
      'card:approved',
      'card:declined',
      'card:multi-choice-selected',
    ]);
  });
});
