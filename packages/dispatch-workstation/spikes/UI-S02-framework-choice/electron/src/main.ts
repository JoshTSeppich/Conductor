/**
 * UI-S02 Electron hello-world. Throwaway spike code.
 *
 * Demonstrates:
 *  1. Tray icon (macOS menu bar)
 *  2. Badge count (via app.dock.setBadge() — doc icon badge; menu bar
 *     icon title as fallback since Electron's Tray has no native
 *     badge property on macOS)
 *  3. Click-to-open menu with Hello + Quit
 *  4. Local notification on Hello click
 *  5. (TS file schema-check.ts imports StateEnum separately to prove
 *     workspace type flow)
 *  6. One-line stdout on startup
 */
import { app, Tray, Menu, Notification, nativeImage } from 'electron';

// 16x16 transparent PNG, base64-encoded. Placeholder icon.
const ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAHklEQVR42mNkoBAw' +
  'jmoY1TCqYVTDqIZRDaMaRigAAAiGAAGoWcGPAAAAAElFTkSuQmCC';

let tray: Tray | null = null;
let helloCount = 0;

function rebuildMenu(): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: `Hello (clicked ${helloCount}×)`,
      click: () => {
        helloCount += 1;
        const n = new Notification({
          title: 'UI-S02 Electron',
          body: `Hello #${helloCount} fired from Electron tray`,
        });
        n.show();
        rebuildMenu();
        updateBadge();
      },
    },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
}

function updateBadge(): void {
  if (!tray) return;
  // macOS Tray has no native badge property. Two workarounds:
  //  (a) Encode count into tray title text ("●3")
  //  (b) Use app.dock.setBadge() for the Dock icon (only works if app
  //      shows in Dock — typically hidden for menu-bar apps)
  tray.setTitle(helloCount > 0 ? ` ${helloCount}` : '');
  if (app.dock) {
    app.dock.setBadge(helloCount > 0 ? String(helloCount) : '');
  }
}

app.whenReady().then(() => {
  console.log('[UI-S02/electron] hello-world ready');
  const icon = nativeImage.createFromBuffer(Buffer.from(ICON_B64, 'base64'));
  tray = new Tray(icon);
  tray.setToolTip('UI-S02 Electron hello-world');
  rebuildMenu();
  updateBadge();
});

app.on('window-all-closed', () => {
  // Keep running on macOS; menu-bar apps don't quit on window close.
});
