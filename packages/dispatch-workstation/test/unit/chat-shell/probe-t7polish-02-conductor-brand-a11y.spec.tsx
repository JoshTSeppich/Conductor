// @vitest-environment happy-dom
//
// MB-F-CHATSHELL-POLISH-REMAINING WB3 (red) — ConductorBrand a11y
// affordance probe.
//
// Anti-fabrication scope `[KNOWN per MB-F-T7-CHATSHELL-POLISH-REMAINING-
// DOGFOOD-DRIVEN Tier 3 FOLLOWUPS.md:357]`: operator visual-diff input
// is absent at probe authoring time + γ headless screenshot pipeline
// has NOT yet shipped (MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-
// TOOLING ticket body at `030c2d6`; WB ladder not yet complete per
// recent commit log). Subjective polish (specific hex / typography /
// padding refinement) deferred per closure-path-α "await γ pipeline".
//
// Concrete non-subjective improvement asserted by this probe:
//   - ConductorBrand span carries explicit `aria-label="Conductor"`
//     affirming the brand-marker semantic for assistive technology.
//     Current HEAD `5db5fee` BRAND span has data-testid + text only;
//     adding aria-label aligns with industry-standard brand-mark
//     accessibility (pattern: github.com top-left logo span, similar
//     branding affordances).
//
// Why aria-label rather than role="img" or title:
//   - role="img" on text content is non-standard + may confuse AT
//     announcement (some readers say "Conductor, image" which is
//     awkward).
//   - title="..." is a hover-tooltip — minor UX, less universally
//     announced by AT.
//   - aria-label explicitly names the element for AT without altering
//     visible rendering OR introducing aesthetic changes.
//
// RED state at HEAD `67de2f8` (post-WB2 GREEN tab-switcher.tsx land):
//   - conductor-brand.tsx:30-36 renders <span data-testid="bottom-
//     rail-brand" style={BRAND_STYLE}>Conductor</span> with NO
//     aria-label attribute. Probe condition fails.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConductorBrand } from '../../../src/chat-shell/conductor-brand.js';

describe('MB-F-CHATSHELL-POLISH-REMAINING WB3 — ConductorBrand a11y', () => {
  describe('Condition (1): aria-label="Conductor" on bottom-rail-brand span', () => {
    it('renders aria-label="Conductor" attribute', () => {
      const { queryByTestId } = render(<ConductorBrand />);
      const brand = queryByTestId('bottom-rail-brand');
      expect(brand, 'bottom-rail-brand element must exist').not.toBeNull();
      expect(
        brand!.getAttribute('aria-label'),
        'ConductorBrand span must carry aria-label="Conductor" for brand-marker semantic',
      ).toBe('Conductor');
    });
  });

  describe('Condition (2): visible text content preserved verbatim (anti-regression)', () => {
    it('text content remains "Conductor"', () => {
      const { queryByTestId } = render(<ConductorBrand />);
      const brand = queryByTestId('bottom-rail-brand');
      expect(
        (brand!.textContent ?? '').trim(),
        'visible text content must be "Conductor" (no replacement with empty / aria-label-only render)',
      ).toBe('Conductor');
    });
  });

  describe('Condition (3): existing data-testid preserved (T4 contract anti-regression)', () => {
    it('data-testid="bottom-rail-brand" preserved verbatim', () => {
      const { queryByTestId } = render(<ConductorBrand />);
      expect(
        queryByTestId('bottom-rail-brand'),
        'bottom-rail-brand data-testid contract from T4 WB2 must be preserved',
      ).not.toBeNull();
    });
  });
});
