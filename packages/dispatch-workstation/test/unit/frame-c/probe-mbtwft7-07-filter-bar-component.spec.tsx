// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T7-VISUAL-POLISH WB7 (red) — FilterBar structural
// component probe (Sub-Q-MBTWFT7-D=(i) operator-arbitrated 2026-05-12
// T7-ships-structural-component + T1-future-WB-wires-logic split).
//
// Asserts (per ticket body §4 WB7):
//   probe-07a: `[data-testid="frame-c-filter-bar"]` element renders
//              when FilterBar is mounted.
//   probe-07b: All-status `<select data-testid="filter-bar-status-
//              select">` renders with options matching the wireframe
//              status enum (default "all"/"All status" + the canonical
//              status states: open / idle / warning / error / detached).
//   probe-07c: All-repos `<select data-testid="filter-bar-repos-select">`
//              renders with options derived from sessions[].repoName
//              unique set + "all"/"All repos" default option.
//   probe-07d: Clear `<button data-testid="filter-bar-clear-btn">`
//              renders.
//   probe-07e: Changing the status select invokes onFilterChange
//              callback with `{status: <value>, repo: null}` shape.
//              Clicking Clear invokes onFilterChange with
//              `{status: null, repo: null}` (reset to no-filter state).
//
// RED state at HEAD `77deec0` (post-WB6 GREEN model-badge family
// coloring):
//   - `packages/dispatch-workstation/src/frame-c/filter-bar.tsx` does
//     NOT exist (verified via `ls packages/dispatch-workstation/src/
//     frame-c/` returning only existing T1/T7 files).
//   - Dynamic `import('../../../src/frame-c/filter-bar.js')` rejects;
//     `FilterBar` remains undefined.
//   - All probes fail at per-test `expect(FilterBar).toBeDefined()`
//     guard. Pattern mirrors `probe-mbtwbfcs-01-frame-c-mount.spec.tsx`
//     (Wave B WB1 RED at `c5f98d5`) — per-test guards surface the
//     missing-module condition cleanly rather than crashing whole spec
//     at module-load.
//
// WB8 GREEN deliverables:
//   1. Author `packages/dispatch-workstation/src/frame-c/filter-bar.tsx`
//      (NEW file) — RENDERER-INTEGRATED component per audit §4.1
//      three-tier discipline. Props:
//        - sessions: readonly TileGridSessionEntry[] (for repo-name
//          unique enumeration)
//        - onFilterChange?: (filter: FilterState) => void
//      where `FilterState = { status: string | null; repo: string | null }`.
//   2. Render structure:
//        <div data-testid="frame-c-filter-bar" style={FILTER_BAR_STYLE}>
//          <select data-testid="filter-bar-status-select"
//                  value={status ?? 'all'}
//                  onChange={...}>...</select>
//          <select data-testid="filter-bar-repos-select"
//                  value={repo ?? 'all'}
//                  onChange={...}>...</select>
//          <button data-testid="filter-bar-clear-btn"
//                  onClick={...}>Clear</button>
//        </div>
//   3. Internal useState for status + repo (uncontrolled component
//      semantics; emits onFilterChange on each change).
//   4. Clear button resets useState to (null, null) + emits.
//   5. LOGIC DEFERRED: predicate-application against sessions[] is
//      T1 future-WB territory (Sub-Q-D=(i) split). FilterBar emits
//      onFilterChange; consumer (FrameCRoot future-WB) filters sessions
//      before passing to SessionList.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import type { TileGridSessionEntry } from '../../../src/tile-grid/tile-grid.js';

interface FilterState {
  status: string | null;
  repo: string | null;
}

interface FilterBarProps {
  readonly sessions: readonly TileGridSessionEntry[];
  readonly onFilterChange?: (filter: FilterState) => void;
}

type FilterBarComponent = (props: FilterBarProps) => JSX.Element;

let FilterBar: FilterBarComponent | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    // Path constructed dynamically to bypass Vite's static-analysis of
    // dynamic-import targets — at WB7 RED time the path resolves to a
    // non-existent file and Vite's transform-time check would otherwise
    // fail the whole spec file rather than letting per-test guards
    // surface the missing-module condition cleanly. WB8 GREEN authors
    // the file. Pattern mirrors `probe-mbtwbfcs-01-frame-c-mount.spec
    // .tsx` (Wave B WB1 RED at `c5f98d5`).
    const modulePath = '../../../src/frame-c/filter-bar.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    FilterBar = (mod as { FilterBar?: FilterBarComponent }).FilterBar;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

const FIXTURE_SESSIONS: readonly TileGridSessionEntry[] = [
  { name: 'sess-alpha', status: 'open', repoName: 'foxworks' },
  { name: 'sess-beta', status: 'idle', repoName: 'foxworks' },
  { name: 'sess-gamma', status: 'warning', repoName: 'conductor' },
];

function renderFilterBar(props: FilterBarProps): {
  container: HTMLDivElement;
  root: Root;
  cleanup: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(FilterBar!, props));
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

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB7 — FilterBar structural component (Sub-Q-D=i)', () => {
  describe('probe-07a: FilterBar component exported from filter-bar.tsx', () => {
    it('module exports FilterBar component', () => {
      if (importError) {
        throw new Error(
          `import failed (expected at WB7 RED; WB8 GREEN authors src/frame-c/filter-bar.tsx): ${importError.message}`,
        );
      }
      expect(FilterBar).toBeDefined();
      expect(typeof FilterBar).toBe('function');
    });
  });

  describe('probe-07a (cont): root element with data-testid="frame-c-filter-bar"', () => {
    it('renders root with stable testid for host integration', () => {
      expect(FilterBar).toBeDefined();
      const { container, cleanup } = renderFilterBar({
        sessions: FIXTURE_SESSIONS,
      });
      try {
        const root = container.querySelector('[data-testid="frame-c-filter-bar"]');
        expect(
          root,
          'FilterBar must render a root with data-testid="frame-c-filter-bar" so FrameCRoot host can locate it for integration + visual styling',
        ).not.toBeNull();
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-07b: All-status select renders with status enum options', () => {
    it('status select exists and contains canonical TileStatus options', () => {
      expect(FilterBar).toBeDefined();
      const { container, cleanup } = renderFilterBar({
        sessions: FIXTURE_SESSIONS,
      });
      try {
        const statusSelect = container.querySelector(
          '[data-testid="filter-bar-status-select"]',
        ) as HTMLSelectElement | null;
        expect(statusSelect).not.toBeNull();
        expect(statusSelect!.tagName).toBe('SELECT');
        const optionValues = Array.from(statusSelect!.options).map((o) => o.value);
        expect(optionValues, 'status select must include a "all" option (default)').toContain(
          'all',
        );
        // Must include the canonical status states the wireframe enumerates.
        expect(optionValues).toContain('open');
        expect(optionValues).toContain('idle');
        expect(optionValues).toContain('warning');
        expect(optionValues).toContain('error');
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-07c: All-repos select renders with unique repo options', () => {
    it('repos select exists and contains "all" + unique repoName options from sessions', () => {
      expect(FilterBar).toBeDefined();
      const { container, cleanup } = renderFilterBar({
        sessions: FIXTURE_SESSIONS,
      });
      try {
        const reposSelect = container.querySelector(
          '[data-testid="filter-bar-repos-select"]',
        ) as HTMLSelectElement | null;
        expect(reposSelect).not.toBeNull();
        expect(reposSelect!.tagName).toBe('SELECT');
        const optionValues = Array.from(reposSelect!.options).map((o) => o.value);
        expect(optionValues, 'repos select must include "all" default option').toContain(
          'all',
        );
        // Unique repoNames from FIXTURE_SESSIONS: foxworks, conductor.
        expect(optionValues).toContain('foxworks');
        expect(optionValues).toContain('conductor');
        // Duplicate 'foxworks' (3 sessions, 2 with foxworks) must
        // dedupe — exactly 1 'foxworks' option.
        const foxworksCount = optionValues.filter((v) => v === 'foxworks').length;
        expect(foxworksCount, 'duplicate repoName must dedupe').toBe(1);
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-07d: Clear button renders', () => {
    it('clear button exists with stable testid', () => {
      expect(FilterBar).toBeDefined();
      const { container, cleanup } = renderFilterBar({
        sessions: FIXTURE_SESSIONS,
      });
      try {
        const clearBtn = container.querySelector(
          '[data-testid="filter-bar-clear-btn"]',
        );
        expect(clearBtn).not.toBeNull();
        expect(clearBtn!.tagName).toBe('BUTTON');
        const text = clearBtn!.textContent ?? '';
        expect(
          text.toLowerCase().includes('clear'),
          'clear button text must include "Clear" per wireframe target',
        ).toBe(true);
      } finally {
        cleanup();
      }
    });
  });

  describe('probe-07e: onFilterChange callback invoked with FilterState shape', () => {
    it('changing status select invokes onFilterChange with {status, repo:null}; Clear resets to {null,null}', () => {
      expect(FilterBar).toBeDefined();
      const onFilterChange = vi.fn();
      const { container, cleanup } = renderFilterBar({
        sessions: FIXTURE_SESSIONS,
        onFilterChange,
      });
      try {
        const statusSelect = container.querySelector(
          '[data-testid="filter-bar-status-select"]',
        ) as HTMLSelectElement;
        // Change status to 'open' (non-default).
        act(() => {
          fireEvent.change(statusSelect, { target: { value: 'open' } });
        });
        expect(
          onFilterChange,
          'onFilterChange must be invoked on status select change',
        ).toHaveBeenCalled();
        const lastCallArg = onFilterChange.mock.calls.at(-1)?.[0] as FilterState;
        expect(lastCallArg).toEqual({ status: 'open', repo: null });

        // Click Clear button.
        const clearBtn = container.querySelector(
          '[data-testid="filter-bar-clear-btn"]',
        ) as HTMLButtonElement;
        onFilterChange.mockClear();
        act(() => {
          fireEvent.click(clearBtn);
        });
        expect(onFilterChange).toHaveBeenCalled();
        const clearedArg = onFilterChange.mock.calls.at(-1)?.[0] as FilterState;
        expect(
          clearedArg,
          'Clear button must emit FilterState reset (status:null, repo:null)',
        ).toEqual({ status: null, repo: null });
      } finally {
        cleanup();
      }
    });
  });
});
