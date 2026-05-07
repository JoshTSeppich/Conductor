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
  // MB-T09: session-send-prompt bridge per Q-MBT09-4=a.
  // Consumed by orchestrator (MB-T11) and tile footer (MB-T12).
  sendPromptToSession: (payload: unknown) =>
    ipcRenderer.invoke('workstation:session-send-prompt', payload),
  // MB-T11 WB3: session-kill bridge per Q-MBT11-3=a.
  // Consumed by orchestrator-action-handler (WB5) for the kill action.
  killSession: (payload: unknown) =>
    ipcRenderer.invoke('workstation:session-kill', payload),
  // MB-T13 WB7: audit-modal-fetch bridge per Q-MBT13-9=a.
  // Consumed by the WB8 audit-modal renderer when the operator
  // clicks "Show recent orchestrator actions" in the menu.
  fetchAuditModal: () =>
    ipcRenderer.invoke('workstation:audit-modal-fetch'),
  // MB-T12 WB11b: detach-tile bridge per Q-MBT12-4=a.
  // detachTile invokes 'tile:detach' which causes the main process
  // (DetachTileIpcController in detach-tile-ipc.ts) to open a new
  // BrowserWindow loading console-panel.html?session=<name>. The
  // returned promise resolves with { ok: true } when the window opened.
  detachTile: (sessionName: string) =>
    ipcRenderer.invoke('tile:detach', { sessionName }),
  // MB-T12 WB11b: subscribe to 'tile:detach-closed' main-process events
  // fired when an operator closes a detached console window. The
  // detached session's tile re-mounts in the main grid (TileGridApp
  // flips status to 'open'). Returns a cleanup fn matching the
  // onSpawnResult / onStream* pattern.
  onTileDetachClosed: (cb: (payload: { sessionName: string }) => void) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = (_: unknown, payload: { sessionName: string }) => cb(payload);
    ipcRenderer.on('tile:detach-closed', h as any);
    return () => ipcRenderer.removeListener('tile:detach-closed', h as any);
  },
  // MB-T16 WB2: per-session approval-policy bridge per Q-MBT16-1..8.
  // getSessionApprovalPolicy invokes 'workstation:approval-policy-get'
  // → main-process ApprovalPolicyIpcController → daemon
  // GET /v3/sessions/:name/approval-policy. Returns full GetResponse
  // shape including updated_at (null for no-row default per Q-MBT13-4=c).
  getSessionApprovalPolicy: (sessionName: string) =>
    ipcRenderer.invoke('workstation:approval-policy-get', { sessionName }),
  // MB-T16 WB2: putSessionApprovalPolicy invokes
  // 'workstation:approval-policy-put' → daemon PUT
  // /v3/sessions/:name/approval-policy. Returns the updated GetResponse
  // with server-assigned updated_at. Caller (TileApprovalPicker)
  // handles optimistic-UI rollback per Q-MBT16-3=a on rejection.
  putSessionApprovalPolicy: (sessionName: string, policy: string) =>
    ipcRenderer.invoke('workstation:approval-policy-put', { sessionName, policy }),
});

// CONSOLE-T02: consoleBridge per vision §10.7 (frozen at eac381e).
// Direction-corrected post operator arbitration of CONSOLE-T02 halt:
//   shell→webview (on*): console:open, console:close, console:stdout-chunk,
//                        console:gap-detected, console:error
//   webview→shell (invoke): console:send-stdin, console:signal,
//                           console:open-panel (Fix-C / cairn finding #82)
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
