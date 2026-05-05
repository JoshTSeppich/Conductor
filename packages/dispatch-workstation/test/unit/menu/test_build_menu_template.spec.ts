// test-batch-1 Session B — menu.ts coverage gap closure (Tier 1).
//
// Pre-state coverage (branch HEAD 7ea398d): stmt 0% / branch 0% / func 0% /
// line 0%. The application-menu factory had zero unit-test coverage despite
// shipping the finding #89 fix at line 118 (setApplicationMenu(null)
// precursor). All existing menu-named specs import console-menu.ts (the
// CC Console submenu builder), not menu.ts.
//
// This file exercises buildMenuTemplate — the pure factory used by both
// registerApplicationMenu and rebuildApplicationMenu. No Electron mock
// needed because buildMenuTemplate only uses MenuItemConstructorOptions
// (a type, not a runtime import).
//
// KNOWN: buildMenuTemplate has two branches — opts.consoleMenu absent vs
// present. When present, the CC Console submenu must be inserted before
// the "Window" section. Order matters because the menu bar ordering is
// operator-visible.
import { describe, it, expect } from 'vitest';

import { buildMenuTemplate } from '../../../src/main/menu.js';

describe('menu — buildMenuTemplate (factory)', () => {
  it('returns the six default sections in the documented order when no consoleMenu opt is passed', () => {
    // KNOWN: default template order is App, File, Edit, View, Window, Help.
    // The macOS app-menu convention requires the application menu first.
    const template = buildMenuTemplate();
    const labels = template.map((m) => m.label ?? `<role:${m.role ?? '?'}>`);
    expect(labels).toEqual([
      'Foxworks Workstation',
      'File',
      'Edit',
      'View',
      'Window',
      '<role:help>',
    ]);
  });

  it('inserts CC Console submenu between View and Window when consoleMenu opts are provided', () => {
    // KNOWN: menu.ts:84-86 finds 'Window' index and splices CC Console
    // immediately before it. The user-experience invariant is that
    // view-related controls are grouped on the left of Window/Help.
    const template = buildMenuTemplate({
      consoleMenu: {
        sessions: ['alpha', 'beta'],
        panelCount: 0,
        panelCap: 4,
        onOpen: () => {},
      },
    });
    const labels = template.map((m) => m.label ?? `<role:${m.role ?? '?'}>`);
    const ccIdx = labels.indexOf('CC Console');
    const viewIdx = labels.indexOf('View');
    const windowIdx = labels.indexOf('Window');
    expect(ccIdx).toBeGreaterThan(-1);
    expect(ccIdx).toBe(viewIdx + 1);
    expect(ccIdx).toBe(windowIdx - 1);
  });

  it('CC Console submenu reflects passed consoleMenu opts (session list passes through)', () => {
    // MODELED: buildMenuTemplate delegates submenu construction to
    // buildConsoleMenu — this test asserts the pass-through is wired
    // correctly, not that buildConsoleMenu itself behaves (covered
    // by console-t03/test_menu_panel_cap_enforcement.spec.ts).
    const template = buildMenuTemplate({
      consoleMenu: {
        sessions: ['gamma', 'delta'],
        panelCount: 1,
        panelCap: 4,
        onOpen: () => {},
      },
    });
    const cc = template.find((m) => m.label === 'CC Console');
    expect(cc).toBeDefined();
    const items = cc?.submenu as Array<{ label?: string }>;
    const sessionLabels = items.map((i) => i.label).filter(Boolean);
    expect(sessionLabels).toContain('gamma');
    expect(sessionLabels).toContain('delta');
  });

  it('omits CC Console section entirely when consoleMenu opt is not provided (explicit default)', () => {
    // KNOWN: omitting consoleMenu must produce a 6-section template, NOT
    // 7 sections with an empty CC Console. Defensive against accidental
    // empty-section regression.
    const template = buildMenuTemplate({});
    const labels = template.map((m) => m.label ?? `<role:${m.role ?? '?'}>`);
    expect(labels).not.toContain('CC Console');
    expect(template.length).toBe(6);
  });
});
