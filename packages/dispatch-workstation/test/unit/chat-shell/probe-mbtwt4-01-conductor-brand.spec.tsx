// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB1 (red) —
// Conductor brand label presence + placement contract probe.
//
// Per ticket body f8fc24d §4 WB1 + Sub-Q-T4-A=(α) operator-pre-
// arbitrated 2026-05-12 ("accept all defaults"):
//   - Bottom-rail host element = extend `chat-shell-header-bar`
//     (existing data-testid="chat-shell-header-bar" element at
//     chat-shell.tsx:171 per MB-T26 WB3 precedent).
//   - Conductor brand renders inline inside chat-shell-header-bar
//     at the leftmost slot per wireframe (operator screenshot
//     reference 2026-05-11; full-build-mode-dispatch.md §1
//     "Bottom rail — Conductor controls" bullet 1).
//
// Encoded contract (3 conditions per ticket body §4 WB1 acceptance):
//   (1) ChatShell with default props (single chat tab) renders an
//       element with `data-testid="bottom-rail-brand"`.
//   (2) That element's text content is "Conductor" (literal exact
//       match — wireframe brand label).
//   (3) The element sits INSIDE `chat-shell-header-bar` per Sub-Q-A=α
//       host-extension decision (not a separate DOM region).
//
// RED state at HEAD `f8fc24d` (post-T4-ticket-body landing):
//   - WB2 has not yet authored `chat-shell/conductor-brand.tsx`;
//     ChatShell renders no brand element.
//   - 3/3 conditions fail at `screen.queryByTestId('bottom-rail-brand')`
//     returning null.
//
// WB2 GREEN target: NEW `src/chat-shell/conductor-brand.tsx` exports
// `<ConductorBrand />` rendering `<span data-testid="bottom-rail-brand">
// Conductor</span>`. MOD `src/chat-shell/chat-shell.tsx` to slot
// `<ConductorBrand />` inside the `chat-shell-header-bar` element
// (leftmost position). All 3 conditions flip RED → GREEN.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatShell, type TabConfig } from '../../../src/chat-shell/chat-shell.js';

const chatTab: TabConfig = {
  id: 'chat',
  label: 'Chat',
  render: () => null,
};

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB1 — Conductor brand label', () => {
  describe('Condition (1): bottom-rail-brand testid present in DOM', () => {
    it('renders element with data-testid="bottom-rail-brand" when ChatShell mounted with default props', () => {
      render(<ChatShell tabs={[chatTab]} />);
      const brand = screen.queryByTestId('bottom-rail-brand');
      expect(
        brand,
        'ChatShell must render an element with data-testid="bottom-rail-brand" (WB2 GREEN adds ConductorBrand component)',
      ).not.toBeNull();
    });
  });

  describe('Condition (2): brand text content is "Conductor"', () => {
    it('bottom-rail-brand element text content equals "Conductor"', () => {
      render(<ChatShell tabs={[chatTab]} />);
      const brand = screen.queryByTestId('bottom-rail-brand');
      expect(
        brand,
        'precondition: bottom-rail-brand must be present (Condition 1)',
      ).not.toBeNull();
      expect(
        brand!.textContent?.trim(),
        'brand text must be literal "Conductor" per wireframe',
      ).toBe('Conductor');
    });
  });

  describe('Condition (3): brand sits inside chat-shell-header-bar per Sub-Q-T4-A=α host-extension', () => {
    it('bottom-rail-brand is a descendant of chat-shell-header-bar (not separate DOM region)', () => {
      render(<ChatShell tabs={[chatTab]} />);
      const brand = screen.queryByTestId('bottom-rail-brand');
      const headerBar = screen.queryByTestId('chat-shell-header-bar');
      expect(
        brand,
        'precondition: bottom-rail-brand must be present (Condition 1)',
      ).not.toBeNull();
      expect(
        headerBar,
        'precondition: chat-shell-header-bar must be present (shipped at MB-T26 WB3)',
      ).not.toBeNull();
      expect(
        headerBar!.contains(brand!),
        'bottom-rail-brand must be a descendant of chat-shell-header-bar per Sub-Q-T4-A=α (extend existing host vs new DOM region)',
      ).toBe(true);
    });
  });
});
