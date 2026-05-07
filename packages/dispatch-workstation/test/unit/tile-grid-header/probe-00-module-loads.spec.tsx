// @vitest-environment happy-dom
//
// MB-T15 WB1 probe-00 — TileHeader module loads + renders stub
// placeholder.
//
// WB1 RED state: TileHeader is a thin skeleton returning
// `<div data-testid="tile-header-content" data-mb-t15-stub="true" />`.
// WB3 fills in the real chrome (status dot, branch, repo, model chip,
// token meter). probe-00 here verifies the import + render + skeleton
// markers; probe-01..N at WB3 add the chrome assertions.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileHeader } from '../../../src/tile-grid/tile-header.js';

describe('MB-T15 WB1 — TileHeader module loads + renders stub placeholder', () => {
  it('renders without throwing when given minimal required props', () => {
    expect(() => {
      render(<TileHeader sessionName="sess-x" status="open" />);
    }).not.toThrow();
  });

  it('renders the tile-header-content placeholder testid', () => {
    render(<TileHeader sessionName="sess-x" status="open" />);
    expect(screen.getByTestId('tile-header-content')).toBeInTheDocument();
  });

  it('marks the WB1 placeholder via data-mb-t15-stub="true" attribute (RED state guard)', () => {
    render(<TileHeader sessionName="sess-x" status="open" />);
    const el = screen.getByTestId('tile-header-content');
    expect(el.getAttribute('data-mb-t15-stub')).toBe('true');
  });

  it('accepts optional branch / repo / model / token fields without crash', () => {
    expect(() => {
      render(
        <TileHeader
          sessionName="sess-y"
          status="idle"
          branchName="main"
          repoName="foxworks-dispatch"
          model="claude-sonnet-4-6"
          tokensUsed={50_000}
          tokenBudget={200_000}
        />,
      );
    }).not.toThrow();
  });
});
