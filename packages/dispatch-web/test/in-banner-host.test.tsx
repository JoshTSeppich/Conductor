import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  within,
  act,
} from '@testing-library/react';
import { InBannerHost } from '../src/components/InBannerHost.js';
import { useUIStore } from '../src/store/ui.js';

// T21 component-level rendering tests:
//   - sticky has Dismiss button (Decision 5; spec verbatim
//     "sticky alerts require explicit dismiss")
//   - toast has NO Dismiss button (auto-dismiss only)
//   - auto-dismiss after 5s for toast banners (Decision 4 +
//     finding-#42 fake-timer discipline: advanceTimersByTime
//     as sole clock-mover)
//   - stack order: sticky renders BEFORE toast (Decision 6;
//     spec verbatim "sticky alerts above")

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
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WEB-T21 InBannerHost', () => {
  it('sticky banner renders Dismiss button; click removes banner from store', () => {
    const id = useUIStore.getState().pushBanner({
      kind: 'sticky',
      severity: 'error',
      title: 'Cairn violation in sherpa',
      body: 'drift: detail',
    });
    render(<InBannerHost />);
    const region = screen.getByRole('region', { name: /banners/i });
    const dismissBtn = within(region).getByRole('button', {
      name: /dismiss/i,
    });
    expect(dismissBtn).toBeInTheDocument();

    fireEvent.click(dismissBtn);

    expect(
      useUIStore.getState().banners.find((b) => b.id === id),
    ).toBeUndefined();
  });

  it('toast banner has NO Dismiss button (auto-dismiss only per Decision 5)', () => {
    useUIStore.getState().pushBanner({
      kind: 'toast',
      severity: 'info',
      title: 'Handoff written for sherpa',
    });
    render(<InBannerHost />);
    const region = screen.getByRole('region', { name: /banners/i });
    expect(
      within(region).queryByRole('button', { name: /dismiss/i }),
    ).toBeNull();
  });

  it('toast auto-dismisses after 5000ms (pushBanner schedules cleanup per Decision 4)', () => {
    vi.useFakeTimers();
    useUIStore.getState().pushBanner({
      kind: 'toast',
      severity: 'info',
      title: 'auto-dismiss target',
    });
    expect(useUIStore.getState().banners).toHaveLength(1);

    // Per finding #42: advanceTimersByTime is sole clock-mover.
    // Don't combine with setSystemTime in same step.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(useUIStore.getState().banners).toHaveLength(0);
  });

  it('stack order: sticky renders BEFORE toast in DOM (Decision 6 — spec verbatim "sticky above")', () => {
    // Push toast first, then sticky. Insertion order: toast, sticky.
    // Render order should reorder: sticky first, toast after.
    useUIStore.getState().pushBanner({
      kind: 'toast',
      severity: 'info',
      title: 'TOAST_FIRST_INSERTED',
    });
    useUIStore.getState().pushBanner({
      kind: 'sticky',
      severity: 'error',
      title: 'STICKY_SECOND_INSERTED',
    });
    render(<InBannerHost />);
    const region = screen.getByRole('region', { name: /banners/i });
    const html = region.innerHTML;
    const stickyIdx = html.indexOf('STICKY_SECOND_INSERTED');
    const toastIdx = html.indexOf('TOAST_FIRST_INSERTED');
    expect(stickyIdx).toBeGreaterThan(-1);
    expect(toastIdx).toBeGreaterThan(-1);
    expect(stickyIdx).toBeLessThan(toastIdx);
  });
});
