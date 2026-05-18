// @vitest-environment happy-dom
//
// MB-T-MVP-W1-ORCHESTRATOR-FOCUS-PANE WB5 probe-05 — Build.md step counters.
//
// Per arbitration Q-MVP-W1-4=(a) (operator ack 17:55 MDT):
//   - filename, total (taskCount), queued (readyCount): LIVE from existing
//     `workstation:read-build-md` IPC poll (BuildMdStatus shape at
//     src/build-md/types.ts:26-35 [KNOWN])
//   - running, done: PLACEHOLDER em-dash pending Tier-2 followup
//     MB-F-MVP-W1-STEP-COUNTERS-RUNNING-DONE-AWAIT-WAVE-4-PRODUCTION-WIRING
//     (blocked-by MB-F-T5-COMPLETED-TASK-IDS-PRODUCTION-WIRING already filed)
//
// FocusPaneHeader is extended with build-md props rather than introducing a
// separate <FocusPaneStepCounters /> component — operator vision §Component 1
// places "build.md filename/total/queued/running/done step counters" inside
// the header chrome, not as a sibling region.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusPaneHeader } from '../../../src/orchestrator-focus-pane/focus-pane-header.js';

const EM_DASH = '—';

describe('MB-T-MVP-W1 WB5 — FocusPaneHeader build.md filename anchor', () => {
  it('renders the filename when buildMdFilename prop is provided', () => {
    render(<FocusPaneHeader buildMdFilename="BUILD.md" />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-filename')).toHaveTextContent('BUILD.md');
  });

  it('renders em-dash placeholder when buildMdFilename is undefined', () => {
    render(<FocusPaneHeader />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-filename')).toHaveTextContent(EM_DASH);
  });

  it('renders em-dash placeholder when buildMdFilename is the empty string', () => {
    render(<FocusPaneHeader buildMdFilename="" />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-filename')).toHaveTextContent(EM_DASH);
  });
});

describe('MB-T-MVP-W1 WB5 — FocusPaneHeader total/queued (LIVE per Q4=(a))', () => {
  it('renders buildMdTotal numeric prop', () => {
    render(<FocusPaneHeader buildMdTotal={14} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-total')).toHaveTextContent('14');
  });

  it('renders buildMdQueued numeric prop (mapped from BuildMdStatus.readyCount)', () => {
    render(<FocusPaneHeader buildMdQueued={3} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-queued')).toHaveTextContent('3');
  });

  it('renders 0 (not em-dash) when total prop is 0 (a meaningful value, not "no data")', () => {
    render(<FocusPaneHeader buildMdTotal={0} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-total')).toHaveTextContent('0');
  });

  it('renders em-dash placeholder when buildMdTotal is undefined', () => {
    render(<FocusPaneHeader />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-total')).toHaveTextContent(EM_DASH);
  });

  it('renders em-dash placeholder when buildMdQueued is undefined', () => {
    render(<FocusPaneHeader />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-queued')).toHaveTextContent(EM_DASH);
  });
});

describe('MB-T-MVP-W1 WB5 — FocusPaneHeader running/done (PLACEHOLDER per Q4=(a))', () => {
  it('running counter always renders em-dash placeholder (not yet wired pending followup)', () => {
    render(<FocusPaneHeader buildMdTotal={10} buildMdQueued={5} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-running')).toHaveTextContent(EM_DASH);
  });

  it('done counter always renders em-dash placeholder (not yet wired pending followup)', () => {
    render(<FocusPaneHeader buildMdTotal={10} buildMdQueued={5} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-done')).toHaveTextContent(EM_DASH);
  });

  it('sentinel completeness: filename + total + queued + running + done anchors present', () => {
    render(<FocusPaneHeader />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-filename')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-total')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-queued')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-running')).toBeInTheDocument();
    expect(screen.getByTestId('orchestrator-focus-pane-header-done')).toBeInTheDocument();
  });
});

describe('MB-T-MVP-W1 WB5 — FocusPaneHeader prior chrome anchors preserved', () => {
  it('uptime/pid/cpu/budget anchors still render alongside the new step counters', () => {
    render(<FocusPaneHeader buildMdFilename="BUILD.md" buildMdTotal={5} buildMdQueued={2} />);
    expect(screen.getByTestId('orchestrator-focus-pane-header-pid')).toHaveTextContent(EM_DASH);
    expect(screen.getByTestId('orchestrator-focus-pane-header-uptime')).toHaveTextContent(EM_DASH);
    expect(screen.getByTestId('orchestrator-focus-pane-header-cpu')).toHaveTextContent(EM_DASH);
    expect(screen.getByTestId('orchestrator-focus-pane-header-budget')).toHaveTextContent(EM_DASH);
  });
});
