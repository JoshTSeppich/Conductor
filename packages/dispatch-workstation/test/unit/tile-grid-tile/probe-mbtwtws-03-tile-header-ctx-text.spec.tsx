// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB5 (red) — TileHeader `ctx N%`
// text rendering contract probe (Sub-Q-MBTWTWS-A=(iv) +tile-header
// sibling integration).
//
// Asserts (per ticket body 8ff40a8 §4 WB5 + operator pre-arbitrated
// envelope Sub-Q-A=(iv) +Sub-Q-B=(a)):
//
//   (1) When <TileHeader/> is rendered with tokensUsed + tokenBudget,
//       a `data-testid="tile-header-ctx-text"` element is present.
//   (2) For tokensUsed=87_000, tokenBudget=200_000 (ratio 0.435), the
//       ctx-text matches /ctx (43|44)%/ — same rounding tolerance as
//       probe-mbtwtws-01 Condition 2.
//   (3) tokenBudget=0 edge: ctx-text element still renders without
//       math-degenerate substrings ("NaN" / "Infinity" / "undefined").
//   (4) MB-T15 token-meter contract preservation (CRITICAL anti-regression
//       per ticket §5.2 WB6 note): the existing
//       `data-testid="tile-header-token-meter"` AND
//       `data-testid="tile-header-token-meter-fill"` elements remain
//       present + the fill width still reflects tokenRatio (bar NOT
//       removed under Sub-Q-B=(a) additive format).
//   (5) Sub-Q-B=(a) inline-not-stacked: ctx-text is a SIBLING of the
//       token-meter (same parentNode), not nested inside the meter
//       div (which would shadow the bar) and not in a separate
//       wrapper that would imply (c) hybrid stacked layout.
//
// RED state at HEAD `d5ba210` (post-WB2 GREEN):
//   - tile-header.tsx (read at 2026-05-11) lines 202-209 render the
//     token-meter outer + fill divs ONLY; no ctx-text element exists.
//   - 5/5 conditions fail at screen.queryByTestId('tile-header-ctx-text')
//     returning null (Conditions 1/2/3/5) OR (for Condition 4) the
//     meter+fill assertions still pass — but the probe FAILS overall
//     because Conditions 1+2+3+5 require the ctx-text element. Honest
//     RED — load-bearing impl absent.
//
// WB6 GREEN target: add ctx-text span next to the existing meter div
// at tile-header.tsx:202-209 (sibling at the same flex level inside
// `data-testid="tile-header-content"`). MUST NOT modify the meter's
// data-testid contracts (tile-header-token-meter +
// tile-header-token-meter-fill) per §5.2 risk note.
//
// Probe naming: `probe-mbtwtws-*` is path-disjoint at file-level from
// other Wave C territories (T3 `probe-mbtwbdpfa-*` in test/unit/frame-c/,
// T4-succ `probe-mbtwbfcs-*` in test/unit/frame-c/). Located in
// test/unit/tile-grid-tile/ alongside other MB-T15 / MB-T-WIREFRAME
// tile-header probes per CLAUDE.md §3.6 test-file layout convention.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileHeader } from '../../../src/tile-grid/tile-header.js';

describe('MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB5 — TileHeader ctx N% text contract', () => {
  describe('Condition (1): tile-header-ctx-text element renders when tokensUsed + tokenBudget present', () => {
    it('renders the ctx-text element', () => {
      render(
        <TileHeader
          sessionName="sess-x"
          status="open"
          tokensUsed={50_000}
          tokenBudget={200_000}
        />,
      );
      expect(
        screen.queryByTestId('tile-header-ctx-text'),
        'TileHeader must render an element with data-testid="tile-header-ctx-text"',
      ).not.toBeNull();
    });
  });

  describe('Condition (2): ctx-text content matches rounded percent (43-44% for 87000/200000)', () => {
    it('renders /ctx (43|44)%/ for tokensUsed=87000, tokenBudget=200000', () => {
      render(
        <TileHeader
          sessionName="sess-x"
          status="open"
          tokensUsed={87_000}
          tokenBudget={200_000}
        />,
      );
      const ctxText = screen.queryByTestId('tile-header-ctx-text');
      expect(ctxText, 'ctx-text element must exist').not.toBeNull();
      expect(
        (ctxText!.textContent ?? '').trim(),
        'ctx-text content for 87000/200000 must match /ctx (43|44)%/',
      ).toMatch(/ctx (43|44)%/);
    });
  });

  describe('Condition (3): tokenBudget=0 edge — no math-degenerate substrings', () => {
    it('renders ctx-text fallback without NaN/Infinity/undefined', () => {
      render(
        <TileHeader
          sessionName="sess-x"
          status="open"
          tokensUsed={5_000}
          tokenBudget={0}
        />,
      );
      const ctxText = screen.queryByTestId('tile-header-ctx-text');
      expect(
        ctxText,
        'ctx-text must still render when tokenBudget=0 (honest fallback)',
      ).not.toBeNull();
      const text = (ctxText!.textContent ?? '').trim();
      expect(text, 'ctx-text must not contain "NaN"').not.toMatch(/NaN/);
      expect(text, 'ctx-text must not contain "Infinity"').not.toMatch(/Infinity/);
      expect(text, 'ctx-text must not contain "undefined"').not.toMatch(/undefined/);
    });
  });

  describe('Condition (4): MB-T15 token-meter contract preservation (anti-regression)', () => {
    it('existing tile-header-token-meter + tile-header-token-meter-fill remain present', () => {
      render(
        <TileHeader
          sessionName="sess-x"
          status="open"
          tokensUsed={120_000}
          tokenBudget={200_000}
        />,
      );
      // CRITICAL: WB6 GREEN must NOT remove the bar element under
      // Sub-Q-B=(a) additive format. Bar removal would regress MB-T15
      // probe-05 contract + lose color-coded tint signal.
      expect(
        screen.queryByTestId('tile-header-token-meter'),
        'tile-header-token-meter (outer bar) must remain present',
      ).not.toBeNull();
      expect(
        screen.queryByTestId('tile-header-token-meter-fill'),
        'tile-header-token-meter-fill (inner fill div) must remain present',
      ).not.toBeNull();
      // Fill width still tracks ratio: 120000/200000 = 60%.
      const fill = screen.getByTestId('tile-header-token-meter-fill');
      expect(
        (fill as HTMLElement).style.width,
        'fill width must reflect tokenRatio (60% for 120000/200000)',
      ).toBe('60%');
    });
  });

  describe('Condition (5): Sub-Q-B=(a) inline-not-stacked — ctx-text is a sibling of the token-meter', () => {
    it('ctx-text shares parentNode with tile-header-token-meter (sibling-level placement)', () => {
      render(
        <TileHeader
          sessionName="sess-x"
          status="open"
          tokensUsed={50_000}
          tokenBudget={200_000}
        />,
      );
      const ctxText = screen.queryByTestId('tile-header-ctx-text');
      const meter = screen.queryByTestId('tile-header-token-meter');
      expect(ctxText, 'ctx-text element must exist').not.toBeNull();
      expect(meter, 'token-meter element must exist').not.toBeNull();
      // Anti-regression for two drifts:
      // 1. (c) hybrid stacked layout: ctx-text wrapped in a separate
      //    container (parentNode would differ from meter's parentNode).
      // 2. ctx-text nested INSIDE the meter div (would shadow the bar
      //    visually; not Sub-Q-B=(a) intent).
      expect(
        ctxText!.parentNode,
        'ctx-text and tile-header-token-meter must share the same parentNode (sibling placement; Sub-Q-B=(a) inline format)',
      ).toBe(meter!.parentNode);
      // Reject the "ctx-text nested INSIDE the meter" drift explicitly.
      expect(
        meter!.contains(ctxText!),
        'ctx-text must NOT be nested inside the token-meter div',
      ).toBe(false);
    });
  });
});
