// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2-TOPBAR-ORCHESTRATOR-STRIP-TMUX-STYLING WB1 probe-01.
//
// Asserts the minimum-shape contract for the Topbar surface per operator
// vision §"Top chrome" + design-handoff app.jsx:282-309 inline render:
//
//   - <Topbar /> renders without throwing
//   - Root testid anchor at data-testid="topbar-root" (overlay strategy
//     mirrors W1 Q6=(c) precedent — body-level fixed-position overlay
//     stacked above the orchestrator-focus-pane overlay; NO #header-bar
//     touch in this WB ladder)
//   - Brand glyph "◐" at data-testid="topbar-brand-glyph"
//     (design-handoff app.jsx:287 `<span className="brand-glyph">◐</span>`)
//   - Brand name "Conductor" at data-testid="topbar-brand-name"
//     (design-handoff app.jsx:288 `<span className="brand-name">Conductor</span>`)
//   - Brand version pill "v_mvp" at data-testid="topbar-brand-version"
//     (design-handoff app.jsx:289 `<span className="brand-version">v_mvp</span>`)
//   - Env label at data-testid="topbar-env-label"
//     (design-handoff app.jsx:305 `<span className="topbar-meta">staging · us-east</span>`)
//     Per Q-EXP2-2 auto-ack: em-dash placeholder when envLabel prop unset
//     (mirrors W1 Q3/Q4 pid/cpu/budget em-dash precedent at
//     focus-pane-header.tsx:14 EM_DASH).
//
// Live count testids (panes/running/queue/done/budget) belong to WB2 probe-02.
// This probe asserts ONLY the scaffold + brand chrome + env label + root
// overlay positioning.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '../../../src/topbar/topbar.js';

describe('MB-T-MVP-W1-EXPANSION-2 WB1 — Topbar scaffold', () => {
  it('renders without throwing and exposes topbar-root anchor', () => {
    expect(() => render(<Topbar />)).not.toThrow();
    expect(screen.getByTestId('topbar-root')).toBeInTheDocument();
  });

  it('exposes brand glyph anchor with design-handoff "◐" character', () => {
    render(<Topbar />);
    const glyph = screen.getByTestId('topbar-brand-glyph');
    expect(glyph).toBeInTheDocument();
    expect(glyph.textContent).toBe('◐');
  });

  it('exposes brand name anchor with literal "Conductor"', () => {
    render(<Topbar />);
    const name = screen.getByTestId('topbar-brand-name');
    expect(name).toBeInTheDocument();
    expect(name.textContent).toBe('Conductor');
  });

  it('exposes brand version pill anchor with literal "v_mvp"', () => {
    render(<Topbar />);
    const version = screen.getByTestId('topbar-brand-version');
    expect(version).toBeInTheDocument();
    expect(version.textContent).toBe('v_mvp');
  });

  it('renders env label em-dash placeholder when envLabel prop unset (W1 Q3/Q4 mech-translation)', () => {
    render(<Topbar />);
    const envLabel = screen.getByTestId('topbar-env-label');
    expect(envLabel).toBeInTheDocument();
    expect(envLabel.textContent).toBe('—');
  });

  it('renders provided envLabel prop verbatim when set', () => {
    render(<Topbar envLabel="staging · us-east" />);
    const envLabel = screen.getByTestId('topbar-env-label');
    expect(envLabel.textContent).toBe('staging · us-east');
  });

  it('root element carries fixed-position style (W1 overlay-precedent body-level mount)', () => {
    render(<Topbar />);
    const root = screen.getByTestId('topbar-root');
    const style = (root as HTMLElement).style;
    expect(style.position).toBe('fixed');
  });
});
