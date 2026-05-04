// MB-F-#83 — workstationBridge.onSpawnResult listener helper.
//
// Pure helper extracted from preload.mts so the listener-registration logic
// is unit-testable without booting Electron (no vi.mock('electron')
// precedent in the workstation test suite). Runtime contract mirrors the
// coarchitectBridge.onStream* pattern in preload.mts (inline ipcRenderer.on
// + closure + cleanup-fn return). preload.mts wires it inline within the
// workstationBridge object literal:
//
//   onSpawnResult: (cb) => attachSpawnResultListener(ipcRenderer, cb)
//
// Channel name 'workstation:spawn-result' matches the emit site in
// spawn-ipc.ts:297 / :308.

export interface SpawnResultIpc {
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ): void;
}

export type SpawnResultCleanup = () => void;

export function attachSpawnResultListener<T>(
  ipc: SpawnResultIpc,
  cb: (reply: T) => void,
): SpawnResultCleanup {
  const wrapped = (_event: unknown, reply: unknown): void => cb(reply as T);
  ipc.on('workstation:spawn-result', wrapped);
  return () => ipc.removeListener('workstation:spawn-result', wrapped);
}
