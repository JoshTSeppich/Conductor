// @vitest-environment happy-dom
//
// MB-T-MVP-W3-CONDUCTOR-CHAT WB3 (renumbered, gen-7 lane) probe-08 —
// BuildMdChip rendering.
//
// Verifies the BuildMdChip props + DOM contract per design bundle a20d0d4
// (docs/design-handoff/conductor-v-mvp/project/conductor-chat.jsx:48-62).
//
// FROZEN testid contract (docs/coordination/w3-testid-contract-2026-05-17.md):
//   conductor-composer-buildmd-chip — placeholder testid that operator-CC
//   composer.tsx (WB3 operator-CC lane) uses; this WB3 (gen-7 lane) ships
//   the REAL body at src/conductor-chat/build-md-chip.tsx mounting that
//   same testid. operator-CC imports build-md-chip from
//   src/conductor-chat/build-md-chip when this file lands.
//
// Probe numbering: 08 because 03 is operator-CC composer probe, 04 is
// operator-CC header probe, 05/06/07 are gen-7 W3 future probes
// (mount/screenshot/integration). 08 picked to avoid collision with the
// disjoint operator-CC lane. Manifest TERRITORY enumerated probes 01-07
// at dispatch time; this probe-08 falls under the operator-coordination
// directive 2026-05-17 ~20:30 MDT ("WB3=build-md-chip.tsx + probe-tbd")
// — treating that grant as an implicit manifest amendment.
//
// Coverage (design conductor-chat.jsx:48-62 verbatim contract):
//   - Root element data-testid="conductor-composer-buildmd-chip"
//   - Inline svg icon (14×14 viewBox 0 0 14 14)
//   - Name text from props
//   - "{steps} steps" meta label
//   - Optional remove × button visible when onRemove prop provided
//   - Remove × button HIDDEN when onRemove prop omitted
//   - Remove × button has aria-label="Remove" + click fires onRemove

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildMdChip } from '../../../src/conductor-chat/build-md-chip.js';

describe('MB-T-MVP-W3 WB3 (gen-7 lane) — BuildMdChip rendering', () => {
  it('renders the root at data-testid="conductor-composer-buildmd-chip"', () => {
    render(<BuildMdChip name="auth-rewrite.build.md" steps={14} />);
    const root = screen.getByTestId('conductor-composer-buildmd-chip');
    expect(root).toBeInTheDocument();
    expect(root.className).toContain('buildmd-chip');
  });

  it('renders the inline svg icon (14×14)', () => {
    render(<BuildMdChip name="auth-rewrite.build.md" steps={14} />);
    const root = screen.getByTestId('conductor-composer-buildmd-chip');
    const svg = root.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('14');
    expect(svg!.getAttribute('height')).toBe('14');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 14 14');
  });

  it('renders the name text from props (with buildmd-chip-name testid)', () => {
    render(<BuildMdChip name="auth-rewrite.build.md" steps={14} />);
    const name = screen.getByTestId('conductor-composer-buildmd-chip-name');
    expect(name.textContent).toBe('auth-rewrite.build.md');
  });

  it('renders the steps meta as "{steps} steps" (with buildmd-chip-meta testid)', () => {
    render(<BuildMdChip name="auth-rewrite.build.md" steps={14} />);
    const meta = screen.getByTestId('conductor-composer-buildmd-chip-meta');
    expect(meta.textContent).toBe('14 steps');
  });

  it('renders the remove × button when onRemove prop is provided', () => {
    const onRemove = vi.fn();
    render(
      <BuildMdChip name="auth-rewrite.build.md" steps={14} onRemove={onRemove} />,
    );
    const btn = screen.getByTestId('conductor-composer-buildmd-chip-x');
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Remove');
    expect(btn.textContent).toBe('×');
  });

  it('does NOT render the remove × button when onRemove prop is omitted', () => {
    render(<BuildMdChip name="auth-rewrite.build.md" steps={14} />);
    expect(
      screen.queryByTestId('conductor-composer-buildmd-chip-x'),
    ).toBeNull();
  });

  it('clicking the remove × button fires the onRemove callback', () => {
    const onRemove = vi.fn();
    render(
      <BuildMdChip name="auth-rewrite.build.md" steps={14} onRemove={onRemove} />,
    );
    const btn = screen.getByTestId('conductor-composer-buildmd-chip-x');
    btn.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders correctly with different name + steps prop values', () => {
    render(<BuildMdChip name="refactor.build.md" steps={3} />);
    expect(
      screen.getByTestId('conductor-composer-buildmd-chip-name').textContent,
    ).toBe('refactor.build.md');
    expect(
      screen.getByTestId('conductor-composer-buildmd-chip-meta').textContent,
    ).toBe('3 steps');
  });
});
