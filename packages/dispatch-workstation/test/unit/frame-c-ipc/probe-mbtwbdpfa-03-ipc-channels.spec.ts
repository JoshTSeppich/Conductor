// MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB3 (red) — FrameCIpc
// controller + 3-channel registration contract probe.
//
// Asserts (per ticket body `32c7eee` §4 WB3 + operator-arbitrated Sub-Q
// resolutions 2026-05-11 + coord note `9fe6358` §2.2):
//   probe-03a: module exports `FrameCIpcController` class with a
//              `registerHandlers(ipcMain)` method.
//   probe-03b: after `registerHandlers(fakeIpcMain)` is called, three
//              `handle` calls have been recorded against the three
//              channel names: `frame-c:diff`, `frame-c:merge`,
//              `frame-c:focus` (per consolidated §6 amendment
//              `0f0e762`).
//   probe-03c: for each channel, invoking the captured handler with a
//              valid `{sessionName: 'session-foo'}` payload returns a
//              discriminated-union result on the `ok` boolean tag —
//              either `{ok: true, ...}` (success-shape per channel) or
//              `{ok: false, error_type: string, message: string}`
//              (failure-shape). The probe is lenient on which branch
//              is taken (DI-seam'd `runGit` stub can drive either);
//              tight on the shape contract.
//
// Wave C #3 Sub-Q resolutions encoded:
//   Sub-Q-MBTWBDPFA-A=(β-consolidated): §6 amendment landed `0f0e762`
//     enumerating the 3 channels; this probe asserts the
//     implementation matches the contract.
//   Sub-Q-MBTWBDPFA-B-{diff,merge,focus}=(i)/(i)/(i): action semantics
//     are tested via DI-seam stub (`runGit` for diff/merge;
//     `writeFrameMode` + `emitScroll` for focus); WB4 GREEN wires the
//     production deps.
//   Sub-Q-MBTWBDPFA-C=(α): inline-banner failure UX shipped at WB6;
//     this probe verifies the result-shape contract that the host
//     consumes for `failureState` plumbing.
//   Sub-Q-MBTWBDPFA-D=(α): NEW `frameCBridge` is preload.mts territory
//     (also WB4 GREEN); this probe is main-process-only and does NOT
//     exercise the preload bridge.
//
// RED state at HEAD `11f6f29`:
//   - `packages/dispatch-workstation/src/main/frame-c-ipc.ts` does not
//     exist (verified via `ls`).
//   - Dynamic `import('../../../src/main/frame-c-ipc.js')` rejects;
//     `FrameCIpcController` remains undefined.
//   - All 3 condition blocks fail at the per-test
//     `expect(FrameCIpcController).toBeDefined()` guard. Pattern
//     mirrors Wave B WB1 RED (`c5f98d5`) + this ticket's WB1 RED
//     (`07a7d93`).
//
// WB4 GREEN: author `packages/dispatch-workstation/src/main/frame-c-
// ipc.ts` exporting `FrameCIpcController` class + `FrameCIpcDeps`
// interface (per coord note `9fe6358` §2.2 signatures). 3 probes flip
// RED → GREEN.

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Structural types the controller contracts on. Mirrors coord note
// `9fe6358` §2.2 sketch; refined at WB4 GREEN authoring time.

interface FrameCIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

interface SessionLookup {
  (sessionName: string): { cwd: string; branchName: string } | null;
}

interface ScrollEmit {
  (payload: { sessionName: string }): void;
}

interface FrameCIpcDeps {
  readonly lookupSession: SessionLookup;
  readonly emitScroll: ScrollEmit;
  readonly writeFrameMode: (mode: 'A' | 'C') => void;
  readonly runGit?: (
    args: readonly string[],
    cwd: string,
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
}

interface FrameCIpcControllerClass {
  new (deps: FrameCIpcDeps): {
    registerHandlers(ipcMain: FrameCIpcMain): void;
  };
}

let FrameCIpcController: FrameCIpcControllerClass | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    // Variable-path dynamic-import bypasses Vite static-analysis
    // transform-time check. Pattern mirrors Wave B WB1 RED `c5f98d5` +
    // this ticket's WB1 RED `07a7d93`.
    const modulePath = '../../../src/main/frame-c-ipc.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    FrameCIpcController = (mod as { FrameCIpcController?: FrameCIpcControllerClass })
      .FrameCIpcController;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

// ─── Fakes ─────────────────────────────────────────────────────────────

function makeFakeIpcMain(): FrameCIpcMain & {
  handlers: Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >;
} {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown
  >();
  return {
    handle: (channel, fn) => {
      handlers.set(channel, fn);
    },
    handlers,
  };
}

function makeStubDeps(): FrameCIpcDeps {
  return {
    lookupSession: (_sessionName: string) => ({
      cwd: '/tmp/test-cwd',
      branchName: 'feature-x',
    }),
    emitScroll: vi.fn(),
    writeFrameMode: vi.fn(),
    runGit: async (_args, _cwd) => ({
      code: 0,
      stdout: 'fake git output',
      stderr: '',
    }),
  };
}

describe('MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB3 — FrameCIpcController + 3-channel contract', () => {
  describe('probe-03a: FrameCIpcController class exported with registerHandlers method', () => {
    it('module exports FrameCIpcController class', () => {
      if (importError) {
        throw new Error(
          `import failed (expected at WB3 RED; WB4 GREEN authors src/main/frame-c-ipc.ts): ${importError.message}`,
        );
      }
      expect(FrameCIpcController).toBeDefined();
      expect(typeof FrameCIpcController).toBe('function');
    });

    it('constructed instance has registerHandlers method', () => {
      expect(FrameCIpcController).toBeDefined();
      const instance = new FrameCIpcController!(makeStubDeps());
      expect(instance.registerHandlers).toBeDefined();
      expect(typeof instance.registerHandlers).toBe('function');
    });
  });

  describe('probe-03b: registerHandlers registers 3 channels (frame-c:diff, frame-c:merge, frame-c:focus)', () => {
    it('after registerHandlers(fakeIpcMain), all 3 channel names are recorded', () => {
      expect(FrameCIpcController).toBeDefined();
      const instance = new FrameCIpcController!(makeStubDeps());
      const fake = makeFakeIpcMain();
      instance.registerHandlers(fake);
      expect(
        fake.handlers.size,
        'registerHandlers must register exactly 3 channels per consolidated §6 amendment 0f0e762',
      ).toBe(3);
      expect(
        fake.handlers.has('frame-c:diff'),
        'frame-c:diff channel must be registered',
      ).toBe(true);
      expect(
        fake.handlers.has('frame-c:merge'),
        'frame-c:merge channel must be registered',
      ).toBe(true);
      expect(
        fake.handlers.has('frame-c:focus'),
        'frame-c:focus channel must be registered',
      ).toBe(true);
    });
  });

  describe('probe-03c: each channel handler returns discriminated-union result on {ok} tag', () => {
    it('frame-c:diff handler returns {ok:true,...} or {ok:false, error_type, message}', async () => {
      expect(FrameCIpcController).toBeDefined();
      const instance = new FrameCIpcController!(makeStubDeps());
      const fake = makeFakeIpcMain();
      instance.registerHandlers(fake);
      const handler = fake.handlers.get('frame-c:diff');
      expect(handler).toBeDefined();
      const result = (await handler!({}, { sessionName: 'session-foo' })) as Record<
        string,
        unknown
      >;
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect('ok' in result, 'result must have discriminating `ok` boolean tag').toBe(true);
      expect(typeof result['ok']).toBe('boolean');
      if (result['ok'] === false) {
        expect('error_type' in result, 'failure-shape requires error_type').toBe(true);
        expect('message' in result, 'failure-shape requires message').toBe(true);
        expect(typeof result['error_type']).toBe('string');
        expect(typeof result['message']).toBe('string');
      }
    });

    it('frame-c:merge handler returns {ok:true,...} or {ok:false, error_type, message}', async () => {
      expect(FrameCIpcController).toBeDefined();
      const instance = new FrameCIpcController!(makeStubDeps());
      const fake = makeFakeIpcMain();
      instance.registerHandlers(fake);
      const handler = fake.handlers.get('frame-c:merge');
      expect(handler).toBeDefined();
      const result = (await handler!({}, { sessionName: 'session-foo' })) as Record<
        string,
        unknown
      >;
      expect(result).toBeDefined();
      expect('ok' in result).toBe(true);
      expect(typeof result['ok']).toBe('boolean');
      if (result['ok'] === false) {
        expect('error_type' in result).toBe(true);
        expect('message' in result).toBe(true);
        expect(typeof result['error_type']).toBe('string');
        expect(typeof result['message']).toBe('string');
      }
    });

    it('frame-c:focus handler returns {ok:true,...} or {ok:false, error_type, message}', async () => {
      expect(FrameCIpcController).toBeDefined();
      const instance = new FrameCIpcController!(makeStubDeps());
      const fake = makeFakeIpcMain();
      instance.registerHandlers(fake);
      const handler = fake.handlers.get('frame-c:focus');
      expect(handler).toBeDefined();
      const result = (await handler!({}, { sessionName: 'session-foo' })) as Record<
        string,
        unknown
      >;
      expect(result).toBeDefined();
      expect('ok' in result).toBe(true);
      expect(typeof result['ok']).toBe('boolean');
      if (result['ok'] === false) {
        expect('error_type' in result).toBe(true);
        expect('message' in result).toBe(true);
        expect(typeof result['error_type']).toBe('string');
        expect(typeof result['message']).toBe('string');
      }
    });
  });
});
