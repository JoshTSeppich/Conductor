// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB11 (red+green paired) —
// session-filter-bar component + FrameCRoot filter-state integration
// contract probe.
//
// Per ticket body `ec60622` §4 WB11 + Sub-Q-T1-E=(α) operator-acked
// "renderer-only useState filter" (2026-05-12):
//
//   NEW component `frame-c/session-filter-bar.tsx` renders three
//   controls per wireframe filter row:
//     - <select data-testid="frame-c-filter-status">      (All status / per-status)
//     - <select data-testid="frame-c-filter-repo">        (All repos / per-repo)
//     - <button data-testid="frame-c-filter-clear">       (Clear button)
//
//   FrameCRoot integrates `useState<FilterState>({ status: 'all',
//   repo: 'all' })` (Sub-Q-E=(α) renderer-only; lost on Frame A↔C
//   toggle and workstation re-launch — Tier 3 followup MB-F-FRAME-C-
//   FILTER-STATE-NOT-PERSISTED filed at WB-final).
//
//   Applies filter via `sessions.filter(matchesFilter(s, filterState))`
//   before passing to SessionList. The filter bar is rendered ABOVE
//   SessionList in the left column.
//
// Encoded contract (5 conditions):
//   (1) Filter bar renders all three controls with documented data-testid.
//   (2) Initial render: all sessions visible (status='all' + repo='all').
//   (3) Selecting a status (e.g., 'detached') hides sessions with other
//       statuses; only matching sessions remain visible as rows.
//   (4) Selecting a repo (e.g., 'foxworks-dispatch') hides sessions
//       with other repoName values.
//   (5) Clicking Clear resets BOTH selects to 'all' and all sessions
//       reappear.
//
// RED state at HEAD `89d2ca1` (post-WB10 GREEN):
//   - frame-c/session-filter-bar.tsx does NOT exist.
//   - FrameCRoot has no filter-state useState.
//   - Conditions (1)-(5) FAIL — filter bar controls absent.

import { describe, it, expect, beforeAll } from 'vitest';
import { act, fireEvent } from '@testing-library/react';

type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let mountFrameC: MountFrameCAny | undefined;
let mountImportError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/mount.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    mountFrameC = (mod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    mountImportError = e instanceof Error ? e : new Error(String(e));
  }
});

const FIXTURE = [
  {
    name: 'sess-alpha',
    status: 'open',
    repoName: 'foxworks-dispatch',
    branchName: 'main',
  },
  {
    name: 'sess-beta',
    status: 'detached',
    repoName: 'foxworks-dispatch',
    branchName: 'feature/x',
  },
  {
    name: 'sess-gamma',
    status: 'open',
    repoName: 'other-repo',
    branchName: 'main',
  },
];

function mountWith(sessions: typeof FIXTURE): {
  container: HTMLElement;
  dispose: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let handle: { dispose(): void } | null = null;
  act(() => {
    handle = mountFrameC!(container, { sessions });
  });
  return {
    container,
    dispose: () => {
      handle?.dispose();
      container.remove();
    },
  };
}

function visibleRowNames(container: HTMLElement): string[] {
  const col = container.querySelector(
    '[data-testid="frame-c-session-list-col"]',
  );
  if (col === null) return [];
  return Array.from(col.querySelectorAll('[data-session-name]')).map(
    (el) => el.getAttribute('data-session-name') ?? '',
  );
}

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB11 — filter bar component + integration contract', () => {
  describe('Condition (1): filter bar renders three controls', () => {
    it('renders frame-c-filter-status + frame-c-filter-repo + frame-c-filter-clear', () => {
      if (mountImportError) {
        throw new Error(`mount import failed: ${mountImportError.message}`);
      }
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE);
      try {
        expect(
          container.querySelector('[data-testid="frame-c-filter-status"]'),
          'status filter dropdown must render (RED until WB11 GREEN ships SessionFilterBar)',
        ).not.toBeNull();
        expect(
          container.querySelector('[data-testid="frame-c-filter-repo"]'),
        ).not.toBeNull();
        expect(
          container.querySelector('[data-testid="frame-c-filter-clear"]'),
        ).not.toBeNull();
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (2): initial render shows all sessions', () => {
    it('all 3 fixture rows visible at mount-time (status=all + repo=all default)', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE);
      try {
        expect(visibleRowNames(container).sort()).toEqual(
          ['sess-alpha', 'sess-beta', 'sess-gamma'].sort(),
        );
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (3): status filter narrows visible rows', () => {
    it('selecting status=detached hides open-status sessions', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE);
      try {
        const statusSelect = container.querySelector(
          '[data-testid="frame-c-filter-status"]',
        ) as HTMLSelectElement | null;
        expect(statusSelect).not.toBeNull();
        act(() => {
          fireEvent.change(statusSelect!, { target: { value: 'detached' } });
        });
        expect(visibleRowNames(container)).toEqual(['sess-beta']);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (4): repo filter narrows visible rows', () => {
    it('selecting repo=other-repo hides foxworks-dispatch sessions', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE);
      try {
        const repoSelect = container.querySelector(
          '[data-testid="frame-c-filter-repo"]',
        ) as HTMLSelectElement | null;
        expect(repoSelect).not.toBeNull();
        act(() => {
          fireEvent.change(repoSelect!, { target: { value: 'other-repo' } });
        });
        expect(visibleRowNames(container)).toEqual(['sess-gamma']);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (5): Clear button resets filters', () => {
    it('after status+repo selected, Clear restores all rows', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE);
      try {
        const statusSelect = container.querySelector(
          '[data-testid="frame-c-filter-status"]',
        ) as HTMLSelectElement | null;
        const repoSelect = container.querySelector(
          '[data-testid="frame-c-filter-repo"]',
        ) as HTMLSelectElement | null;
        const clearButton = container.querySelector(
          '[data-testid="frame-c-filter-clear"]',
        ) as HTMLButtonElement | null;
        expect(statusSelect).not.toBeNull();
        expect(repoSelect).not.toBeNull();
        expect(clearButton).not.toBeNull();
        act(() => {
          fireEvent.change(statusSelect!, { target: { value: 'open' } });
        });
        act(() => {
          fireEvent.change(repoSelect!, {
            target: { value: 'other-repo' },
          });
        });
        // After narrow filter: only sess-gamma should match (open + other-repo).
        expect(visibleRowNames(container)).toEqual(['sess-gamma']);
        // Clear resets both to 'all'.
        act(() => {
          fireEvent.click(clearButton!);
        });
        expect(visibleRowNames(container).sort()).toEqual(
          ['sess-alpha', 'sess-beta', 'sess-gamma'].sort(),
        );
        // Selects revert to 'all' value.
        expect(statusSelect!.value).toBe('all');
        expect(repoSelect!.value).toBe('all');
      } finally {
        dispose();
      }
    });
  });
});
