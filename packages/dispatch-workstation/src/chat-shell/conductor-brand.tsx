// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB2 (green) —
// Conductor brand label component.
//
// Per ticket body f8fc24d §4 WB2 + Sub-Q-T4-A=(α) operator-pre-
// arbitrated 2026-05-12 ("accept all defaults"):
//   - Renders `<span data-testid="bottom-rail-brand">Conductor</span>`.
//   - Always-present (no slot prop conditional) — the brand label is
//     unconditional per wireframe.
//   - Mounted by ChatShell at the leftmost position inside the
//     existing `chat-shell-header-bar` element (Sub-Q-T4-A=α host-
//     extension; precedes the MB-T24 dispatch-mode-toggle "FAR-LEFT"
//     slot which the wireframe positions to the RIGHT of the brand).
//
// Visual styling is minimal — T7 visual-polish ticket consumes this
// component and refines per wireframe (typography, weight, color,
// padding precisely). This component ships the structural element +
// literal text only.
//
// MB-F-CHATSHELL-POLISH-REMAINING WB4 (green) — adds aria-label for
// brand-marker semantic affordance to assistive technology. Subjective
// hex / typography refinement deferred per MB-F-T7-CHATSHELL-POLISH-
// REMAINING-DOGFOOD-DRIVEN Tier 3 closure-path-α (await γ headless
// screenshot pipeline).

import type { CSSProperties } from 'react';

const BRAND_STYLE: CSSProperties = {
  fontWeight: 600,
  fontSize: '13px',
  color: '#eaeaea',
  letterSpacing: '0.02em',
  flexShrink: 0,
  paddingRight: '4px',
};

export function ConductorBrand(): JSX.Element {
  return (
    <span
      data-testid="bottom-rail-brand"
      aria-label="Conductor"
      style={BRAND_STYLE}
    >
      Conductor
    </span>
  );
}
