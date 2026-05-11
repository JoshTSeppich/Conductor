// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB3 (red) — Frame C detail-pane
// `ctx N%` text rendering contract probe (Sub-Q-MBTWTWS-B=(a) inline
// format).
//
// Authored AFTER Wave B WB8 GREEN (`525c502`) cleared HALT-PRE-WB-
// DETAIL-PANE: detail-pane.tsx now exists with signature
// `DetailPane({ selectedSessionName: string })`. This probe asserts
// the WB4 GREEN extension of that signature with optional
// `tokensUsed?: number` + `tokenBudget?: number` props (adaptation
// per ticket body 8ff40a8 §8 risk register row 2: "WB4 may discover
// that detail-pane's selected-session context lookup makes tokensUsed/
// tokenBudget access non-trivial ... Adapt at WB4").
//
// Asserts (per ticket body §4 WB3 + operator pre-arbitrated envelope
// Sub-Q-A=(iv) + Sub-Q-B=(a)):
//
//   (1) When <DetailPane/> is rendered with tokensUsed + tokenBudget
//       props, a `data-testid="frame-c-detail-pane-ctx-text"` element
//       is present inside `data-testid="frame-c-detail-pane"`.
//   (2) For tokensUsed=87_000, tokenBudget=200_000 (43.5%), ctx-text
//       matches /ctx (43|44)%/ — same rounding tolerance as
//       probe-mbtwtws-01 + probe-mbtwtws-03 Condition 2.
//   (3) tokenBudget=0/undefined edge: ctx-text element still renders
//       without math-degenerate substrings ("NaN" / "Infinity" /
//       "undefined").
//   (4) Bridge-independence: ctx-text renders even when
//       `window.workstationBridge` is unavailable (DetailPane's
//       useEffect surfaces an inline error state, but ctx-text is
//       sourced from props — independent of bridge state).
//   (5) Sub-Q-B=(a) inline-not-stacked: ctx-text is NOT nested inside
//       the <pre> body element (which would suggest (c) hybrid stacked
//       layout where the percent is embedded in the swarm-state text
//       block). ctx-text must exist within the detail-pane outer
//       container at a sibling level to the body.
//
// RED state at HEAD `aa18302` (post-Wave-B-WB9-RED main.ts wiring
// probe; current detail-pane.tsx at 525c502 WB8 GREEN):
//   - DetailPaneProps shape is `{ selectedSessionName: string }` —
//     no tokens props yet. WB4 GREEN extends with optional props.
//   - DetailPane render emits: outer div (frame-c-detail-pane) >
//     [header div, <pre> body]. No ctx-text element.
//   - 5/5 conditions fail at queryByTestId('frame-c-detail-pane-ctx-text')
//     returning null. Honest RED — load-bearing impl absent.
//
// WB4 GREEN target:
//   1. Extend DetailPaneProps with `tokensUsed?: number` +
//      `tokenBudget?: number`.
//   2. Render `<span data-testid="frame-c-detail-pane-ctx-text">ctx N%</span>`
//      as a sibling of the existing header div (NOT inside the <pre>),
//      so it appears near the session-name header — semantically
//      "alongside the selected session's content" per body §1.1 item 2.
//   3. Modify FrameCRoot's DetailPane invocation to pass tokens props
//      by looking up the selected session in `sessions`.
//
// Type-cast pattern: DetailPane import + a probe-local
// `DetailPaneWithTokens` type alias declaring the post-WB4 expected
// prop shape; cast is contained to this probe file. Runtime ctx-text
// assertions are DOM-based (data-testid query); failures are honest
// RED at the element level, not at the type level.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
import { DetailPane } from '../../../src/frame-c/detail-pane.js';

// Post-WB4 expected DetailPaneProps shape; cast contained to this
// probe. WB4 GREEN must extend the runtime DetailPaneProps to match.
type DetailPaneWithTokensProps = {
  readonly selectedSessionName: string;
  readonly tokensUsed?: number;
  readonly tokenBudget?: number;
};
const DetailPaneWithTokens = DetailPane as unknown as (
  props: DetailPaneWithTokensProps,
) => JSX.Element;

interface WindowWithBridge {
  workstationBridge?: { readSwarmState?: () => Promise<string> };
}

// Stash + restore the existing workstationBridge across cases so that
// bridge-mock tests don't leak global pollution into Condition 4
// (which explicitly asserts bridge-absent behavior).
let savedBridge: { readSwarmState?: () => Promise<string> } | undefined;

beforeEach(() => {
  savedBridge = (globalThis as unknown as { window?: WindowWithBridge }).window
    ?.workstationBridge;
});

afterEach(() => {
  const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
  if (win) {
    win.workstationBridge = savedBridge;
  }
});

// Bridge mock returning empty swarm-state. DetailPane resolves the
// promise → setContent('') → render shows the "no swarm-state section
// found" placeholder. ctx-text rendering is independent of this state.
function mockBridge(content: string = ''): void {
  const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
  if (win) {
    win.workstationBridge = {
      readSwarmState: vi.fn().mockResolvedValue(content),
    };
  }
}

function clearBridge(): void {
  const win = (globalThis as unknown as { window?: WindowWithBridge }).window;
  if (win) {
    win.workstationBridge = undefined;
  }
}

describe('MB-T-WIREFRAME-C5-TOKEN-WIRING-SURFACE WB3 — DetailPane ctx N% text contract', () => {
  describe('Condition (1): ctx-text element renders when tokens props passed', () => {
    it('renders frame-c-detail-pane-ctx-text inside the detail-pane container', () => {
      mockBridge();
      const result: RenderResult = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-x"
          tokensUsed={50_000}
          tokenBudget={200_000}
        />,
      );
      const pane = result.queryByTestId('frame-c-detail-pane');
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
      expect(pane, 'detail-pane container must exist').not.toBeNull();
      expect(
        ctxText,
        'frame-c-detail-pane-ctx-text element must exist when tokens props passed',
      ).not.toBeNull();
      expect(
        pane!.contains(ctxText!),
        'ctx-text must be a descendant of the detail-pane container',
      ).toBe(true);
    });
  });

  describe('Condition (2): ctx-text content matches /ctx (43|44)%/ for 87000/200000', () => {
    it('renders /ctx (43|44)%/ for tokensUsed=87000, tokenBudget=200000', () => {
      mockBridge();
      const result = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-beta"
          tokensUsed={87_000}
          tokenBudget={200_000}
        />,
      );
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
      expect(ctxText, 'ctx-text element must exist').not.toBeNull();
      expect(
        (ctxText!.textContent ?? '').trim(),
        'ctx-text content for 87000/200000 must match /ctx (43|44)%/',
      ).toMatch(/ctx (43|44)%/);
    });
  });

  describe('Condition (3): tokenBudget undefined/0 edge — no math-degenerate substrings', () => {
    it('tokenBudget=undefined → ctx-text renders fallback, no NaN/Infinity/undefined', () => {
      mockBridge();
      const result = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-edge-undef"
          tokensUsed={5_000}
          // tokenBudget intentionally undefined
        />,
      );
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
      expect(
        ctxText,
        'ctx-text must still render when tokenBudget=undefined (honest fallback)',
      ).not.toBeNull();
      const text = (ctxText!.textContent ?? '').trim();
      expect(text, 'ctx-text must not contain "NaN"').not.toMatch(/NaN/);
      expect(text, 'ctx-text must not contain "Infinity"').not.toMatch(/Infinity/);
      expect(text, 'ctx-text must not contain "undefined"').not.toMatch(/undefined/);
    });

    it('tokenBudget=0 → ctx-text renders fallback, no NaN/Infinity/undefined', () => {
      mockBridge();
      const result = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-edge-zero"
          tokensUsed={5_000}
          tokenBudget={0}
        />,
      );
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
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

  describe('Condition (4): bridge-independence — ctx-text renders even when bridge is unavailable', () => {
    it('renders ctx-text without workstationBridge defined', () => {
      clearBridge();
      const result = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-x"
          tokensUsed={100_000}
          tokenBudget={200_000}
        />,
      );
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
      expect(
        ctxText,
        'ctx-text must render even when workstationBridge is unavailable (props-sourced, not bridge-sourced)',
      ).not.toBeNull();
      expect(
        (ctxText!.textContent ?? '').trim(),
        'ctx-text content must reflect tokens props (50%) regardless of bridge state',
      ).toMatch(/ctx 50%/);
    });
  });

  describe('Condition (5): Sub-Q-B=(a) inline-not-stacked — ctx-text is NOT nested inside the <pre> body', () => {
    it('ctx-text and the detail-pane <pre> body are siblings (or ctx-text is sibling-of-pre at the pane level)', () => {
      mockBridge();
      const result = render(
        <DetailPaneWithTokens
          selectedSessionName="sess-x"
          tokensUsed={50_000}
          tokenBudget={200_000}
        />,
      );
      const pane = result.queryByTestId('frame-c-detail-pane');
      const ctxText = result.queryByTestId('frame-c-detail-pane-ctx-text');
      expect(pane, 'detail-pane container must exist').not.toBeNull();
      expect(ctxText, 'ctx-text element must exist').not.toBeNull();
      // Anti-regression: if ctx-text is placed INSIDE the <pre> body
      // element, the percent ends up embedded in the swarm-state text
      // block — visually "stacked" with the content rather than
      // "inline" with the session-name header. Reject that drift.
      const preEl = pane!.querySelector('pre');
      expect(preEl, 'detail-pane must contain a <pre> body element').not.toBeNull();
      expect(
        preEl!.contains(ctxText!),
        'ctx-text must NOT be nested inside the <pre> body (Sub-Q-B=(a) inline-not-stacked)',
      ).toBe(false);
    });
  });
});
