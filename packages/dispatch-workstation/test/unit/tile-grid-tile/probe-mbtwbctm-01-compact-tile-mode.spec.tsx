// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE WB1 RED — compact-Tile-variant probe.
//
// Per the authored ticket body at `dec21c1` §4 WB1 + Sub-Q-MBTWBCTM-A=(i)
// strict-wireframe-alignment recommended default + Sub-Q-MBTWBCTM-B=(α)
// prop-drilled `frameMode` recommended default (applied under autonomous-ack
// mode per Gate-W3 PHASE 2 dispatch 2026-05-11).
//
// 4 probes:
//   probe-01: <Tile frameMode='A' ...> — SHIPPED-BEYOND-WIREFRAME chrome
//             hidden (collapse-btn + detach-btn NOT in DOM; picker-slot +
//             autopilot-slot children NOT rendered even if closures supplied).
//   probe-02: <Tile frameMode='C' ...> OR frameMode omitted — full chrome
//             renders (collapse-btn + detach-btn IN DOM; slot wrappers IN
//             DOM with closures rendered).
//   probe-03: <Tile frameMode='A' renderPickerSlot=(()=>stub) /> — stub
//             content NOT rendered despite closure being supplied
//             (render-time gate, not prop removal).
//   probe-04: TileHeader chrome (status-indicator + session-name) present
//             under BOTH modes — compact does not regress wireframe-aligned
//             chrome.
//
// WB1 RED today: `tile.tsx` does not accept a `frameMode` prop and renders
// all chrome unconditionally. The TS layer flags `frameMode` as unknown
// prop on TileProps; probes fail at runtime because:
//   probe-01: `tile-collapse-btn` + `tile-detach-btn` ARE in DOM (current
//             unconditional render).
//   probe-02: passes trivially (matches current behavior).
//   probe-03: stub content IS rendered (slot closure called unconditionally
//             today).
//   probe-04: passes trivially (matches current behavior).
// → 2 of 4 fail at RED. After WB2 GREEN: 4 of 4 pass.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as React from 'react';
import { Tile } from '../../../src/tile-grid/tile.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

function makeProps(
  overrides: Partial<React.ComponentProps<typeof Tile>> = {},
): React.ComponentProps<typeof Tile> {
  const fake = makeFakeConsoleBridge();
  const adapter = makeFakeTerminalAdapter();
  return {
    sessionName: 'alpha',
    consoleBridge: fake.bridge,
    createTerminal: () => adapter,
    collapsed: false,
    onKill: vi.fn(),
    onCollapse: vi.fn(),
    onDetach: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof Tile>;
}

describe('MB-T-WIREFRAME-C1P4-COMPACT-TILE-MODE — Tile compact variant under frameMode=A', () => {
  it("probe-01: frameMode='A' hides SHIPPED-BEYOND-WIREFRAME chrome (collapse + detach + slot children)", () => {
    // @ts-expect-error WB1 RED: `frameMode` prop ships in WB2 GREEN.
    const props = makeProps({ sessionName: 'alpha', frameMode: 'A' });
    render(<Tile {...props} />);

    // SHIPPED-BEYOND-WIREFRAME audit §4.1 elements must be absent under compact:
    expect(screen.queryByTestId('tile-collapse-btn')).toBeNull();
    expect(screen.queryByTestId('tile-detach-btn')).toBeNull();

    // Slot wrappers may remain in DOM (preserves testid stability for
    // non-compact probes), but their children must not render. The probe
    // here asserts wrapper-empty by inspecting innerHTML.
    const pickerSlot = screen.queryByTestId('tile-picker-slot-alpha');
    if (pickerSlot !== null) {
      expect(pickerSlot.children.length).toBe(0);
    }
    const autopilotSlot = screen.queryByTestId('tile-autopilot-slot-alpha');
    if (autopilotSlot !== null) {
      expect(autopilotSlot.children.length).toBe(0);
    }
  });

  it("probe-02: frameMode='C' (or omitted) renders full chrome", () => {
    // @ts-expect-error WB1 RED: `frameMode` prop ships in WB2 GREEN.
    const props = makeProps({ sessionName: 'beta', frameMode: 'C' });
    render(<Tile {...props} />);

    expect(screen.getByTestId('tile-collapse-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-detach-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tile-picker-slot-beta')).toBeInTheDocument();
    expect(screen.getByTestId('tile-autopilot-slot-beta')).toBeInTheDocument();
  });

  it("probe-03: frameMode='A' suppresses renderPickerSlot stub content (render-time gate, not prop removal)", () => {
    const props = makeProps({
      sessionName: 'gamma',
      renderPickerSlot: () => (
        <span data-testid="picker-stub-content">PICKER-STUB</span>
      ),
      // @ts-expect-error WB1 RED: `frameMode` prop ships in WB2 GREEN.
      frameMode: 'A',
    });
    render(<Tile {...props} />);

    // Compact mode must suppress the closure's rendered content even though
    // the renderPickerSlot prop is supplied. Render-time gate per body §1.1
    // bullet 3: "The render-prop closures supplied by TileGridApp remain
    // wired upstream but render-empty when in compact mode."
    expect(screen.queryByTestId('picker-stub-content')).toBeNull();
  });

  it('probe-04: TileHeader chrome (status-indicator + session-name) present under BOTH modes', () => {
    // mode='C' full-chrome
    {
      // @ts-expect-error WB1 RED: `frameMode` prop ships in WB2 GREEN.
      const propsC = makeProps({ sessionName: 'delta-c', frameMode: 'C' });
      const { unmount } = render(<Tile {...propsC} />);
      expect(screen.getByTestId('tile-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('tile-session-name')).toHaveTextContent('delta-c');
      unmount();
    }
    // mode='A' compact-chrome
    {
      // @ts-expect-error WB1 RED: `frameMode` prop ships in WB2 GREEN.
      const propsA = makeProps({ sessionName: 'delta-a', frameMode: 'A' });
      render(<Tile {...propsA} />);
      expect(screen.getByTestId('tile-status-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('tile-session-name')).toHaveTextContent('delta-a');
    }
  });
});
