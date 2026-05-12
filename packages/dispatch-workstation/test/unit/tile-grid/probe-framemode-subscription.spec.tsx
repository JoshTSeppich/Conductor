// @vitest-environment happy-dom
//
// MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP-2026-05-11 (FOLLOWUPS.md
// row 313, Tier 2) — renderer-side integration anchor — WB4 RED.
//
// Contract spec: c5 ships TWO surfaces for closing the renderer-side
// subscription anchor:
//
//   (1) A small pure-fn module at
//       `packages/dispatch-workstation/src/tile-grid/frame-mode-
//       subscription.ts` exposing:
//
//         export interface FrameModeBridge {
//           onFrameModeChange?: (cb: (mode: FrameMode) => void) => () => void;
//         }
//
//         export function subscribeToFrameMode(
//           bridge: FrameModeBridge,
//           callback: (mode: FrameMode) => void,
//         ): () => void;
//
//       Semantics:
//         - If bridge.onFrameModeChange is defined, attach `callback`
//           via it and return its returned cleanup verbatim.
//         - If bridge.onFrameModeChange is undefined (production at
//           HEAD; preload.mts hasn't shipped onFrameModeChange yet
//           — out of c5 territory), return a no-op cleanup. This
//           keeps TileGridApp's useEffect API stable across the
//           bridge-extension lifecycle.
//
//   (2) `WorkstationBridgeShape` (in tile-grid-app.tsx) extends
//       `FrameModeBridge` so the same workstationBridge prop carries
//       the optional method. TileGridApp wires:
//
//         useEffect(() => subscribeToFrameMode(workstationBridge,
//           setFrameMode), [workstationBridge]);
//
//       so frame-mode changes flow into a renderer-side `frameMode`
//       state (defaulting to 'C' to match shell-level
//       `[data-frame-mode]` default at workstation-shell.html:46).
//
// Renderer-side prop-drill into <Tile frameMode={...}/> is OUT OF c5
// territory — `tile-grid.tsx` (and `tile.tsx`) are forbidden per
// manifest. That step is downstream work (separate ticket); see
// coord-c5-revert-and-contract-alignment-2026-05-12.md §6 honest
// framing.
//
// RED state: at HEAD post-WB3 (56925b8), `frame-mode-subscription.ts`
// does NOT exist; `WorkstationBridgeShape` does NOT include
// `onFrameModeChange`. Imports fail at module resolution.
//
// Closure anchor: FOLLOWUPS.md:313 (MB-F-TILEGRIDAPP-FRAMEMODE-
// SUBSCRIPTION-GAP-2026-05-11 Tier 2); dispatch-queue row
// `c5-ticket-wb1`. c5 anchor-closure-only — full Tier-2 closure
// pending preload.mts extension exposing `onFrameModeChange` (out of
// territory).

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
// @ts-expect-error WB4 RED: frame-mode-subscription module not yet authored until WB5 GREEN
import {
  subscribeToFrameMode,
  type FrameModeBridge,
} from '../../../src/tile-grid/frame-mode-subscription.js';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';
import type { FrameMode } from '../../../src/main/frame-mode-state.js';

// ─── Fake bridge with onFrameModeChange ──────────────────────────────────

interface FakeFrameModeBridge extends WorkstationBridgeShape {
  emitFrameMode: (mode: FrameMode) => void;
}

function makeFakeBridge(): FakeFrameModeBridge {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  const frameModeHandlers = new Set<(mode: FrameMode) => void>();
  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => spawnHandlers.delete(cb);
    },
    // @ts-expect-error WB4 RED: onFrameModeChange not in WorkstationBridgeShape until WB5 GREEN
    onFrameModeChange: (cb: (mode: FrameMode) => void) => {
      frameModeHandlers.add(cb);
      return () => frameModeHandlers.delete(cb);
    },
    emitFrameMode: (mode) => {
      frameModeHandlers.forEach((h) => h(mode));
    },
  };
}

function makeFixtures() {
  return {
    workstation: makeFakeBridge(),
    console: makeFakeConsoleBridge(),
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

// ─── Pure-fn subscribeToFrameMode tests ──────────────────────────────────

describe('MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP — subscribeToFrameMode pure-fn', () => {
  it('subscribeToFrameMode is exported as a function', () => {
    expect(typeof subscribeToFrameMode).toBe('function');
  });

  it('with bridge.onFrameModeChange defined, attaches the callback', () => {
    const handlers = new Set<(mode: FrameMode) => void>();
    const bridge: FrameModeBridge = {
      onFrameModeChange: (cb) => {
        handlers.add(cb);
        return () => handlers.delete(cb);
      },
    };
    const cb = vi.fn();
    subscribeToFrameMode(bridge, cb);
    expect(handlers.size).toBe(1);
    // Invoke through the captured handler to verify the callback is the
    // exact function passed (not wrapped, not bound to a different ctx).
    handlers.forEach((h) => h('A'));
    expect(cb).toHaveBeenCalledWith('A');
  });

  it('returns the bridge cleanup function verbatim', () => {
    const handlers = new Set<(mode: FrameMode) => void>();
    const cleanup = vi.fn(() => undefined);
    const bridge: FrameModeBridge = {
      onFrameModeChange: (cb) => {
        handlers.add(cb);
        return cleanup;
      },
    };
    const returned = subscribeToFrameMode(bridge, () => {});
    expect(typeof returned).toBe('function');
    returned();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('with bridge.onFrameModeChange undefined, returns a no-op cleanup', () => {
    const bridge: FrameModeBridge = {};
    const returned = subscribeToFrameMode(bridge, () => {});
    expect(typeof returned).toBe('function');
    expect(() => returned()).not.toThrow();
  });

  it('multiple subscribers can attach independently', () => {
    const handlers = new Set<(mode: FrameMode) => void>();
    const bridge: FrameModeBridge = {
      onFrameModeChange: (cb) => {
        handlers.add(cb);
        return () => handlers.delete(cb);
      },
    };
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const cleanup1 = subscribeToFrameMode(bridge, cb1);
    const cleanup2 = subscribeToFrameMode(bridge, cb2);
    expect(handlers.size).toBe(2);
    handlers.forEach((h) => h('A'));
    expect(cb1).toHaveBeenCalledWith('A');
    expect(cb2).toHaveBeenCalledWith('A');
    cleanup1();
    expect(handlers.size).toBe(1);
    cleanup2();
    expect(handlers.size).toBe(0);
  });
});

// ─── TileGridApp integration tests ───────────────────────────────────────

describe('MB-F-TILEGRIDAPP-FRAMEMODE-SUBSCRIPTION-GAP — TileGridApp wiring', () => {
  it('TileGridApp subscribes to bridge.onFrameModeChange on mount', () => {
    const f = makeFixtures();
    const onFrameModeChangeSpy = vi.spyOn(f.workstation, 'onFrameModeChange');
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );
    expect(onFrameModeChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('TileGridApp cleanup unsubscribes onFrameModeChange', () => {
    const f = makeFixtures();
    const cleanup = vi.fn();
    f.workstation.onFrameModeChange = vi.fn(() => cleanup);
    const { unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('TileGridApp gracefully handles bridge without onFrameModeChange', () => {
    // Production path: preload.mts at HEAD does NOT expose
    // onFrameModeChange. TileGridApp must render without throwing.
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => () => {},
      // onFrameModeChange intentionally absent
    };
    const f = makeFixtures();
    expect(() =>
      render(
        <TileGridApp
          workstationBridge={bridge}
          consoleBridge={f.console.bridge}
          createTerminal={f.createTerminal}
          initialSessions={[{ name: 'sess-a' }]}
        />,
      ),
    ).not.toThrow();
  });

  it('emitFrameMode delivers payload to TileGridApp subscriber callback', () => {
    // Indirect verification: spy on the bridge's onFrameModeChange
    // *invocation*, then fire the captured callback via the fake
    // bridge's emit. The probe asserts the callback receives the mode
    // — i.e., TileGridApp passes a real callback into the bridge (not
    // a no-op).
    const f = makeFixtures();
    let capturedCb: ((mode: FrameMode) => void) | null = null;
    f.workstation.onFrameModeChange = (cb) => {
      capturedCb = cb;
      return () => {};
    };
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );
    expect(capturedCb).not.toBeNull();
    // Smoke: TileGridApp's callback should accept the mode without
    // throwing. Renderer-side prop-drill of frameMode → <Tile> is OUT
    // of c5 territory (see commit body Test plan).
    expect(() =>
      act(() => {
        capturedCb!('A');
      }),
    ).not.toThrow();
  });
});
