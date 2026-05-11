// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB1 (red) — Frame C session-list
// row `ctx N%` text rendering contract probe.
//
// Asserts (per ticket body 8ff40a8 §4 WB1 + operator pre-arbitrated envelope
// Sub-Q-MBTWTWS-A=(iv) tile-header sibling + Sub-Q-MBTWTWS-B=(a) inline
// text next to bar; this probe covers the Frame C list-row leg —
// tile-header leg is WB5 probe-03):
//
//   (1) When FrameC is mounted with sessions carrying tokensUsed +
//       tokenBudget, each row in `data-testid="frame-c-session-list-col"`
//       contains exactly one element matching
//       `data-testid="frame-c-session-row-ctx-text-{name}"`.
//   (2) For a session with tokensUsed=87_000, tokenBudget=200_000
//       (ratio 0.435 → 43.5%), the ctx-text content matches /ctx (43|44)%/
//       (rounding tolerance — Math.round vs Math.floor implementation
//       flexibility; per ticket body §4 WB1 acceptance regex).
//   (3) Per-row data binding: for N sessions with N distinct ratios, the
//       ctx-text content for each row reflects THAT row's own ratio
//       (not shared/global state). Asserts row-A text ≠ row-B text when
//       ratios differ.
//   (4) Token-budget edge case: when tokenBudget is undefined OR 0, the
//       ctx-text element MUST still render (honest fallback per body §8
//       risk row "tokenBudget undefined → ctx 0% or ctx —") AND must
//       NOT contain math-degenerate substrings ("NaN", "Infinity",
//       "undefined").
//   (5) Sub-Q-B=(a) inline-not-stacked format: ctx-text element is a
//       DIRECT child of the row element (sibling to status/name/meta
//       spans) — not nested inside name/meta/status spans (which would
//       suggest implementation drift toward (c) hybrid stacked layout).
//
// RED state at HEAD `2bc5cda` (post-T4 WB6 + WB7-RED):
//   - `frame-c/session-list.tsx` is shipped at 92eb23c (WB4) + 2c55804
//     (WB6 selection-state); explicit comment at lines 21-22 reads
//     "Token meter rendering DEFERRED to MB-T-WIREFRAME-C5-TOKEN-WIRING-
//     SURFACE" — confirming this probe lives in the deferred-scope.
//   - SessionList renders status dot + name span + meta span ONLY; no
//     ctx-text element exists. Probe Conditions (1)/(2)/(3)/(4)/(5) all
//     fail at querySelector(...) returning null OR at content/parent
//     assertion.
//
// WB2 GREEN target: add ctx-text span to each row in
// `frame-c/session-list.tsx`. Per Sub-Q-B=(a) inline format: render as
// direct child of the row div, sibling to status/name/meta. Text content
// shape: `ctx {Math.round(ratio * 100)}%` when tokenBudget > 0; fallback
// when undefined/0 (operator decision at WB2 implementation time —
// probe only asserts no-crash + no-math-degenerate substrings).
//
// Probe naming: `probe-mbtwtws-*` is path-disjoint at file-level from
// T4-successor's `probe-mbtwbfcs-*` series (Wave B Frame C scope) per
// dispatch serialization rules; no cross-session test-file collision.

import { describe, it, expect, beforeAll } from 'vitest';
import { act } from '@testing-library/react';

// Minimal TileGridSessionEntry-compatible shape. Mirrors
// tile-grid.tsx:29-52 subset that this probe exercises. Test fixtures
// carry tokensUsed + tokenBudget as the load-bearing fields.
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
// shape extends across WBs. Probe uses `any` cast at call site to avoid
// coupling to a moving prop shape; assertions are DOM-based, not type-
// based. Mirrors probe-mbtwbfcs-02 pattern (line 54-58).
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

// Fixture: 3 sessions with DISTINCT ratios for per-row binding assertion
// (Condition 3). sess-beta at 43.5% is the canonical Condition (2)
// target per ticket body §4 WB1 acceptance.
const FIXTURE_SESSIONS: readonly TestSessionEntry[] = [
  {
    name: 'sess-alpha',
    status: 'open',
    branchName: 'main',
    repoName: 'foxworks-dispatch',
    model: 'claude-sonnet-4-6',
    tokensUsed: 12_000, // 6%
    tokenBudget: 200_000,
  },
  {
    name: 'sess-beta',
    status: 'open',
    branchName: 'feature/x',
    repoName: 'foxworks-dispatch',
    model: 'claude-sonnet-4-6',
    tokensUsed: 87_000, // 43.5% — Condition (2) target
    tokenBudget: 200_000,
  },
  {
    name: 'sess-gamma',
    status: 'collapsed',
    branchName: 'main',
    repoName: 'other-repo',
    tokensUsed: 170_000, // 85%
    tokenBudget: 200_000,
  },
];

// Edge fixtures for Condition (4) — tokenBudget undefined and = 0.
const FIXTURE_EDGE_SESSIONS: readonly TestSessionEntry[] = [
  {
    name: 'sess-edge-undef',
    status: 'open',
    branchName: 'main',
    repoName: 'edge-repo',
    tokensUsed: 5_000,
    // tokenBudget intentionally undefined
  },
  {
    name: 'sess-edge-zero',
    status: 'open',
    branchName: 'main',
    repoName: 'edge-repo',
    tokensUsed: 5_000,
    tokenBudget: 0,
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

describe('MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB1 — session-list ctx N% text contract', () => {
  describe('Condition (1): each row contains exactly one frame-c-session-row-ctx-text-{name} element', () => {
    it('renders one ctx-text element per session row', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const ctxText = container.querySelectorAll(
            `[data-testid="frame-c-session-row-ctx-text-${sess.name}"]`,
          );
          expect(
            ctxText.length,
            `row for "${sess.name}" must contain exactly one ctx-text element (got ${ctxText.length})`,
          ).toBe(1);
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (2): ctx-text content matches rounded percent for tokensUsed=87000, tokenBudget=200000', () => {
    it('sess-beta ctx-text matches /ctx (43|44)%/ (43.5% rounding tolerance)', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        const ctxText = container.querySelector(
          '[data-testid="frame-c-session-row-ctx-text-sess-beta"]',
        );
        expect(ctxText, 'sess-beta ctx-text element must exist').not.toBeNull();
        expect(
          (ctxText!.textContent ?? '').trim(),
          'ctx-text content for 87000/200000 must match /ctx (43|44)%/',
        ).toMatch(/ctx (43|44)%/);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (3): per-row data binding — distinct ratios produce distinct ctx-text content', () => {
    it('alpha (6%), beta (43-44%), gamma (85%) ctx-text values are all distinct and match expected', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        const alphaText = (
          container.querySelector(
            '[data-testid="frame-c-session-row-ctx-text-sess-alpha"]',
          )?.textContent ?? ''
        ).trim();
        const betaText = (
          container.querySelector(
            '[data-testid="frame-c-session-row-ctx-text-sess-beta"]',
          )?.textContent ?? ''
        ).trim();
        const gammaText = (
          container.querySelector(
            '[data-testid="frame-c-session-row-ctx-text-sess-gamma"]',
          )?.textContent ?? ''
        ).trim();

        expect(alphaText, 'sess-alpha (12000/200000 = 6%) must match /ctx 6%/').toMatch(
          /ctx 6%/,
        );
        expect(betaText, 'sess-beta (87000/200000 ≈ 43.5%) must match /ctx (43|44)%/').toMatch(
          /ctx (43|44)%/,
        );
        expect(gammaText, 'sess-gamma (170000/200000 = 85%) must match /ctx 85%/').toMatch(
          /ctx 85%/,
        );

        // Per-row binding: distinct ratios → distinct text. Detects
        // implementation regressions where a single shared ratio (e.g.,
        // first session, last session, hardcoded) leaks into all rows.
        expect(alphaText, 'alpha vs beta ctx-text must differ').not.toBe(betaText);
        expect(betaText, 'beta vs gamma ctx-text must differ').not.toBe(gammaText);
        expect(alphaText, 'alpha vs gamma ctx-text must differ').not.toBe(gammaText);
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (4): tokenBudget undefined/0 edge — no crash, no math-degenerate substrings', () => {
    it('renders ctx-text fallback without NaN/Infinity/undefined text', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_EDGE_SESSIONS);
      try {
        for (const sess of FIXTURE_EDGE_SESSIONS) {
          const ctxText = container.querySelector(
            `[data-testid="frame-c-session-row-ctx-text-${sess.name}"]`,
          );
          expect(
            ctxText,
            `row for "${sess.name}" (tokenBudget=${String(sess.tokenBudget)}) must still render ctx-text fallback`,
          ).not.toBeNull();
          const text = (ctxText!.textContent ?? '').trim();
          // Honest fallback shapes per WB2 implementation discretion:
          // "ctx 0%" OR "ctx —" OR "ctx -%" — all acceptable. What is
          // NOT acceptable: NaN, Infinity, undefined leaking into the
          // visible string (would signal divide-by-zero / unguarded ratio).
          expect(
            text,
            `ctx-text for "${sess.name}" must not contain "NaN"`,
          ).not.toMatch(/NaN/);
          expect(
            text,
            `ctx-text for "${sess.name}" must not contain "Infinity"`,
          ).not.toMatch(/Infinity/);
          expect(
            text,
            `ctx-text for "${sess.name}" must not contain "undefined"`,
          ).not.toMatch(/undefined/);
        }
      } finally {
        dispose();
      }
    });
  });

  describe('Condition (5): Sub-Q-B=(a) inline-not-stacked — ctx-text is a direct child of the row element', () => {
    it('ctx-text parent IS the row element (sibling to status/name/meta), not nested inside them', () => {
      expect(mountFrameC).toBeDefined();
      const { container, dispose } = mountWith(FIXTURE_SESSIONS);
      try {
        for (const sess of FIXTURE_SESSIONS) {
          const row = container.querySelector(
            `[data-testid="frame-c-session-row-${sess.name}"]`,
          );
          expect(row, `row for "${sess.name}" must exist`).not.toBeNull();
          const ctxText = container.querySelector(
            `[data-testid="frame-c-session-row-ctx-text-${sess.name}"]`,
          );
          expect(
            ctxText,
            `ctx-text for "${sess.name}" must exist`,
          ).not.toBeNull();
          // Sub-Q-B=(a) inline: ctx-text element's parentNode IS the
          // row div. Not nested inside name/meta/status spans (which
          // would suggest (c) hybrid stacked layout or accidental
          // wrapping div). Anti-regression for implementation drift.
          expect(
            ctxText!.parentNode,
            `ctx-text for "${sess.name}" must be a DIRECT child of the row (Sub-Q-B=(a) inline format)`,
          ).toBe(row);
        }
      } finally {
        dispose();
      }
    });
  });
});
