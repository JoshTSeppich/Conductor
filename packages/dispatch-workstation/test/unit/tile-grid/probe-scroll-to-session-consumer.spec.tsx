// @vitest-environment happy-dom
//
// MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING (FOLLOWUPS.md row 333,
// Tier 3) — renderer-side integration anchor — WB6 RED.
//
// Contract spec: c5 ships TWO surfaces for closing the renderer-side
// consumer anchor:
//
//   (1) A pure-fn module at
//       `packages/dispatch-workstation/src/tile-grid/scroll-to-session-
//       consumer.ts` exposing:
//
//         export interface ScrollToSessionPayload {
//           readonly sessionName: string;
//         }
//         export interface ScrollToSessionBridge {
//           onScrollToSession?: (
//             cb: (payload: ScrollToSessionPayload) => void,
//           ) => () => void;
//         }
//         export function subscribeToScrollToSession(
//           bridge: ScrollToSessionBridge,
//           callback: (payload: ScrollToSessionPayload) => void,
//         ): () => void;
//
//   (2) `WorkstationBridgeShape` extends `ScrollToSessionBridge` so the
//       same workstationBridge prop carries the optional method.
//       TileGridApp wires `useEffect` calling subscribeToScrollToSession
//       to update a renderer-side `lastScrollTargetSessionName` state —
//       the anchor that future work (visual scroll/highlight in
//       tile-grid.tsx, OUT of c5 territory) reads from.
//
// At HEAD post-WB5 (a833b94), `frame-c:focus` IPC handler emits
// `frame-c:scroll-to-session` via `mainWindow.webContents.send(...)`
// (main.ts:594) but no renderer-side subscriber exists. The
// `frameCBridge` preload exposes only invoke-style methods; subscribe-
// style `onScrollToSession` is OUT of c5 territory.
//
// RED state: `scroll-to-session-consumer.ts` does NOT exist;
// WorkstationBridgeShape lacks `onScrollToSession`. Imports fail at
// module resolution.
//
// Closure anchor: FOLLOWUPS.md:333 (MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-
// MISSING Tier 3); main.ts:594 emit site; frame-c-ipc.ts:43-46
// ScrollEmitter dep contract. c5 anchor-closure-only — full Tier-3
// closure pending preload.mts subscribe-API extension + tile-grid.tsx
// scroll/highlight implementation, both OUT of c5 territory.

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import {
  subscribeToScrollToSession,
  type ScrollToSessionBridge,
  type ScrollToSessionPayload,
} from '../../../src/tile-grid/scroll-to-session-consumer.js';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fake bridge with onScrollToSession ──────────────────────────────────

interface FakeScrollBridge extends WorkstationBridgeShape {
  emitScrollToSession: (payload: ScrollToSessionPayload) => void;
}

function makeFakeBridge(): FakeScrollBridge {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  const scrollHandlers = new Set<(payload: ScrollToSessionPayload) => void>();
  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => spawnHandlers.delete(cb);
    },
    onScrollToSession: (cb) => {
      scrollHandlers.add(cb);
      return () => scrollHandlers.delete(cb);
    },
    emitScrollToSession: (payload) => {
      scrollHandlers.forEach((h) => h(payload));
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

// ─── Pure-fn subscribeToScrollToSession tests ────────────────────────────

describe('MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING — subscribeToScrollToSession pure-fn', () => {
  it('subscribeToScrollToSession is exported as a function', () => {
    expect(typeof subscribeToScrollToSession).toBe('function');
  });

  it('with bridge.onScrollToSession defined, attaches the callback', () => {
    const handlers = new Set<(p: ScrollToSessionPayload) => void>();
    const bridge: ScrollToSessionBridge = {
      onScrollToSession: (cb) => {
        handlers.add(cb);
        return () => handlers.delete(cb);
      },
    };
    const cb = vi.fn();
    subscribeToScrollToSession(bridge, cb);
    expect(handlers.size).toBe(1);
    handlers.forEach((h) => h({ sessionName: 'sess-a' }));
    expect(cb).toHaveBeenCalledWith({ sessionName: 'sess-a' });
  });

  it('returns the bridge cleanup function verbatim', () => {
    const cleanup = vi.fn(() => undefined);
    const bridge: ScrollToSessionBridge = {
      onScrollToSession: () => cleanup,
    };
    const returned = subscribeToScrollToSession(bridge, () => {});
    expect(typeof returned).toBe('function');
    returned();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('with bridge.onScrollToSession undefined, returns no-op cleanup', () => {
    const bridge: ScrollToSessionBridge = {};
    const returned = subscribeToScrollToSession(bridge, () => {});
    expect(typeof returned).toBe('function');
    expect(() => returned()).not.toThrow();
  });

  it('payload sessionName is delivered unmodified to callback', () => {
    const handlers = new Set<(p: ScrollToSessionPayload) => void>();
    const bridge: ScrollToSessionBridge = {
      onScrollToSession: (cb) => {
        handlers.add(cb);
        return () => handlers.delete(cb);
      },
    };
    const received: ScrollToSessionPayload[] = [];
    subscribeToScrollToSession(bridge, (p) => received.push(p));
    handlers.forEach((h) => h({ sessionName: 'feat-x' }));
    handlers.forEach((h) => h({ sessionName: 'feat-y' }));
    expect(received).toEqual([
      { sessionName: 'feat-x' },
      { sessionName: 'feat-y' },
    ]);
  });
});

// ─── TileGridApp integration tests ───────────────────────────────────────

describe('MB-F-FRAME-C-FOCUS-EVENT-CONSUMER-MISSING — TileGridApp wiring', () => {
  it('TileGridApp subscribes to bridge.onScrollToSession on mount', () => {
    const f = makeFixtures();
    const spy = vi.spyOn(f.workstation, 'onScrollToSession');
    render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.console.bridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'sess-a' }]}
      />,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('TileGridApp cleanup unsubscribes onScrollToSession', () => {
    const f = makeFixtures();
    const cleanup = vi.fn();
    f.workstation.onScrollToSession = vi.fn(() => cleanup);
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

  it('TileGridApp gracefully handles bridge without onScrollToSession', () => {
    // Production path: preload.mts at HEAD does NOT expose
    // onScrollToSession. TileGridApp must render without throwing.
    const bridge: WorkstationBridgeShape = {
      onSpawnResult: () => () => {},
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

  it('emitScrollToSession delivers payload to TileGridApp subscriber callback', () => {
    const f = makeFixtures();
    let capturedCb: ((p: ScrollToSessionPayload) => void) | null = null;
    f.workstation.onScrollToSession = (cb) => {
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
    // TileGridApp's callback must accept the payload without throwing.
    // Renderer-side scroll/highlight implementation is OUT of c5
    // territory (tile-grid.tsx + tile.tsx forbidden per manifest); see
    // commit body test plan and coord doc.
    expect(() =>
      act(() => {
        capturedCb!({ sessionName: 'sess-a' });
      }),
    ).not.toThrow();
  });
});
