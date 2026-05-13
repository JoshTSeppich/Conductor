// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB3 (red) —
// probe-mbtphase5-status-source-01-subscribe-api.
//
// Contract spec per ticket body §4 WB3 (commit 832c03b). Module
// `src/main/session-status-source.ts` exports:
//
//   export interface SessionStatusSourceDeps {
//     readonly listClient: StatusListClient;
//     readonly intervalMs?: number;
//     readonly clock?: () => number;
//   }
//   export interface SessionStatusSource {
//     subscribe(cb: (snapshot: ReadonlyMap<string, TileStatus>) => void): () => void;
//     getSnapshot(): ReadonlyMap<string, TileStatus>;
//     dispose(): void;
//   }
//   export function createSessionStatusSource(deps: SessionStatusSourceDeps): SessionStatusSource;
//
// 4 conditions:
//   (1) createSessionStatusSource returns object with subscribe +
//       getSnapshot + dispose methods (shape check).
//   (2) subscribe(cb) returns unsubscribe; calling it stops further
//       callback invocations (snapshot updates still happen
//       internally — subscriber is just removed).
//   (3) getSnapshot() returns the current ReadonlyMap; starts empty;
//       grows as poll responses derive statuses.
//   (4) dispose() is idempotent (calling twice doesn't throw);
//       post-dispose, subscribe is a no-op (returns no-op unsubscribe);
//       getSnapshot() still works (returns last known).
//
// RED state: session-status-source.ts does NOT exist at HEAD
// post-WB2-GREEN (17aa384); dynamic import fails; all 4 assertions
// fail because createSessionStatusSource is undefined.

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
interface SessionStatusSourceDeps {
  readonly listClient: StatusListClient;
  readonly intervalMs?: number;
}
interface SessionStatusSource {
  subscribe(cb: (snapshot: ReadonlyMap<string, TileStatus>) => void): () => void;
  getSnapshot(): ReadonlyMap<string, TileStatus>;
  dispose(): void;
}
type CreateFn = (deps: SessionStatusSourceDeps) => SessionStatusSource;

let createSessionStatusSource: CreateFn | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/main/session-status-source.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    createSessionStatusSource = (mod as { createSessionStatusSource?: CreateFn })
      .createSessionStatusSource;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function makeClient(responses: StatusListResponse[]): StatusListClient {
  let i = 0;
  return {
    async listSessions(): Promise<StatusListResponse> {
      const head = i < responses.length ? responses[i++] : responses[responses.length - 1];
      return head;
    },
  };
}

function createOrThrow(deps: SessionStatusSourceDeps): SessionStatusSource {
  if (importError) throw new Error(`module import failed: ${importError.message}`);
  if (!createSessionStatusSource) {
    throw new Error('createSessionStatusSource is undefined (module not yet implemented)');
  }
  return createSessionStatusSource(deps);
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB3 — subscribe API facade', () => {
  it('(1) createSessionStatusSource returns object with subscribe/getSnapshot/dispose', () => {
    const source = createOrThrow({
      listClient: makeClient([{ sessions: [] }]),
      intervalMs: 100,
    });
    try {
      expect(typeof source.subscribe).toBe('function');
      expect(typeof source.getSnapshot).toBe('function');
      expect(typeof source.dispose).toBe('function');
    } finally {
      source.dispose();
    }
  });

  it('(2) subscribe(cb) returns unsubscribe; calling it stops further callback invocations', async () => {
    const source = createOrThrow({
      listClient: makeClient([
        { sessions: [{ name: 'a', computed_status: 'running' }] },
        { sessions: [{ name: 'a', computed_status: 'idle' }] },
        { sessions: [{ name: 'a', computed_status: 'stale' }] },
      ]),
      intervalMs: 100,
    });
    try {
      const snapshots: ReadonlyMap<string, TileStatus>[] = [];
      const unsub = source.subscribe((snap) => snapshots.push(new Map(snap)));
      // Let first poll complete
      await vi.advanceTimersByTimeAsync(50);
      const countBefore = snapshots.length;
      unsub();
      // Subsequent polls happen but callback NOT invoked
      await vi.advanceTimersByTimeAsync(300);
      expect(snapshots.length).toBe(countBefore);
      // getSnapshot still reflects updated internal state
      expect(source.getSnapshot().get('a')).toBeDefined();
    } finally {
      source.dispose();
    }
  });

  it('(3) getSnapshot() returns empty Map initially; grows on poll', async () => {
    const source = createOrThrow({
      listClient: makeClient([{ sessions: [{ name: 'a', computed_status: 'running' }] }]),
      intervalMs: 100,
    });
    try {
      // BEFORE the first poll completes, snapshot is empty.
      // (Initial poll is queued via microtask but not yet awaited;
      // getSnapshot called synchronously sees empty Map.)
      expect(source.getSnapshot().size).toBe(0);
      await vi.advanceTimersByTimeAsync(50);
      // After first poll, snapshot has 'a' → 'open' (computed_status='running')
      expect(source.getSnapshot().size).toBe(1);
      expect(source.getSnapshot().get('a')).toBe<TileStatus>('open');
    } finally {
      source.dispose();
    }
  });

  it('(4) dispose() is idempotent; post-dispose subscribe is no-op', async () => {
    const source = createOrThrow({
      listClient: makeClient([{ sessions: [{ name: 'a', computed_status: 'running' }] }]),
      intervalMs: 100,
    });
    await vi.advanceTimersByTimeAsync(50);
    // First dispose
    expect(() => source.dispose()).not.toThrow();
    // Second dispose (idempotent)
    expect(() => source.dispose()).not.toThrow();
    // Post-dispose subscribe returns a no-op unsubscribe; callback never invoked
    const snapshots: ReadonlyMap<string, TileStatus>[] = [];
    const unsub = source.subscribe((snap) => snapshots.push(new Map(snap)));
    expect(typeof unsub).toBe('function');
    await vi.advanceTimersByTimeAsync(300);
    expect(snapshots.length).toBe(0);
    // Unsubscribing the no-op should also not throw
    expect(() => unsub()).not.toThrow();
    // getSnapshot still returns last-known
    expect(source.getSnapshot().get('a')).toBe<TileStatus>('open');
  });
});
