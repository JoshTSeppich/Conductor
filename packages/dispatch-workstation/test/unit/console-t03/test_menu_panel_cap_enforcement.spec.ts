// CONSOLE-T03 Cluster 5 — Test 3/3: panel cap disables session items.
//
// Vision §10.11 Q3 (ratified): default panel cap is 4 simultaneous CC-console
// panels. CONSOLE-T02 enforces the cap on the controller side
// (WorkstationError type=PanelCapExceeded). The menu surface must visibly
// reflect "no more panels can be opened" so the operator does not click an
// item that would silently fail.
//
// RED state: src/main/console-menu.ts absent → import fails → FAIL.
import { describe, it, expect } from 'vitest';
import { buildConsoleMenu } from '../../../src/main/console-menu.js';

describe('CONSOLE-T03 cluster 5 — panel cap enforcement', () => {
  it('all session items are enabled when panelCount < panelCap', () => {
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 2,
      panelCap: 4,
      onOpen: () => {},
    });
    const items = m.submenu as Array<{
      enabled?: boolean;
      type?: string;
      label?: string;
    }>;
    const sessionItems = items.filter((i) => !i.type);
    for (const i of sessionItems) {
      // Electron MenuItemConstructorOptions.enabled defaults to true; the
      // cluster invariant: when below cap, items must NOT be explicitly
      // disabled.
      expect(i.enabled).not.toBe(false);
    }
  });

  it('all session items are disabled when panelCount >= panelCap', () => {
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 4,
      panelCap: 4,
      onOpen: () => {},
    });
    const items = m.submenu as Array<{
      enabled?: boolean;
      type?: string;
      label?: string;
    }>;
    const sessionItems = items.filter((i) => !i.type);
    for (const i of sessionItems) {
      expect(i.enabled).toBe(false);
    }
  });

  it('disabled session items do NOT invoke onOpen when click is fired', () => {
    // Defensive contract: even if Electron somehow dispatched the click on
    // a disabled item (it normally won't), our handler must guard.
    const opens: string[] = [];
    const m = buildConsoleMenu({
      sessions: ['alpha'],
      panelCount: 4,
      panelCap: 4,
      onOpen: (name) => opens.push(name),
    });
    const items = m.submenu as Array<{
      enabled?: boolean;
      click?: () => void;
      label?: string;
    }>;
    const alpha = items.find((i) => i.label === 'alpha');
    expect(alpha?.enabled).toBe(false);
    alpha?.click?.();
    expect(opens).toEqual([]);
  });

  it('a separator + cap-status hint item is appended below session items at cap', () => {
    const m = buildConsoleMenu({
      sessions: ['alpha', 'beta'],
      panelCount: 4,
      panelCap: 4,
      onOpen: () => {},
    });
    const items = m.submenu as Array<{
      type?: string;
      label?: string;
      enabled?: boolean;
    }>;
    // The last visible (non-separator) item carries the cap-status hint.
    const hint = items.find(
      (i) => !i.type && (i.label ?? '').toLowerCase().includes('cap'),
    );
    expect(hint).toBeDefined();
    expect(hint?.enabled).toBe(false);
  });
});
