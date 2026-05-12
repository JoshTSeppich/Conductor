// @vitest-environment happy-dom
//
// MB-F-CHATSHELL-POLISH-REMAINING WB3 RED+GREEN paired — mix-indicator
// chip border-radius adjustment.
//
// Per T7 row 357 example polish target: "mix-indicator chip
// border-radius adjustment". Resolution: bump CHIP_STYLE.borderRadius
// from `3px` (current) to `4px` (slightly softer chip aesthetic;
// matches the visual softness of the broader T7 chat-shell polish set).
//
// RED state pre-edit: CHIP_STYLE.borderRadius === '3px' (verified at
// mix-indicator.tsx:95 direct read).
// GREEN state post-edit: CHIP_STYLE.borderRadius === '4px'.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MixIndicator } from '../../../src/chat-shell/mix-indicator.js';

describe('probe-polish-03 — mix-indicator chip border-radius adjustment', () => {
  it('S4.6 chip renders with borderRadius 4px', () => {
    const { getByTestId } = render(<MixIndicator />);
    const chip = getByTestId('mix-indicator-chip-S46');
    expect((chip as HTMLElement).style.borderRadius).toBe('4px');
  });

  it('all 4 chips render with consistent borderRadius 4px', () => {
    const { getByTestId } = render(<MixIndicator />);
    const suffixes = ['S46', 'O46', 'O471M', 'H'];
    for (const suffix of suffixes) {
      const chip = getByTestId(`mix-indicator-chip-${suffix}`);
      expect(
        (chip as HTMLElement).style.borderRadius,
        `chip ${suffix} must render with borderRadius 4px per polish; got '${(chip as HTMLElement).style.borderRadius}'`,
      ).toBe('4px');
    }
  });

  it('chip retains data-testid + count span structure (non-regression)', () => {
    const { getByTestId } = render(<MixIndicator />);
    const chip = getByTestId('mix-indicator-chip-O46');
    expect(chip.tagName).toBe('SPAN');
    const countSpan = getByTestId('mix-indicator-chip-O46-count');
    expect(countSpan.textContent).toBe('0');
  });
});
