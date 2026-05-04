// MB-F-MB-T07-MAIN-IPC-WIRING — F2 wrapper called from main.ts.
//
// main.ts calls wireCardIpc({ ipcOn: ... }) inside the sentinel-marked
// region. This wrapper composes the deps registerCardIpcHandlers needs
// (daemonClient + cardContextCache + ipcOn) and keeps main.ts ownership
// narrow per coordination scaffold §2.2 rebase-contention discipline.
// Mirrors Session C's onboarding-mount.ts extract-and-call pattern
// (committed at b74954b).
//
// Dep field names match the GREEN-frozen CardIpcDeps interface in
// card-ipc.ts:47-59 (per coord §4.1: `cardContext` not `contextLookup`;
// per coord §4.2: `ipcOn` required, no default).

import { daemonClient } from './coarchitect-ipc.js';
import { cardContextCache } from './card-context-cache.js';
import { registerCardIpcHandlers } from './card-ipc.js';

export interface WireCardIpcDeps {
  ipcOn: (
    channel: string,
    listener: (event: unknown, payload: unknown) => Promise<void> | void,
  ) => void;
}

export function wireCardIpc(deps: WireCardIpcDeps): void {
  registerCardIpcHandlers({
    daemonClient,
    cardContext: cardContextCache,
    ipcOn: deps.ipcOn,
  });
}
