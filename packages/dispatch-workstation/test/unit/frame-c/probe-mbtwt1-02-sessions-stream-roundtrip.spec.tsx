// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB2 (red) — sessions-stream
// roundtrip contract probe.
//
// Per ticket body `ec60622` §4 WB2 (operator-acked Sub-Q-T1-A=(α)
// renderer-only useState; binding interpretation per `ec60622` commit
// body: "independent subscription pattern mirroring tile-grid-app.tsx:
// 159-185"):
//
//   Frame C SessionList must populate from a live spawn-result stream.
//   Mechanism: `mountFrameC` accepts a `workstationBridge` prop whose
//   `onSpawnResult(cb)` subscription FrameCRoot wires up in a useEffect
//   on mount; each `{ type: 'success', result: { sessionName } }` reply
//   appends a new `TileGridSessionEntry` to internal `useState`; the
//   SessionList re-renders with the new row.
//
// Encoded contract (4 conditions per ticket body acceptance):
//   (1) `mountFrameC` returns a working handle when given a
//       workstationBridge that exposes `onSpawnResult` (sanity guard;
//       passes regardless of WB4 state).
//   (2) Initial mount with NO emitted spawn-results renders 0
//       session rows (empty-state — verified GREEN at Wave B WB4
//       Condition 5; preserved here as anchor).
//   (3) After invoking the captured `onSpawnResult` callback with a
//       SpawnSuccessReply (`{ type: 'success', result: { sessionName } }`
//       shape per tile-grid-app.tsx:121-141 `isSpawnSuccessReply` contract),
//       SessionList re-renders with exactly 1 row whose
//       `data-testid="frame-c-session-row-{name}"` matches the reply's
//       sessionName.
//   (4) A second SpawnSuccessReply for a different sessionName produces
//       a second row (cumulative append; idempotent re-emit for the
//       same sessionName does NOT double-append — mirrors
//       tile-grid-app.tsx:173 dedup guard).
//
// RED state at HEAD `1644e5e` (post-WB1 RED):
//   - Conditions (1) + (2) GREEN: `mountFrameC` accepts loose-typed
//     props and renders the session-list-col with 0 rows when sessions
//     prop omitted (Wave B WB4 GREEN behavior).
//   - Conditions (3) + (4) FAIL RED: FrameCRoot has NO `workstationBridge`
//     prop in its FrameCRootProps shape (verified at frame-c-root.tsx:54-68);
//     no useEffect spawn-result subscription; the mocked `onSpawnResult`
//     callback is never captured; triggering it has no effect; 0 rows
//     remain.
//
// WB3 GREEN target (Sub-Q-T1-A=(α) source-of-truth surface):
//   - Extend FrameCRootProps with `workstationBridge?: { onSpawnResult:
//     (cb: (reply: unknown) => void) => () => void }` (or a stricter
//     type via re-export from tile-grid-app.tsx WorkstationBridgeShape).
//   - Add useState<TileGridSessionEntry[]>([]) + useEffect that wires
//     `workstationBridge.onSpawnResult` via the same `isSpawnSuccessReply`
//     parser used by tile-grid-app.tsx:133-141. Idempotent dedup by
//     `name` field per tile-grid-app.tsx:173 pattern.
//   - Initial state seeded from `sessions` prop if provided (allows
//     test-fixture mode + tile-grid-state.json seed parity for parent
//     mounts that pre-populate).
//
// WB4 GREEN target (mount.ts wiring):
//   - Replace empty-sessions stub at tile-grid/mount.ts:175-181 with
//     `mountFrameC(root, { workstationBridge })` reading
//     `window.workstationBridge` from the renderer global. WB1 probe
//     Condition (3) flips RED → GREEN at this point (literal `sessions:
//     []` regex no longer matches).

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

// Loose-typed factory call signature — FrameCMountProps shape extends
// across WB2 → WB3 → WB4. Probe uses `any` cast at call site to avoid
// coupling to a moving prop shape; assertions are DOM-based + callback-
// invocation-based, not type-based. Mirrors probe-mbtwbfcs-02 pattern.
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

// Mock workstationBridge — captures the onSpawnResult callback so the
// probe can synthetically emit spawn replies and observe re-render.
function createMockBridge(): {
  onSpawnResult: (cb: (reply: unknown) => void) => () => void;
  emit: (reply: unknown) => void;
  unsubscribeCount: () => number;
} {
  let captured: ((reply: unknown) => void) | null = null;
  let unsubs = 0;
  return {
    onSpawnResult(cb) {
      captured = cb;
      return () => {
        unsubs += 1;
        captured = null;
      };
    },
    emit(reply) {
      if (captured) captured(reply);
    },
    unsubscribeCount() {
      return unsubs;
    },
  };
}

function mountWithBridge(bridge: ReturnType<typeof createMockBridge>): {
  container: HTMLElement;
  dispose: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let handle: { dispose(): void } | null = null;
  act(() => {
    handle = mountFrameC!(container, { workstationBridge: bridge });
  });
  return {
    container,
    dispose: () => {
      handle?.dispose();
      container.remove();
    },
  };
}

function emitSpawnSuccess(
  bridge: ReturnType<typeof createMockBridge>,
  sessionName: string,
  cwd?: string,
): void {
  act(() => {
    bridge.emit({
      type: 'success',
      result: {
        sessionName,
        ...(cwd !== undefined ? { cwd } : {}),
      },
    });
  });
}

function countSessionRows(container: HTMLElement): number {
  const col = container.querySelector(
    '[data-testid="frame-c-session-list-col"]',
  );
  if (col === null) return 0;
  // data-session-name attribute is set ONLY on row elements (not nested
  // status/name/meta spans) per session-list.tsx:163.
  return col.querySelectorAll('[data-session-name]').length;
}

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB2 — sessions-stream roundtrip contract', () => {
  describe('Condition (1): mountFrameC accepts workstationBridge prop without crash', () => {
    it('factory returns a working dispose handle when given workstationBridge', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const bridge = createMockBridge();
      const { container, dispose } = mountWithBridge(bridge);
      try {
        expect(
          container.querySelector('[data-testid="frame-c-root"]'),
          'frame-c-root must render even when sessions prop omitted',
        ).not.toBeNull();
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (2): initial mount renders 0 rows (empty-state)', () => {
    it('no emitted spawn-results → session-list-col contains 0 rows', () => {
      expect(mountFrameC).toBeDefined();
      const bridge = createMockBridge();
      const { container, dispose } = mountWithBridge(bridge);
      try {
        expect(
          countSessionRows(container),
          'initial state must render 0 rows (honest empty-state per Wave B WB4 Condition 5)',
        ).toBe(0);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (3): single spawn-success → 1 row appears', () => {
    it('emitting onSpawnResult callback with a SpawnSuccessReply renders the new session row', () => {
      expect(mountFrameC).toBeDefined();
      const bridge = createMockBridge();
      const { container, dispose } = mountWithBridge(bridge);
      try {
        emitSpawnSuccess(bridge, 'sess-alpha');
        const row = container.querySelector(
          '[data-testid="frame-c-session-row-sess-alpha"]',
        );
        expect(
          row,
          'sess-alpha row must appear after spawn-result emission (Sub-Q-T1-A=(α) independent subscription per ec60622 commit body)',
        ).not.toBeNull();
        expect(
          countSessionRows(container),
          'exactly 1 row total after single spawn-result emission',
        ).toBe(1);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (4): second spawn-result appends; duplicate name dedups', () => {
    it('two distinct spawn-results → 2 rows; duplicate sessionName re-emit → still 2 rows', () => {
      expect(mountFrameC).toBeDefined();
      const bridge = createMockBridge();
      const { container, dispose } = mountWithBridge(bridge);
      try {
        emitSpawnSuccess(bridge, 'sess-alpha');
        emitSpawnSuccess(bridge, 'sess-beta');
        expect(countSessionRows(container), 'two distinct → 2 rows').toBe(2);
        // Idempotent dedup — mirrors tile-grid-app.tsx:173 guard.
        emitSpawnSuccess(bridge, 'sess-alpha');
        expect(
          countSessionRows(container),
          'duplicate sess-alpha re-emit must NOT add a third row (idempotent dedup per tile-grid-app.tsx:173 pattern)',
        ).toBe(2);
      } finally {
        dispose();
      }
    });
  });
});
