// @vitest-environment happy-dom
//
// MB-T17 WB1 probe-00 — TileAutopilotToggle module loads + renders stub
// placeholder.
//
// WB1 RED state: TileAutopilotToggle is a thin skeleton returning
// `<div data-testid="tile-autopilot-toggle-content" data-mb-t17-stub="true" />`.
// WB3 fills in the real chrome (native `<input type="checkbox"
// role="switch">`, onChange with optimistic UI, disabled state on
// bridge-missing or fetch-error). probe-00 here verifies the import +
// render + skeleton markers; probe-01..N at WB3 add the chrome
// assertions.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TileAutopilotToggle } from '../../../src/tile-grid/tile-autopilot-toggle.js';

describe('MB-T17 WB1 — TileAutopilotToggle module loads + renders stub placeholder', () => {
  it('renders without throwing when given minimal required props', () => {
    expect(() => {
      render(<TileAutopilotToggle sessionName="sess-x" />);
    }).not.toThrow();
  });

  it('renders the tile-autopilot-toggle-content placeholder testid', () => {
    render(<TileAutopilotToggle sessionName="sess-x" />);
    expect(
      screen.getByTestId('tile-autopilot-toggle-content'),
    ).toBeInTheDocument();
  });

  it('marks the WB1 placeholder via data-mb-t17-stub="true" attribute (RED state guard)', () => {
    render(<TileAutopilotToggle sessionName="sess-x" />);
    const el = screen.getByTestId('tile-autopilot-toggle-content');
    expect(el.getAttribute('data-mb-t17-stub')).toBe('true');
  });

  it('accepts optional workstationBridge prop without crash (null/undefined OK)', () => {
    expect(() => {
      render(<TileAutopilotToggle sessionName="sess-y" workstationBridge={null} />);
    }).not.toThrow();
    expect(() => {
      render(
        <TileAutopilotToggle
          sessionName="sess-z"
          workstationBridge={{
            getSessionAutopilotEnabled: async () => ({ enabled: false }),
            setSessionAutopilotEnabled: async (_name, enabled) => ({ enabled }),
          }}
        />,
      );
    }).not.toThrow();
  });
});
