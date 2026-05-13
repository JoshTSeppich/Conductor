// @vitest-environment happy-dom
//
// MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB3 — dispose lifecycle
// ratification.
//
// Per build-doc §4 Path B WB3: verifies `useEffect` cleanup calls
// `source.dispose()` and prevents further state-emits from reaching
// React state after unmount.
//
// 2 conditions:
//   03a: Mount TileGridApp. After initial poll completes, the fake
//        listClient.callCount() is 1. After unmount + advancing fake
//        timers past the next scheduled poll (default 3000ms cadence),
//        callCount() is STILL 1 — proves the underlying timer was
//        cancelled (which can only happen via pollHandle.dispose() →
//        source.dispose()).
//   03b: Mount TileGridApp. Unmount. Advance fake timers. No React
//        state-update warning emitted to console.error.
//
// Build-doc §4 Path B WB3 GREEN scope: "ensure `useEffect` returns
// `() => { unsub(); source.dispose(); }` per probe-mbtphase5-status-
// indicator-02-integration.spec.tsx:85-88 pattern." WB1 GREEN
// (`460fbda`) already implements this cleanup; if the probes PASS at
// HEAD, this WB is a ratification anchor (single `green:` commit).
//
// Verification technique:
// - Sub-Q-2 binds renderer-side useEffect-owned lifecycle. The cleanup
//   path is the only path that can stop subsequent polls.
// - Indirect-via-callCount is preferred over a source-factory test
//   seam: avoids adding a second test seam (`createStatusSource?`)
//   purely for dispose verification. Behavior-not-implementation:
//   cleared timer is the observable consequence of dispose().
//
// Citation: Sub-Q-2 lifecycle at decisions doc §2.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fixtures ────────────────────────────────────────────────────────

function makeFakeBridge(): WorkstationBridgeShape {
  const spawnHandlers = new Set<(reply: unknown) => void>();
  return {
    onSpawnResult: (cb) => {
      spawnHandlers.add(cb);
      return () => {
        spawnHandlers.delete(cb);
      };
    },
  };
}

interface StatusEntry {
  readonly name: string;
  readonly state?: string;
  readonly computed_status?: string;
}
interface StatusListResponse {
  readonly sessions: readonly StatusEntry[];
}

function makeRecordingClient(): {
  listSessions(): Promise<StatusListResponse>;
  callCount(): number;
} {
  let calls = 0;
  return {
    async listSessions(): Promise<StatusListResponse> {
      calls += 1;
      return { sessions: [{ name: 'a', computed_status: 'running' }] };
    },
    callCount() {
      return calls;
    },
  };
}

type ExtraProps = {
  statusListClient?: ReturnType<typeof makeRecordingClient>;
};

function makeFixtures() {
  return {
    workstation: makeFakeBridge(),
    consoleBridge: makeFakeConsoleBridge().bridge,
    createTerminal: () => makeFakeTerminalAdapter(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB3 — dispose lifecycle', () => {
  it('03a: post-unmount, no further listSessions calls (timer cancelled by source.dispose())', async () => {
    const f = makeFixtures();
    const client = makeRecordingClient();
    const extra: ExtraProps = { statusListClient: client };
    const { unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
        {...(extra as Record<string, unknown>)}
      />,
    );
    // Flush initial poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(client.callCount()).toBe(1);

    // Unmount → cleanup runs → unsub() + source.dispose() →
    // pollHandle.dispose() clears the pending setTimeout.
    unmount();

    // Advance past next scheduled poll (default 3000ms cadence).
    // If dispose worked, the timer was cleared; no further calls.
    // If dispose did NOT work, listSessions would be called again at
    // t≈3050 → callCount would be 2.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(client.callCount()).toBe(1);
  });

  it('03b: post-unmount, no React state-update warning emitted to console.error', async () => {
    const f = makeFixtures();
    const client = makeRecordingClient();
    const extra: ExtraProps = { statusListClient: client };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { unmount } = render(
        <TileGridApp
          workstationBridge={f.workstation}
          consoleBridge={f.consoleBridge}
          createTerminal={f.createTerminal}
          initialSessions={[{ name: 'a' }]}
          {...(extra as Record<string, unknown>)}
        />,
      );
      // Flush initial poll while mounted (legitimate setState).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      // Unmount.
      unmount();
      // Advance more time. Any pending in-flight poll resumes after
      // the await and hits the `if (disposed) return;` guards at
      // session-status-source-poll.ts:117/120, OR the facade-level
      // `if (disposed) return;` at session-status-source.ts:74. No
      // setStatusSnapshot should fire post-unmount.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      // Filter for the specific React state-update-on-unmounted
      // warning text (other test-noise from happy-dom AbortError is
      // tolerated; we only care about React-side leaks here).
      const reactWarnings = consoleErrorSpy.mock.calls.filter((call) => {
        const msg = String(call[0] ?? '');
        return (
          msg.includes('state update on an unmounted component') ||
          msg.includes('memory leak') ||
          msg.includes('act(')
        );
      });
      expect(reactWarnings).toEqual([]);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
