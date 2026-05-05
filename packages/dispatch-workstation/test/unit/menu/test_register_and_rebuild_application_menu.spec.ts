// test-batch-1 Session B — menu.ts coverage gap closure (Tier 1).
//
// Covers the two side-effect functions registerApplicationMenu and
// rebuildApplicationMenu. Mocks Electron's Menu class to (a) avoid pulling
// the full Electron runtime into the unit-test process and (b) assert
// the finding #89 fix invariant — rebuildApplicationMenu must call
// setApplicationMenu(null) BEFORE setApplicationMenu(newMenu).
//
// Module-level state (`menuRegistered` boolean gate) is reset between
// tests via vi.resetModules() + dynamic import. Without this, the second
// test's registerApplicationMenu call would short-circuit on the gate
// set by the first test.
//
// KNOWN finding #89 invariant: macOS menu server reference-tracks submenu
// pointers from the OS menu bar's first attachment. Subsequent
// setApplicationMenu(newMenu) calls update Electron JS state but the
// OS-level cache holds the originally attached pointers. Calling
// setApplicationMenu(null) first invalidates the OS cache; the immediate-
// following setApplicationMenu(newMenu) re-attaches with fresh pointers.
// Removing the null precursor reintroduces finding #89.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted runs before vi.mock factory so the mock can reference these
// shared spies for assertion access.
const mocks = vi.hoisted(() => {
  const fakeMenu = { __isFakeMenu: true };
  return {
    fakeMenu,
    buildFromTemplate: vi.fn(() => fakeMenu),
    setApplicationMenu: vi.fn(),
  };
});

vi.mock('electron', () => ({
  Menu: {
    buildFromTemplate: mocks.buildFromTemplate,
    setApplicationMenu: mocks.setApplicationMenu,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('menu — registerApplicationMenu', () => {
  it('builds a Menu from buildMenuTemplate output and sets it as the application menu on first call', async () => {
    // KNOWN: first call must invoke buildFromTemplate(template) once and
    // setApplicationMenu(menu) once.
    const menu = await import('../../../src/main/menu.js');
    menu.registerApplicationMenu();
    expect(mocks.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledWith(mocks.fakeMenu);
  });

  it('is idempotent — second registerApplicationMenu call short-circuits on the menuRegistered gate', async () => {
    // KNOWN: menu.ts:93-96 returns early when menuRegistered is true.
    // The gate exists so accidental double-registration does not double-
    // attach the menu; rebuilds must go through rebuildApplicationMenu.
    const menu = await import('../../../src/main/menu.js');
    menu.registerApplicationMenu();
    menu.registerApplicationMenu();
    expect(mocks.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(1);
  });

  it('passes consoleMenu opts through to the underlying buildMenuTemplate template', async () => {
    // MODELED: when consoleMenu is provided, the resulting template should
    // include a 'CC Console' section. We assert this via the template arg
    // captured by buildFromTemplate, not by re-invoking buildMenuTemplate.
    const menu = await import('../../../src/main/menu.js');
    menu.registerApplicationMenu({
      consoleMenu: {
        sessions: ['alpha'],
        panelCount: 0,
        panelCap: 4,
        onOpen: () => {},
      },
    });
    const template = mocks.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
    }>;
    const labels = template.map((m) => m.label);
    expect(labels).toContain('CC Console');
  });
});

describe('menu — rebuildApplicationMenu (finding #89 invariant)', () => {
  it('calls setApplicationMenu(null) BEFORE setApplicationMenu(newMenu) — finding #89 fix', async () => {
    // KNOWN: this is the load-bearing assertion. Removing line 118
    // (setApplicationMenu(null)) of menu.ts reintroduces finding #89 —
    // submenu rebuilds stop propagating to the macOS menu bar after
    // first attachment. Asserting call order guards against silent
    // regression of the fix.
    const menu = await import('../../../src/main/menu.js');
    menu.rebuildApplicationMenu();
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(2);
    const firstCallArg = mocks.setApplicationMenu.mock.calls[0]?.[0];
    const secondCallArg = mocks.setApplicationMenu.mock.calls[1]?.[0];
    expect(firstCallArg).toBeNull();
    expect(secondCallArg).toBe(mocks.fakeMenu);
  });

  it('bypasses the menuRegistered gate — works when called without prior registerApplicationMenu', async () => {
    // KNOWN: menu.ts:115-120 sets menuRegistered = true unconditionally
    // and does not consult its prior value. Rebuild must succeed even on
    // the very first call (e.g., main.ts daemon-driven menu refresh that
    // races registerApplicationMenu).
    const menu = await import('../../../src/main/menu.js');
    menu.rebuildApplicationMenu();
    expect(mocks.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(2);
  });

  it('passes consoleMenu opts through to the underlying buildMenuTemplate template (rebuild path)', async () => {
    // MODELED: rebuild path with consoleMenu opts must route through
    // buildMenuTemplate the same way registerApplicationMenu does. This
    // is the operator-experiential path: when daemon /v2/sessions changes,
    // main.ts calls rebuildApplicationMenu({ consoleMenu: { sessions: ... } })
    // to reflect the new session list in the menu bar.
    const menu = await import('../../../src/main/menu.js');
    menu.rebuildApplicationMenu({
      consoleMenu: {
        sessions: ['beta'],
        panelCount: 2,
        panelCap: 4,
        onOpen: () => {},
      },
    });
    const template = mocks.buildFromTemplate.mock.calls[0]?.[0] as Array<{
      label?: string;
    }>;
    const labels = template.map((m) => m.label);
    expect(labels).toContain('CC Console');
  });

  it('rebuild after register continues to invoke the null precursor (gate-bypass + null-precursor compose)', async () => {
    // KNOWN: production flow is register-once-then-rebuild-on-events.
    // After register, menuRegistered is true. Rebuild must STILL invoke
    // setApplicationMenu(null) — the gate bypass and the null precursor
    // are independent invariants that compose.
    const menu = await import('../../../src/main/menu.js');
    menu.registerApplicationMenu();
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(1);
    menu.rebuildApplicationMenu();
    // 1 (register) + 2 (rebuild: null + newMenu) = 3 total calls.
    expect(mocks.setApplicationMenu).toHaveBeenCalledTimes(3);
    // The null precursor is the SECOND call (first was register's
    // setApplicationMenu(menu); second is rebuild's null; third is
    // rebuild's newMenu).
    expect(mocks.setApplicationMenu.mock.calls[1]?.[0]).toBeNull();
    expect(mocks.setApplicationMenu.mock.calls[2]?.[0]).toBe(mocks.fakeMenu);
  });
});
