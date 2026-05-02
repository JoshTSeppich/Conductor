import { contextBridge, ipcRenderer } from 'electron';

// COARCH-T03: streaming bridge methods added (sendAndStream, onStreamChunk/Done/Error).
contextBridge.exposeInMainWorld('coarchitectBridge', {
  fetchHistory: () => ipcRenderer.invoke('coarchitect:fetchHistory'),
  postMessage: (msg: unknown) => ipcRenderer.invoke('coarchitect:postMessage', msg),
  sendAndStream: (content: string) => ipcRenderer.send('coarchitect:sendAndStream', content),
  onStreamChunk: (cb: (chunk: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, chunk: string) => cb(chunk);
    ipcRenderer.on('coarchitect:streamChunk', h as any);
    return () => ipcRenderer.removeListener('coarchitect:streamChunk', h as any);
  },
  onStreamDone: (cb: (preview: string) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, preview: string) => cb(preview);
    ipcRenderer.on('coarchitect:streamDone', h as any);
    return () => ipcRenderer.removeListener('coarchitect:streamDone', h as any);
  },
  onStreamError: (cb: (err: { code: string; message: string }) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, err: { code: string; message: string }) => cb(err);
    ipcRenderer.on('coarchitect:streamError', h as any);
    return () => ipcRenderer.removeListener('coarchitect:streamError', h as any);
  },
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
