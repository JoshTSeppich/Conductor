// @vitest-environment happy-dom
//
// MB-T18 WB1 probe-00 — TileFooter module loads + renders stub
// placeholder.
//
// WB1 RED state: TileFooter is a thin skeleton returning
// `<div data-testid="tile-footer-content" data-mb-t18-stub="true" />`.
// WB2 fills in the real chrome (cwd line + uptime line + 5s tick).
// probe-00 here verifies the import + render + skeleton markers + the
// optional-prop tolerance; probe-01..N at WB2 add the chrome
// assertions.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileFooter } from '../../../src/tile-grid/tile-footer.js';

describe('MB-T18 WB1 — TileFooter module loads + renders stub placeholder', () => {
  it('renders without throwing when given minimal required props', () => {
    expect(() => {
      render(<TileFooter sessionName="sess-x" />);
    }).not.toThrow();
  });

  it('renders the tile-footer-content placeholder testid', () => {
    render(<TileFooter sessionName="sess-x" />);
    expect(
      screen.getByTestId('tile-footer-content'),
    ).toBeInTheDocument();
  });

  it('marks the WB1 placeholder via data-mb-t18-stub="true" attribute (RED state guard)', () => {
    render(<TileFooter sessionName="sess-x" />);
    const el = screen.getByTestId('tile-footer-content');
    expect(el.getAttribute('data-mb-t18-stub')).toBe('true');
  });

  it('accepts optional cwd + mountedAt props without crash (absent + provided OK)', () => {
    // Absent (existing-test-compat shape; WB1 stub ignores both).
    expect(() => {
      render(<TileFooter sessionName="sess-y" />);
    }).not.toThrow();
    // Provided (WB2 will consume; WB1 stub still ignores).
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
