import { Menu, type MenuItemConstructorOptions } from 'electron';
import { buildConsoleMenu, type ConsoleMenuOpts } from './console-menu.js';

let menuRegistered = false;

/** Optional CC Console submenu opts. When provided, buildMenuTemplate
 * inserts the CONSOLE-T03 menu between "View" and "Window". */
export interface ApplicationMenuOpts {
  readonly consoleMenu?: ConsoleMenuOpts;
  /**
   * MB-T13 WB8: click handler for the "Show recent orchestrator actions"
   * menu item under View. When provided, the View submenu gains a
   * separator + the labelled item. Click opens the audit-modal
   * BrowserWindow per Phase 2 brief WB8 (renderer bundled to dist/audit
   * -modal/ via scripts/build-audit-modal.mjs; HTML loads workstation
   * preload + invokes workstationBridge.fetchAuditModal).
   *
   * When undefined, the menu item is omitted entirely (test-isolated
   * unit specs don't need the production handler to exist).
   */
  readonly onShowAuditModal?: () => void;
}

export function buildMenuTemplate(
  opts: ApplicationMenuOpts = {},
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = [
    {
      // First menu on macOS is always the application menu (app name in menu bar).
      label: 'Foxworks Workstation',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },        // Cmd+H
        { role: 'hideOthers' }, // Cmd+Option+H
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },       // Cmd+Q
      ],
    },
    {
      label: 'File',
      submenu: [
        { role: 'close' }, // Cmd+W
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },      // Cmd+Z
        { role: 'redo' },      // Shift+Cmd+Z
        { type: 'separator' },
        { role: 'cut' },       // Cmd+X
        { role: 'copy' },      // Cmd+C
        { role: 'paste' },     // Cmd+V
        { role: 'selectAll' }, // Cmd+A
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        // MB-T13 WB8: audit-modal menu item — appended to View submenu
        // when opts.onShowAuditModal is provided. Production main.ts
        // wires this to a closure that opens the audit-modal BrowserWindow.
        ...(opts.onShowAuditModal
          ? ([
              { type: 'separator' as const },
              {
                label: 'Show recent orchestrator actions',
                click: opts.onShowAuditModal,
              },
            ] satisfies MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, // Cmd+M
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Foxworks Workstation Help',
          // URL deferred to MB-T08 (onboarding + help surface).
        },
      ],
    },
  ];

  if (opts.consoleMenu) {
    // Insert "CC Console" before "Window" — view-related controls grouped on the left.
    const windowIdx = template.findIndex((m) => m.label === 'Window');
    template.splice(windowIdx, 0, buildConsoleMenu(opts.consoleMenu));
  }

  return template;
}

export function registerApplicationMenu(opts: ApplicationMenuOpts = {}): void {
  if (menuRegistered) {
    // Allow rebuild via rebuildApplicationMenu rather than wedging the gate.
    return;
  }
  menuRegistered = true;
  const menu = Menu.buildFromTemplate(buildMenuTemplate(opts));
  Menu.setApplicationMenu(menu);
}

/** Rebuild the application menu in-place. Used by CONSOLE-T03 main.ts to
 * refresh the "CC Console" submenu when daemon's session list or panel
 * count changes. Bypasses the menuRegistered gate intentionally.
 *
 * Cairn finding #89 fix (hypothesis 1, KNOWN-confirmed at green commit):
 * the macOS menu server reference-tracks submenu pointers from the OS
 * menu bar's first attachment after app.activate. Subsequent
 * setApplicationMenu(newMenu) calls update Electron's JS-side state
 * but the OS-level cache holds the originally attached pointers, so
 * the operator-visible menu bar stays pinned to the first-attached
 * state. Calling setApplicationMenu(null) first invalidates the OS
 * cache; the immediately-following setApplicationMenu(newMenu) then
 * re-attaches with fresh pointers and propagates correctly. */
export function rebuildApplicationMenu(opts: ApplicationMenuOpts = {}): void {
  menuRegistered = true;
  const menu = Menu.buildFromTemplate(buildMenuTemplate(opts));
  Menu.setApplicationMenu(null);
  Menu.setApplicationMenu(menu);
}
