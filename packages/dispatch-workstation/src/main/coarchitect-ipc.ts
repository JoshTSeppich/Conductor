import { ipcMain } from 'electron';
import { createStubDaemonClient } from '../coarchitect/daemon-client.js';
import { readSplitterPosition, writeSplitterPosition } from './splitter-state.js';

// Shared stub client instance for the session lifetime.
// Round 2: stub only. Real /v3/* wiring deferred to COARCH-T03.
const client = createStubDaemonClient();

export function registerIpcHandlers(): void {
  ipcMain.handle('coarchitect:fetchHistory', async () => {
    return client.fetchHistory();
  });

  ipcMain.handle('coarchitect:postMessage', async (_event, msg: unknown) => {
    return client.postMessage(msg as Parameters<typeof client.postMessage>[0]);
  });

  ipcMain.handle('shell:getSplitterPos', () => {
    return readSplitterPosition();
  });

  ipcMain.handle('shell:saveSplitterPos', (_event, pos: unknown) => {
    if (typeof pos === 'number' && pos > 0) {
      writeSplitterPosition(pos);
    }
  });
}
