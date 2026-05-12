// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB6 (green) —
// BUILD.md tab body placeholder component.
//
// Per ticket body f8fc24d §4 WB6 + Sub-Q-T4-B=(iii) operator-acked
// default 2026-05-12 ("accept all defaults"):
//   - Sub-Q-T4-B=(iii): ship tab body placeholder; T5 owns actual
//     BUILD.md content rendering. T5 ticket landed at `c92f750`
//     (Phase 1 second batch convergence; MB-T-WIREFRAME-T5-BUILD-MD-
//     DRIVEN-DISPATCH).
//   - Renders `<div data-testid="build-md-tab-placeholder">` with
//     text cross-referencing T5 ownership.
//
// Production-wiring path:
//   - mount.ts (chat-shell renderer entry) is responsible for
//     including a BUILD.md TabConfig in the `tabs` array passed to
//     ChatShell. WB12 final layout consolidation OR T5 sibling
//     ownership reconciles the wiring; this component contract
//     ships unconditionally so the integration point is defined.

import type { CSSProperties } from 'react';

const PLACEHOLDER_STYLE: CSSProperties = {
  padding: '12px',
  fontFamily: 'monospace',
  fontSize: '13px',
  color: '#9ca3af',
  lineHeight: 1.5,
};

const TITLE_STYLE: CSSProperties = {
  color: '#cccccc',
  fontWeight: 600,
  marginBottom: '8px',
};

export function BuildMdTab(): JSX.Element {
  return (
    <div data-testid="build-md-tab-placeholder" style={PLACEHOLDER_STYLE}>
      <div style={TITLE_STYLE}>BUILD.md tab</div>
      Content rendered by MB-T-WIREFRAME-T5-BUILD-MD-DRIVEN-DISPATCH
      (T5 ticket body landed at <code>c92f750</code>; parser + content
      rendering shipped under T5 ownership). This tab shell is the
      structural slot per MB-T-WIREFRAME-T4 WB6 Sub-Q-T4-B=(iii)
      defer-with-placeholder disposition.
    </div>
  );
}
