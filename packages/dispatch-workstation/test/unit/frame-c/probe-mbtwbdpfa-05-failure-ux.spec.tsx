// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB5 (red) — ActionBar
// inline-banner failure-UX probe (Sub-Q-MBTWBDPFA-C=α).
//
// Asserts (per ticket body `32c7eee` §4 WB5 + coord note `9fe6358` §4):
//   probe-05a: failureState=null → NO banner rendered (default state;
//              no `[role="alert"][data-testid="action-bar-failure-banner"]`).
//   probe-05b: failureState={action,result} → banner rendered with
//              role="alert" + data-testid="action-bar-failure-banner".
//   probe-05c: banner contains action name + error_type + message text.
//   probe-05d: Dismiss button `[data-testid="action-bar-failure-dismiss"]`
//              renders inside the banner.
//   probe-05e: clicking Dismiss invokes `onDismissFailure` callback.
//   probe-05f: MergeConflict with conflictFiles[] renders `<ul>` listing
//              the conflict file paths.
//
// RED state at HEAD `48032cf`: ActionBar's TileProps does NOT yet accept
// `failureState` / `onDismissFailure` props (WB2 GREEN at `cde9308`
// shipped 4 props only — sessionName + onDiff/onMerge/onFocus). At
// runtime React silently drops unknown props; the banner DOM never
// renders → all banner-asserting probes fail. Probe-05a trivially
// passes (no banner = expected behavior today + post-WB6).
//
// WB6 GREEN extends ActionBarProps with `failureState` + `onDismissFailure`
// + renders the banner conditionally. 5 banner-related probes flip
// RED → GREEN; probe-05a remains GREEN throughout.

import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ActionBar } from '../../../src/frame-c/action-bar.js';
import type { FrameCActionError } from '../../../src/main/frame-c-ipc.js';

interface FailureState {
  action: 'diff' | 'merge' | 'focus';
  result: FrameCActionError;
}

function renderActionBar(props: {
  sessionName: string | null;
  onDiff?: (n: string) => void;
  onMerge?: (n: string) => void;
  onFocus?: (n: string) => void;
  failureState?: FailureState | null;
  onDismissFailure?: () => void;
}): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    // @ts-expect-error WB5 RED: failureState + onDismissFailure props
    // not yet on ActionBarProps; WB6 GREEN extends the interface.
    root.render(createElement(ActionBar, {
      sessionName: props.sessionName,
      onDiff: props.onDiff ?? vi.fn(),
      onMerge: props.onMerge ?? vi.fn(),
      onFocus: props.onFocus ?? vi.fn(),
      failureState: props.failureState ?? null,
      onDismissFailure: props.onDismissFailure ?? vi.fn(),
    }));
  });
  return {
    container,
    cleanup: () => {
      act(() => { root.unmount(); });
      container.remove();
    },
  };
}

describe('MB-T-WIREFRAME-C1P3-DETAIL-PANE-FOOTER-ACTIONS WB5 — inline-banner failure UX', () => {
  it('probe-05a: failureState=null → no banner rendered', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: null,
    });
    try {
      expect(container.querySelector('[data-testid="action-bar-failure-banner"]')).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-05b: failureState non-null → banner rendered with role="alert"', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'diff',
        result: { ok: false, error_type: 'NotARepository', message: 'fatal: not a git repository' },
      },
    });
    try {
      const banner = container.querySelector('[data-testid="action-bar-failure-banner"]');
      expect(banner, 'banner must render when failureState !== null').not.toBeNull();
      expect(
        banner!.getAttribute('role'),
        'banner must have role="alert" for a11y',
      ).toBe('alert');
    } finally {
      cleanup();
    }
  });

  it('probe-05c: banner contains action name + error_type + message text', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'merge',
        result: { ok: false, error_type: 'DirtyWorkingTree', message: 'fatal: local changes' },
      },
    });
    try {
      const banner = container.querySelector('[data-testid="action-bar-failure-banner"]');
      expect(banner).not.toBeNull();
      const text = banner!.textContent ?? '';
      expect(text, 'banner text must include action name').toContain('merge');
      expect(text, 'banner text must include error_type').toContain('DirtyWorkingTree');
      expect(text, 'banner text must include message').toContain('fatal: local changes');
    } finally {
      cleanup();
    }
  });

  it('probe-05d: Dismiss button renders inside banner', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'focus',
        result: { ok: false, error_type: 'SessionNotFound', message: 'session "x" not registered' },
      },
    });
    try {
      const dismiss = container.querySelector('[data-testid="action-bar-failure-dismiss"]');
      expect(dismiss, 'Dismiss button must render inside the banner').not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-05e: clicking Dismiss invokes onDismissFailure callback', () => {
    const onDismissFailure = vi.fn();
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'diff',
        result: { ok: false, error_type: 'BranchNotFound', message: 'fatal: unknown revision' },
      },
      onDismissFailure,
    });
    try {
      const dismiss = container.querySelector('[data-testid="action-bar-failure-dismiss"]') as HTMLButtonElement | null;
      expect(dismiss).not.toBeNull();
      act(() => {
        fireEvent.click(dismiss!);
      });
      expect(onDismissFailure).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
    }
  });

  it('probe-05f: MergeConflict failureState with conflictFiles renders <ul> file list', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'merge',
        result: {
          ok: false,
          error_type: 'MergeConflict',
          message: 'Automatic merge failed.',
          // @ts-expect-error WB5 RED: conflictFiles is optional MergeResult-specific field
          // not in FrameCActionError base; cast at WB6 GREEN host-side handles narrowing.
          conflictFiles: ['src/foo.ts', 'src/bar.ts'],
        },
      },
    });
    try {
      const banner = container.querySelector('[data-testid="action-bar-failure-banner"]');
      expect(banner).not.toBeNull();
      const list = banner!.querySelector('ul');
      expect(list, 'MergeConflict failure must render <ul> listing conflict files').not.toBeNull();
      const items = list!.querySelectorAll('li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('src/foo.ts');
      expect(items[1].textContent).toContain('src/bar.ts');
    } finally {
      cleanup();
    }
  });
});
