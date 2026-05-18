// @vitest-environment happy-dom
//
// MB-T-MVP-W1-EXPANSION-2 WB4 probe-04 — OrchestratorStrip SlotGrid + legend.
//
// Asserts the SlotGrid surface contract per design-handoff
// orchestrator-strip.jsx:29-52 SlotGrid + jsx:117-127 legend:
//
//   - SlotGrid renders `maxSlots` cells (default 64)
//   - First N slots take sessions in order; rest are empty
//   - Each slot: <button data-testid="ostrip-slot-<i>"> with status class
//     style (empty/starting/running/done/error)
//   - Running slots include inner data-testid="ostrip-slot-pulse-<i>" span
//   - Empty slots are disabled (cursor: default per design HTML:296)
//   - Slot click invokes onSlotClick(session) for live (non-empty) slots
//   - Legend block testid="ostrip-legend" with 5 entries:
//     running/starting/done/error/idle
//
// Per design jsx:32 `Array.from({ length: maxSlots }, (_, i) => sessions[i] || null)`.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrchestratorStrip } from '../../../src/orchestrator-strip/orchestrator-strip.js';

type SessionStatus = 'starting' | 'running' | 'done' | 'error';

interface SlotSession {
  id: string;
  name: string;
  status: SessionStatus;
}

function fakeSession(id: string, status: SessionStatus): SlotSession {
  return { id, name: `agent-${id}`, status };
}

describe('MB-T-MVP-W1-EXPANSION-2 WB4 — OrchestratorStrip SlotGrid', () => {
  it('renders SlotGrid root anchor at data-testid="ostrip-slots"', () => {
    render(<OrchestratorStrip />);
    expect(screen.getByTestId('ostrip-slots')).toBeInTheDocument();
  });

  it('renders exactly 64 slot buttons by default (design maxSlots default)', () => {
    render(<OrchestratorStrip />);
    const slots = screen.getAllByTestId(/^ostrip-slot-\d+$/);
    expect(slots).toHaveLength(64);
  });

  it('renders exactly `maxSlots` cells when caller overrides (e.g. 16)', () => {
    render(<OrchestratorStrip maxSlots={16} />);
    const slots = screen.getAllByTestId(/^ostrip-slot-\d+$/);
    expect(slots).toHaveLength(16);
  });

  it('first N slots take sessions in order; remaining are empty', () => {
    const sessions: SlotSession[] = [
      fakeSession('s1', 'running'),
      fakeSession('s2', 'starting'),
      fakeSession('s3', 'done'),
    ];
    render(<OrchestratorStrip sessions={sessions} maxSlots={5} />);
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
    expect(screen.getByTestId('ostrip-slot-4').getAttribute('data-status')).toBe(
      'empty',
    );
  });

  it('running slot includes pulse inner span at data-testid="ostrip-slot-pulse-<i>"', () => {
    const sessions: SlotSession[] = [fakeSession('s1', 'running')];
    render(<OrchestratorStrip sessions={sessions} maxSlots={3} />);
    expect(screen.getByTestId('ostrip-slot-pulse-0')).toBeInTheDocument();
  });

  it('non-running slots do NOT include pulse inner span', () => {
    const sessions: SlotSession[] = [
      fakeSession('s1', 'starting'),
      fakeSession('s2', 'done'),
      fakeSession('s3', 'error'),
    ];
    render(<OrchestratorStrip sessions={sessions} maxSlots={3} />);
    expect(screen.queryByTestId('ostrip-slot-pulse-0')).toBeNull();
    expect(screen.queryByTestId('ostrip-slot-pulse-1')).toBeNull();
    expect(screen.queryByTestId('ostrip-slot-pulse-2')).toBeNull();
  });

  it('empty slots are disabled (button disabled attr)', () => {
    render(<OrchestratorStrip maxSlots={3} />);
    const slot0 = screen.getByTestId('ostrip-slot-0') as HTMLButtonElement;
    expect(slot0.disabled).toBe(true);
  });

  it('live (non-empty) slots are enabled', () => {
    const sessions: SlotSession[] = [fakeSession('s1', 'running')];
    render(<OrchestratorStrip sessions={sessions} maxSlots={3} />);
    const slot0 = screen.getByTestId('ostrip-slot-0') as HTMLButtonElement;
    expect(slot0.disabled).toBe(false);
  });

  it('slot click invokes onSlotClick with the live session', () => {
    const sessions: SlotSession[] = [
      fakeSession('s1', 'running'),
      fakeSession('s2', 'done'),
    ];
    const onSlotClick = vi.fn();
    render(
      <OrchestratorStrip sessions={sessions} maxSlots={3} onSlotClick={onSlotClick} />,
    );
    fireEvent.click(screen.getByTestId('ostrip-slot-1'));
    expect(onSlotClick).toHaveBeenCalledTimes(1);
    expect(onSlotClick).toHaveBeenCalledWith(sessions[1]);
  });

  it('empty slot click does NOT invoke onSlotClick (disabled)', () => {
    const onSlotClick = vi.fn();
    render(<OrchestratorStrip maxSlots={3} onSlotClick={onSlotClick} />);
    fireEvent.click(screen.getByTestId('ostrip-slot-0'));
    expect(onSlotClick).not.toHaveBeenCalled();
  });

  it('legend block renders at data-testid="ostrip-legend" with 5 entries', () => {
    render(<OrchestratorStrip />);
    const legend = screen.getByTestId('ostrip-legend');
    expect(legend).toBeInTheDocument();
    expect(screen.getByTestId('ostrip-legend-running')).toBeInTheDocument();
    expect(screen.getByTestId('ostrip-legend-starting')).toBeInTheDocument();
    expect(screen.getByTestId('ostrip-legend-done')).toBeInTheDocument();
    expect(screen.getByTestId('ostrip-legend-error')).toBeInTheDocument();
    expect(screen.getByTestId('ostrip-legend-empty')).toBeInTheDocument();
  });

  it('error slot reflects data-status="error"', () => {
    const sessions: SlotSession[] = [fakeSession('s1', 'error')];
    render(<OrchestratorStrip sessions={sessions} maxSlots={2} />);
    expect(screen.getByTestId('ostrip-slot-0').getAttribute('data-status')).toBe(
      'error',
    );
  });

  it('passing more sessions than maxSlots truncates display to maxSlots (design Array.from-length cap)', () => {
    const sessions: SlotSession[] = Array.from({ length: 20 }, (_, i) =>
      fakeSession(`s${i}`, 'running'),
    );
    render(<OrchestratorStrip sessions={sessions} maxSlots={10} />);
    expect(screen.getAllByTestId(/^ostrip-slot-\d+$/)).toHaveLength(10);
  });
});
