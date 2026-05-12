// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB1 (red) — probe-mbtwft2-01
// TerminalStream component mount + per-session-filtered stdout subscription
// + unmount-cleanup contract.
//
// Asserts (per ticket body 30ab109 §4 WB1):
//   (a) Importing `frame-c/terminal-stream.js` resolves and exports the
//       `TerminalStream` named React component.
//   (b) On mount with `{ targetSessionName, consoleBridge, createTerminal }`,
//       an element with `data-testid="frame-c-terminal-stream-root"` is
//       present in the DOM. (Idle state — no console:open lifecycle
//       assumption; matches the WB2 SPIKE §2.5 listener-only expectation.
//       If the WB2 spike outcome forces an open-gate, this probe's
//       Condition (b) becomes an open-event-driven render — adjusted at
//       WB2 GREEN.)
//   (c) On mount, `consoleBridge.onStdoutChunk` is called exactly once.
//       A chunk whose `sessionName === targetSessionName` results in the
//       chunk bytes being forwarded to the injected TerminalAdapter's
//       `write(data)`. A chunk whose `sessionName !== targetSessionName`
//       does NOT reach the adapter. Mirrors the per-session filter
//       precedent at `console-panel.tsx:92-99`.
//   (d) On unmount, the cleanup-fn returned by `onStdoutChunk` is invoked
//       — listener-leak prevention parity with ConsolePanel cluster-3
//       listener-cleanup tests.
//
// RED state at HEAD `30ab109` (post-ticket-body commit):
//   - `frame-c/terminal-stream.tsx` does NOT exist. Verified via `ls
//     packages/dispatch-workstation/src/frame-c/` at WB1 authoring:
//     action-bar.tsx, detail-pane.tsx, frame-c-root.tsx, index.ts,
//     mount.tsx, session-list.tsx (6 files; no terminal-stream.tsx).
//   - Dynamic import in beforeAll captures the resolve-failure; all
//     four `Condition` blocks fail at the import-guard.
//
// WB2 GREEN target: create `frame-c/terminal-stream.tsx` exporting
//   `TerminalStream({ targetSessionName, consoleBridge, createTerminal }):
//   JSX.Element`. Implementation mirrors `ConsolePanel`'s per-session
//   filter pattern (`console-panel.tsx:82-126`) — useEffect subscribes
//   to `consoleBridge.onStdoutChunk`, filters by
//   `p.sessionName === targetSessionName`, writes decoded bytes to
//   `terminalAdapterRef.current?.write(...)` (base64 fallback per
//   `console-panel.tsx:189-205`). Render emits a root element with
//   `data-testid="frame-c-terminal-stream-root"` containing the terminal
//   container ref.
//
// Reuse confirmation (per ticket §2.4): `consoleBridge.onStdoutChunk`
// (CONSOLE-T02 `eac381e`) IS per-session-filterable via the
// `StdoutChunkPayload { sessionName, stdoutSeq, bytes, encoding }` shape.
// NO new IPC channel introduced in this WB. The WB2 SPIKE (§2.5)
// validates the runtime lifecycle assumption that `console:stdout-chunk`
// events fire for the selected session without a separate
// `console:open-panel` window invocation.
//
// Fixture reuse: imports `makeFakeConsoleBridge` + `makeFakeTerminalAdapter`
// from the CONSOLE-T03 test directory (cross-directory test fixture reuse
// — the fakes are pure-fn, no runtime dependency on CONSOLE-T03).

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import type { ConsoleBridge } from '../../../src/main/console-bridge.js';
import type { TerminalAdapter } from '../../../src/console-panel/terminal-adapter.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

interface TerminalStreamProps {
  readonly targetSessionName: string;
  readonly consoleBridge: ConsoleBridge;
  readonly createTerminal: () => TerminalAdapter;
}

type TerminalStreamComponent = (props: TerminalStreamProps) => JSX.Element;

let TerminalStream: TerminalStreamComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/terminal-stream.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    TerminalStream = (mod as { TerminalStream?: TerminalStreamComponent }).TerminalStream;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function renderTerminalStream(props: TerminalStreamProps): {
  container: HTMLElement;
  root: Root;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(TerminalStream!, props));
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB1 — TerminalStream mount + per-session filter + cleanup', () => {
  describe('Condition (a): module imports + exports `TerminalStream`', () => {
    it('frame-c/terminal-stream.js resolves and exports the TerminalStream component', () => {
      if (importError) {
        throw new Error(`import failed: ${importError.message}`);
      }
      expect(
        TerminalStream,
        'frame-c/terminal-stream.js must export `TerminalStream` named component (WB2 GREEN target)',
      ).toBeDefined();
    });
  });

  describe('Condition (b): renders frame-c-terminal-stream-root testid on mount', () => {
    it('mounts an element with data-testid="frame-c-terminal-stream-root" in the idle (no-chunks-yet) state', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(TerminalStream).toBeDefined();
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const root = container.querySelector<HTMLElement>(
          '[data-testid="frame-c-terminal-stream-root"]',
        );
        expect(
          root,
          'TerminalStream must render an element with data-testid="frame-c-terminal-stream-root" on mount',
        ).not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (c): per-session-filtered stdout chunks reach the adapter', () => {
    it('subscribes to onStdoutChunk on mount (exactly one listener registered)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(TerminalStream).toBeDefined();
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const counts = fake.listenerCounts();
        expect(
          counts.chunk,
          'TerminalStream must register exactly one onStdoutChunk listener on mount',
        ).toBe(1);
      } finally {
        unmount();
      }
    });

    it('matching-sessionName chunk bytes are forwarded to adapter.write; non-matching are not', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(TerminalStream).toBeDefined();
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        // Matching session — chunk bytes must reach the adapter.
        act(() => {
          fake.emitChunk({
            sessionName: 'sess-alpha',
            stdoutSeq: 1,
            bytes: 'hello-alpha',
            encoding: 'utf8',
          });
        });
        expect(
          adapter.writes,
          'adapter.write must receive bytes for matching sessionName (per-session filter PASS path)',
        ).toContain('hello-alpha');

        // Non-matching session — chunk bytes must NOT reach the adapter.
        const writesBeforeMismatch = adapter.writes.length;
        act(() => {
          fake.emitChunk({
            sessionName: 'sess-beta',
            stdoutSeq: 2,
            bytes: 'hello-beta',
            encoding: 'utf8',
          });
        });
        expect(
          adapter.writes.length,
          'adapter.write count must NOT increase for non-matching sessionName (per-session filter REJECT path)',
        ).toBe(writesBeforeMismatch);
        expect(
          adapter.writes,
          'adapter must not receive the non-matching chunk',
        ).not.toContain('hello-beta');
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (d): unmount invokes the cleanup-fn returned by onStdoutChunk', () => {
    it('listener count returns to 0 after unmount (cleanup-fn fired — leak prevention)', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(TerminalStream).toBeDefined();
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      expect(
        fake.listenerCounts().chunk,
        'pre-unmount: exactly one chunk listener registered',
      ).toBe(1);
      unmount();
      expect(
        fake.listenerCounts().chunk,
        'post-unmount: chunk listener cleanup-fn must have removed the listener',
      ).toBe(0);
    });
  });
});
