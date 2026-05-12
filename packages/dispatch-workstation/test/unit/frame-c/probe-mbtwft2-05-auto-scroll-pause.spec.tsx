// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB9 (red) — probe-mbtwft2-05
// TerminalStream auto-scroll + operator-pause + resume affordance contract
// per ticket body 30ab109 §4 WB9.
//
// Asserts:
//   (a) After mount, the auto-scroll-paused indicator is ABSENT
//       (default state is not-paused).
//   (b) Simulating operator scroll-up via dispatched 'scroll' event
//       with mocked scroll geometry where scrollTop is significantly
//       less than scrollHeight - clientHeight - tolerance flips the
//       paused state — `data-testid="frame-c-autoscroll-paused"`
//       attribute or element appears.
//   (c) Subsequent chunk events while paused do NOT unpause: the
//       paused testid remains present even after additional emitChunk
//       events.
//   (d) "Resume autoscroll" affordance — `data-testid="frame-c-
//       autoscroll-resume"` — renders when paused === true.
//   (e) Clicking resume returns paused → false: the
//       autoscroll-paused testid + resume affordance both disappear
//       on next render.
//
// Scroll geometry under happy-dom: happy-dom does NOT compute layout,
// so scrollTop / scrollHeight / clientHeight default to 0. The probe
// installs Object.defineProperty mocks on the terminal-stream-root
// element to simulate operator-scrolled-up state.
//
// RED state at HEAD `85712c2` (post-WB8 GREEN commit):
//   - terminal-stream.tsx at WB2 GREEN has NO scroll-pause logic.
//     The root div has `overflow: hidden` (terminal-stream.tsx:33);
//     no onScroll handler; no `frame-c-autoscroll-paused` testid;
//     no `frame-c-autoscroll-resume` button.
//   - All 5 conditions fail because the testids do not yet exist /
//     the behavior is not implemented.

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

function streamRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-terminal-stream-root"]',
  );
}

function pausedIndicator(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-autoscroll-paused"]',
  );
}

function resumeAffordance(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    '[data-testid="frame-c-autoscroll-resume"]',
  );
}

/** Install scrollTop / scrollHeight / clientHeight property mocks on
 *  the element. Caller dispatches scroll event after mutating
 *  scrollTop to trigger the component's onScroll handler. */
function mockScrollGeometry(
  el: HTMLElement,
  { scrollTop, scrollHeight, clientHeight }: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  },
): void {
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  let currentScrollTop = scrollTop;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => currentScrollTop,
    set: (v: number) => {
      currentScrollTop = v;
    },
  });
}

describe('MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB9 — TerminalStream auto-scroll + operator-pause', () => {
  describe('Condition (a): default state is not-paused after mount', () => {
    it('on mount, frame-c-autoscroll-paused testid is ABSENT', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        expect(streamRoot(container), 'stream-root must render').not.toBeNull();
        expect(
          pausedIndicator(container),
          'default state: frame-c-autoscroll-paused must be absent (auto-scroll active)',
        ).toBeNull();
        expect(
          resumeAffordance(container),
          'default state: frame-c-autoscroll-resume must be absent',
        ).toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (b): operator scroll-up event flips paused → true', () => {
    it('dispatching scroll event with scrollTop << scrollHeight - clientHeight sets paused', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const root = streamRoot(container);
        expect(root, 'stream-root must render').not.toBeNull();
        // Simulate operator scrolled up: scrollTop=0, scrollHeight=1000,
        // clientHeight=500 → 0 < 1000-500-4=496 → paused.
        mockScrollGeometry(root!, {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500,
        });
        act(() => {
          root!.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
        expect(
          pausedIndicator(container),
          'after scroll-up event, frame-c-autoscroll-paused must be present',
        ).not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (c): chunk events while paused do not unpause', () => {
    it('after pause + chunk events, paused testid remains present', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const root = streamRoot(container);
        expect(root).not.toBeNull();
        mockScrollGeometry(root!, {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500,
        });
        act(() => {
          root!.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
        expect(
          pausedIndicator(container),
          'paused must be set after scroll-up',
        ).not.toBeNull();
        // Subsequent chunk while paused
        act(() => {
          fake.emitChunk({
            sessionName: 'sess-alpha',
            stdoutSeq: 1,
            bytes: 'mid-pause-chunk',
            encoding: 'utf8',
          });
        });
        expect(
          pausedIndicator(container),
          'paused must remain after chunk while paused (chunk does not auto-unpause)',
        ).not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (d): resume affordance renders when paused', () => {
    it('after pause, frame-c-autoscroll-resume button is present', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const root = streamRoot(container);
        expect(root).not.toBeNull();
        mockScrollGeometry(root!, {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500,
        });
        act(() => {
          root!.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
        expect(
          resumeAffordance(container),
          'frame-c-autoscroll-resume button must render when paused',
        ).not.toBeNull();
      } finally {
        unmount();
      }
    });
  });

  describe('Condition (e): click resume → paused → false', () => {
    it('clicking resume affordance removes paused state + resume affordance', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const fake = makeFakeConsoleBridge();
      const adapter = makeFakeTerminalAdapter();
      const { container, unmount } = renderTerminalStream({
        targetSessionName: 'sess-alpha',
        consoleBridge: fake.bridge,
        createTerminal: () => adapter,
      });
      try {
        const root = streamRoot(container);
        expect(root).not.toBeNull();
        // Pause first
        mockScrollGeometry(root!, {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500,
        });
        act(() => {
          root!.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
        const resume = resumeAffordance(container);
        expect(resume, 'resume affordance must render when paused').not.toBeNull();
        // Click resume
        act(() => {
          resume!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(
          pausedIndicator(container),
          'after resume click, paused testid must be absent',
        ).toBeNull();
        expect(
          resumeAffordance(container),
          'after resume click, resume affordance must be absent',
        ).toBeNull();
      } finally {
        unmount();
      }
    });
  });
});
