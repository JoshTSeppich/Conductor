// MB-F-MB-T07-CARD-BRIDGE-PRELOAD-WIRING — webview-scoped preload entry.
//
// Built by scripts/build-card-bridge.mjs to dist/main/card-bridge.cjs and
// attached to the kanban <webview> via the `preload` attribute in
// workstation-shell.html so window.cardBridge is available in the
// dispatch-web React app loaded into the kanban region.
//
// === Fix-92 extension (cairn finding #92, do not modify outside this region) ===
// In addition to exposing window.cardBridge, this preload bootstraps
// localStorage['x-conductor-token'] from the workstation main process so
// dispatch-web's useAuthBootstrap (auth/useAuthBootstrap.ts:26 readToken)
// finds a value on cold launch and skips TokenPrompt. The IPC channel
// `workstation:get-daemon-token` is registered in main.ts inside the
// Fix-92 sentinel region; the handler returns the trimmed contents of
// ~/.foxworks-dispatch/token (or null on absent/unreadable file).
//
// localStorage is per-origin and shared across isolated worlds even with
// contextIsolation:true, so the preload's setItem here is visible to the
// dispatch-web bundle when it later reads it. Preload runs before page
// scripts, so the read is observation-stable: the bundle never sees an
// empty string between preload and its own first readToken().
//
// Failure modes (all silent — operator falls through to TokenPrompt):
// - IPC handler not registered yet (race): would throw on invoke; caught.
// - Disk read returns null (no daemon installed): no setItem call.
// - localStorage unavailable (private-mode-style pathological case):
//   setItem throws; caught.
// === end Fix-92 extension ===
import { contextBridge, ipcRenderer } from 'electron';
import { makeCardBridge, type CardBridgeIpc } from './card-bridge.js';

const ipcAdapter: CardBridgeIpc = {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
};

contextBridge.exposeInMainWorld('cardBridge', makeCardBridge(ipcAdapter));

// === BEGIN: Fix-92 webview token bootstrap (do not modify outside this block) ===
void (async () => {
  try {
    const token = await ipcRenderer.invoke('workstation:get-daemon-token');
    if (typeof token === 'string' && token.length > 0) {
      try {
        localStorage.setItem('x-conductor-token', token);
      } catch {
        /* localStorage unavailable; TokenPrompt remains fallback */
      }
    }
  } catch {
    /* IPC unavailable; TokenPrompt remains fallback */
  }
})();
// === END: Fix-92 ===
