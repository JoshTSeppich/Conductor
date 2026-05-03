// CONSOLE-T03 — native "CC Console" menu builder.
//
// Vision §10.10 ship-gate cites the operator-driven open path: "operator
// selects 'CC Console > [session]' from native menu → panel mounts in
// webview". This module is the open-trigger source.
//
// Pure builder by design: returns a `MenuItemConstructorOptions` so unit
// tests can assert structure without booting Electron, and so main.ts can
// rebuild the menu cheaply whenever the daemon's session list changes.
//
// Cap enforcement (vision §10.11 Q3 ratified default = 4):
//   panelCount < panelCap → session items enabled
//   panelCount >= panelCap → session items disabled, plus a trailing
//                            "Panel cap reached (N/N)" hint item is
//                            appended so the operator sees why everything
//                            is greyed out
//
// Daemon-list-subscription (when /v2/sessions changes, rebuild the menu)
// is out of CONSOLE-T03 scope; main.ts wires the rebuild on its own
// session-events refresh cadence. See FOLLOWUPS.md MB-F-CONSOLE-T03-MENU-
// SUBSCRIPTION.

import type { MenuItemConstructorOptions } from 'electron';

export interface ConsoleMenuOpts {
  /** Currently registered daemon sessions, in display order. */
  readonly sessions: readonly string[];
  /** Number of CC-console panels currently open in the webview. */
  readonly panelCount: number;
  /** Configurable panel cap. v3.0 default = 4 per vision §10.11 Q3. */
  readonly panelCap: number;
  /** Click handler invoked when an enabled session item is selected. */
  readonly onOpen: (sessionName: string) => void;
}

export function buildConsoleMenu(
  opts: ConsoleMenuOpts,
): MenuItemConstructorOptions {
  const { sessions, panelCount, panelCap, onOpen } = opts;
  const atCap = panelCount >= panelCap;

  const submenu: MenuItemConstructorOptions[] = [];

  if (sessions.length === 0) {
    submenu.push({
      label: 'No sessions registered',
      enabled: false,
    });
  } else {
    for (const name of sessions) {
      submenu.push({
        label: name,
        enabled: !atCap,
        click: () => {
          if (atCap) return; // defensive guard; Electron normally suppresses click on disabled items
          onOpen(name);
        },
      });
    }
    if (atCap) {
      submenu.push({ type: 'separator' });
      submenu.push({
        label: `Panel cap reached (${panelCount}/${panelCap}) — close one to open another`,
        enabled: false,
      });
    }
  }

  return {
    label: 'CC Console',
    submenu,
  };
}
