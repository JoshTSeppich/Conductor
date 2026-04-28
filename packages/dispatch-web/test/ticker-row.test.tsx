import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TickerRow } from '../src/components/TickerRow.js';
import { useUIStore } from '../src/store/ui.js';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';

// Fixed clock for relative-time assertions. T20 reads Date.now() at
// row-render time; pinning the clock makes "Xm ago" deterministic.
const FROZEN_NOW = Date.UTC(2026, 3, 27, 12, 0, 0);

beforeEach(() => {
  useUIStore.setState(
    {
      focusedSessionName: null,
      sendModalOpen: false,
      killConfirmOpen: false,
      killConfirmTarget: null,
      showArchived: false,
      connectionStatus: 'connected',
      commitBySession: {},
      banners: [],
      authRetryNonce: 0,
      events: [],
      notificationsAvailable: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  );
  // Pin Date.now via a stub so relative-time formatters are deterministic.
  // (Per Decision 8, the 30s refresh integration test uses
  // vi.useFakeTimers; this suite uses a simpler stub since TickerRow
  // direct-renders don't need timer advancement.)
  vi.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function eventOfType(
  type: EventV2Type['type'],
  ageMs = 60_000,
): EventV2Type {
  const timestamp = new Date(FROZEN_NOW - ageMs).toISOString();
  switch (type) {
    case 'handoff_written':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { path: '/h.md', size_bytes: 1 },
      };
    case 'commit_landed':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { sha: 'abc', subject: 's', branch: 'main' },
      };
    case 'state_changed':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { from: 'paused', to: 'armed', triggered_by: 'operator' },
      };
    case 'prompt_sent':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { archived_to: '/p.md', size_chars: 1 },
      };
    case 'test_status_updated':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { tests_passing: 1, tests_failing: 0, phase: 'green' },
      };
    case 'cairn_violation_detected':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { violation_type: 'drift', details: 'd' },
      };
    case 'gate_trip':
      return {
        type,
        timestamp,
        session: 'sherpa',
        data: { gate_name: 'g', context: 'c', expected_action: 'a' },
      };
  }
}

describe('WEB-T20 TickerRow', () => {
  it('cairn_violation_detected has red affordance (border-l-status-stale per spec verbatim "→ red")', () => {
    render(<TickerRow event={eventOfType('cairn_violation_detected')} />);
    const row = screen.getByTestId('ticker-row');
    expect(row.className).toMatch(/\bborder-l-status-stale\b/);
  });

  it('commit_landed has neutral affordance (border-l-status-idle per spec verbatim "neutral")', () => {
    render(<TickerRow event={eventOfType('commit_landed')} />);
    const row = screen.getByTestId('ticker-row');
    expect(row.className).toMatch(/\bborder-l-status-idle\b/);
  });

  it.each<[EventV2Type['type'], RegExp]>([
    ['handoff_written', /\bborder-l-status-running\b/],
    ['commit_landed', /\bborder-l-status-idle\b/],
    ['state_changed', /\bborder-l-accent\b/],
    ['prompt_sent', /\bborder-l-status-running\b/],
    ['test_status_updated', /\bborder-l-status-awaiting-review\b/],
    ['cairn_violation_detected', /\bborder-l-status-stale\b/],
    ['gate_trip', /\bborder-l-status-stale\b/],
  ])(
    'all 7 §5.3 types render with distinct color class — type %s matches %s',
    (type, classRegex) => {
      render(<TickerRow event={eventOfType(type)} />);
      const row = screen.getByTestId('ticker-row');
      expect(row.className).toMatch(classRegex);
    },
  );

  it.each<[EventV2Type['type'], string]>([
    ['handoff_written', 'H'],
    ['commit_landed', '✓'],
    ['state_changed', '↻'],
    ['prompt_sent', '→'],
    ['test_status_updated', 'T'],
    ['cairn_violation_detected', '!'],
    ['gate_trip', '⏸'],
  ])(
    'each row contains type-specific icon glyph — type %s shows %s',
    (type, glyph) => {
      render(<TickerRow event={eventOfType(type)} />);
      const row = screen.getByTestId('ticker-row');
      expect(row.textContent).toContain(glyph);
    },
  );

  it.each<[number, RegExp]>([
    [30_000, /<1m ago/],
    [3 * 60_000, /\b3m ago\b/],
    [2 * 60 * 60_000, /\b2h ago\b/],
    [3 * 24 * 60 * 60_000, /\b3d ago\b/],
  ])(
    'relative timestamp format — %ims age → matches %s',
    (ageMs, expectedFormat) => {
      render(<TickerRow event={eventOfType('commit_landed', ageMs)} />);
      const row = screen.getByTestId('ticker-row');
      expect(row.textContent).toMatch(expectedFormat);
    },
  );

  it('session name is a clickable button (role=button, name=session)', () => {
    render(<TickerRow event={eventOfType('commit_landed')} />);
    expect(
      screen.getByRole('button', { name: /sherpa/i }),
    ).toBeInTheDocument();
  });

  it('clicking session name calls setFocus → store.focusedSessionName updated', () => {
    render(<TickerRow event={eventOfType('commit_landed')} />);
    expect(useUIStore.getState().focusedSessionName).toBe(null);
    fireEvent.click(screen.getByRole('button', { name: /sherpa/i }));
    expect(useUIStore.getState().focusedSessionName).toBe('sherpa');
  });
});
