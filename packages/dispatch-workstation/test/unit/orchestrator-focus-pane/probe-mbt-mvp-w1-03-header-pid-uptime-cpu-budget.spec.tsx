// @vitest-environment happy-dom
//
// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB3 probe-03 — focus-pane-header chrome.
//
// Per arbitration Q-MVP-W1-3=(a) (operator ack 17:55 MDT):
//   - Uptime: LIVE (derive from __orchestrator_active spawnedAtMs;
//     formatUptimeLabel precedent at src/tile-grid/tile-header.tsx:77-91)
//   - pid / cpuPercent / tokenBudgetUsd: PLACEHOLDER literal '—' (em-dash)
//     pending Tier-2 followup MB-F-MVP-W1-HEADER-PID-CPU-BUDGET-WIRING
//
// Each anchor exposed via stable data-testid so subsequent WBs / followups
// can swap implementations without ripping the test surface.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusPaneHeader } from '../../../src/orchestrator-focus-pane/focus-pane-header.js';

const EM_DASH = '—';

describe('MB-T-MVP-W1 WB3 — FocusPaneHeader uptime (LIVE per Q3=(a))', () => {
  it('renders elapsed-minutes uptime when spawnedAtMs + nowMs span >= 1 minute', () => {
    const spawnedAtMs = 1_700_000_000_000;
    const nowMs = spawnedAtMs + 5 * 60_000; // +5m
    render(<FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={nowMs} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('5m');
  });

  it('renders "<h>h<m>m" when span >= 1 hour', () => {
    const spawnedAtMs = 1_700_000_000_000;
    const nowMs = spawnedAtMs + (60 + 15) * 60_000; // +1h15m
    render(<FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={nowMs} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('1h15m');
  });

  it('renders placeholder em-dash when spawnedAtMs is undefined', () => {
    render(<FocusPaneHeader nowMs={Date.now()} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent(EM_DASH);
  });

  it('renders placeholder em-dash when elapsed is below the 1-minute floor', () => {
    const spawnedAtMs = 1_700_000_000_000;
    const nowMs = spawnedAtMs + 30_000; // +30s, below 1m floor
    render(<FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={nowMs} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent(EM_DASH);
  });

  it('renders placeholder em-dash when nowMs is before spawnedAtMs (clock skew guard)', () => {
    const spawnedAtMs = 1_700_000_000_000;
    const nowMs = spawnedAtMs - 5_000; // negative elapsed
    render(<FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={nowMs} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent(EM_DASH);
  });
});

describe('MB-T-MVP-W1 WB3 — FocusPaneHeader pid/cpu/budget (PLACEHOLDER per Q3=(a))', () => {
  it('renders pid anchor with em-dash placeholder', () => {
    render(<FocusPaneHeader nowMs={Date.now()} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-pid')).toHaveTextContent(EM_DASH);
  });

  it('renders cpu anchor with em-dash placeholder', () => {
    render(<FocusPaneHeader nowMs={Date.now()} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-cpu')).toHaveTextContent(EM_DASH);
  });

  it('renders budget anchor with em-dash placeholder', () => {
    render(<FocusPaneHeader nowMs={Date.now()} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-budget')).toHaveTextContent(EM_DASH);
  });

  it('each anchor exists in the DOM (sentinel completeness)', () => {
    render(<FocusPaneHeader nowMs={Date.now()} spawnedAtMs={1} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-pid')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-cpu')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-budget')).toBeInTheDocument();
  });
});

describe('MB-T-MVP-W1 WB3 — FocusPaneHeader reactivity to spawnedAtMs/nowMs changes', () => {
  it('re-renders uptime when nowMs prop advances by one minute', () => {
    const spawnedAtMs = 1_700_000_000_000;
    const { rerender } = render(
      <FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={spawnedAtMs + 60_000} />,
    );
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('1m');
    rerender(<FocusPaneHeader spawnedAtMs={spawnedAtMs} nowMs={spawnedAtMs + 7 * 60_000} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('7m');
  });

  it('re-renders uptime when spawnedAtMs prop changes (e.g., orchestrator restart)', () => {
    const t0 = 1_700_000_000_000;
    const { rerender } = render(
      <FocusPaneHeader spawnedAtMs={t0} nowMs={t0 + 10 * 60_000} />,
    );
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('10m');
    // orchestrator restarted -> spawnedAtMs jumps forward; uptime resets
    const t1 = t0 + 9 * 60_000;
    rerender(<FocusPaneHeader spawnedAtMs={t1} nowMs={t0 + 10 * 60_000} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent('1m');
  });
});
