// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB3 (red) — SessionList rendering
// contract probe.
//
// Asserts (per ticket body a1f7a03 §4 WB3 + §4 WB4 SessionList scope):
//   (1) When `mountFrameC(container, { sessions: [...] })` is called
//       with an array of N TileGridSessionEntry-shaped objects, the
//       SessionList component renders N rows inside
//       `data-testid="frame-c-session-list-col"`. Each row carries
//       `data-testid="frame-c-session-row-{name}"`.
//   (2) Each row's text content includes the session name.
//   (3) Each row's text content includes the repo name + branch name
//       (when present on the entry).
//   (4) Each row carries a status badge element
//       (data-testid="frame-c-session-row-status-{name}") whose
//       data-status attribute matches the entry's status.
//   (5) Empty-state: when `sessions=[]`, the session-list-col is
//       present but renders 0 row elements (no crash; honest empty
//       state).
//
// RED state at HEAD `2174f3a` (post-WB2 GREEN):
//   - WB2 scaffolded `frame-c-root.tsx` with EMPTY session-list-col
//     placeholder. FrameCMountProps does not yet accept `sessions`
//     prop. SessionList component does not yet exist.
//   - 5 it-blocks fail at row-count or row-content assertions
//     (probe queries DOM via container.querySelectorAll); WB4 GREEN
//     authors SessionList + wires sessions prop through FrameCRoot.
//
// WB4 GREEN target: author `frame-c/session-list.tsx`; extend
// FrameCMountProps + FrameCRootProps with `sessions?: readonly
// TileGridSessionEntry[]`; render SessionList into the
// `frame-c-session-list-col` slot.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

// Minimal TileGridSessionEntry-compatible shape for test fixtures.
// Mirrors tile-grid.tsx:29-52 subset that the probe exercises.
interface TestSessionEntry {
  readonly name: string;
  readonly status?: 'open' | 'collapsed' | 'detached';
  readonly branchName?: string;
  readonly repoName?: string;
  readonly model?: string;
  readonly tokensUsed?: number;
  readonly tokenBudget?: number;
}

// Loose-typed factory call signature — frame-c/mount.tsx FrameCMountProps
// shape extends across WB2 → WB4. Probe uses `any` cast at call site to
// avoid coupling to a moving prop shape; assertions are DOM-based, not
// type-based.
type MountFrameCAny = (
  container: HTMLElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any,
) => { dispose(): void };

let mountFrameC: MountFrameCAny | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/mount.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    mountFrameC = (mod as { mountFrameC?: MountFrameCAny }).mountFrameC;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

const FIXTURE_SESSIONS: readonly TestSessionEntry[] = [
  {
    name: 'sess-alpha',
    status: 'open',
    branchName: 'main',
    repoName: 'foxworks-dispatch',
    model: 'claude-sonnet-4-6',
    tokensUsed: 12_000,
    tokenBudget: 200_000,
  },
  {
    name: 'sess-beta',
    status: 'open',
    branchName: 'feature/x',
    repoName: 'foxworks-dispatch',
    model: 'claude-sonnet-4-6',
    tokensUsed: 87_000,
    tokenBudget: 200_000,
  },
  {
    name: 'sess-gamma',
    status: 'collapsed',
    branchName: 'main',
    repoName: 'other-repo',
    tokensUsed: 5_000,
    tokenBudget: 200_000,
  },
];

function mountWith(
  sessions: readonly TestSessionEntry[],
): { container: HTMLElement; dispose: () => void } {
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

describe('MB-T-WIREFRAME-C1P2-FRAME-C-SURFACE WB3 — SessionList rendering contract', () => {
  describe('Condition (1): N sessions → N rows with data-testid="frame-c-session-row-{name}"', () => {
    it('renders exactly N rows for N sessions in the session-list-col', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        const col = container.querySelector(
          '[data-testid="frame-c-session-list-col"]',
        );
        expect(col).not.toBeNull();
        // Use `data-session-name` attribute (row-unique) rather than
        // a `[data-testid^="frame-c-session-row-"]` prefix selector —
        // the prefix selector would match nested status/name/meta
        // spans that share the same testid prefix per the
        // frame-c-session-row-status-{name} + -name-{name} + -meta-{name}
        // naming scheme required by Conditions 2/3/4. `data-session-name`
        // is set ONLY on the row element so this counts rows exactly.
        const rows = col!.querySelectorAll('[data-session-name]');
        expect(
          rows.length,
          'session-list-col must contain exactly N row elements (one per session)',
        ).toBe(FIXTURE_SESSIONS.length);
      } finally {
        dispose();
      }
    });

    it('each row has data-testid="frame-c-session-row-{sessionName}"', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const row = container.querySelector(
            `[data-testid="frame-c-session-row-${sess.name}"]`,
          );
          expect(row, `row for "${sess.name}" must exist`).not.toBeNull();
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (2): row text content includes session name', () => {
    it('each row displays its session name', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const row = container.querySelector(
            `[data-testid="frame-c-session-row-${sess.name}"]`,
          );
          expect(row).not.toBeNull();
          expect(
            row!.textContent ?? '',
            `row for "${sess.name}" must include the session name`,
          ).toContain(sess.name);
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (3): row text content includes repo + branch when present', () => {
    it('each row displays repoName + branchName when fields are present', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const row = container.querySelector(
            `[data-testid="frame-c-session-row-${sess.name}"]`,
          );
          expect(row).not.toBeNull();
          const text = row!.textContent ?? '';
          if (sess.repoName !== undefined) {
            expect(
              text,
              `row for "${sess.name}" must include repo name "${sess.repoName}"`,
            ).toContain(sess.repoName);
          }
          if (sess.branchName !== undefined) {
            expect(
              text,
              `row for "${sess.name}" must include branch "${sess.branchName}"`,
            ).toContain(sess.branchName);
          }
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (4): status badge per row reflects entry.status', () => {
    it('each row has a status-badge element with data-status matching the entry', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const badge = container.querySelector(
            `[data-testid="frame-c-session-row-status-${sess.name}"]`,
          );
          expect(
            badge,
            `row for "${sess.name}" must contain a status-badge element`,
          ).not.toBeNull();
          if (sess.status !== undefined) {
            expect(
              badge!.getAttribute('data-status'),
              `status-badge for "${sess.name}" data-status must match entry`,
            ).toBe(sess.status);
          }
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (5): empty-state — sessions=[] renders 0 rows', () => {
    it('empty sessions array renders the col with zero row elements', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith([]);
      try {
        const col = container.querySelector(
          '[data-testid="frame-c-session-list-col"]',
        );
        expect(col).not.toBeNull();
        // Use `data-session-name` attribute (row-unique) rather than
        // a `[data-testid^="frame-c-session-row-"]` prefix selector —
        // the prefix selector would match nested status/name/meta
        // spans that share the same testid prefix per the
        // frame-c-session-row-status-{name} + -name-{name} + -meta-{name}
        // naming scheme required by Conditions 2/3/4. `data-session-name`
        // is set ONLY on the row element so this counts rows exactly.
        const rows = col!.querySelectorAll('[data-session-name]');
        expect(
          rows.length,
          'empty sessions array must render 0 rows (honest empty state)',
        ).toBe(0);
      } finally {
        dispose();
      }
    });
  });
});
