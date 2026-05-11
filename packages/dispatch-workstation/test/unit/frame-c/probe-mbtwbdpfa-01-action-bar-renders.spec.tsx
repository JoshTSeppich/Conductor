// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB1 (red) — ActionBar
// render contract probe.
//
// Asserts (per ticket body `32c7eee` §4 WB1 + operator-arbitrated Sub-Q
// resolutions 2026-05-11):
//   probe-01a: module exports `ActionBar` React component.
//   probe-01b: render `<ActionBar sessionName='session-foo' ...>` →
//              root element with `data-testid="frame-c-action-bar"`.
//   probe-01c: 3 button testids render: `action-bar-diff-btn`,
//              `action-bar-merge-btn`, `action-bar-focus-btn`.
//   probe-01d: `sessionName === null` → all 3 buttons rendered with
//              `disabled` attribute (no-op state).
//   probe-01e: `sessionName !== null` → all 3 buttons rendered enabled.
//   probe-01f: clicking each button invokes the matching callback prop
//              (onDiff/onMerge/onFocus) with `sessionName` as the
//              argument. Per audit §4.1 three-tier discipline, ActionBar
//              is RENDERER-INTEGRATED + bridge-free — it does NOT
//              directly call `window.frameCBridge.*`. The host (detail-
//              pane / Frame C root) catches the callback + invokes the
//              bridge method at the integration seam. WB4 GREEN wires
//              the host→bridge plumbing; this probe asserts only the
//              component-prop contract.
//
// Wave C #3 Sub-Q resolutions encoded in this probe (per orchestrator-
// relay autonomous-mode (b)-pattern 2026-05-11 — coord note `9fe6358`):
//   Sub-Q-MBTWBDPFA-A=(β-consolidated): consolidated §6 amendment landed
//     at `0f0e762` (4 channels: readSwarmState + diff/merge/focus); no
//     §6 touch in this probe.
//   Sub-Q-MBTWBDPFA-B-{diff,merge,focus}=(i)/(i)/(i): action semantics
//     are main-process executor concerns (WB4 GREEN); WB1 probe only
//     verifies callback-prop invocation at the component layer.
//   Sub-Q-MBTWBDPFA-C=(α): inline-banner failure UX is WB5+6 scope;
//     `failureState` prop NOT exercised in WB1.
//   Sub-Q-MBTWBDPFA-D=(α): NEW `frameCBridge` is preload.mts territory
//     (WB4 GREEN); WB1 probe is bridge-agnostic.
//
// RED state at HEAD `aa18302`:
//   - `packages/dispatch-workstation/src/frame-c/action-bar.tsx` does
//     not exist (verified via `ls`).
//   - Dynamic `import('../../../src/frame-c/action-bar.js')` rejects;
//     `ActionBar` remains undefined.
//   - All 6 it-blocks fail at the per-test `expect(ActionBar).toBeDefined()`
//     guard. Pattern mirrors `probe-mbtwbfcs-01-frame-c-mount.spec.tsx`
//     (Wave B WB1 RED at `c5f98d5`) — per-test guards surface the
//     missing-module condition cleanly rather than crashing the whole
//     spec at module-load.
//
// WB2 GREEN: author `frame-c/action-bar.tsx` with `ActionBar` React
// component (5 props: sessionName, onDiff, onMerge, onFocus, [optional
// failureState — Sub-Q-C=α scope for WB6 GREEN]). 6 probes flip
// RED → GREEN.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';

// Structural types the component contracts on. Mirrors body §4 WB2
// ActionBarProps sketch; refined at WB2 GREEN authoring time.
interface ActionBarProps {
  readonly sessionName: string | null;
  readonly onDiff: (sessionName: string) => void;
  readonly onMerge: (sessionName: string) => void;
  readonly onFocus: (sessionName: string) => void;
}

type ActionBarComponent = (props: ActionBarProps) => JSX.Element;

let ActionBar: ActionBarComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    // Path constructed dynamically to bypass Vite's static-analysis of
    // dynamic-import targets — at WB1 RED time the path resolves to a
    // non-existent file and Vite's transform-time check would otherwise
    // fail the whole spec file rather than letting per-test guards
    // surface the missing-module condition cleanly. WB2 GREEN authors
    // the file; this pattern is robust to either RED or GREEN state.
    // Mirrors `probe-mbtwbfcs-01-frame-c-mount.spec.tsx` (Wave B WB1 RED
    // at `c5f98d5`).
    const modulePath = '../../../src/frame-c/action-bar.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    ActionBar = (mod as { ActionBar?: ActionBarComponent }).ActionBar;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function renderActionBar(props: ActionBarProps): {
  container: HTMLDivElement;
  root: Root;
  cleanup: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ActionBar!, props));
  });
  return {
    container,
    root,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB1 — ActionBar render contract', () => {
  describe('probe-01a: ActionBar component exported from action-bar.tsx', () => {
    it('module exports ActionBar component', () => {
      if (importError) {
        throw new Error(
          `import failed (expected at WB1 RED; WB2 GREEN authors src/frame-c/action-bar.tsx): ${importError.message}`,
        );
      }
      expect(ActionBar).toBeDefined();
      expect(typeof ActionBar).toBe('function');
    });
  });

  describe('probe-01b: root element with data-testid="frame-c-action-bar"', () => {
    it('renders root with stable testid for host integration', () => {
      expect(ActionBar).toBeDefined();
      const { container, cleanup } = renderActionBar({
        sessionName: 'session-foo',
        onDiff: vi.fn(),
        onMerge: vi.fn(),
        onFocus: vi.fn(),
      });
      try {
        const root = container.querySelector('[data-testid="frame-c-action-bar"]');
        expect(
          root,
          'ActionBar must render a root with data-testid="frame-c-action-bar" so detail-pane host can locate it for failureState wiring (Sub-Q-C=α WB6 scope)',
        ).not.toBeNull();
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-01c: three button testids render (diff/merge/focus)', () => {
    it('renders action-bar-{diff,merge,focus}-btn buttons', () => {
      expect(ActionBar).toBeDefined();
      const { container, cleanup } = renderActionBar({
        sessionName: 'session-foo',
        onDiff: vi.fn(),
        onMerge: vi.fn(),
        onFocus: vi.fn(),
      });
      try {
        expect(
          container.querySelector('[data-testid="action-bar-diff-btn"]'),
          'diff button must render with stable testid for probe assertions',
        ).not.toBeNull();
        expect(
          container.querySelector('[data-testid="action-bar-merge-btn"]'),
          'merge button must render with stable testid for probe assertions',
        ).not.toBeNull();
        expect(
          container.querySelector('[data-testid="action-bar-focus-btn"]'),
          'focus button must render with stable testid for probe assertions',
        ).not.toBeNull();
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-01d: sessionName === null disables all 3 buttons', () => {
    it('renders buttons with disabled attribute when no session selected', () => {
      expect(ActionBar).toBeDefined();
      const { container, cleanup } = renderActionBar({
        sessionName: null,
        onDiff: vi.fn(),
        onMerge: vi.fn(),
        onFocus: vi.fn(),
      });
      try {
        const diff = container.querySelector('[data-testid="action-bar-diff-btn"]') as HTMLButtonElement | null;
        const merge = container.querySelector('[data-testid="action-bar-merge-btn"]') as HTMLButtonElement | null;
        const focus = container.querySelector('[data-testid="action-bar-focus-btn"]') as HTMLButtonElement | null;
        expect(diff).not.toBeNull();
        expect(merge).not.toBeNull();
        expect(focus).not.toBeNull();
        expect(
          diff!.disabled,
          'diff button must be disabled when sessionName === null (no-op state per body §1.1)',
        ).toBe(true);
        expect(merge!.disabled).toBe(true);
        expect(focus!.disabled).toBe(true);
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-01e: sessionName !== null enables all 3 buttons', () => {
    it('renders buttons enabled when session selected', () => {
      expect(ActionBar).toBeDefined();
      const { container, cleanup } = renderActionBar({
        sessionName: 'session-foo',
        onDiff: vi.fn(),
        onMerge: vi.fn(),
        onFocus: vi.fn(),
      });
      try {
        const diff = container.querySelector('[data-testid="action-bar-diff-btn"]') as HTMLButtonElement | null;
        const merge = container.querySelector('[data-testid="action-bar-merge-btn"]') as HTMLButtonElement | null;
        const focus = container.querySelector('[data-testid="action-bar-focus-btn"]') as HTMLButtonElement | null;
        expect(diff).not.toBeNull();
        expect(diff!.disabled).toBe(false);
        expect(merge!.disabled).toBe(false);
        expect(focus!.disabled).toBe(false);
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-01f: clicking each button invokes matching callback with sessionName', () => {
    it('onDiff/onMerge/onFocus invoked with sessionName arg on respective clicks', () => {
      expect(ActionBar).toBeDefined();
      const onDiff = vi.fn();
      const onMerge = vi.fn();
      const onFocus = vi.fn();
      const { container, cleanup } = renderActionBar({
        sessionName: 'session-foo',
        onDiff,
        onMerge,
        onFocus,
      });
      try {
        const diff = container.querySelector('[data-testid="action-bar-diff-btn"]') as HTMLButtonElement;
        const merge = container.querySelector('[data-testid="action-bar-merge-btn"]') as HTMLButtonElement;
        const focus = container.querySelector('[data-testid="action-bar-focus-btn"]') as HTMLButtonElement;
        act(() => {
          fireEvent.click(diff);
        });
        expect(onDiff).toHaveBeenCalledTimes(1);
        expect(onDiff).toHaveBeenCalledWith('session-foo');
        expect(onMerge).not.toHaveBeenCalled();
        expect(onFocus).not.toHaveBeenCalled();
        act(() => {
          fireEvent.click(merge);
        });
        expect(onMerge).toHaveBeenCalledTimes(1);
        expect(onMerge).toHaveBeenCalledWith('session-foo');
        act(() => {
          fireEvent.click(focus);
        });
        expect(onFocus).toHaveBeenCalledTimes(1);
        expect(onFocus).toHaveBeenCalledWith('session-foo');
      } finally {
        cleanup();
      }
    });
  });
});
