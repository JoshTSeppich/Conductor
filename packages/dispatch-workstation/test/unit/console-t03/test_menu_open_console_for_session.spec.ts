// CONSOLE-T03 Cluster 5 — Test 1/3: native CC Console menu lists sessions.
//
// Vision §10.10 ship-gate: "operator selects 'CC Console > [session]'
// from native menu → panel mounts in webview". The open-trigger source is
// the Electron application menu (extending MB-T03's menu surface).
//
// Tested as a pure menu-template builder so the assertion runs without
// booting Electron. main.ts wires the click() into ConsoleIpcController
// .openConsolePanel() at app start.
//
// RED state: src/main/console-menu.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { buildConsoleMenu } from '../../../src/main/console-menu.js';

describe('CONSOLE-T03 cluster 5 — buildConsoleMenu lists sessions', () => {
  it('top-level item is labeled "CC Console" and contains a submenu', () => {
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });
    expect(m.label).toBe('CC Console');
    expect(Array.isArray(m.submenu)).toBe(true);
  });

  it('one submenu item per registered session, label = session name', () => {
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta', 'gamma'],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });
    const items = m.submenu as Array<{ label?: string; type?: string }>;
    const sessionLabels = items.filter((i) => !i.type).map((i) => i.label);
    expect(sessionLabels).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('clicking a session item invokes onOpen with that session name', () => {
    const opens: string[] = [];
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 0,
      panelCap: 4,
      onOpen: (name) => opens.push(name),
    });
    const items = m.submenu as Array<{
      label?: string;
      click?: () => void;
    }>;

    // Find the 'beta' item and call its click handler directly.
    const beta = items.find((i) => i.label === 'beta');
    expect(beta?.click).toBeTypeOf('function');
    beta?.click?.();

    expect(opens).toEqual(['beta']);
  });

  it('empty session list renders a single disabled placeholder', () => {
    const m = buildConsoleMenu({
      sessions: [],
      panelCount: 0,
      panelCap: 4,
      onOpen: () => {},
    });
    const items = m.submenu as Array<{
      label?: string;
      enabled?: boolean;
      type?: string;
    }>;
    expect(items).toHaveLength(1);
    expect(items[0]?.enabled).toBe(false);
    expect(items[0]?.label ?? '').toMatch(/no sessions/i);
  });
});
