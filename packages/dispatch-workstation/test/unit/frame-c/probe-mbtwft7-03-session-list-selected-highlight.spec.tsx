// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T7-VISUAL-POLISH WB3 (red) — SessionList selected-tile
// highlight + sticky-note aesthetic probe (Sub-Q-MBTWFT7-F=(i)
// operator-arbitrated 2026-05-12 background + left-border accent).
//
// Asserts (per ticket body §4 WB3 + Sub-Q-F=(i) bg+border-accent):
//   probe-03a: SessionList row with `selectedSessionName === row.name`
//              has aria-selected="true". (T1 already ships this at
//              session-list.tsx:226 → TRIVIAL-PASS baseline; codifies
//              the contract via probe regression protection.)
//   probe-03b: Selected row has distinct background-color
//              (style.backgroundColor !== unset/transparent;
//              T1 ships '#1f2a3f' at session-list.tsx:217-218 →
//              TRIVIAL-PASS baseline).
//   probe-03c: Selected row has LEFT-BORDER accent
//              (style.borderLeft includes non-zero width with non-
//              transparent color) per Sub-Q-F=(i) operator default.
//              T1 does NOT ship borderLeft at HEAD `02c0807` →
//              ACTIVE-RED.
//   probe-03d: Non-selected rows have aria-selected="false"
//              (T1 ships this at session-list.tsx:226 → TRIVIAL-PASS
//              baseline).
//   probe-03e: Sticky-note aesthetic — SessionList wrapper
//              `[data-testid="frame-c-session-list"]` has visible
//              styling refinement at the LIST_ROOT_STYLE level
//              (subtle backgroundColor OR padding adjustment
//              distinct from the default Wave B WB4 settings of
//              `padding: '4px 0'` only with no backgroundColor).
//              ACTIVE-RED at HEAD: LIST_ROOT_STYLE has no
//              backgroundColor (verified via direct read of
//              session-list.tsx:37-43).
//
// RED state at HEAD `02c0807` (post-WB2 GREEN status-color ratification):
//   - 3 trivial-baseline probes (03a / 03b / 03d) — T1's WB6 shipped
//     aria-selected + selected-bg per session-list.tsx:212-219, 226.
//     Mirrors the Wave C #3 WB5 probe-05a "failureState=null → no
//     banner" trivial-baseline pattern (probes lock in the existing
//     contract; survive RED→GREEN transition).
//   - 2 active-RED probes (03c / 03e) — left-border accent + sticky-
//     note wrapper styling not yet shipped.
//
// WB4 GREEN deliverable: extend session-list.tsx with:
//   1. ROW_STYLE_SELECTED CSSProperties: backgroundColor (preserve
//      existing T1 value or refine) + borderLeft (e.g.,
//      `3px solid <accent-hex>`) + paddingLeft adjustment to
//      compensate for border-width (preserve content alignment with
//      non-selected rows).
//   2. LIST_ROOT_STYLE refinement: sticky-note background tint OR
//      padding adjustment distinct from current `padding: '4px 0'`
//      only.
//   3. Apply ROW_STYLE_SELECTED via {...ROW_STYLE, ...ROW_STYLE_SELECTED}
//      when isSelected.

import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { SessionList } from '../../../src/frame-c/session-list.js';
import type { TileGridSessionEntry } from '../../../src/tile-grid/tile-grid.js';

const SESSIONS: readonly TileGridSessionEntry[] = [
  { name: 'sess-alpha', status: 'open', branchName: 'feat/x', repoName: 'foxworks' },
  { name: 'sess-beta', status: 'idle', branchName: 'main', repoName: 'foxworks' },
];

function renderSessionList(props: {
  selectedSessionName: string | null;
}): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(SessionList, {
        sessions: SESSIONS,
        onSelect: vi.fn(),
        selectedSessionName: props.selectedSessionName,
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

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB3 — SessionList selected-highlight + sticky-note aesthetic', () => {
  it('probe-03a [trivial-baseline]: selected row has aria-selected="true" (T1 ships)', () => {
    const { container, cleanup } = renderSessionList({
      selectedSessionName: 'sess-alpha',
    });
    try {
      const row = container.querySelector(
        '[data-testid="frame-c-session-row-sess-alpha"]',
      );
      expect(row).not.toBeNull();
      expect(
        row!.getAttribute('aria-selected'),
        'aria-selected="true" on selected row per ARIA listbox-pattern (T1 WB6 ships at session-list.tsx:226)',
      ).toBe('true');
    } finally {
      cleanup();
    }
  });

  it('probe-03b [trivial-baseline]: selected row has distinct background-color (T1 ships #1f2a3f)', () => {
    const { container, cleanup } = renderSessionList({
      selectedSessionName: 'sess-alpha',
    });
    try {
      const row = container.querySelector(
        '[data-testid="frame-c-session-row-sess-alpha"]',
      ) as HTMLElement;
      expect(row).not.toBeNull();
      const bg = row.style.backgroundColor;
      expect(
        bg,
        'selected row backgroundColor must be set (T1 ships #1f2a3f at session-list.tsx:217-218)',
      ).toBeTruthy();
      expect(bg.length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it('probe-03c [active-RED]: selected row has LEFT-BORDER accent (Sub-Q-F=i)', () => {
    const { container, cleanup } = renderSessionList({
      selectedSessionName: 'sess-alpha',
    });
    try {
      const row = container.querySelector(
        '[data-testid="frame-c-session-row-sess-alpha"]',
      ) as HTMLElement;
      expect(row).not.toBeNull();
      // happy-dom serializes individual border properties (borderLeft,
      // borderLeftWidth, borderLeftColor, borderLeftStyle) when inline
      // style sets `borderLeft: 'Npx solid #hex'`. Check borderLeftWidth
      // for non-zero presence — WB4 GREEN adds borderLeft accent.
      const borderLeft = row.style.borderLeft;
      const borderLeftWidth = row.style.borderLeftWidth;
      const hasBorder =
        (borderLeft !== '' && borderLeft !== 'none' && !borderLeft.startsWith('0')) ||
        (borderLeftWidth !== '' && borderLeftWidth !== '0px' && borderLeftWidth !== '0');
      expect(
        hasBorder,
        'selected row must have left-border accent per Sub-Q-MBTWFT7-F=(i); WB4 GREEN ships ROW_STYLE_SELECTED with borderLeft',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('probe-03d [trivial-baseline]: non-selected rows have aria-selected="false"', () => {
    const { container, cleanup } = renderSessionList({
      selectedSessionName: 'sess-alpha',
    });
    try {
      const betaRow = container.querySelector(
        '[data-testid="frame-c-session-row-sess-beta"]',
      );
      expect(betaRow).not.toBeNull();
      expect(
        betaRow!.getAttribute('aria-selected'),
        'aria-selected="false" on non-selected rows per ARIA listbox-pattern',
      ).toBe('false');
    } finally {
      cleanup();
    }
  });

  it('probe-03e [active-RED]: SessionList wrapper has sticky-note aesthetic styling', () => {
    const { container, cleanup } = renderSessionList({
      selectedSessionName: null,
    });
    try {
      const wrapper = container.querySelector(
        '[data-testid="frame-c-session-list"]',
      ) as HTMLElement;
      expect(wrapper).not.toBeNull();
      // Sticky-note aesthetic acceptance: any of (a) subtle
      // backgroundColor distinct from transparent/unset, (b) refined
      // padding distinct from T1 default `padding: '4px 0'`, (c)
      // border-radius, (d) box-shadow. WB4 GREEN picks one or more
      // refinements. At HEAD `02c0807` LIST_ROOT_STYLE has only
      // flex + width + padding:'4px 0' + boxSizing — none of the
      // sticky-note affordances.
      const bg = wrapper.style.backgroundColor;
      const padding = wrapper.style.padding;
      const borderRadius = wrapper.style.borderRadius;
      const boxShadow = wrapper.style.boxShadow;
      const hasStickyAesthetic =
        (bg !== '' && bg !== 'transparent') ||
        (padding !== '' && padding !== '4px 0' && padding !== '4px 0px') ||
        (borderRadius !== '' && borderRadius !== '0' && borderRadius !== '0px') ||
        (boxShadow !== '' && boxShadow !== 'none');
      expect(
        hasStickyAesthetic,
        'SessionList wrapper must have at least one sticky-note aesthetic affordance (background OR padding-refined OR border-radius OR shadow); WB4 GREEN refines LIST_ROOT_STYLE',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });
});
