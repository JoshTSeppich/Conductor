// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB1 (red) — ActionBar kill-button
// + extended ActionBarFailureState.action union probe.
//
// Asserts (per ticket body §4 WB1 + operator-arbitrated Sub-Q resolutions
// 2026-05-12 at all defaults A=α / B=i / C=i / D=ii / E=ii / F=ii):
//   probe-01a: `[data-testid="action-bar-kill-btn"]` renders when
//              sessionName !== null.
//   probe-01b: kill button has `disabled` attribute when sessionName === null
//              (no-op state mirroring existing 3-button discipline).
//   probe-01c: kill button NOT disabled when sessionName !== null.
//   probe-01d: clicking kill button invokes `onKill(sessionName)` with the
//              current sessionName as the sole argument.
//   probe-01e: passing failureState with `action: 'kill'` renders the
//              existing failure banner with "kill" + error_type + message
//              text. RED signal: the @ts-expect-error suppressing the
//              'kill' literal's union-narrowing error becomes unused at
//              WB2 GREEN when the union is extended → typecheck fails
//              until the @ts-expect-error is removed. Runtime assertion
//              passes at HEAD due to template-literal lenience in
//              renderFailureBanner (`${failureState.action} failed:`);
//              probe is wired so the TYPE-level RED is the load-bearing
//              signal, not the runtime assertion.
//
// Per audit §4.1 three-tier discipline (binding per ticket body §2.2):
// ActionBar stays RENDERER-INTEGRATED + bridge-free. The kill action's
// `onKill` callback prop is invoked by the host (DetailPane at WB4); the
// host catches the result + maps SessionKillReply → ActionBarFailureState
// via the WB6 adapter `adaptSessionKillFailure`. This probe is bridge-
// agnostic and asserts only the component-prop contract.
//
// RED state at HEAD `0d71590` (T3 ticket body landed at this commit per
// methodology-incident-co-commit; content-correctness verified):
//   - `ActionBarProps` does NOT declare `onKill` (verified via direct
//     source read of action-bar.tsx:41-68 at HEAD). React drops unknown
//     props silently at runtime; the kill button DOM never renders →
//     all 4 runtime probes (01a-d) fail.
//   - `ActionBarFailureState.action` union at action-bar.tsx:37 is
//     `'diff' | 'merge' | 'focus'` — does NOT include 'kill'. The
//     `@ts-expect-error WB1 RED:` on the failureState assignment in
//     probe-01e suppresses the union-narrowing error. WB2 GREEN extends
//     the union → @ts-expect-error becomes unused → typecheck fails
//     until removed.
//
// WB2 GREEN deliverables:
//   1. Extend `ActionBarProps` with `onKill: (sessionName: string) => void`.
//   2. Render kill button with `data-testid="action-bar-kill-btn"`,
//      disabled when sessionName === null, mirroring existing fireDiff/
//      fireMerge/fireFocus guarded-callback pattern.
//   3. Extend `ActionBarFailureState.action` union to include `'kill'`.
//   4. Remove the 5 `@ts-expect-error WB1 RED:` annotations in this spec.
//   5. All 5 probes flip RED → GREEN (4 runtime + 1 typecheck).

import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ActionBar } from '../../../src/frame-c/action-bar.js';
import type { ActionBarFailureState } from '../../../src/frame-c/action-bar.js';

function renderActionBar(props: {
  sessionName: string | null;
  onDiff?: (n: string) => void;
  onMerge?: (n: string) => void;
  onFocus?: (n: string) => void;
  onKill?: (n: string) => void;
  failureState?: ActionBarFailureState | null;
  onDismissFailure?: () => void;
}): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(ActionBar, {
        sessionName: props.sessionName,
        onDiff: props.onDiff ?? vi.fn(),
        onMerge: props.onMerge ?? vi.fn(),
        onFocus: props.onFocus ?? vi.fn(),
        onKill: props.onKill ?? vi.fn(),
        failureState: props.failureState ?? null,
        onDismissFailure: props.onDismissFailure ?? vi.fn(),
      }),
    );
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB1 — ActionBar kill-button + failureState.action="kill" extension', () => {
  it('probe-01a: kill button renders with stable testid when sessionName !== null', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
    });
    try {
      const killBtn = container.querySelector(
        '[data-testid="action-bar-kill-btn"]',
      );
      expect(
        killBtn,
        'kill button must render with data-testid="action-bar-kill-btn" so DetailPane host can click-through for kill action wiring (WB4 GREEN)',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-01b: kill button has `disabled` attribute when sessionName === null', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: null,
    });
    try {
      const killBtn = container.querySelector(
        '[data-testid="action-bar-kill-btn"]',
      ) as HTMLButtonElement | null;
      expect(killBtn).not.toBeNull();
      expect(
        killBtn!.disabled,
        'kill button must be disabled when sessionName === null (no-op state per body §1.1 mirroring existing diff/merge/focus discipline)',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('probe-01c: kill button is enabled when sessionName !== null', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
    });
    try {
      const killBtn = container.querySelector(
        '[data-testid="action-bar-kill-btn"]',
      ) as HTMLButtonElement | null;
      expect(killBtn).not.toBeNull();
      expect(killBtn!.disabled).toBe(false);
    } finally {
      cleanup();
    }
  });

  it('probe-01d: clicking kill button invokes onKill(sessionName)', () => {
    const onKill = vi.fn();
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      onKill,
    });
    try {
      const killBtn = container.querySelector(
        '[data-testid="action-bar-kill-btn"]',
      ) as HTMLButtonElement | null;
      expect(killBtn).not.toBeNull();
      act(() => {
        fireEvent.click(killBtn!);
      });
      expect(onKill).toHaveBeenCalledTimes(1);
      expect(
        onKill,
        'onKill must receive the current sessionName as its sole argument (mirrors existing fireDiff/fireMerge/fireFocus pattern)',
      ).toHaveBeenCalledWith('session-foo');
    } finally {
      cleanup();
    }
  });

  it('probe-01e: failureState with action="kill" renders banner with "kill" + error_type + message text', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      failureState: {
        action: 'kill',
        result: {
          ok: false,
          error_type: 'TmuxKillError',
          message: 'tmux kill-session returned non-zero',
        },
      },
    });
    try {
      const banner = container.querySelector(
        '[data-testid="action-bar-failure-banner"]',
      );
      expect(banner, 'banner must render when failureState.action === "kill"').not.toBeNull();
      const text = banner!.textContent ?? '';
      expect(text, 'banner text must include action name "kill"').toContain('kill');
      expect(text, 'banner text must include error_type "TmuxKillError"').toContain(
        'TmuxKillError',
      );
      expect(text, 'banner text must include the message body').toContain(
        'tmux kill-session returned non-zero',
      );
    } finally {
      cleanup();
    }
  });
});
