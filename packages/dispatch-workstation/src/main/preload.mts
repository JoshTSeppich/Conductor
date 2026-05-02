import { contextBridge, ipcRenderer } from 'electron';

// Pattern B (RESOLUTION-3 operator 2026-04-30): renderer calls window.coarchitectBridge.*,
// main-process handlers in coarchitect-ipc.ts relay to stub DaemonClient (Round 2).
// Real /v3/* wiring deferred to COARCH-T03.
contextBridge.exposeInMainWorld('coarchitectBridge', {
  fetchHistory: () => ipcRenderer.invoke('coarchitect:fetchHistory'),
  postMessage: (msg: unknown) => ipcRenderer.invoke('coarchitect:postMessage', msg),
});

// Shell bridge for wrapper layout plumbing (splitter state persistence).
contextBridge.exposeInMainWorld('shellBridge', {
  getSplitterPos: () => ipcRenderer.invoke('shell:getSplitterPos'),
  saveSplitterPos: (pos: number) => ipcRenderer.invoke('shell:saveSplitterPos', pos),
});

// MB-T04: spawn-from-UI bridge. openRepoDialog opens native directory picker
// and returns selected path (or null on cancel). requestSpawn fires the
// 'workstation:spawn-requested' IPC event consumed by spawn-ipc.ts; payload
// shape per WORKSTATION_CONTRACT.md §3.3 spawn-new-session target = repo
// path + session name (initial prompt deferred to MB-T05+).
contextBridge.exposeInMainWorld('workstationBridge', {
  openRepoDialog: () => ipcRenderer.invoke('workstation:open-repo-dialog'),
  requestSpawn: (payload: { repoPath: string; sessionName: string }) =>
    ipcRenderer.send('workstation:spawn-requested', payload),
});
