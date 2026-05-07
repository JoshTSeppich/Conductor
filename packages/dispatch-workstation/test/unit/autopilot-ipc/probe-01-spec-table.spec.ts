// MB-T17 WB2 probe-01 — autopilot-ipc helpers + controller spec table.
//
// Exercises the per-session autopilot enabled toggle pure-fn helpers
// (getSessionAutopilotEnabled, setSessionAutopilotEnabled) + the
// AutopilotIpcController class + createDefaultAutopilotIpcController
// factory. Per Q-MBT17-1..13 + decisions doc.
//
// Test isolation: each test constructs an AutopilotLoop with in-memory
// store deps (read/write closures over a Record<string, AutopilotState>)
// — avoids tmpdir+fs. Validates that the IPC layer is wired correctly
// over the AutopilotLoop without fs side effects.
//
// Pattern mirrors test/unit/approval-policy-ipc/probe-01-spec-table.spec.ts
// (MB-T16 WB2).

import { describe, it, expect, vi } from 'vitest';
import {
  getSessionAutopilotEnabled,
  setSessionAutopilotEnabled,
  AutopilotIpcController,
  createDefaultAutopilotIpcController,
  type AutopilotIpcMain,
} from '../../../src/main/autopilot-ipc.js';
import { AutopilotLoop } from '../../../src/main/autopilot-loop.js';
import {
  defaultAutopilotState,
  type AutopilotState,
} from '../../../src/main/autopilot-state-store.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeFakeAutopilot(): {
  autopilot: AutopilotLoop;
  store: Record<string, AutopilotState>;
} {
  const store: Record<string, AutopilotState> = {};
  const autopilot = new AutopilotLoop({
    read: (name) => store[name] ?? defaultAutopilotState(),
    write: (name, state) => {
      store[name] = state;
    },
  });
  return { autopilot, store };
}

interface FakeIpcMain extends AutopilotIpcMain {
  registered: Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >;
}

function makeFakeIpcMain(): FakeIpcMain {
  const registered = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();
  return {
    registered,
    handle: (channel, fn) => {
      registered.set(channel, fn);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getSessionAutopilotEnabled
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — getSessionAutopilotEnabled', () => {
  it('returns enabled=false for a session with no row (default state)', async () => {
    const { autopilot } = makeFakeAutopilot();
    const result = await getSessionAutopilotEnabled('sess-x', autopilot);
    expect(result).toEqual({ enabled: false });
  });

  it('returns enabled=true when AutopilotLoop has the session enabled', async () => {
    const { autopilot } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    const result = await getSessionAutopilotEnabled('sess-x', autopilot);
    expect(result).toEqual({ enabled: true });
  });

  it('returns enabled=false when AutopilotLoop has the session explicitly disabled', async () => {
    const { autopilot } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    autopilot.setEnabled('sess-x', false);
    const result = await getSessionAutopilotEnabled('sess-x', autopilot);
    expect(result).toEqual({ enabled: false });
  });

  it('keys per session — sess-a enabled does not affect sess-b', async () => {
    const { autopilot } = makeFakeAutopilot();
    autopilot.setEnabled('sess-a', true);
    expect(await getSessionAutopilotEnabled('sess-a', autopilot)).toEqual({
      enabled: true,
    });
    expect(await getSessionAutopilotEnabled('sess-b', autopilot)).toEqual({
      enabled: false,
    });
  });

  it('uses injected AutopilotLoop instance (not the default)', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    const result = await getSessionAutopilotEnabled('sess-x', autopilot);
    expect(result.enabled).toBe(true);
    // Confirm the injected instance is what was hit (store has the entry).
    expect(store['sess-x']?.enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setSessionAutopilotEnabled
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — setSessionAutopilotEnabled', () => {
  it('persists enabled=true via AutopilotLoop.setEnabled and returns it', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    const result = await setSessionAutopilotEnabled('sess-x', true, autopilot);
    expect(result).toEqual({ enabled: true });
    expect(store['sess-x']?.enabled).toBe(true);
  });

  it('persists enabled=false and returns it', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    const result = await setSessionAutopilotEnabled('sess-x', false, autopilot);
    expect(result).toEqual({ enabled: false });
    expect(store['sess-x']?.enabled).toBe(false);
  });

  it('is idempotent: setting true twice keeps enabled=true', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    await setSessionAutopilotEnabled('sess-x', true, autopilot);
    await setSessionAutopilotEnabled('sess-x', true, autopilot);
    expect(store['sess-x']?.enabled).toBe(true);
  });

  it('does not mutate other state fields (currentIntentId, pendingIntents)', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    // Pre-populate with intent state via startIntent equivalent.
    store['sess-x'] = {
      ...defaultAutopilotState(),
      enabled: false,
      currentIntentId: 'intent-1',
      currentStep: 2,
      pendingIntents: [
        { intent_id: 'intent-1', step: 2, total_steps: 5, intent_summary: 'x' },
      ],
    };
    await setSessionAutopilotEnabled('sess-x', true, autopilot);
    expect(store['sess-x']?.enabled).toBe(true);
    expect(store['sess-x']?.currentIntentId).toBe('intent-1');
    expect(store['sess-x']?.pendingIntents.length).toBe(1);
  });

  it('uses injected AutopilotLoop instance', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    await setSessionAutopilotEnabled('sess-y', true, autopilot);
    expect(store['sess-y']?.enabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AutopilotIpcController construction
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — AutopilotIpcController construction', () => {
  it('constructor accepts empty options without throwing', () => {
    expect(() => new AutopilotIpcController({})).not.toThrow();
  });

  it('constructor accepts no arguments without throwing (default opts)', () => {
    expect(() => new AutopilotIpcController()).not.toThrow();
  });

  it('constructor accepts injected AutopilotLoop in opts.autopilot', () => {
    const { autopilot } = makeFakeAutopilot();
    expect(() => new AutopilotIpcController({ autopilot })).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AutopilotIpcController.registerHandlers — channel registration
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — AutopilotIpcController.registerHandlers channels', () => {
  it('registers exactly the 2 expected channels', () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    expect(ipcMain.registered.size).toBe(2);
    expect(ipcMain.registered.has('workstation:autopilot-get')).toBe(true);
    expect(ipcMain.registered.has('workstation:autopilot-put')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AutopilotIpcController — get handler behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — workstation:autopilot-get handler', () => {
  it('returns { enabled } for a valid sessionName', async () => {
    const { autopilot } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-get')!;
    const result = await handler({}, { sessionName: 'sess-x' });
    expect(result).toEqual({ enabled: true });
  });

  it('throws on missing sessionName field', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-get')!;
    await expect(handler({}, {})).rejects.toThrow(/sessionName/);
  });

  it('throws on empty sessionName string', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-get')!;
    await expect(handler({}, { sessionName: '' })).rejects.toThrow(
      /sessionName/,
    );
  });

  it('throws on non-object payload (e.g., null)', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-get')!;
    await expect(handler({}, null)).rejects.toThrow(/sessionName/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AutopilotIpcController — put handler behavior
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — workstation:autopilot-put handler', () => {
  it('persists enabled=true and returns { enabled: true }', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    const result = await handler({}, { sessionName: 'sess-x', enabled: true });
    expect(result).toEqual({ enabled: true });
    expect(store['sess-x']?.enabled).toBe(true);
  });

  it('persists enabled=false and returns { enabled: false }', async () => {
    const { autopilot, store } = makeFakeAutopilot();
    autopilot.setEnabled('sess-x', true);
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    const result = await handler({}, { sessionName: 'sess-x', enabled: false });
    expect(result).toEqual({ enabled: false });
    expect(store['sess-x']?.enabled).toBe(false);
  });

  it('throws on missing sessionName', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    await expect(handler({}, { enabled: true })).rejects.toThrow(
      /sessionName/,
    );
  });

  it('throws on missing enabled field', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    await expect(handler({}, { sessionName: 'sess-x' })).rejects.toThrow(
      /enabled/,
    );
  });

  it('throws on non-boolean enabled (e.g., string "true")', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    await expect(
      handler({}, { sessionName: 'sess-x', enabled: 'true' }),
    ).rejects.toThrow(/enabled/);
  });

  it('throws on non-object payload', async () => {
    const { autopilot } = makeFakeAutopilot();
    const ipcMain = makeFakeIpcMain();
    new AutopilotIpcController({ autopilot }).registerHandlers(ipcMain);
    const handler = ipcMain.registered.get('workstation:autopilot-put')!;
    await expect(handler({}, 'not-an-object')).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createDefaultAutopilotIpcController
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T17 WB2 — createDefaultAutopilotIpcController factory', () => {
  it('returns an AutopilotIpcController instance', () => {
    const ctl = createDefaultAutopilotIpcController();
    expect(ctl).toBeInstanceOf(AutopilotIpcController);
  });

  it('default controller registers both expected channels', () => {
    const ctl = createDefaultAutopilotIpcController();
    const ipcMain = makeFakeIpcMain();
    ctl.registerHandlers(ipcMain);
    expect(ipcMain.registered.size).toBe(2);
    expect(ipcMain.registered.has('workstation:autopilot-get')).toBe(true);
    expect(ipcMain.registered.has('workstation:autopilot-put')).toBe(true);
  });
});

// Suppress vi unused-import lint when no spy used; import retained for parity.
void vi;
