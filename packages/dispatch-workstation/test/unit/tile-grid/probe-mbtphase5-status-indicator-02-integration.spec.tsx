// @vitest-environment happy-dom
//
// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB5 (green-via-ratification) —
// probe-mbtphase5-status-indicator-02-integration.
//
// Per ticket body §4 WB5 (commit 832c03b): "Authoring the probe IS the
// GREEN; if it fails, the failure is a bug in WB1-4 to be fixed in-WB
// before commit (no new RED commit — this is the integration
// ratification)."
//
// End-to-end closure-of-loop probe verifying WB1 deriveTileStatus
// (eeb11f5) + WB2 startStatusPoll (17aa384) + WB3
// createSessionStatusSource (fb6a474) + WB4 StatusIndicator (ff530b1)
// compose correctly under realistic state transitions.
//
// 3 conditions:
//   (1) fake client returns computed_status='running'
//       → indicator renders with green hex (#5b9d6e)
//   (2) fake client toggles to computed_status='stale'
//       → after fake-timer tick + microtask flush, indicator renders
//       amber (#c97a3a)
//   (3) fake client rejects (DaemonUnreachable) AND a session was
//       previously seen
//       → indicator renders red (#c54a4a) after backoff propagation
//
// Test fixture mounts a small ConsumerWrapper React component that:
//   - Creates a SessionStatusSource via createSessionStatusSource()
//   - Subscribes; tracks snapshot in useState
//   - Renders <StatusIndicator status={snap.get('a') ?? 'idle'}
//                                  sessionName="a"/>
//   - Disposes the source on unmount

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { createElement, useEffect, useState } from 'react';
import { createSessionStatusSource } from '../../../src/main/session-status-source.js';
import { StatusIndicator } from '../../../src/tile-grid/status-indicator.js';
import type { TileStatus } from '../../../src/tile-grid/types.js';

interface StatusEntry {
  readonly name: string;
  readonly state?: string;
  readonly computed_status?: string;
}
interface StatusListResponse {
  readonly sessions: readonly StatusEntry[];
}

function makeClient(): {
  listSessions(): Promise<StatusListResponse>;
  setResponse(r: StatusListResponse): void;
  setReject(yes: boolean): void;
} {
  let response: StatusListResponse = { sessions: [] };
  let reject = false;
  return {
    async listSessions(): Promise<StatusListResponse> {
      if (reject) throw new Error('daemon unreachable (stub)');
      return response;
    },
    setResponse(r) {
      response = r;
    },
    setReject(yes) {
      reject = yes;
    },
  };
}

interface ConsumerProps {
  readonly client: ReturnType<typeof makeClient>;
}

function ConsumerWrapper(props: ConsumerProps): JSX.Element {
  const [status, setStatus] = useState<TileStatus>('idle');
  useEffect(() => {
    const source = createSessionStatusSource({
      listClient: props.client,
      intervalMs: 100,
    });
    const unsub = source.subscribe((snap) => {
      const next = snap.get('a');
      if (next !== undefined) setStatus(next);
    });
    return () => {
      unsub();
      source.dispose();
    };
  }, [props.client]);
  return createElement(StatusIndicator, { status, sessionName: 'a' });
}

function mountConsumer(client: ReturnType<typeof makeClient>): {
  container: HTMLElement;
  unmount: () => void;
} {
  return render(createElement(ConsumerWrapper, { client }));
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB5 — end-to-end integration', () => {
  it('(1) computed_status="running" → indicator renders green #5b9d6e', async () => {
    const client = makeClient();
    client.setResponse({ sessions: [{ name: 'a', computed_status: 'running' }] });
    const { container, unmount } = mountConsumer(client);
    try {
      // Initial poll fires microtask; advance fake timers to flush
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      const el = container.querySelector('[data-testid="tile-status-indicator-a"]');
      expect(el?.getAttribute('data-status')).toBe('open');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#5b9d6e');
    } finally {
      unmount();
    }
  });

  it('(2) computed_status transitions running → stale → indicator goes green → amber', async () => {
    const client = makeClient();
    client.setResponse({ sessions: [{ name: 'a', computed_status: 'running' }] });
    const { container, unmount } = mountConsumer(client);
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      // Verify initial green
      let el = container.querySelector('[data-testid="tile-status-indicator-a"]');
      expect(el?.getAttribute('data-status')).toBe('open');

      // Toggle response; advance to next poll tick (intervalMs=100)
      client.setResponse({ sessions: [{ name: 'a', computed_status: 'stale' }] });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(150);
      });
      el = container.querySelector('[data-testid="tile-status-indicator-a"]');
      expect(el?.getAttribute('data-status')).toBe('warning');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#c97a3a');
    } finally {
      unmount();
    }
  });

  it('(3) daemon-unreachable after prior success → indicator goes red #c54a4a', async () => {
    const client = makeClient();
    client.setResponse({ sessions: [{ name: 'a', computed_status: 'running' }] });
    const { container, unmount } = mountConsumer(client);
    try {
      // Initial success → green observed (anchor)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      let el = container.querySelector('[data-testid="tile-status-indicator-a"]');
      expect(el?.getAttribute('data-status')).toBe('open');

      // Daemon dies — subsequent polls reject
      client.setReject(true);
      // Advance through the backoff doubling (100ms intervalMs →
      // backoff 200 → 400 → 800 → 1600 ...). 2000ms is enough to fire
      // several failed polls and emit 'error' for session 'a'.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      el = container.querySelector('[data-testid="tile-status-indicator-a"]');
      expect(el?.getAttribute('data-status')).toBe('error');
      expect((el?.getAttribute('style') ?? '').toLowerCase()).toContain('#c54a4a');
    } finally {
      unmount();
    }
  });
});
