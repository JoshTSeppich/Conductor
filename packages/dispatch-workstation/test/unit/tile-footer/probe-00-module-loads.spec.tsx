// @vitest-environment happy-dom
//
// MB-T18 probe-00 — TileFooter module loads + renders without crash.
//
// Originally authored at WB1 with a `data-mb-t18-stub="true"` RED-state
// guard assertion that intentionally fails at WB2 (when the stub is
// replaced with real chrome). WB2 removes the stub guard; the
// remaining 3 tests cover module-load + minimal render + optional-prop
// tolerance. probe-01 covers formatUptime; probe-02 covers render
// behavior including the 5s tick.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileFooter } from '../../../src/tile-grid/tile-footer.js';

describe('MB-T18 probe-00 — TileFooter module loads + renders without crash', () => {
  it('renders without throwing when given minimal required props', () => {
    expect(() => {
      render(<TileFooter sessionName="sess-x" />);
    }).not.toThrow();
  });

  it('renders the tile-footer-content testid on the outer wrapper', () => {
    render(<TileFooter sessionName="sess-x" />);
    expect(
      screen.getByTestId('tile-footer-content'),
    ).toBeInTheDocument();
  });

  it('accepts optional cwd + mountedAt props without crash (absent + provided OK)', () => {
    expect(() => {
      render(<TileFooter sessionName="sess-y" />);
    }).not.toThrow();
    expect(() => {
      render(
        <TileFooter
          sessionName="sess-z"
          cwd="/Users/op/Desktop/foxworks-dispatch"
          mountedAt={1700000000000}
        />,
      );
    }).not.toThrow();
  });
});
