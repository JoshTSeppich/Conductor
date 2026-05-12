// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T7-VISUAL-POLISH WB9 (red) — cost-meter wireframe-
// format polish probe (Sub-Q-MBTWFT7-E=(i) chat-shell-polish-only scope
// narrowed to concrete wireframe-target text refinement).
//
// SCOPE NARROWING per WB9 authoring observation (anti-fabrication
// discipline applied per CLAUDE.md memory `feedback_stale_dispatch_
// detection.md` — same lesson as T7 WB7 anti-fabrication catch
// `MB-F-T7-WB7-FILTERBAR-SCOPE-OBSOLETED-BY-T1-WB11`): direct source
// read of chat-shell/{cost-meter, dispatch-mode-toggle, plan-usage-ring,
// mix-indicator}.tsx at HEAD `ba49029` confirms:
//   - dispatch-mode-toggle ALREADY has active-state highlight via
//     BUTTON_ACTIVE_STYLE (background:#374151 + fontWeight:600) +
//     aria-pressed semantic + chat-shell-dispatch-mode-toggle-{auto,ask}
//     testids. Wireframe "Auto highlighted = autonomous" already
//     shipped.
//   - plan-usage-ring already renders SVG ring + countdown text with
//     chat-shell-plan-usage-{slot,ring-svg,ring-tint-*,countdown}
//     testids.
//   - mix-indicator already renders chip with mix-indicator-{root,chip-
//     *,chip-*-count} testids.
//   - cost-meter renders ONLY the value (`$0.42` per `formatCost`) — no
//     wireframe-mandated "conductor api · ... today" prefix/suffix.
// → narrowed WB9-WB10 scope to cost-meter wireframe-format refinement
//   (concrete, visible, single-component); other 3 components ship-
//   adequate at HEAD per visual-diff-deferred posture filed at WB11
//   docs as Tier 3 `MB-F-T7-CHATSHELL-POLISH-REMAINING-DOGFOOD-DRIVEN`.
//
// Asserts (per dispatch §1 wireframe target "conductor api · $0.42
// today" format):
//   probe-09a [ratify]: cost-meter slot renders root testid
//              `chat-shell-cost-meter-slot` (T1/MB-T22 ship; trivial-
//              pass baseline).
//   probe-09b [ratify]: cost-meter value renders testid
//              `chat-shell-cost-meter-value` (trivial-pass).
//   probe-09c [ACTIVE-RED]: cost-meter renders `chat-shell-cost-meter-
//              prefix` (NEW) with text containing "conductor api"
//              per wireframe-target text content.
//   probe-09d [ACTIVE-RED]: cost-meter renders `chat-shell-cost-meter-
//              suffix` (NEW) with text containing "today" per
//              wireframe-target text content.
//
// RED state at HEAD `ba49029`:
//   - cost-meter.tsx:59-70 renders only the value span; no prefix /
//     suffix elements. probes 09c-09d fail at DOM query null.
//   - probes 09a + 09b trivially pass (existing T1/MB-T22 testids
//     preserved).
//
// WB10 GREEN deliverable: extend cost-meter.tsx with:
//   <span data-testid="chat-shell-cost-meter-prefix" style={PREFIX_STYLE}>
//     conductor api ·
//   </span>
//   <span data-testid="chat-shell-cost-meter-value">{formatCost(...)}</span>
//   <span data-testid="chat-shell-cost-meter-suffix" style={SUFFIX_STYLE}>
//     today
//   </span>
//   Inline-CSSProperties per Sub-Q-MBTWFT7-A=(α) extend-pattern.
//   PREFIX_STYLE + SUFFIX_STYLE muted (e.g., color: '#888' or '#9ca3af')
//   to keep visual emphasis on the value.

import { describe, it, expect, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { CostMeter } from '../../../src/chat-shell/cost-meter.js';

function renderCostMeter(): { container: HTMLDivElement; cleanup: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(CostMeter, {
        bridge: {
          // Minimal bridge stub — onCostUpdate captures callback +
          // returns no-op cleanup; cost-meter renders the formatCost
          // fallback ('—') with NO totalUsd update fired.
          onCostUpdate: vi.fn(() => () => {}),
        },
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

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB9 — cost-meter wireframe-format polish (Sub-Q-E=i)', () => {
  it('probe-09a [trivial-baseline]: cost-meter slot renders chat-shell-cost-meter-slot testid', () => {
    const { container, cleanup } = renderCostMeter();
    try {
      const slot = container.querySelector(
        '[data-testid="chat-shell-cost-meter-slot"]',
      );
      expect(
        slot,
        'cost-meter root slot must render with T1/MB-T22 shipped testid',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-09b [trivial-baseline]: cost-meter value span renders chat-shell-cost-meter-value testid', () => {
    const { container, cleanup } = renderCostMeter();
    try {
      const value = container.querySelector(
        '[data-testid="chat-shell-cost-meter-value"]',
      );
      expect(
        value,
        'cost-meter value span must render with T1/MB-T22 shipped testid',
      ).not.toBeNull();
    } finally {
      cleanup();
    }
  });

  it('probe-09c [ACTIVE-RED for WB10]: cost-meter renders prefix containing "conductor api"', () => {
    const { container, cleanup } = renderCostMeter();
    try {
      const prefix = container.querySelector(
        '[data-testid="chat-shell-cost-meter-prefix"]',
      );
      expect(
        prefix,
        'cost-meter prefix span must render per wireframe-target "conductor api · $0.42 today" format; WB10 GREEN adds NEW span',
      ).not.toBeNull();
      const text = prefix!.textContent ?? '';
      expect(
        text.includes('conductor api'),
        'prefix text must include "conductor api" per dispatch §1 wireframe-target verbatim',
      ).toBe(true);
    } finally {
      cleanup();
    }
  });

  it('probe-09d [ACTIVE-RED for WB10]: cost-meter renders suffix containing "today"', () => {
    const { container, cleanup } = renderCostMeter();
    try {
      const suffix = container.querySelector(
        '[data-testid="chat-shell-cost-meter-suffix"]',
      );
      expect(
        suffix,
        'cost-meter suffix span must render per wireframe-target "today" verbatim',
      ).not.toBeNull();
      const text = suffix!.textContent ?? '';
      expect(text.includes('today')).toBe(true);
    } finally {
      cleanup();
    }
  });
});
