// @vitest-environment happy-dom
//
// MB-T17 WB3 probe-01 — TileAutopilotToggle chrome render tests.
//
// Replaces WB1's probe-00-module-loads.spec.tsx (deleted at WB3; the
// stub-attribute test fails after WB3 lands real chrome). probe-01
// covers all WB3 acceptance:
//   - Native <input type="checkbox" role="switch"> per Q-MBT17-1=a
//   - Disabled + tooltip on bridge-missing or fetch-error per Q-MBT17-2=a
//   - Optimistic update + silent rollback on PUT error per Q-MBT17-3=a
//   - State machine (loading / ready / unavailable) reflected on
//     data-state attribute
//   - Bridge calls keyed by sessionName

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import {
  TileAutopilotToggle,
  type TileAutopilotToggleBridge,
} from '../../../src/tile-grid/tile-autopilot-toggle.js';

/** Deferred-promise helper: returns a controllable promise + resolve/reject
 *  fns for fine-grained async test orchestration. */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('MB-T17 WB3 — TileAutopilotToggle initial render', () => {
  it('without bridge: renders disabled checkbox with "bridge unavailable" tooltip', () => {
    render(<TileAutopilotToggle sessionName="sess-x" />);
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(cb).toBeInTheDocument();
    expect(cb.tagName).toBe('INPUT');
    expect(cb.type).toBe('checkbox');
    expect(cb.getAttribute('role')).toBe('switch');
    expect(cb.disabled).toBe(true);
    expect(cb.getAttribute('data-state')).toBe('unavailable');
    expect(cb.title).toMatch(/bridge unavailable/);
  });

  it('null bridge: renders disabled with "bridge unavailable"', () => {
    render(<TileAutopilotToggle sessionName="sess-x" workstationBridge={null} />);
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(cb.disabled).toBe(true);
    expect(cb.getAttribute('data-state')).toBe('unavailable');
  });

  it('aria-label includes sessionName for accessibility', () => {
    render(<TileAutopilotToggle sessionName="sess-aria" />);
    const cb = screen.getByTestId('tile-autopilot-toggle');
    expect(cb.getAttribute('aria-label')).toBe('Autopilot for sess-aria');
  });
});

describe('MB-T17 WB3 — TileAutopilotToggle fetch-on-mount (Q-MBT17-7=a per-tile fetch)', () => {
  it('with valid bridge: starts in "loading" state, transitions to "ready" on resolve', async () => {
    const d = deferred<{ enabled: boolean }>();
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(() => d.promise),
      setSessionAutopilotEnabled: vi.fn(async (_n, e) => ({ enabled: e })),
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(cb.getAttribute('data-state')).toBe('loading');
    expect(cb.disabled).toBe(true);

    await act(async () => {
      d.resolve({ enabled: true });
      await d.promise;
    });

    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('ready');
    });
    expect(cb.disabled).toBe(false);
    expect(cb.checked).toBe(true);
  });

  it('with valid bridge returning enabled=false: ready state with checked=false', async () => {
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => ({ enabled: false })),
      setSessionAutopilotEnabled: vi.fn(async (_n, e) => ({ enabled: e })),
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('ready');
    });
    expect(cb.checked).toBe(false);
    expect(cb.disabled).toBe(false);
  });

  it('GET error: transitions to "unavailable" with error message in tooltip', async () => {
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => {
        throw new Error('daemon unreachable');
      }),
      setSessionAutopilotEnabled: vi.fn(async (_n, e) => ({ enabled: e })),
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('unavailable');
    });
    expect(cb.disabled).toBe(true);
    expect(cb.title).toMatch(/daemon unreachable/);
  });

  it('bridge call keyed by sessionName', async () => {
    const get = vi.fn(async (name: string) => ({ enabled: name === 'on-x' }));
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: get,
      setSessionAutopilotEnabled: vi.fn(async (_n, e) => ({ enabled: e })),
    };
    render(
      <TileAutopilotToggle sessionName="on-x" workstationBridge={bridge} />,
    );
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('on-x');
    });
  });
});

describe('MB-T17 WB3 — TileAutopilotToggle onChange (Q-MBT17-3=a optimistic UI)', () => {
  it('flip OFF→ON: optimistic update + PUT fires + server-confirm', async () => {
    const put = vi.fn(async (_n: string, e: boolean) => ({ enabled: e }));
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => ({ enabled: false })),
      setSessionAutopilotEnabled: put,
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('ready');
    });
    expect(cb.checked).toBe(false);

    await act(async () => {
      fireEvent.click(cb);
    });

    // Optimistic — checked=true immediately.
    expect(cb.checked).toBe(true);
    expect(put).toHaveBeenCalledWith('sess-x', true);

    await waitFor(() => {
      expect(cb.checked).toBe(true);
    });
    expect(cb.getAttribute('data-state')).toBe('ready');
  });

  it('flip ON→OFF: optimistic update + PUT fires', async () => {
    const put = vi.fn(async (_n: string, e: boolean) => ({ enabled: e }));
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => ({ enabled: true })),
      setSessionAutopilotEnabled: put,
    };
    render(
      <TileAutopilotToggle sessionName="sess-y" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.checked).toBe(true);
    });

    await act(async () => {
      fireEvent.click(cb);
    });

    expect(cb.checked).toBe(false);
    expect(put).toHaveBeenCalledWith('sess-y', false);
  });

  it('PUT error: silent rollback to previous value + tooltip surfacing error', async () => {
    const put = vi.fn(async () => {
      throw new Error('disk full');
    });
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => ({ enabled: false })),
      setSessionAutopilotEnabled: put,
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('ready');
    });
    expect(cb.checked).toBe(false);

    await act(async () => {
      fireEvent.click(cb);
    });

    // Optimistic flips to true, then rollback to false on PUT error.
    await waitFor(() => {
      expect(cb.checked).toBe(false);
    });
    expect(cb.getAttribute('data-state')).toBe('ready'); // stays enabled
    expect(cb.disabled).toBe(false);
    expect(cb.title).toMatch(/autopilot update failed/);
    expect(cb.title).toMatch(/disk full/);
  });

  it('PUT error: checkbox stays enabled so operator can retry (Q-MBT17-3=a)', async () => {
    const put = vi.fn(async () => {
      throw new Error('transient error');
    });
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(async () => ({ enabled: false })),
      setSessionAutopilotEnabled: put,
    };
    render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    await waitFor(() => {
      expect(cb.getAttribute('data-state')).toBe('ready');
    });

    await act(async () => {
      fireEvent.click(cb);
    });
    await waitFor(() => {
      expect(cb.title).toMatch(/transient error/);
    });
    // Still enabled despite the error — operator can retry.
    expect(cb.disabled).toBe(false);
  });

  it('onChange while in unavailable state: no PUT fired (defensive)', async () => {
    const put = vi.fn(async (_n: string, e: boolean) => ({ enabled: e }));
    render(<TileAutopilotToggle sessionName="sess-x" />);
    const cb = screen.getByTestId('tile-autopilot-toggle') as HTMLInputElement;
    expect(cb.disabled).toBe(true);
    // disabled inputs don't fire change events naturally — but defensive
    // check via fireEvent.click anyway. Should not invoke put.
    fireEvent.click(cb);
    expect(put).not.toHaveBeenCalled();
  });
});

describe('MB-T17 WB3 — TileAutopilotToggle unmount cancellation (Q-MBT17-7=a useEffect cleanup)', () => {
  it('unmount during loading: pending fetch result is ignored (no setState after unmount)', async () => {
    const d = deferred<{ enabled: boolean }>();
    const bridge: TileAutopilotToggleBridge = {
      getSessionAutopilotEnabled: vi.fn(() => d.promise),
      setSessionAutopilotEnabled: vi.fn(async (_n, e) => ({ enabled: e })),
    };
    const { unmount } = render(
      <TileAutopilotToggle sessionName="sess-x" workstationBridge={bridge} />,
    );
    unmount();
    // Resolving after unmount should not throw or warn (cancelled flag).
    await act(async () => {
      d.resolve({ enabled: true });
      await d.promise;
    });
    // No assertion needed — the test passes if React doesn't warn about
    // setState on unmounted component.
  });
});
