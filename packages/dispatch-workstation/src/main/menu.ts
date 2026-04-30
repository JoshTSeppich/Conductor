import { Menu, type MenuItemConstructorOptions } from 'electron';

let menuRegistered = false;

export function buildMenuTemplate(): MenuItemConstructorOptions[] {
  return [
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
}

export function registerApplicationMenu(): void {
  if (menuRegistered) return;
  menuRegistered = true;
  const menu = Menu.buildFromTemplate(buildMenuTemplate());
  Menu.setApplicationMenu(menu);
}
