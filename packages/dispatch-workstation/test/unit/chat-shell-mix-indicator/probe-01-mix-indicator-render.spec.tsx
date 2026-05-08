// @vitest-environment happy-dom
//
// MB-T27 WB1 RED — MixIndicator render tests (probe-01).
//
// Operator-confirmed dispositions exercised by this probe (HALT 0,
// 2026-05-07):
//   - Q-MBT27-5=a: undefined / unmapped models NOT counted; chips
//     still render at 0.
//   - Q-MBT27-7=a: per-chip data-testid contract.
//
// Acceptance criteria (operator prompt) covered:
//   - Counts accurate against live session list — describe block 2.
//   - Renders with zero-state (all zeros visible, not collapsed) —
//     describe block 1.
//   - "Updates within 1s of spawn/kill" — covered separately by
//     WB2 container subscription test (probe-02 forthcoming);
//     out of scope for the pure-render probe-01.
//
// All 8 tests FAIL at WB1 RED (stub returns null → no mix-indicator-*
// elements in the DOM). WB2 GREEN flips them to pass via pure-render
// impl reusing modelChipShortcode from src/tile-grid/color-helpers.js.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MixIndicator, type SessionLike } from '../../../src/chat-shell/mix-indicator.js';

describe('MB-T27 WB1 RED — MixIndicator zero-state (chips visible at 0)', () => {
  it('renders mix-indicator-root container with no sessions prop', () => {
    render(<MixIndicator />);
    expect(screen.getByTestId('mix-indicator-root')).toBeInTheDocument();
  });

  it('renders all 4 chips (S46/O46/O471M/H) in zero-state — none collapsed', () => {
    render(<MixIndicator />);
    expect(screen.getByTestId('mix-indicator-chip-S46')).toBeInTheDocument();
    expect(screen.getByTestId('mix-indicator-chip-O46')).toBeInTheDocument();
    expect(screen.getByTestId('mix-indicator-chip-O471M')).toBeInTheDocument();
    expect(screen.getByTestId('mix-indicator-chip-H')).toBeInTheDocument();
  });

  it('shows count = 0 on every chip when sessions=[] (empty array path)', () => {
    render(<MixIndicator sessions={[]} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });
});

describe('MB-T27 WB1 RED — MixIndicator counts accurate (live session list)', () => {
  it('groups 3 sonnet-4-6 sessions under S46 chip; others remain at 0', () => {
    const sessions: SessionLike[] = [
      { model: 'claude-sonnet-4-6' },
      { model: 'claude-sonnet-4-6' },
      { model: 'claude-sonnet-4-6' },
    ];
    render(<MixIndicator sessions={sessions} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('3');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });

  it('groups mixed-model sessions correctly (S+O46+O47+H)', () => {
    const sessions: SessionLike[] = [
      { model: 'claude-sonnet-4-6' },
      { model: 'claude-opus-4-6' },
      { model: 'claude-opus-4-7' },
      { model: 'claude-opus-4-7-1m-context' }, // suffixed → O471M per modelChipShortcode
      { model: 'claude-haiku-4-5' },
      { model: 'claude-haiku-4-5-october' }, // any haiku-* → H
    ];
    render(<MixIndicator sessions={sessions} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('2');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('2');
  });

  it('opus-4-7 base + suffixed variants both map to O471M chip', () => {
    const sessions: SessionLike[] = [
      { model: 'claude-opus-4-7' },
      { model: 'claude-opus-4-7-1m-context' },
      { model: 'claude-opus-4-7-experimental' },
    ];
    render(<MixIndicator sessions={sessions} />);
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('3');
  });
});

describe('MB-T27 WB1 RED — MixIndicator "unknown" bucket (Q-MBT27-5=a)', () => {
  it('does NOT count sessions with undefined model in any chip', () => {
    const sessions: SessionLike[] = [
      { model: undefined },
      { model: undefined },
    ];
    render(<MixIndicator sessions={sessions} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });

  it('does NOT count sessions with unmapped/non-claude model strings', () => {
    const sessions: SessionLike[] = [
      { model: 'gpt-4-turbo' },
      { model: 'claude-instant-v1' },
      { model: '' }, // empty → modelChipShortcode returns null
    ];
    render(<MixIndicator sessions={sessions} />);
    expect(screen.getByTestId('mix-indicator-chip-S46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O46-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-O471M-count')).toHaveTextContent('0');
    expect(screen.getByTestId('mix-indicator-chip-H-count')).toHaveTextContent('0');
  });
});
