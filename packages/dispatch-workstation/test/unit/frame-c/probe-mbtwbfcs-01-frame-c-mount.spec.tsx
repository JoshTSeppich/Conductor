// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB1 (red) — frame-c mount factory
// contract probe.
//
// Asserts (per ticket body a1f7a03 §4 WB1):
//   (1) `mountFrameC` factory exported from `frame-c/mount.tsx`.
//   (2) Invoking `mountFrameC(container, props)` renders a root element
//       with `data-testid="frame-c-root"` into the container.
//   (3) The root contains the two-column structure required by §1.1
//       item 3-4: a session-list column (left) + detail-pane column (right).
//       Tested via `data-testid="frame-c-session-list-col"` +
//       `data-testid="frame-c-detail-col"`.
//   (4) The factory returns a `{ dispose(): void }` handle (per
//       `tile-grid/mount.ts` + `chat-shell/mount.ts` factory convention).
//
// RED state at HEAD `bb36f26`:
//   - `packages/dispatch-workstation/src/frame-c/` directory does not
//     exist (verified via `ls`).
//   - Dynamic `import('../../../src/frame-c/mount.js')` rejects;
//     `mountFrameC` remains undefined.
//   - All 4 it-blocks fail at the per-test `expect(mountFrameC).toBeDefined()`
//     guard. Pattern mirrors probe-mbthsowire-06 (dynamic-import-with-
//     beforeAll) so RED state shows clear per-condition failures rather
//     than a single hard import-time crash for the whole spec file.
//
// WB2 GREEN: scaffold `frame-c/mount.tsx` + `frame-c/frame-c-root.tsx`
// + `frame-c/index.ts` barrel; all 4 conditions flip RED → GREEN.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

// Structural types the factory consumes. Mirrors ticket body §4 WB2
// FrameCMountProps sketch; refined at WB2 GREEN scaffold time.
interface FrameCMountProps {
  // initialSessions + selection-related props deferred to WB4/WB6 per
  // §C.1′ #2 ladder; WB1 asserts only the mount-and-render contract.
}

interface FrameCMountHandle {
  dispose(): void;
}

type MountFrameC = (
  container: HTMLElement,
  props: FrameCMountProps,
) => FrameCMountHandle;

let mountFrameC: MountFrameC | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    // Path constructed dynamically to bypass Vite's static-analysis of
    // dynamic-import targets — at WB1 RED time the path resolves to a
    // non-existent file and Vite's transform-time check would otherwise
    // fail the whole spec file rather than letting per-test guards
    // surface the missing-module condition cleanly. WB2 GREEN authors
    // the file; this pattern is robust to either RED or GREEN state.
    const modulePath = '../../../src/frame-c/mount.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    mountFrameC = (mod as { mountFrameC?: MountFrameC }).mountFrameC;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB1 — frame-c mount factory contract', () => {
  describe('Condition (1): mountFrameC factory exported', () => {
    it('module exports mountFrameC factory function', () => {
      if (importError) {
        throw new Error(
          `import failed (expected at WB1 RED; WB2 GREEN authors the module): ${importError.message}`,
        );
      }
      expect(mountFrameC).toBeDefined();
      expect(typeof mountFrameC).toBe('function');
    });
  });

  describe('Condition (2): factory renders frame-c-root into container', () => {
    it('mountFrameC(container, props) renders a root with data-testid="frame-c-root"', () => {
      expect(mountFrameC).toBeDefined();
      const container = document.createElement('div');
      document.body.appendChild(container);
      try {
        act(() => {
          mountFrameC!(container, {});
        });
        const root = container.querySelector('[data-testid="frame-c-root"]');
        expect(
          root,
          'mountFrameC must render a root element with data-testid="frame-c-root" so Frame Router CSS (data-frame-mode="C") can scope to it',
        ).not.toBeNull();
      } finally {
        container.remove();
      }
    });
  });

  describe('Condition (3): two-column structure (session-list + detail-pane)', () => {
    it('frame-c-root contains frame-c-session-list-col + frame-c-detail-col', () => {
      expect(mountFrameC).toBeDefined();
      const container = document.createElement('div');
      document.body.appendChild(container);
      try {
        act(() => {
          mountFrameC!(container, {});
        });
        const sessionListCol = container.querySelector(
          '[data-testid="frame-c-session-list-col"]',
        );
        const detailCol = container.querySelector(
          '[data-testid="frame-c-detail-col"]',
        );
        expect(
          sessionListCol,
          'frame-c-root must contain a session-list column (left); WB4 SessionList component renders into this slot',
        ).not.toBeNull();
        expect(
          detailCol,
          'frame-c-root must contain a detail-pane column (right); WB8 DetailPane component renders into this slot',
        ).not.toBeNull();
      } finally {
        container.remove();
      }
    });
  });

  describe('Condition (4): factory returns dispose handle', () => {
    it('mountFrameC returns an object with a dispose() function', () => {
      expect(mountFrameC).toBeDefined();
      const container = document.createElement('div');
      document.body.appendChild(container);
      try {
        const handle = mountFrameC!(container, {});
        expect(handle).toBeDefined();
        expect(typeof handle.dispose).toBe('function');
        // Calling dispose() should not throw.
        expect(() => handle.dispose()).not.toThrow();
      } finally {
        container.remove();
      }
    });
  });
});
