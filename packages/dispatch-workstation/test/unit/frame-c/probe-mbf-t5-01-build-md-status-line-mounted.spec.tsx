// @vitest-environment happy-dom
//
// MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING WB1 (red) — FrameCRoot mounts
// BuildMdStatusLine + invokes window.workstationBridge.readBuildMd() on
// mount + threads the result through.
//
// Closure-target row body (docs/FOLLOWUPS.md:353, filed at `87c04b6`):
//   "T5 WB6 ships BuildMdStatusLine React component at
//    packages/dispatch-workstation/src/frame-c/build-md-status-line.tsx
//    (88 lines; 7/7 probe-mbtwft5-03 cases passing) per Sub-Q-MBTWFT5-E=(i)
//    operator arbitration 2026-05-12, but the component is NOT yet mounted
//    in frame-c-root.tsx ... Closure path: (α) Mount <BuildMdStatusLine
//    result={...} onSpawnTriggerClick={...} /> in src/frame-c/frame-c-root.tsx."
//
// Conditions:
//   (1) Mounting FrameCRoot invokes window.workstationBridge.readBuildMd
//       at least once on mount (state-holder pattern per FOLLOWUPS:353
//       row body).
//   (2) After async resolution of bridge.readBuildMd, an element with
//       data-testid="build-md-status-line" appears inside the
//       frame-c-root container (BuildMdStatusLine ships this testid at
//       build-md-status-line.tsx:39).
//   (3) After async resolution, the rendered status line reflects the
//       fixture status counts (taskCount, blockedCount, readyCount)
//       per the wireframe §1 text contract verbatim.
//
// RED state at HEAD post-`87c04b6` (KNOWN-via-grep):
//   - frame-c-root.tsx contains no `BuildMdStatusLine` import or render
//     (verified via grep returning empty at HEAD).
//   - All 3 conditions fail at their respective assertions: readBuildMd
//     never called; status-line element absent; counts text absent.
//
// GREEN target (WB1 GREEN): extend FrameCRoot to (a) `useState<
// BuildMdLoadResult | null>(null)` for buildMdResult; (b) `useEffect` on
// mount calling `window.workstationBridge.readBuildMd().then(setResult)`
// via globalThis access (mirrors detail-pane.tsx:575-583 pattern);
// (c) render <BuildMdStatusLine result={buildMdResult} /> at Frame-C
// bottom when buildMdResult !== null.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';

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
  triggerBuildMdDispatch?: ReturnType<typeof vi.fn>;
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

describe('MB-F-T5-BUILD-MD-STATUS-LINE-MOUNT-WIRING WB1 — FrameCRoot mounts BuildMdStatusLine + reads BUILD.md', () => {
  describe('Condition (1): mounting FrameCRoot invokes window.workstationBridge.readBuildMd()', () => {
    it('readBuildMd is called at least once after mount', async () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      await waitFor(() => {
        expect(
          bridge.readBuildMd,
          'FrameCRoot must call window.workstationBridge.readBuildMd() on mount (FOLLOWUPS:353 closure-path α)',
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Condition (2): BuildMdStatusLine renders inside frame-c-root after async resolution', () => {
    it('build-md-status-line testid appears in container after readBuildMd resolves', async () => {
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      await waitFor(() => {
        const statusLine = container.querySelector(
          '[data-testid="build-md-status-line"]',
        );
        expect(
          statusLine,
          'BuildMdStatusLine must render inside frame-c-root after bridge.readBuildMd resolves (FOLLOWUPS:353 closure-path α mount)',
        ).not.toBeNull();
      });
    });
  });

  describe('Condition (3): rendered status line reflects fixture taskCount + blockedCount + readyCount', () => {
    it('status line text content includes 7 tasks, 2 blocked, 3 ready per fixture', async () => {
      expect(mountFrameC).toBeDefined();
      const bridge: StubWorkstationBridge = {
        readBuildMd: vi.fn(async () => FIXTURE_RESULT),
        onSpawnResult: () => () => undefined,
      };
      installBridge(bridge);
      await act(async () => {
        handle = mountFrameC!(container, {});
      });
      await waitFor(() => {
        const taskCount = container.querySelector(
          '[data-testid="build-md-task-count"]',
        );
        const blockedCount = container.querySelector(
          '[data-testid="build-md-blocked-count"]',
        );
        const readyCount = container.querySelector(
          '[data-testid="build-md-ready-count"]',
        );
        expect(taskCount?.textContent, 'taskCount span renders 7').toBe('7');
        expect(blockedCount?.textContent, 'blockedCount span renders 2').toBe('2');
        expect(readyCount?.textContent, 'readyCount span renders 3').toBe('3');
      });
    });
  });
});
