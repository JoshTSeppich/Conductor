// @vitest-environment happy-dom
//
// MB-T18 probe-02 — TileFooter render behavior tests.
//
// Covers:
//   - cwd renders when provided + omits when absent
//   - cwd has title= attribute (full path tooltip per Q-MBT18-7=d)
//   - cwd has CSS truncation styles (text-overflow:ellipsis +
//     overflow:hidden + whitespace:nowrap)
//   - uptime renders with mountedAt prop seam
//   - uptime ticks via 5s setInterval (Q-MBT18-9=b) — verified via
//     vi.useFakeTimers + vi.advanceTimersByTime + act() per WB11a
//     happy-dom act() requirement

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { TileFooter } from '../../../src/tile-grid/tile-footer.js';

describe('MB-T18 probe-02 — TileFooter cwd rendering', () => {
  it('renders the cwd span with the full path text when cwd prop is provided', () => {
    render(<TileFooter sessionName="s1" cwd="/Users/op/code/foo" />);
    const cwdEl = screen.getByTestId('tile-footer-cwd');
    expect(cwdEl).toBeInTheDocument();
    expect(cwdEl.textContent).toBe('/Users/op/code/foo');
  });

  it('omits the cwd span when cwd prop is absent', () => {
    render(<TileFooter sessionName="s1" />);
    expect(screen.queryByTestId('tile-footer-cwd')).toBeNull();
  });

  it('omits the cwd span when cwd prop is empty string', () => {
    render(<TileFooter sessionName="s1" cwd="" />);
    expect(screen.queryByTestId('tile-footer-cwd')).toBeNull();
  });

  it('cwd span carries title= attribute matching the full path (tooltip)', () => {
    const path = '/Users/op/Desktop/Automata/foxworks-dispatch';
    render(<TileFooter sessionName="s1" cwd={path} />);
    const cwdEl = screen.getByTestId('tile-footer-cwd');
    expect(cwdEl.getAttribute('title')).toBe(path);
  });

  it('cwd span has CSS truncation styles (overflow:hidden + textOverflow:ellipsis + whiteSpace:nowrap)', () => {
    render(<TileFooter sessionName="s1" cwd="/some/path" />);
    const cwdEl = screen.getByTestId('tile-footer-cwd') as HTMLElement;
    expect(cwdEl.style.overflow).toBe('hidden');
    expect(cwdEl.style.textOverflow).toBe('ellipsis');
    expect(cwdEl.style.whiteSpace).toBe('nowrap');
  });
});

describe('MB-T18 probe-02 — TileFooter uptime rendering + tick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the tile-footer-uptime testid', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    render(<TileFooter sessionName="s1" mountedAt={Date.now()} />);
    expect(screen.getByTestId('tile-footer-uptime')).toBeInTheDocument();
  });

  it('shows "0s" at mount when mountedAt = now', () => {
    const t0 = new Date(2026, 0, 1, 12, 0, 0).getTime();
    vi.setSystemTime(t0);
    render(<TileFooter sessionName="s1" mountedAt={t0} />);
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('0s');
  });

  it('uptime advances after 5s tick (setInterval tick → setNow → re-render)', () => {
    const t0 = new Date(2026, 0, 1, 12, 0, 0).getTime();
    vi.setSystemTime(t0);
    render(<TileFooter sessionName="s1" mountedAt={t0} />);
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('0s');

    // Advance 5 seconds — one full tick.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('5s');

    // Advance another 55s — should now be at 60s = "1m" (auto-unit).
    act(() => {
      vi.advanceTimersByTime(55_000);
    });
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('1m');
  });

  it('uptime does NOT advance between ticks (string stays stable for ~5s)', () => {
    const t0 = new Date(2026, 0, 1, 12, 0, 0).getTime();
    vi.setSystemTime(t0);
    render(<TileFooter sessionName="s1" mountedAt={t0} />);

    // Advance 4.9 seconds — under one tick window; setInterval has not
    // fired, so the displayed uptime string is still "0s" (initial
    // render captured `now=Date.now()` at first render which was t0,
    // so elapsed was 0). The setInterval would fire at t0+5000 → it
    // hasn't yet at t0+4900.
    act(() => {
      vi.advanceTimersByTime(4_900);
    });
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('0s');
  });

  it('mountedAt prop seam — injecting a past timestamp shows immediate uptime', () => {
    // Mount time was 2 minutes ago; current time is "now".
    const now = new Date(2026, 0, 1, 12, 5, 0).getTime();
    vi.setSystemTime(now);
    const twoMinutesAgo = now - 2 * 60 * 1000;
    render(<TileFooter sessionName="s1" mountedAt={twoMinutesAgo} />);
    expect(screen.getByTestId('tile-footer-uptime').textContent).toBe('2m');
  });
});

describe('MB-T18 probe-02 — TileFooter wrapper attribution', () => {
  it('outer wrapper carries data-mb-t18-content="true" + data-session-name attrs', () => {
    render(<TileFooter sessionName="my-session" />);
    const wrapper = screen.getByTestId('tile-footer-content');
    expect(wrapper.getAttribute('data-mb-t18-content')).toBe('true');
    expect(wrapper.getAttribute('data-session-name')).toBe('my-session');
  });
});
