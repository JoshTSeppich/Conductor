// MB-T04: spawn modal IPC handlers (main process).
//
// Registers two IPC channels for the native spawn-from-UI surface:
//
//   workstation:open-repo-dialog (invoke) — opens the OS native directory
//     picker via dialog.showOpenDialog and returns the selected absolute
//     path (or null on cancel). Used by the modal's [Browse...] button as
//     the file-dialog fallback per V3_TICKETS.md L130.
//
//   workstation:spawn-requested (send/on) — fires when operator clicks
//     [Spawn] in the modal with payload { repoPath, sessionName }. MB-T04
//     ends at this event with correct payload shape; the actual tmux+claude
//     spawn + daemon registration is MB-T05's territory per V3_TICKETS.md
//     L136-142. Under MB_TEST_HOOKS=1 the handler echoes the payload as
//     JSON to stdout so MB-T04 RED tests can assert IPC roundtrip.
//
// Settings-UI-driven project list (V3_TICKETS.md MB-T11) is out of scope;
// MB-T04 ships with the file-dialog fallback only.
import { ipcMain, dialog } from 'electron';

export function registerSpawnIpcHandlers(): void {
  ipcMain.handle('workstation:open-repo-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select repository for new session',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.on('workstation:spawn-requested', (_event, payload: unknown) => {
    if (process.env.MB_TEST_HOOKS === '1') {
      try {
        process.stdout.write('SPAWN_REQUESTED ' + JSON.stringify(payload) + '\n');
      } catch {
        process.stdout.write('SPAWN_REQUESTED <serialization-error>\n');
      }
    }
  });
}
