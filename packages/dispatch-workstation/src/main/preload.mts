import { contextBridge, ipcRenderer } from 'electron';
import { makeConsoleBridge, type ConsoleBridgeIpc } from './console-bridge.js';
import { attachSpawnResultListener } from './spawn-result-listener.js';

// COARCH-T03: streaming bridge methods added (sendAndStream, onStreamChunk/Done/Error).
// COARCH-T04: build-doc config bridge methods added (getBuildDocConfig/setBuildDocConfig/clearBuildDocConfig).
contextBridge.exposeInMainWorld('coarchitectBridge', {
  fetchHistory: () => ipcRenderer.invoke('coarchitect:fetchHistory'),
  postMessage: (msg: unknown) => ipcRenderer.invoke('coarchitect:postMessage', msg),
  sendAndStream: (content: string) => ipcRenderer.send('coarchitect:sendAndStream', content),
  getBuildDocConfig: () => ipcRenderer.invoke('coarchitect:getBuildDocConfig'),
  setBuildDocConfig: (config: unknown) => ipcRenderer.invoke('coarchitect:setBuildDocConfig', config),
  clearBuildDocConfig: () => ipcRenderer.invoke('coarchitect:clearBuildDocConfig'),
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
//
// MB-F-#83: onSpawnResult subscribes to 'workstation:spawn-result' (emitted
// by spawn-ipc.ts:297 / :308). Returns cleanup-fn per the
// coarchitectBridge.onStream* pattern. Listener-attach logic lives in
// spawn-result-listener.ts so the seam is unit-testable without booting
// Electron.
contextBridge.exposeInMainWorld('workstationBridge', {
  openRepoDialog: () => ipcRenderer.invoke('workstation:open-repo-dialog'),
  requestSpawn: (payload: { repoPath: string; sessionName: string }) =>
    ipcRenderer.send('workstation:spawn-requested', payload),
  onSpawnResult: (cb: (reply: unknown) => void) =>
    attachSpawnResultListener(ipcRenderer, cb),
});

// CONSOLE-T02: consoleBridge per vision §10.7 (frozen at eac381e).
// Direction-corrected post operator arbitration of CONSOLE-T02 halt:
//   shell→webview (on*): console:open, console:close, console:stdout-chunk,
//                        console:gap-detected, console:error
//   webview→shell (invoke): console:send-stdin, console:signal
// makeConsoleBridge factory lives in console-bridge.ts so the shape can be
// unit-tested without booting electron.
const consoleIpcAdapter: ConsoleBridgeIpc = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (channel, listener) => { ipcRenderer.on(channel, listener as any); },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeListener: (channel, listener) => { ipcRenderer.removeListener(channel, listener as any); },
};
contextBridge.exposeInMainWorld('consoleBridge', makeConsoleBridge(consoleIpcAdapter));
