// @vitest-environment happy-dom
//
// MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 RED — parent-closure
// status hookup in tile-grid-app.tsx.
//
// Per build-doc §4 Path B WB1 + decisions doc Sub-Q-1=B (gen-5
// orchestrator auto-ack 2026-05-13 per dispatch §2 envelope), this WB
// adds:
//   1. NEW useState<ReadonlyMap<string, TileStatus>> snapshot mirror in
//      tile-grid-app.tsx.
//   2. NEW useEffect that constructs a `createSessionStatusSource` from
//      `props.statusListClient ?? new HttpSessionListClient()` (test seam
//      via the new prop per Sub-Q-4 + production wiring per Sub-Q-4),
//      subscribes (setState on snapshot emit), and disposes on unmount.
//   3. JSX-call-site merge of the snapshot into the `sessions` prop:
//        sessions.map((s) => ({
//          ...s,
//          status: snapshot.get(s.name) ?? s.status ?? 'idle',
//        }))
//      (Sub-Q-3 fallback chain).
//
// The existing `tile-header.tsx:225-230` `<span data-testid="tile-
// status-indicator">` chain (Tile.status → TileHeader.status → data-
// status attribute) is reactive to the merge automatically (Path B).
//
// 3 conditions:
//   01a: Initial render with no snapshot entry yet (pre-first-poll) and
//        an entry with no seeded `status` → indicator's `data-status`
//        reads 'idle' (the `?? 'idle'` final fallback in the merge
//        expression). At HEAD: Tile.status defaults to 'idle' at
//        tile.tsx:145 — so this passes at HEAD AS WELL; it functions as
//        a sanity ratification of the test fixture, not a RED-driver.
//   01b: Fake listClient returns `computed_status='running'` for session
//        'a'. After fake-timer flush, `data-status='open'` (derived via
//        deriveTileStatus → 'running' maps to 'open' TileStatus). RED at
//        HEAD because there is no createSessionStatusSource integration.
//   01c: Fake listClient first returns 'running' (anchor session 'a' in
//        lastStatus), then rejects. Backoff-emitted 'error' for session
//        'a' propagates via the merge → `data-status='error'`. RED at
//        HEAD for the same reason as 01b.
//
// Test seam: NEW optional prop `statusListClient?: StatusListClient` on
// TileGridAppProps. RED state: prop does NOT exist on the type. Probe
// casts via `as Record<string, unknown>` (mirrors the t8sibling-02
// ExtraProps pattern) for TS-clean at both RED and GREEN. After GREEN:
// the prop is declared and consumed in useEffect.
//
// Citation: Sub-Q-1=B + Sub-Q-2=useEffect + Sub-Q-3=fallback chain +
// Sub-Q-4=separate HttpSessionListClient at
// docs/coordination/mb-t-phase-5-tile-header-status-integration-
// decisions-2026-05-13.md §2 (auto-acked 2026-05-13).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fake workstation bridge ─────────────────────────────────────────

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

// ─── Fake StatusListClient (mirrors WB5 integration probe makeClient()) ─

interface StatusEntry {
  readonly name: string;
  readonly state?: string;
  readonly computed_status?: string;
}
interface StatusListResponse {
  readonly sessions: readonly StatusEntry[];
}

function makeFakeClient(): {
  listSessions(): Promise<StatusListResponse>;
  setResponse(r: StatusListResponse): void;
  setReject(yes: boolean): void;
  callCount(): number;
} {
  let response: StatusListResponse = { sessions: [] };
  let reject = false;
  let calls = 0;
  return {
    async listSessions(): Promise<StatusListResponse> {
      calls += 1;
      if (reject) throw new Error('daemon unreachable (stub)');
      return response;
    },
    setResponse(r) {
      response = r;
    },
    setReject(yes) {
      reject = yes;
    },
    callCount() {
      return calls;
    },
  };
}

// Probe-extension prop shape — cast at the test site so the probe is
// TS-clean at both RED (prop absent on TileGridAppProps) and GREEN
// (prop declared). Mirrors the t8sibling-02 probe's ExtraProps pattern.
type ExtraProps = {
  statusListClient?: ReturnType<typeof makeFakeClient>;
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

describe('MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB1 — parent-closure status hookup', () => {
  it("01a: initial render with no snapshot entry → tile-header data-status='idle' (sanity)", async () => {
    const f = makeFixtures();
    const client = makeFakeClient();
    // No setResponse — empty sessions[] → no snapshot emit even after flush.
    const extra: ExtraProps = { statusListClient: client };
    const { container, unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
        {...(extra as Record<string, unknown>)}
      />,
    );
    try {
      // Do NOT advance timers — assert PRE-FIRST-POLL state. The merge
      // expression's `?? 'idle'` final fallback applies.
      const el = container.querySelector(
        '[data-testid="tile-status-indicator"]',
      );
      expect(el).not.toBeNull();
      expect(el?.getAttribute('data-status')).toBe('idle');
    } finally {
      unmount();
    }
  });

  it("01b: source emits 'running' for session 'a' → tile-header data-status='open'", async () => {
    const f = makeFixtures();
    const client = makeFakeClient();
    client.setResponse({
      sessions: [{ name: 'a', computed_status: 'running' }],
    });
    const extra: ExtraProps = { statusListClient: client };
    const { container, unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
        {...(extra as Record<string, unknown>)}
      />,
    );
    try {
      // First poll fires synchronously inside startStatusPoll (via void
      // poll()); we just need to flush the awaited listSessions promise.
      // 50ms is enough for the microtask queue.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      const el = container.querySelector(
        '[data-testid="tile-status-indicator"]',
      );
      expect(el?.getAttribute('data-status')).toBe('open');
    } finally {
      unmount();
    }
  });

  it("01c: daemon-unreachable after prior success → tile-header data-status='error'", async () => {
    const f = makeFixtures();
    const client = makeFakeClient();
    client.setResponse({
      sessions: [{ name: 'a', computed_status: 'running' }],
    });
    const extra: ExtraProps = { statusListClient: client };
    const { container, unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a' }]}
        {...(extra as Record<string, unknown>)}
      />,
    );
    try {
      // First success → snapshot[a]='open', anchored in startStatusPoll's
      // lastStatus map.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(
        container
          .querySelector('[data-testid="tile-status-indicator"]')
          ?.getAttribute('data-status'),
      ).toBe('open');

      // Daemon dies — subsequent polls reject.
      client.setReject(true);
      // Default intervalMs = 3000. Advance past the next scheduled
      // poll so the failed-poll path emits 'error' for previously-seen
      // session 'a'. 5000ms is enough.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      const el = container.querySelector(
        '[data-testid="tile-status-indicator"]',
      );
      expect(el?.getAttribute('data-status')).toBe('error');
    } finally {
      unmount();
    }
  });
});
