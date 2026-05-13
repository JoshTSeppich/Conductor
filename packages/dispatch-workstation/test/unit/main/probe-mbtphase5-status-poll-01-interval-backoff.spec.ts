// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB2 (red) —
// probe-mbtphase5-status-poll-01-interval-backoff.
//
// Contract spec per ticket body §4 WB2 (commit 832c03b). Module
// `src/main/session-status-source-poll.ts` exports:
//
//   export interface StatusListClient {
//     listSessions(): Promise<{
//       sessions: ReadonlyArray<{
//         name: string;
//         state?: string;
//         computed_status?: string;
//       }>;
//     }>;
//   }
//   export interface PollDeps {
//     readonly listClient: StatusListClient;
//     readonly intervalMs?: number;             // default 3000
//     readonly onStatusChange: (sessionName: string, status: TileStatus) => void;
//   }
//   export interface PollHandle { dispose(): void; }
//   export function startStatusPoll(deps: PollDeps): PollHandle;
//
// 5 conditions:
//   (1) Successful listSessions fires at intervalMs cadence
//       (fake-timer advance → spy.calls.length grows).
//   (2) Per-session status change emits onStatusChange exactly once
//       per actual transition.
//   (3) Duplicate response (same shape) does NOT re-emit (dedup).
//   (4) Consecutive failures → backoff doubles 3→6→12s (cap); first
//       success resets cadence to 3s.
//   (5) dispose() clears interval; subsequent ticks do NOT invoke
//       listSessions.
//
// RED state: session-status-source-poll.ts does NOT exist at HEAD
// post-WB1-GREEN (eeb11f5); dynamic import fails; all 5 assertions
// fail because startStatusPoll is undefined.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { TileStatus } from '../../../src/tile-grid/types.js';

interface StatusEntry {
  readonly name: string;
  readonly state?: string;
  readonly computed_status?: string;
}
interface StatusListResponse {
  readonly sessions: readonly StatusEntry[];
}
interface StatusListClient {
  listSessions(): Promise<StatusListResponse>;
}
interface PollDeps {
  readonly listClient: StatusListClient;
  readonly intervalMs?: number;
  readonly onStatusChange: (sessionName: string, status: TileStatus) => void;
}
interface PollHandle {
  dispose(): void;
}
type StartFn = (deps: PollDeps) => PollHandle;

let startStatusPoll: StartFn | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/main/session-status-source-poll.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    startStatusPoll = (mod as { startStatusPoll?: StartFn }).startStatusPoll;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

// Recording client with mutable response sequence. Each `listSessions()`
// call returns the head of `responses`; the head is consumed (FIFO) so
// later calls observe later state. If responses is exhausted, the last
// response is repeated. `failNext: number` triggers `failNext`
// consecutive failures before resuming successes.
function makeRecordingClient(): {
  client: StatusListClient;
  calls: number;
  setResponses(rs: StatusListResponse[]): void;
  failNext(n: number): void;
} {
  let responses: StatusListResponse[] = [{ sessions: [] }];
  let calls = 0;
  let fails = 0;
  const harness = {
    client: {
      async listSessions(): Promise<StatusListResponse> {
        calls += 1;
        if (fails > 0) {
          fails -= 1;
          throw new Error('daemon unreachable (stub)');
        }
        const head = responses.length > 1 ? responses.shift()! : responses[0];
        return head;
      },
    },
    get calls() {
      return calls;
    },
    setResponses(rs: StatusListResponse[]) {
      responses = rs;
    },
    failNext(n: number) {
      fails = n;
    },
  };
  return harness;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function startOrThrow(deps: PollDeps): PollHandle {
  if (importError) throw new Error(`module import failed: ${importError.message}`);
  if (!startStatusPoll) throw new Error('startStatusPoll is undefined (module not yet implemented)');
  return startStatusPoll(deps);
}

describe('MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB2 — daemon poll seam', () => {
  it('(1) listSessions fires at intervalMs cadence (default 3000ms; explicit 100ms used here)', async () => {
    const harness = makeRecordingClient();
    const handle = startOrThrow({
      listClient: harness.client,
      intervalMs: 100,
      onStatusChange: () => {
        /* no-op */
      },
    });
    try {
      // Advance 350ms → expect ~3-4 calls (initial fire + ticks at 100/200/300)
      await vi.advanceTimersByTimeAsync(350);
      expect(harness.calls).toBeGreaterThanOrEqual(3);
      expect(harness.calls).toBeLessThanOrEqual(5);
    } finally {
      handle.dispose();
    }
  });

  it('(2) per-session status change emits onStatusChange exactly once per transition', async () => {
    const harness = makeRecordingClient();
    harness.setResponses([
      { sessions: [{ name: 'a', state: 'armed', computed_status: 'idle' }] },
      { sessions: [{ name: 'a', state: 'armed', computed_status: 'running' }] },
    ]);
    const emits: Array<[string, TileStatus]> = [];
    const handle = startOrThrow({
      listClient: harness.client,
      intervalMs: 100,
      onStatusChange: (name, status) => emits.push([name, status]),
    });
    try {
      await vi.advanceTimersByTimeAsync(250);
      // Initial poll → 'idle' (computed_status='idle' → TileStatus 'idle')
      // Second poll → 'open' (computed_status='running' → TileStatus 'open')
      const transitions = emits.map(([n, s]) => `${n}:${s}`);
      expect(transitions).toContain('a:idle');
      expect(transitions).toContain('a:open');
    } finally {
      handle.dispose();
    }
  });

  it('(3) duplicate response does NOT re-emit (dedup on stable TileStatus)', async () => {
    const harness = makeRecordingClient();
    harness.setResponses([
      { sessions: [{ name: 'a', computed_status: 'running' }] },
    ]);
    const emits: Array<[string, TileStatus]> = [];
    const handle = startOrThrow({
      listClient: harness.client,
      intervalMs: 100,
      onStatusChange: (name, status) => emits.push([name, status]),
    });
    try {
      await vi.advanceTimersByTimeAsync(550);
      // 5+ polls, all returning same response → exactly 1 emit for 'a'
      const aEmits = emits.filter(([n]) => n === 'a');
      expect(aEmits).toHaveLength(1);
      expect(aEmits[0][1]).toBe<TileStatus>('open');
    } finally {
      handle.dispose();
    }
  });

  it('(4) consecutive failures double backoff (3→6→12 cap); first success resets', async () => {
    // Use the production-default cadence (3000ms) for this probe so the
    // 3→6→12 cap doubling is testable in real ms (with fake timers).
    const harness = makeRecordingClient();
    harness.setResponses([
      { sessions: [{ name: 'a', computed_status: 'running' }] },
    ]);
    harness.failNext(4); // 4 consecutive failures
    const emits: Array<[string, TileStatus]> = [];
    const handle = startOrThrow({
      listClient: harness.client,
      // intervalMs default 3000
      onStatusChange: (name, status) => emits.push([name, status]),
    });
    try {
      // Initial fire (t=0) fails → backoff 6s
      await vi.advanceTimersByTimeAsync(100);
      expect(harness.calls).toBe(1);
      // t=6000 → 2nd attempt fails → backoff 12s
      await vi.advanceTimersByTimeAsync(6000);
      expect(harness.calls).toBe(2);
      // t=18000 → 3rd attempt fails → backoff still 12s (cap)
      await vi.advanceTimersByTimeAsync(12000);
      expect(harness.calls).toBe(3);
      // t=30000 → 4th attempt fails → backoff still 12s
      await vi.advanceTimersByTimeAsync(12000);
      expect(harness.calls).toBe(4);
      // t=42000 → 5th attempt succeeds → cadence resets to 3000
      await vi.advanceTimersByTimeAsync(12000);
      expect(harness.calls).toBe(5);
      // t=45000 → 6th attempt fires at the reset cadence (3000ms after success)
      await vi.advanceTimersByTimeAsync(3000);
      expect(harness.calls).toBe(6);
    } finally {
      handle.dispose();
    }
  });

  it('(5) dispose() stops further listSessions invocations', async () => {
    const harness = makeRecordingClient();
    const handle = startOrThrow({
      listClient: harness.client,
      intervalMs: 100,
      onStatusChange: () => {
        /* no-op */
      },
    });
    await vi.advanceTimersByTimeAsync(250);
    const callsBeforeDispose = harness.calls;
    handle.dispose();
    await vi.advanceTimersByTimeAsync(500);
    expect(harness.calls).toBe(callsBeforeDispose);
  });
});
