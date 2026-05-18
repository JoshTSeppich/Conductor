// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB3 probe-03 — OrchestratorStrip scaffold + ProgressBar.
//
// Asserts the minimum-shape contract for the OrchestratorStrip surface
// per design-handoff orchestrator-strip.jsx (full component, 133 lines):
//
//   - <OrchestratorStrip /> renders without throwing
//   - Root anchor data-testid="ostrip-root"
//   - Header section anchor data-testid="ostrip-header" containing:
//     - title block testid="ostrip-title" with ▦ mark + title text
//     - count pill testid="ostrip-count" when attached (else hidden)
//   - Stats section anchor data-testid="ostrip-stats" with per-stat
//     testids: ostrip-stat-running / ostrip-stat-queued / ostrip-stat-done
//   - ProgressBar block testid="ostrip-bar" with 3 segments:
//     ostrip-bar-done / ostrip-bar-running / ostrip-bar-queued
//     widths in % per design `(value / total) * 100`
//   - Default title "build progress" when no attached.name (design line 97)
//
// SlotGrid (WB4), throughput/ETA (WB5), and footer/legend (WB-final
// closure) are out-of-scope for this WB.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrchestratorStrip } from '../../../src/orchestrator-strip/orchestrator-strip.js';

describe('MB-T-MVP-W1-EXPANSION-2 WB3 — OrchestratorStrip scaffold', () => {
  it('renders without throwing and exposes ostrip-root anchor', () => {
    expect(() => render(<OrchestratorStrip />)).not.toThrow();
    expect(screen.getByTestId('ostrip-root')).toBeInTheDocument();
  });

  it('exposes header anchor at data-testid="ostrip-header"', () => {
    render(<OrchestratorStrip />);
    expect(screen.getByTestId('ostrip-header')).toBeInTheDocument();
  });

  it('exposes title block with ▦ mark glyph (design ostrip-mark)', () => {
    render(<OrchestratorStrip />);
    const mark = screen.getByTestId('ostrip-mark');
    expect(mark).toBeInTheDocument();
    expect(mark.textContent).toBe('▦');
  });

  it('default title text is "build progress" when no attachedName prop (design line 97)', () => {
    render(<OrchestratorStrip />);
    const title = screen.getByTestId('ostrip-title-text');
    expect(title.textContent).toBe('build progress');
  });

  it('renders attachedName as title text when provided', () => {
    render(<OrchestratorStrip attachedName="auth-rewrite.build.md" />);
    expect(screen.getByTestId('ostrip-title-text').textContent).toBe(
      'auth-rewrite.build.md',
    );
  });

  it('does NOT render count pill when attached prop unset/false', () => {
    render(<OrchestratorStrip />);
    expect(screen.queryByTestId('ostrip-count')).toBeNull();
  });

  it('renders count pill "(done+running)/total" when attached=true', () => {
    render(
      <OrchestratorStrip
        attached
        done={7}
        runningCount={4}
        queuedCount={3}
        totalSteps={14}
      />,
    );
    const pill = screen.getByTestId('ostrip-count');
    expect(pill.textContent).toBe('11/14');
  });

  it('renders 3-segment progress bar at testid="ostrip-bar" with done/running/queued segments', () => {
    render(
      <OrchestratorStrip
        attached
        done={7}
        runningCount={4}
        queuedCount={3}
        totalSteps={14}
      />,
    );
    const bar = screen.getByTestId('ostrip-bar');
    expect(bar).toBeInTheDocument();
    const doneSeg = screen.getByTestId('ostrip-bar-done');
    const runningSeg = screen.getByTestId('ostrip-bar-running');
    const queuedSeg = screen.getByTestId('ostrip-bar-queued');
    // Widths per design formula `(value / total) * 100`%; total=14, so
    // done=7/14=50%, running=4/14≈28.57%, queued=3/14≈21.43%.
    expect((doneSeg as HTMLElement).style.width).toBe('50%');
    expect((runningSeg as HTMLElement).style.width).toMatch(/^28\.5/);
    expect((queuedSeg as HTMLElement).style.width).toMatch(/^21\.4/);
  });

  it('progress bar uses `Math.max(total, done+running+queued, 1)` as denominator (design line 13)', () => {
    // When total understates the actual sum, fallback to sum so segments never
    // overflow 100% combined.
    render(
      <OrchestratorStrip
        attached
        done={5}
        runningCount={5}
        queuedCount={5}
        totalSteps={10} /* understated; actual sum=15 */
      />,
    );
    const doneSeg = screen.getByTestId('ostrip-bar-done');
    // 5/15 ≈ 33.33% (not 50% as would be against the wrong total)
    expect((doneSeg as HTMLElement).style.width).toMatch(/^33\.3/);
  });

  it('progress bar guards divide-by-zero when no counts at all (denominator >= 1)', () => {
    render(<OrchestratorStrip />);
    const doneSeg = screen.getByTestId('ostrip-bar-done');
    // 0/1 = 0%
    expect((doneSeg as HTMLElement).style.width).toBe('0%');
  });

  it('exposes per-stat testids: ostrip-stat-running / ostrip-stat-queued / ostrip-stat-done', () => {
    render(
      <OrchestratorStrip
        attached
        done={7}
        runningCount={4}
        queuedCount={3}
        totalSteps={14}
      />,
    );
    expect(screen.getByTestId('ostrip-stat-running').textContent).toBe('4');
    expect(screen.getByTestId('ostrip-stat-queued').textContent).toBe('3');
    expect(screen.getByTestId('ostrip-stat-done').textContent).toBe('7');
  });

  it('renders em-dash for stats when count props unset', () => {
    render(<OrchestratorStrip />);
    expect(screen.getByTestId('ostrip-stat-running').textContent).toBe('—');
    expect(screen.getByTestId('ostrip-stat-queued').textContent).toBe('—');
    expect(screen.getByTestId('ostrip-stat-done').textContent).toBe('—');
  });
});
