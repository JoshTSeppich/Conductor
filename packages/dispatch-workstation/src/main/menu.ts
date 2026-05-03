import { Menu, type MenuItemConstructorOptions } from 'electron';
import { buildConsoleMenu, type ConsoleMenuOpts } from './console-menu.js';

let menuRegistered = false;

/** Optional CC Console submenu opts. When provided, buildMenuTemplate
 * inserts the CONSOLE-T03 menu between "View" and "Window". */
export interface ApplicationMenuOpts {
  readonly consoleMenu?: ConsoleMenuOpts;
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
 * count changes. Bypasses the menuRegistered gate intentionally. */
export function rebuildApplicationMenu(opts: ApplicationMenuOpts = {}): void {
  menuRegistered = true;
  const menu = Menu.buildFromTemplate(buildMenuTemplate(opts));
  Menu.setApplicationMenu(menu);
}
