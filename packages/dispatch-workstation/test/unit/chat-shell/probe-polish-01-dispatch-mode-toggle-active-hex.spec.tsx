// @vitest-environment happy-dom
//
// MB-F-CHATSHELL-POLISH-REMAINING (T7 followup) WB1 RED+GREEN paired
// — dispatch-mode-toggle active-state hex brightening polish.
//
// Per T7 row 357 (FOLLOWUPS.md `MB-F-T7-CHATSHELL-POLISH-REMAINING-
// DOGFOOD-DRIVEN`) example refinement: "dispatch-mode-toggle active-
// state hex brighter". Resolution via R11 §3.9 Wave 2 SPECULATIVE
// dispatch + full §C envelope: brighten active-button background
// from current `#374151` (dark slate grey) to `#4a7fb8` (matches T7
// WB4 selected-tile borderLeft accent at session-list.tsx — creates
// visual unity across "selected/active" states between Frame C
// SessionList rows and chat-shell dispatch-mode toggle).
//
// RED state pre-edit: BUTTON_ACTIVE_STYLE.background === '#374151'
// (verified at dispatch-mode-toggle.tsx:91 direct read at HEAD
// `a8e9a76`).
//
// GREEN state post-edit: BUTTON_ACTIVE_STYLE.background === '#4a7fb8'.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DispatchModeToggle } from '../../../src/chat-shell/dispatch-mode-toggle.js';

describe('probe-polish-01 — dispatch-mode-toggle active-state hex brighter', () => {
  it('active button (default Ask state) renders with brightened background hex #4a7fb8', () => {
    const { getByTestId } = render(<DispatchModeToggle />);
    const askButton = getByTestId('chat-shell-dispatch-mode-toggle-ask');
    // Default mode per DEFAULT_MODE = 'ask'; aria-pressed should be 'true'.
    expect(askButton.getAttribute('aria-pressed')).toBe('true');
    // Active style.background should be the brightened hex per polish.
    const bg = (askButton as HTMLElement).style.background;
    // CSS computed style may report as 'rgb(74, 127, 184)' OR raw hex
    // depending on happy-dom version; accept either form.
    const normalized = bg.toLowerCase().replace(/\s+/g, '');
    const acceptable =
      normalized === '#4a7fb8' || normalized === 'rgb(74,127,184)';
    expect(
      acceptable,
      `active button background must be brightened hex '#4a7fb8' (matches T7 selected-tile accent); got '${bg}'`,
    ).toBe(true);
  });

  it('inactive button retains transparent background (unchanged from T7 baseline)', () => {
    const { getByTestId } = render(<DispatchModeToggle />);
    const autoButton = getByTestId('chat-shell-dispatch-mode-toggle-auto');
    expect(autoButton.getAttribute('aria-pressed')).toBe('false');
    const bg = (autoButton as HTMLElement).style.background;
    // Inactive button has `background: 'transparent'` per BUTTON_STYLE.
    expect(bg.toLowerCase()).toBe('transparent');
  });

  it('active button retains existing aria + testid contract (non-regression)', () => {
    const { getByTestId } = render(<DispatchModeToggle />);
    const askButton = getByTestId('chat-shell-dispatch-mode-toggle-ask');
    expect(askButton.getAttribute('aria-pressed')).toBe('true');
    expect(askButton.tagName).toBe('BUTTON');
    // fontWeight 600 retained from T7 baseline BUTTON_ACTIVE_STYLE.
    const fw = (askButton as HTMLElement).style.fontWeight;
    expect(fw === '600' || fw === 'bold').toBe(true);
  });
});
