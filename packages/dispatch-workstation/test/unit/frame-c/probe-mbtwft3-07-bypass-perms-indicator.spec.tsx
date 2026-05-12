// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB7 (red) — bypass-perms indicator
// + dispatch-workstation source label probe.
//
// Asserts (per ticket body §4 WB7 + dispatch §1 right-pane bottom action
// bar inventory "bypass-perms indicator (red triangle warning) +
// dispatch-workstation source label" + Sub-Q-MBTWFT3-E=(ii) operator-
// arbitrated 2026-05-12 spawn-mode-per-session data source):
//   probe-07a: `[data-testid="action-bar-bypass-perms-indicator"]`
//              renders when `spawnMode === 'auto'` (session spawned
//              with --dangerously-skip-permissions per
//              spawn-handler.ts:225-245).
//   probe-07b: indicator does NOT render when `spawnMode === 'ask'`
//              (operator-supervised spawn).
//   probe-07c: indicator does NOT render when `spawnMode === undefined`
//              (no data; ship-shy default per Sub-Q-E=(ii) fallback
//              (b) given `TileGridSessionEntry.spawnMode` field is
//              absent at HEAD `a587336` — `MB-F-TILEGRIDSESSIONENTRY-
//              SPAWNMODE-MISSING` Tier 2 to be filed at WB9 docs).
//   probe-07d: `[data-testid="action-bar-source-label"]` renders text
//              "dispatch-workstation" UNCONDITIONALLY (no Sub-Q —
//              wireframe target shows static label).
//   probe-07e: bypass-perms indicator has accessible affordances:
//              `role="img"` + non-empty `aria-label`. Per a11y
//              discipline, the red-triangle warning glyph must be
//              accessible to AT users with a meaningful label
//              (e.g., "bypass-perms warning" or
//              "permissions bypassed for this session").
//
// Per audit §4.1 three-tier discipline (binding per ticket body §2.2):
// ActionBar stays RENDERER-INTEGRATED + bridge-free. New `spawnMode`
// prop is plumbed down from DetailPane (WB8 thread-through). DetailPane
// passes `spawnMode={undefined}` at WB8 ship time (ship-shy fallback);
// future T1-territory work threads `TileGridSessionEntry.spawnMode`
// up from session-entry shape.
//
// RED state at HEAD `a587336` (post-WB6 GREEN):
//   - `ActionBarProps` does NOT declare `spawnMode` (verified via
//     direct source read of action-bar.tsx:41-78 at HEAD).
//   - `[data-testid="action-bar-bypass-perms-indicator"]` not in DOM
//     for any prop combination.
//   - `[data-testid="action-bar-source-label"]` not in DOM.
//   - probes 07a-07e all fail at DOM query or attribute check.
//   - `@ts-expect-error WB7 RED:` suppresses the `spawnMode` prop
//     type error; WB8 GREEN adds the prop, removing the
//     @ts-expect-error → typecheck remains CLEAN at GREEN (no
//     TS2578 unused-directive).
//
// WB8 GREEN deliverables:
//   1. Extend `ActionBarProps` with `spawnMode?: 'auto' | 'ask'`.
//   2. Render bypass-perms indicator (e.g., `<span role="img"
//      aria-label="..." data-testid="action-bar-bypass-perms-indicator">⚠</span>`)
//      when `spawnMode === 'auto'`; null otherwise.
//   3. Render source-label `<span data-testid="action-bar-source-label">
//      dispatch-workstation</span>` unconditionally.
//   4. Layout: both anchored bottom-left of ActionBar (wireframe);
//      buttons remain bottom-right via existing component structure.
//   5. Extend `DetailPaneProps` with `spawnMode?: 'auto' | 'ask'` +
//      pass through to ActionBar.
//   6. Remove `@ts-expect-error WB7 RED:` annotation in this probe.
//   7. All 5 probes flip RED → GREEN.
//   8. Filing `MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING` Tier 2
//      at WB9 docs (TileGridSessionEntry.spawnMode field absent at
//      HEAD → DetailPane passes undefined until T1 closure).

import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ActionBar } from '../../../src/frame-c/action-bar.js';

function renderActionBar(props: {
  sessionName: string | null;
  spawnMode?: 'auto' | 'ask' | undefined;
}): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(ActionBar, {
        sessionName: props.sessionName,
        onDiff: vi.fn(),
        onMerge: vi.fn(),
        onFocus: vi.fn(),
        onKill: vi.fn(),
        failureState: null,
        onDismissFailure: vi.fn(),
        // @ts-expect-error WB7 RED: `spawnMode` not yet on ActionBarProps
        // at HEAD `a587336`. WB8 GREEN adds the prop; removing this
        // comment is part of the GREEN ladder step.
        spawnMode: props.spawnMode,
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

describe('MB-T-WIREFRAME-T3-ACTION-BAR-WIRING WB7 — bypass-perms indicator + source label', () => {
  it('probe-07a: bypass-perms indicator renders when spawnMode === "auto"', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      spawnMode: 'auto',
    });
    try {
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'bypass-perms indicator must render when spawnMode === "auto" (session spawned with --dangerously-skip-permissions per spawn-handler.ts:225-245)',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-07b: indicator does NOT render when spawnMode === "ask"', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      spawnMode: 'ask',
    });
    try {
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'bypass-perms indicator must NOT render when spawnMode === "ask" (operator-supervised spawn)',
      ).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-07c: indicator does NOT render when spawnMode === undefined (ship-shy default)', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      spawnMode: undefined,
    });
    try {
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(
        indicator,
        'indicator must NOT render when spawnMode is undefined — honest "no data" surface per Sub-Q-E=(ii) fallback (b) ship-shy default; closes via MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING Tier 2 future-cycle',
      ).toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-07d: source-label "dispatch-workstation" renders unconditionally', () => {
    // Verify across 3 spawnMode states: auto, ask, undefined.
    const variants: Array<'auto' | 'ask' | undefined> = ['auto', 'ask', undefined];
    for (const spawnMode of variants) {
      const { container, cleanup } = renderActionBar({
        sessionName: 'session-foo',
        spawnMode,
      });
      try {
        const label = container.querySelector(
          '[data-testid="action-bar-source-label"]',
        );
        expect(
          label,
          `source-label must render unconditionally (spawnMode=${spawnMode ?? 'undefined'})`,
        ).not.toBeNull();
        expect(
          label!.textContent,
          'source-label text must be "dispatch-workstation" per wireframe target',
        ).toContain('dispatch-workstation');
      } finally {
        cleanup();
      }
    }
  });

  it('probe-07e: bypass-perms indicator has accessible role + non-empty aria-label', () => {
    const { container, cleanup } = renderActionBar({
      sessionName: 'session-foo',
      spawnMode: 'auto',
    });
    try {
      const indicator = container.querySelector(
        '[data-testid="action-bar-bypass-perms-indicator"]',
      );
      expect(indicator).not.toBeNull();
      const role = indicator!.getAttribute('role');
      expect(
        role,
        'indicator must have role="img" for AT users (red-triangle warning glyph)',
      ).toBe('img');
      const ariaLabel = indicator!.getAttribute('aria-label');
      expect(
        ariaLabel,
        'indicator must have non-empty aria-label describing the warning',
      ).toBeTruthy();
      expect(ariaLabel!.length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });
});
