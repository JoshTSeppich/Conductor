/**
 * UI-S02 menubar npm hello-world. Throwaway.
 *
 * Demonstrates `menubar` wrapper's idiomatic pattern: tray icon with a
 * popover window as its click target (vs raw Electron's context-menu
 * pattern). The wrapper handles the click-to-show-popover lifecycle,
 * click-outside-to-hide, and preferred-position.
 *
 * Hello-world capabilities:
 *   1. Tray icon
 *   2. Badge count (via tray.setTitle() — same constraint as raw
 *      Electron: Tray has no native badge property on macOS)
 *   3. Click-to-open menu (rendered as HTML inside the popover)
 *   4. Local notification on Hello click (via Electron's Notification)
 *   5. TS proof: see schema-check.ts (parallel to Electron hello-world)
 *   6. One-line stdout on startup
 */
const path = require('node:path');
const { menubar } = require('menubar');
const { Notification, nativeImage, ipcMain } = require('electron');

const ICON_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAHklEQVR42mNkoBAw' +
  'jmoY1TCqYVTDqIZRDaMaRigAAAiGAAGoWcGPAAAAAElFTkSuQmCC';

let helloCount = 0;
const icon = nativeImage.createFromBuffer(Buffer.from(ICON_B64, 'base64'));

const mb = menubar({
  icon,
  index: `file://${path.join(__dirname, 'index.html')}`,
  browserWindow: { width: 260, height: 160 },
});

mb.on('ready', () => {
  console.log('[UI-S02/menubar-npm] hello-world ready');
  if (mb.tray) mb.tray.setTitle('');
});

ipcMain.on('hello-clicked', () => {
  helloCount += 1;
  if (mb.tray) mb.tray.setTitle(` ${helloCount}`);
  new Notification({
    title: 'UI-S02 menubar npm',
    body: `Hello #${helloCount} fired from menubar-npm popover`,
  }).show();
});

ipcMain.on('quit-clicked', () => mb.app.quit());
