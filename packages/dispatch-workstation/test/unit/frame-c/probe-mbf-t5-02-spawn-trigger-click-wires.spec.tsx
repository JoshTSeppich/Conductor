// @vitest-environment happy-dom
//
// MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING WB2 (red) — clicking the
// `build-md-spawn-trigger` button (rendered by BuildMdStatusLine when
// readyCount > 0) invokes window.workstationBridge.triggerBuildMdDispatch().
//
// Closure-target row body (docs/FOLLOWUPS.md:353) verbatim:
//   "onSpawnTriggerClick: () => window.workstationBridge
//    .triggerBuildMdDispatch().then(r => /* re-fetch status or
//    update UI */)"
//
// Conditions:
//   (1) After mount + readBuildMd async resolution, the
//       `data-testid="build-md-spawn-trigger"` button is present (gated
//       on readyCount > 0 per build-md-status-line.tsx:49; fixture
//       readyCount = 3 satisfies the gate).
//   (2) Firing a click event on the button results in
//       window.workstationBridge.triggerBuildMdDispatch being called
//       exactly once.
//   (3) After the dispatch trigger resolves, readBuildMd is invoked
//       AGAIN to re-fetch status (closure-path note "/* re-fetch
//       status or update UI */" — re-fetch is the operative behavior).
//       Asserts total readBuildMd invocation count ≥ 2 after click +
//       dispatch resolution.
//
// RED state at HEAD post-WB1 GREEN `c03d32d`:
//   - frame-c-root.tsx renders <BuildMdStatusLine result={buildMdResult} />
//     WITHOUT onSpawnTriggerClick prop (deferred to WB2 per WB1 commit body).
//   - Clicking the button has no wired handler — bridge.triggerBuildMdDispatch
//     is never called; readBuildMd remains at its single mount-invocation
//     count.
//   - Conditions (2) + (3) fail at HEAD; condition (1) passes (status line
//     + button render via WB1 GREEN render gate + fixture readyCount=3).
//
// GREEN target (WB2 GREEN): extend frame-c-root.tsx useEffect-scope OR a
// useCallback to invoke bridge.triggerBuildMdDispatch() then re-call
// bridge.readBuildMd() to refresh the status; pass the callback as
// `onSpawnTriggerClick` to BuildMdStatusLine.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, waitFor } from '@testing-library/react';

interface BuildMdStatusFixture {
  readonly taskCount: number;
  readonly blockedCount: number;
  readonly readyCount: number;
  readonly errorCount: number;
}

interface BuildMdLoadSuccessFixture {
  readonly ok: true;
  readonly path: string;
  readonly revSha?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly dag: any;
  readonly status: BuildMdStatusFixture;
}

const FIXTURE_RESULT: BuildMdLoadSuccessFixture = {
  ok: true,
  path: '/repo-root/BUILD.md',
  revSha: 'abc1234',
  dag: { tasks: [] },
  status: {
    taskCount: 7,
    blockedCount: 2,
    readyCount: 3,
    errorCount: 0,
  },
};

const FIXTURE_DISPATCH_TRIGGER_RESULT = {
  ok: true,
  spawnedCount: 3,
  declinedCount: 0,
  queuedCount: 0,
};

type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let mountFrameC: MountFrameCAny | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/mount.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    mountFrameC = (mod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

interface StubWorkstationBridge {
  readBuildMd: ReturnType<typeof vi.fn>;
  triggerBuildMdDispatch: ReturnType<typeof vi.fn>;
  onSpawnResult?: (cb: (r: unknown) => void) => () => void;
}

function installBridge(bridge: StubWorkstationBridge): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? globalThis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window.workstationBridge = bridge;
}

function clearBridge(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).window?.workstationBridge) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window.workstationBridge;
  }
}

let container: HTMLElement;
let handle: { dispose(): void } | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  handle = null;
});

afterEach(() => {
  handle?.dispose();
  container.remove();
  clearBridge();
});

describe('MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING WB2 — spawn-trigger button click wires to triggerBuildMdDispatch', () => {
  describe('Condition (1): spawn-trigger button renders after readBuildMd resolves with readyCount > 0', () => {
    it('build-md-spawn-trigger testid appears in container after async resolution', async () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        triggerBuildMdDispatch: vi.fn(async () => FIXTURE_DISPATCH_TRIGGER_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      await waitFor(() => {
        const button = container.querySelector(
          '[data-testid="build-md-spawn-trigger"]',
        );
        expect(
          button,
          'BuildMdStatusLine must render Spawn button when readyCount > 0 (build-md-status-line.tsx:49 gate)',
        ).not.toBeNull();
      });
    });
  });

  describe('Condition (2): clicking spawn-trigger invokes bridge.triggerBuildMdDispatch exactly once', () => {
    it('after fireEvent.click on the button, triggerBuildMdDispatch is called once', async () => {
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        triggerBuildMdDispatch: vi.fn(async () => FIXTURE_DISPATCH_TRIGGER_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      let button: Element | null = null;
      await waitFor(() => {
        button = container.querySelector(
          '[data-testid="build-md-spawn-trigger"]',
        );
        expect(button).not.toBeNull();
      });
      await act(async () => {
        fireEvent.click(button!);
      });
      await waitFor(() => {
        expect(
          bridge.triggerBuildMdDispatch,
          'clicking the Spawn button must invoke bridge.triggerBuildMdDispatch (FOLLOWUPS:353 onSpawnTriggerClick closure-path)',
        ).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Condition (3): after dispatch trigger resolves, readBuildMd is invoked again (re-fetch status)', () => {
    it('readBuildMd call count ≥ 2 after click + dispatch resolution', async () => {
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        triggerBuildMdDispatch: vi.fn(async () => FIXTURE_DISPATCH_TRIGGER_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      let button: Element | null = null;
      await waitFor(() => {
        button = container.querySelector(
          '[data-testid="build-md-spawn-trigger"]',
        );
        expect(button).not.toBeNull();
      });
      await act(async () => {
        fireEvent.click(button!);
      });
      await waitFor(() => {
        expect(
          (bridge.readBuildMd as ReturnType<typeof vi.fn>).mock.calls.length,
          'readBuildMd must be re-invoked after dispatch trigger resolves (FOLLOWUPS:353 closure-path "re-fetch status" note)',
        ).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
