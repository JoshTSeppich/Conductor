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
