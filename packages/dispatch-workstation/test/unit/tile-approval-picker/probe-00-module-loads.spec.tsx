// @vitest-environment happy-dom
//
// MB-T16 WB1 probe-00 — TileApprovalPicker module loads + renders stub
// placeholder.
//
// WB1 RED state: TileApprovalPicker is a thin skeleton returning
// `<div data-testid="tile-approval-picker-content" data-mb-t16-stub="true" />`.
// WB3 fills in the real chrome (native <select>, onChange, disabled
// state). probe-00 here verifies the import + render + skeleton
// markers; probe-01..N at WB3 add the chrome assertions.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileApprovalPicker } from '../../../src/tile-grid/tile-approval-picker.js';

describe('MB-T16 WB1 — TileApprovalPicker module loads + renders stub placeholder', () => {
  it('renders without throwing when given minimal required props', () => {
    expect(() => {
      render(<TileApprovalPicker sessionName="sess-x" />);
    }).not.toThrow();
  });

  it('renders the tile-approval-picker-content placeholder testid', () => {
    render(<TileApprovalPicker sessionName="sess-x" />);
    expect(screen.getByTestId('tile-approval-picker-content')).toBeInTheDocument();
  });

  it('marks the WB1 placeholder via data-mb-t16-stub="true" attribute (RED state guard)', () => {
    render(<TileApprovalPicker sessionName="sess-x" />);
    const el = screen.getByTestId('tile-approval-picker-content');
    expect(el.getAttribute('data-mb-t16-stub')).toBe('true');
  });

  it('accepts optional workstationBridge prop without crash (null/undefined OK)', () => {
    expect(() => {
      render(<TileApprovalPicker sessionName="sess-y" workstationBridge={null} />);
    }).not.toThrow();
    expect(() => {
      render(
        <TileApprovalPicker
          sessionName="sess-z"
          workstationBridge={{
            getSessionApprovalPolicy: async () => ({
              session_name: 'sess-z',
              approval_policy: 'medium',
              updated_at: null,
            }),
            putSessionApprovalPolicy: async (name, policy) => ({
              session_name: name,
              approval_policy: policy,
              updated_at: new Date().toISOString(),
            }),
          }}
        />,
      );
    }).not.toThrow();
  });
});
