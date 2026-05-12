// @vitest-environment happy-dom
//
// MB-F-CHATSHELL-POLISH-REMAINING WB2 RED+GREEN paired —
// plan-usage-ring countdown typography refinement.
//
// Per T7 row 357 example polish target: "plan-usage-ring countdown
// typography refinement". Resolution: explicit COUNTDOWN_STYLE
// applied to the countdown span (currently inherits from SLOT_STYLE
// only) with:
//   - fontVariantNumeric: 'tabular-nums' (stable digit width — load-
//     bearing for ticking '2h 47m' style countdown text per dispatch
//     §1 wireframe target)
//   - color: '#cccccc' (brighter than inherited inherit-from-parent;
//     consistent with T1 SessionList NAME_STYLE color contrast)
//   - fontWeight: 500 (subtle emphasis vs surrounding ring)
//
// RED state pre-edit: countdown span has NO own style attribute (no
// inline style set; inherits from SLOT_STYLE via parent).
// GREEN state post-edit: countdown span has explicit style with
//   fontVariantNumeric 'tabular-nums' + color '#cccccc' + fontWeight '500'.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlanUsageRing } from '../../../src/chat-shell/plan-usage-ring.js';

describe('probe-polish-02 — plan-usage-ring countdown typography refinement', () => {
  it('countdown span has tabular-nums fontVariantNumeric for stable digit width', () => {
    const { getByTestId } = render(<PlanUsageRing />);
    const countdown = getByTestId('chat-shell-plan-usage-countdown');
    const fvn = (countdown as HTMLElement).style.fontVariantNumeric;
    expect(
      fvn,
      `countdown span must set fontVariantNumeric='tabular-nums' for ticking-stable digit width; got '${fvn}'`,
    ).toBe('tabular-nums');
  });

  it('countdown span has explicit color #cccccc (brighter than inherited)', () => {
    const { getByTestId } = render(<PlanUsageRing />);
    const countdown = getByTestId('chat-shell-plan-usage-countdown');
    const color = (countdown as HTMLElement).style.color;
    const normalized = color.toLowerCase().replace(/\s+/g, '');
    const acceptable =
      normalized === '#cccccc' || normalized === 'rgb(204,204,204)';
    expect(
      acceptable,
      `countdown color must be '#cccccc' per polish; got '${color}'`,
    ).toBe(true);
  });

  it('countdown span has fontWeight 500 (subtle emphasis vs surrounding ring slot)', () => {
    const { getByTestId } = render(<PlanUsageRing />);
    const countdown = getByTestId('chat-shell-plan-usage-countdown');
    const fw = (countdown as HTMLElement).style.fontWeight;
    expect(
      fw === '500' || fw === 'medium',
      `countdown fontWeight must be '500'; got '${fw}'`,
    ).toBe(true);
  });

  it('countdown span retains data-testid + placeholder content (non-regression)', () => {
    const { getByTestId } = render(<PlanUsageRing />);
    const countdown = getByTestId('chat-shell-plan-usage-countdown');
    // No bridge supplied → placeholder '—' per current behavior
    // (line 100 plan-usage-ring.tsx).
    expect(countdown.textContent).toBe('—');
    expect(countdown.tagName).toBe('SPAN');
  });
});
