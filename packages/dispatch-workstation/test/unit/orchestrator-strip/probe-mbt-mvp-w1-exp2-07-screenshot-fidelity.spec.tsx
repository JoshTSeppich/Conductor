// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB7 probe-07 — screenshot-fidelity acceptance
// (HARD GATE per §5.5 NORMATIVE).
//
// Q-EXP2-3 = (a) structural-DOM oracle (NO pixel-diff library adoption)
// mirroring W3 WB6 precedent (probe-mbt-mvp-w3-06-screenshot-fidelity-
// acceptance.spec.tsx). This probe asserts the composed EXPANSION-2
// surface (Topbar + OrchestratorStrip + TmuxPaneBody with ORCH_BANNER)
// renders DOM consistent with the design-handoff screenshots at
// docs/design-handoff/conductor-v-mvp/project/screenshots/*.png.
//
// What "consistent" means here (per W3 precedent):
//   - canonical design literals present verbatim (◐, Conductor, v_mvp,
//     ▦, ORCH_BANNER ┌/└ box corners, IBM Plex Mono font)
//   - testid surface contract anchors present per WB1-WB6 ladder
//   - idle-state defaults (em-dash placeholders) per W1 Q3/Q4
//     mech-translation when count props unset
//   - banner-class lines color-mapped per TMUX_COLORS
//
// Pixel-diff infra (scripts/phase-3-visual-smoke.mjs + pixelmatch/pngjs)
// EXISTS but its ticket-acceptance-gate adoption is deferred (parallel to
// W3 deferral; tracked Tier-2 at WB-final).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '../../../src/topbar/topbar.js';
import { OrchestratorStrip } from '../../../src/orchestrator-strip/orchestrator-strip.js';
import {
  TmuxPaneBody,
  TMUX_COLORS,
  ORCH_BANNER,
} from '../../../src/orchestrator-focus-pane/tmux-pane-body.js';

// Composition harness — mirrors the EXPANSION-2 mount-time composition
// (deferred to WB-final wiring). Asserts structural fidelity of the
// FULL three-surface stack as the operator would see at runtime.
function ExpansionTwoCompositionIdle(): React.ReactElement {
  return (
    <div data-testid="exp2-composition-root">
      <Topbar />
      <OrchestratorStrip />
      <TmuxPaneBody lines={[]} status="starting" showBanner />
    </div>
  );
}

function ExpansionTwoCompositionAttached(): React.ReactElement {
  const sampleSessions = [
    { id: 's1', name: 'agent-1', status: 'running' as const },
    { id: 's2', name: 'agent-2', status: 'starting' as const },
    { id: 's3', name: 'agent-3', status: 'done' as const },
  ];
  return (
    <div data-testid="exp2-composition-root">
      <Topbar
        envLabel="staging · us-east"
        paneCount={3}
        runningCount={1}
        buildMdAttached
        buildMdQueue={3}
        buildMdDone={7}
        budgetUsedDollars={4.21}
        budgetTotalDollars={10}
      />
      <OrchestratorStrip
        attached
        attachedName="auth-rewrite.build.md"
        done={7}
        runningCount={1}
        queuedCount={3}
        totalSteps={14}
        sessions={sampleSessions}
        maxSlots={16}
        ratePerMin={4.7}
        etaSeconds={120}
      />
      <TmuxPaneBody
        lines={[
          { t: 'sys', s: 'INFO  Detected file changes' },
          { t: 'ok', s: 'INFO  Build complete' },
        ]}
        status="running"
        cwd="~/workspace"
        showBanner
      />
    </div>
  );
}

import * as React from 'react'; // bottom-import to keep the JSX above readable

describe('MB-T-MVP-W1-EXPANSION-2 WB7 — screenshot-fidelity (structural oracle)', () => {
  describe('idle state composition (mirrors default check.png screenshot)', () => {
    it('renders all three surface anchors (Topbar + OrchestratorStrip + TmuxPaneBody)', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('topbar-root')).toBeInTheDocument();
      expect(screen.getByTestId('ostrip-root')).toBeInTheDocument();
      expect(screen.getByTestId('tmux-body')).toBeInTheDocument();
    });

    it('Topbar renders canonical brand literals (◐ + Conductor + v_mvp)', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('topbar-brand-glyph').textContent).toBe('◐');
      expect(screen.getByTestId('topbar-brand-name').textContent).toBe('Conductor');
      expect(screen.getByTestId('topbar-brand-version').textContent).toBe('v_mvp');
    });

    it('Topbar idle counts render em-dash placeholders (W1 Q3/Q4 mech-translation)', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('topbar-pane-count').textContent).toBe('—');
      expect(screen.getByTestId('topbar-running-count').textContent).toBe('—');
      expect(screen.getByTestId('topbar-env-label').textContent).toBe('—');
      expect(screen.getByTestId('topbar-budget').textContent).toBe('—');
    });

    it('OrchestratorStrip idle title is "build progress" + count pill hidden', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('ostrip-title-text').textContent).toBe(
        'build progress',
      );
      expect(screen.queryByTestId('ostrip-count')).toBeNull();
    });

    it('OrchestratorStrip ▦ mark + 64-slot default grid', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('ostrip-mark').textContent).toBe('▦');
      const slots = screen.getAllByTestId(/^ostrip-slot-\d+$/);
      expect(slots).toHaveLength(64);
    });

    it('OrchestratorStrip stats em-dash by default; rate is "0.0/min"', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('ostrip-stat-running').textContent).toBe('—');
      expect(screen.getByTestId('ostrip-stat-queued').textContent).toBe('—');
      expect(screen.getByTestId('ostrip-stat-done').textContent).toBe('—');
      expect(screen.getByTestId('ostrip-stat-rate').textContent).toBe('0.0/min');
      expect(screen.queryByTestId('ostrip-stat-eta')).toBeNull();
      expect(screen.queryByTestId('ostrip-stat-failed')).toBeNull();
    });

    it('OrchestratorStrip legend renders all 5 entries', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.getByTestId('ostrip-legend-running')).toBeInTheDocument();
      expect(screen.getByTestId('ostrip-legend-starting')).toBeInTheDocument();
      expect(screen.getByTestId('ostrip-legend-done')).toBeInTheDocument();
      expect(screen.getByTestId('ostrip-legend-error')).toBeInTheDocument();
      expect(screen.getByTestId('ostrip-legend-empty')).toBeInTheDocument();
    });

    it('TmuxPaneBody renders ORCH_BANNER with ┌ + └ box corners (6 banner lines)', () => {
      render(<ExpansionTwoCompositionIdle />);
      const banner = screen.getByTestId('tmux-banner');
      expect(banner).toBeInTheDocument();
      const bannerLines = banner.querySelectorAll(
        '[data-testid^="tmux-line-banner-"]',
      );
      expect(bannerLines).toHaveLength(6);
      // First box line contains ┌; 5th contains └.
      expect(bannerLines[0].textContent).toContain('┌');
      expect(bannerLines[4].textContent).toContain('└');
    });

    it('TmuxPaneBody cursor hidden when status="starting" (idle screenshot match)', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(screen.queryByTestId('tmux-prompt')).toBeNull();
      expect(screen.queryByTestId('tmux-cursor')).toBeNull();
    });

    it('progress bar widths all 0% when no counts (idle screenshot match)', () => {
      render(<ExpansionTwoCompositionIdle />);
      expect(
        (screen.getByTestId('ostrip-bar-done') as HTMLElement).style.width,
      ).toBe('0%');
      expect(
        (screen.getByTestId('ostrip-bar-running') as HTMLElement).style.width,
      ).toBe('0%');
      expect(
        (screen.getByTestId('ostrip-bar-queued') as HTMLElement).style.width,
      ).toBe('0%');
    });
  });

  describe('attached/running state composition (mirrors progress*.png screenshots)', () => {
    it('Topbar live counts render canonical values + budget formatted', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(screen.getByTestId('topbar-pane-count').textContent).toBe('3 panes');
      expect(screen.getByTestId('topbar-running-count').textContent).toBe('1 running');
      expect(screen.getByTestId('topbar-queue-done').textContent).toBe(
        'queue: 3 · done: 7',
      );
      expect(screen.getByTestId('topbar-env-label').textContent).toBe(
        'staging · us-east',
      );
      expect(screen.getByTestId('topbar-budget').textContent).toBe(
        '$4.21 / $10.00',
      );
    });

    it('OrchestratorStrip attached state shows filename + count pill', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(screen.getByTestId('ostrip-title-text').textContent).toBe(
        'auth-rewrite.build.md',
      );
      expect(screen.getByTestId('ostrip-count').textContent).toBe('8/14'); // done(7)+running(1)
    });

    it('OrchestratorStrip stats render canonical values + rate/eta visible', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(screen.getByTestId('ostrip-stat-running').textContent).toBe('1');
      expect(screen.getByTestId('ostrip-stat-queued').textContent).toBe('3');
      expect(screen.getByTestId('ostrip-stat-done').textContent).toBe('7');
      expect(screen.getByTestId('ostrip-stat-rate').textContent).toBe('4.7/min');
      expect(screen.getByTestId('ostrip-stat-eta').textContent).toBe('02:00');
    });

    it('OrchestratorStrip slot grid shows 3 live status-coded slots + 13 empty', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(screen.getByTestId('ostrip-slot-0').getAttribute('data-status')).toBe(
        'running',
      );
      expect(screen.getByTestId('ostrip-slot-1').getAttribute('data-status')).toBe(
        'starting',
      );
      expect(screen.getByTestId('ostrip-slot-2').getAttribute('data-status')).toBe(
        'done',
      );
      expect(screen.getByTestId('ostrip-slot-3').getAttribute('data-status')).toBe(
        'empty',
      );
      // 16 total (maxSlots=16 override).
      expect(screen.getAllByTestId(/^ostrip-slot-\d+$/)).toHaveLength(16);
    });

    it('TmuxPaneBody attached state renders banner + lines + cursor', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(screen.getByTestId('tmux-banner')).toBeInTheDocument();
      expect(screen.getByTestId('tmux-line-0').textContent).toContain(
        'Detected file changes',
      );
      expect(screen.getByTestId('tmux-line-1').textContent).toContain(
        'Build complete',
      );
      expect(screen.getByTestId('tmux-prompt')).toBeInTheDocument();
      expect(screen.getByTestId('tmux-cursor')).toBeInTheDocument();
    });

    it('TmuxPaneBody line colors match TMUX_COLORS map (banner ok/sys color literal)', () => {
      render(<ExpansionTwoCompositionAttached />);
      expect(
        (screen.getByTestId('tmux-line-0') as HTMLElement).style.color,
      ).toBe(TMUX_COLORS.sys);
      expect(
        (screen.getByTestId('tmux-line-1') as HTMLElement).style.color,
      ).toBe(TMUX_COLORS.ok);
      // Banner-class color literal.
      expect(TMUX_COLORS.banner).toBe('#f0a062');
    });

    it('progress bar widths reflect attached counts (denominator 14)', () => {
      render(<ExpansionTwoCompositionAttached />);
      const doneSeg = screen.getByTestId('ostrip-bar-done') as HTMLElement;
      const runningSeg = screen.getByTestId('ostrip-bar-running') as HTMLElement;
      const queuedSeg = screen.getByTestId('ostrip-bar-queued') as HTMLElement;
      expect(doneSeg.style.width).toBe('50%'); // 7/14
      expect(runningSeg.style.width).toMatch(/^7\.14/); // 1/14 ≈ 7.14
      expect(queuedSeg.style.width).toMatch(/^21\.4/); // 3/14 ≈ 21.43
    });
  });

  describe('design-handoff constant fidelity', () => {
    it('ORCH_BANNER first line title literal matches design tmux-content.jsx:164', () => {
      expect(ORCH_BANNER[0].s).toContain('conductor orchestrator');
    });

    it('TMUX_COLORS keys are exhaustive 5-class map', () => {
      const keys = Object.keys(TMUX_COLORS).sort();
      expect(keys).toEqual(['banner', 'err', 'ok', 'sys', 'warn']);
    });
  });
});
