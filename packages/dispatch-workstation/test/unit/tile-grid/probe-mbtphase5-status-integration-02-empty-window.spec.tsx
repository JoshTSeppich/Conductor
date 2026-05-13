// @vitest-environment happy-dom
//
// MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB2 — empty-window
// fallback ratification.
//
// Per build-doc §4 Path B WB2: ratifies the Sub-Q-3 fallback chain
// `snapshot.get(s.name) ?? s.status ?? 'idle'` for the empty-snapshot
// case (pre-first-poll OR daemon-down-from-start).
//
// 2 conditions:
//   02a: snapshot is empty Map; entry has no `status` field → indicator
//        data-status='idle' (final `?? 'idle'` fallback applies).
//   02b: snapshot is empty Map; entry has `status: 'open'` seeded →
//        indicator data-status='open' (seeded `s.status` preserved as
//        the middle `?? s.status` fallback applies before the 'idle'
//        default).
//
// Expected outcome at WB1 GREEN anchor (`460fbda`): both 02a + 02b
// PASS — the WB1 merge expression at tile-grid-app.tsx already honors
// the chained fallback. This probe is a RATIFICATION anchor that locks
// the fallback semantics for downstream changes. If either condition
// fails, the WB1 GREEN gets amended in-WB (per build-doc §4 Path B
// WB2: "no new RED commit; bug-fix in-WB").
//
// Technique: do NOT advance fake timers. The createSessionStatusSource
// snapshot starts as an empty Map; setStatusSnapshot is only invoked
// after an actual poll resolves. By skipping timer advance, we lock in
// the empty-Map initial state. (Belt + suspenders: use a fake
// listClient that returns empty sessions[] so even if a poll fires,
// no snapshot entry is set for session 'a'.)
//
// Citation: Sub-Q-3 fallback chain at decisions doc §2 (auto-acked
// 2026-05-13).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import {
  TileGridApp,
  type WorkstationBridgeShape,
} from '../../../src/tile-grid/tile-grid-app.js';
import { makeFakeConsoleBridge } from '../console-t03/fake-console-bridge.js';
import { makeFakeTerminalAdapter } from '../console-t03/fake-terminal-adapter.js';

// ─── Fixtures (parallel to probe-01) ─────────────────────────────────

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

function makeEmptyClient(): {
  listSessions(): Promise<StatusListResponse>;
} {
  return {
    async listSessions(): Promise<StatusListResponse> {
      // Returns empty sessions[] — startStatusPoll will derive nothing
      // and emitIfChanged is never called for session 'a'. Snapshot
      // stays empty.
      return { sessions: [] };
    },
  };
}

type ExtraProps = {
  statusListClient?: ReturnType<typeof makeEmptyClient>;
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

describe('MB-T-PHASE-5-TILE-HEADER-STATUS-INTEGRATION WB2 — empty-window fallback ratification', () => {
  it("02a: empty snapshot + no seeded status → tile-header data-status='idle'", () => {
    const f = makeFixtures();
    const client = makeEmptyClient();
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
      // Do NOT advance timers. Snapshot stays empty.
      const el = container.querySelector(
        '[data-testid="tile-status-indicator"]',
      );
      expect(el).not.toBeNull();
      // Fallback chain: snapshot.get('a') === undefined → s.status ===
      // undefined → 'idle'. The final `?? 'idle'` clause applies.
      expect(el?.getAttribute('data-status')).toBe('idle');
    } finally {
      unmount();
    }
  });

  it("02b: empty snapshot + seeded status='open' → tile-header data-status='open' (seeded preserved)", () => {
    const f = makeFixtures();
    const client = makeEmptyClient();
    const extra: ExtraProps = { statusListClient: client };
    const { container, unmount } = render(
      <TileGridApp
        workstationBridge={f.workstation}
        consoleBridge={f.consoleBridge}
        createTerminal={f.createTerminal}
        initialSessions={[{ name: 'a', status: 'open' }]}
        {...(extra as Record<string, unknown>)}
      />,
    );
    try {
      // Do NOT advance timers. Snapshot stays empty.
      const el = container.querySelector(
        '[data-testid="tile-status-indicator"]',
      );
      expect(el).not.toBeNull();
      // Fallback chain: snapshot.get('a') === undefined → s.status ===
      // 'open' → 'open'. The middle `?? s.status` clause applies; the
      // seeded value wins before the 'idle' default.
      expect(el?.getAttribute('data-status')).toBe('open');
    } finally {
      unmount();
    }
  });
});
