// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — webview-scoped preload entry.
//
// Built by scripts/build-card-bridge.mjs to dist/main/card-bridge.cjs and
// attached to the kanban <webview> via the `preload` attribute in
// workstation-shell.html so window.cardBridge is available in the
// dispatch-web React app loaded into the kanban region.
import { contextBridge, ipcRenderer } from 'electron';
import { makeCardBridge, type CardBridgeIpc } from './card-bridge.js';

const ipcAdapter: CardBridgeIpc = {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
};

contextBridge.exposeInMainWorld('cardBridge', makeCardBridge(ipcAdapter));
