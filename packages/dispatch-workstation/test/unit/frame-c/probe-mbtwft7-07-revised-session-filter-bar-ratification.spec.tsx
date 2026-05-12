// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T7-VISUAL-POLISH WB7-revised (red) — SessionFilterBar
// contract ratification + visual-polish RED probe.
//
// SUPERSEDES `probe-mbtwft7-07-filter-bar-component.spec.tsx` (committed
// at `1685769`) per Tier 1 `MB-F-T7-WB7-FILTERBAR-SCOPE-OBSOLETED-BY-
// T1-WB11` operator option-(A) remediation 2026-05-12.
//
// CONTEXT: original WB7 RED probe targeted a hypothetical NEW
// `frame-c/filter-bar.tsx` with `FilterBar` component + `onFilterChange`
// callback + null-sentinel FilterState. T1's WB11 ladder concurrent with
// T7 body authoring shipped `frame-c/session-filter-bar.tsx` with
// `SessionFilterBar` + `onFilterStateChange` + 'all'-sentinel FilterState
// + DIFFERENT testid suffixes. Original probe contract is obsolete; this
// revised probe codifies T1's shipped contract (ratification probes,
// trivially-passing baselines) + adds active-RED probes for WB8 GREEN
// visual-polish targets (BAR_STYLE sticky-note tint).
//
// Per CLAUDE.md memory `feedback_stale_dispatch_detection.md` + Tier 1
// row body: anti-fabrication discipline catches this at WB8 GREEN
// authoring (late-but-not-too-late per HALT-required gate).
//
// Asserts:
//   probe-07a [trivial-baseline]: SessionFilterBar component exported
//              from `frame-c/session-filter-bar.tsx` + renders root
//              `[data-testid="frame-c-filter-bar"]`.
//   probe-07b [trivial-baseline]: 3 control testids match T1's shipped
//              contract — `frame-c-filter-status`, `frame-c-filter-repo`,
//              `frame-c-filter-clear`.
//   probe-07c [trivial-baseline]: STATUS_OPTIONS / repo options include
//              'all' default + canonical TileStatus states + dynamic
//              repoName options from sessions[].
//   probe-07d [trivial-baseline]: `applyFilter` pure-fn filters by
//              status + repo correctly per T1 predicate logic.
//   probe-07e [ACTIVE-RED for WB8]: BAR_STYLE has backgroundColor
//              sticky-note tint distinct from unset/transparent.
//              At HEAD `095e507`, T1's BAR_STYLE at
//              `frame-c/session-filter-bar.tsx:62-71` has
//              `borderBottom + fontSize + color` only — no
//              backgroundColor. WB8 GREEN adds the sticky-note tint
//              per Sub-Q-MBTWFT7-F=(i) "background-color shift" default
//              extended to the SessionList wrapper region.
//
// WB8 GREEN deliverable: extend `frame-c/session-filter-bar.tsx`
// BAR_STYLE with `backgroundColor: '<sticky-note-tint-hex>'` matching
// SessionList LIST_ROOT_STYLE wrapper bg `#0a0a0a` (T7 WB4 GREEN at
// `be24ed8`) OR a slightly distinct tint that complements the column
// aesthetic. Operator visual-diff at HALT-T7-FINAL-PRE-PUSH refines.

import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import {
  SessionFilterBar,
  DEFAULT_FILTER_STATE,
  applyFilter,
  type FilterState,
} from '../../../src/frame-c/session-filter-bar.js';
import type { TileGridSessionEntry } from '../../../src/tile-grid/tile-grid.js';

const FIXTURE_SESSIONS: readonly TileGridSessionEntry[] = [
  { name: 'sess-alpha', status: 'open', repoName: 'foxworks' },
  { name: 'sess-beta', status: 'idle', repoName: 'foxworks' },
  { name: 'sess-gamma', status: 'warning', repoName: 'conductor' },
];

function renderBar(opts: {
  sessions?: readonly TileGridSessionEntry[];
  filterState?: FilterState;
}): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(SessionFilterBar, {
        sessions: opts.sessions ?? FIXTURE_SESSIONS,
        filterState: opts.filterState ?? DEFAULT_FILTER_STATE,
        onFilterStateChange: vi.fn(),
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

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB7-revised — SessionFilterBar ratification + visual-polish RED', () => {
  it('probe-07a [trivial-baseline]: SessionFilterBar exported + renders root testid', () => {
    expect(SessionFilterBar).toBeDefined();
    expect(typeof SessionFilterBar).toBe('function');
    const { container, cleanup } = renderBar({});
    try {
      const root = container.querySelector('[data-testid="frame-c-filter-bar"]');
      expect(
        root,
        'SessionFilterBar root must render data-testid="frame-c-filter-bar" per T1 WB11 shipped contract',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-07b [trivial-baseline]: 3 control testids match T1 shipped contract', () => {
    const { container, cleanup } = renderBar({});
    try {
      expect(
        container.querySelector('[data-testid="frame-c-filter-status"]'),
        'status select must render with T1-shipped testid frame-c-filter-status',
      ).not.toBeNull();
      expect(
        container.querySelector('[data-testid="frame-c-filter-repo"]'),
        'repo select must render with T1-shipped testid frame-c-filter-repo',
      ).not.toBeNull();
      expect(
        container.querySelector('[data-testid="frame-c-filter-clear"]'),
        'clear button must render with T1-shipped testid frame-c-filter-clear',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-07c [trivial-baseline]: status + repo selects contain expected options', () => {
    const { container, cleanup } = renderBar({});
    try {
      const statusSelect = container.querySelector(
        '[data-testid="frame-c-filter-status"]',
      ) as HTMLSelectElement;
      const statusValues = Array.from(statusSelect.options).map((o) => o.value);
      expect(statusValues).toContain('all');
      expect(statusValues).toContain('open');
      expect(statusValues).toContain('idle');
      expect(statusValues).toContain('warning');
      expect(statusValues).toContain('error');

      const repoSelect = container.querySelector(
        '[data-testid="frame-c-filter-repo"]',
      ) as HTMLSelectElement;
      const repoValues = Array.from(repoSelect.options).map((o) => o.value);
      expect(repoValues).toContain('all');
      expect(repoValues).toContain('foxworks');
      expect(repoValues).toContain('conductor');
      // Dedup: 2 sessions with 'foxworks' → exactly 1 option.
      const foxworksCount = repoValues.filter((v) => v === 'foxworks').length;
      expect(foxworksCount).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('probe-07d [trivial-baseline]: applyFilter filters by status + repo per T1 predicate logic', () => {
    // All-pass: DEFAULT_FILTER_STATE → all 3 sessions.
    const all = applyFilter(FIXTURE_SESSIONS, DEFAULT_FILTER_STATE);
    expect(all.length).toBe(3);

    // Status filter only.
    const openOnly = applyFilter(FIXTURE_SESSIONS, {
      status: 'open',
      repo: 'all',
    });
    expect(openOnly.length).toBe(1);
    expect(openOnly[0]!.name).toBe('sess-alpha');

    // Repo filter only.
    const foxworksOnly = applyFilter(FIXTURE_SESSIONS, {
      status: 'all',
      repo: 'foxworks',
    });
    expect(foxworksOnly.length).toBe(2);

    // Combined: status + repo.
    const idleFoxworks = applyFilter(FIXTURE_SESSIONS, {
      status: 'idle',
      repo: 'foxworks',
    });
    expect(idleFoxworks.length).toBe(1);
    expect(idleFoxworks[0]!.name).toBe('sess-beta');
  });

  it('probe-07e [ACTIVE-RED for WB8]: BAR_STYLE has sticky-note backgroundColor tint', () => {
    const { container, cleanup } = renderBar({});
    try {
      const bar = container.querySelector(
        '[data-testid="frame-c-filter-bar"]',
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      const bg = bar.style.backgroundColor;
      expect(
        bg !== '' && bg !== 'transparent',
        'BAR_STYLE must have backgroundColor sticky-note tint per Sub-Q-MBTWFT7-F=(i) extended to SessionFilterBar wrapper; WB8 GREEN adds. At HEAD `095e507` BAR_STYLE has only borderBottom + fontSize + color → no backgroundColor → ACTIVE-RED.',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });
});
