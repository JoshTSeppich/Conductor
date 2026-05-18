// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB2 probe-02 — Topbar live counts.
//
// Asserts Topbar surface counts the design-handoff app.jsx:292-302
// topbar-meta surfaces:
//
//   - "{N} pane(s)" pluralized via testid="topbar-pane-count"
//   - "{M} running" via testid="topbar-running-count"
//   - "queue: {K} · done: {J}" via testid="topbar-queue-done"
//     (rendered only when attachedBuildMd attached — design app.jsx:295-301
//     `{attached && (<><span/><span/></>)}` pattern)
//   - "$X.XX / $Y.YY" budget via testid="topbar-budget"
//     (right-side per app.jsx:307)
//
// Per Q-EXP2-2 auto-ack (W1 Q3/Q4 em-dash precedent): every count prop
// is optional; undefined renders em-dash. queue-done block only renders
// when attached === true (mirrors design `attached && (...)` gate).
// Budget is em-dash when usedCents/totalCents undefined.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '../../../src/topbar/topbar.js';

describe('MB-T-MVP-W1-EXPANSION-2 WB2 — Topbar live counts', () => {
  it('renders em-dash for pane count when paneCount undefined', () => {
    render(<Topbar />);
    const pane = screen.getByTestId('topbar-pane-count');
    expect(pane.textContent).toBe('—');
  });

  it('renders pluralized "1 pane" when paneCount=1', () => {
    render(<Topbar paneCount={1} />);
    expect(screen.getByTestId('topbar-pane-count').textContent).toBe('1 pane');
  });

  it('renders pluralized "0 panes" when paneCount=0', () => {
    render(<Topbar paneCount={0} />);
    expect(screen.getByTestId('topbar-pane-count').textContent).toBe('0 panes');
  });

  it('renders pluralized "5 panes" when paneCount=5', () => {
    render(<Topbar paneCount={5} />);
    expect(screen.getByTestId('topbar-pane-count').textContent).toBe('5 panes');
  });

  it('renders em-dash for running count when runningCount undefined', () => {
    render(<Topbar />);
    expect(screen.getByTestId('topbar-running-count').textContent).toBe('—');
  });

  it('renders "{N} running" when runningCount set', () => {
    render(<Topbar runningCount={3} />);
    expect(screen.getByTestId('topbar-running-count').textContent).toBe('3 running');
  });

  it('renders "0 running" when runningCount=0 (verbatim, not em-dash)', () => {
    render(<Topbar runningCount={0} />);
    expect(screen.getByTestId('topbar-running-count').textContent).toBe('0 running');
  });

  it('does NOT render queue-done block when buildMdAttached prop unset/false', () => {
    render(<Topbar />);
    expect(screen.queryByTestId('topbar-queue-done')).toBeNull();
  });

  it('renders queue-done block when buildMdAttached=true (queue/done props derive display)', () => {
    render(<Topbar buildMdAttached buildMdQueue={3} buildMdDone={7} />);
    const qd = screen.getByTestId('topbar-queue-done');
    expect(qd).toBeInTheDocument();
    expect(qd.textContent).toBe('queue: 3 · done: 7');
  });

  it('renders queue-done with em-dash for missing queue/done numerics under attached', () => {
    render(<Topbar buildMdAttached />);
    const qd = screen.getByTestId('topbar-queue-done');
    expect(qd.textContent).toBe('queue: — · done: —');
  });

  it('renders budget em-dash when budgetUsedDollars + budgetTotalDollars undefined', () => {
    render(<Topbar />);
    expect(screen.getByTestId('topbar-budget').textContent).toBe('—');
  });

  it('renders budget formatted "$U.UU / $T.TT" when both provided', () => {
    render(<Topbar budgetUsedDollars={4.21} budgetTotalDollars={10} />);
    expect(screen.getByTestId('topbar-budget').textContent).toBe('$4.21 / $10.00');
  });

  it('renders budget with em-dash when only one side provided (atomic display)', () => {
    render(<Topbar budgetUsedDollars={4.21} />);
    expect(screen.getByTestId('topbar-budget').textContent).toBe('—');
  });

  it('budget formats to exactly 2 decimal places (currency convention)', () => {
    // Use 1.236 to avoid IEEE-754 1.005 round-half-to-even ambiguity:
    // Number(1.005).toFixed(2) === '1.00' in V8 due to float storage.
    // 1.236 → '1.24' deterministically across JS engines.
    render(<Topbar budgetUsedDollars={1.236} budgetTotalDollars={10} />);
    expect(screen.getByTestId('topbar-budget').textContent).toBe('$1.24 / $10.00');
  });
});
