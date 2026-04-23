/**
 * FD-T11 — ink TUI for `fd status`.
 *
 * Assertions hit the pure StatusView render, not the refresh wrapper.
 * The wrapper (useEffect + registry read + fs.stat) is validated by
 * the §6 exit-gate visual smoke, not by these tests.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusView, type StatusRow } from '../../src/commands/status.js';

describe('StatusView (ink)', () => {
  it('renders each session name, its state in caps, and age text', () => {
    const rows: StatusRow[] = [
      { name: 'alpha', state: 'running', target: 'alpha:0.0', ageText: '2m' },
      { name: 'beta', state: 'awaiting_review', target: 'beta:0.0', ageText: '5m' },
      { name: 'gamma', state: 'idle', target: 'gamma:0.0', ageText: '—' },
    ];

    const { lastFrame } = render(<StatusView rows={rows} />);
    const frame = lastFrame() ?? '';

    for (const row of rows) {
      expect(frame).toContain(row.name);
      expect(frame).toContain(row.state.toUpperCase());
      expect(frame).toContain(row.ageText);
    }
  });

  it('sorts rows: awaiting_review, stale, running, idle (§6.1 order)', () => {
    const rows: StatusRow[] = [
      { name: 'row-idle', state: 'idle', target: 't1:0.0', ageText: '—' },
      { name: 'row-running', state: 'running', target: 't2:0.0', ageText: '1m' },
      { name: 'row-stale', state: 'stale', target: 't3:0.0', ageText: '1h' },
      { name: 'row-review', state: 'awaiting_review', target: 't4:0.0', ageText: '5m' },
    ];

    const { lastFrame } = render(<StatusView rows={rows} />);
    const frame = lastFrame() ?? '';

    const posReview = frame.indexOf('row-review');
    const posStale = frame.indexOf('row-stale');
    const posRunning = frame.indexOf('row-running');
    const posIdle = frame.indexOf('row-idle');

    expect(posReview).toBeGreaterThanOrEqual(0);
    expect(posStale).toBeGreaterThan(posReview);
    expect(posRunning).toBeGreaterThan(posStale);
    expect(posIdle).toBeGreaterThan(posRunning);
  });
});
