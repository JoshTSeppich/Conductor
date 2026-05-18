// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB8 — probe-07:
// orchestrator-state-ipc controller channels + WB4-A clarifying
// amendment source-text-assert.
//
// Verifies:
//   - registerHandlers calls ipcMain.handle with CHANNEL_GET_SNAPSHOT
//   - the registered handler returns aggregator.getSnapshot()
//   - aggregator.onUpdate emissions fan out via broadcast() with
//     CHANNEL_UPDATE channel + snapshot payload
//   - dispose function returned from registerHandlers tears down the
//     broadcast subscription (subsequent emissions don't broadcast)
//   - WB4-A clarifying amendment text present in WORKSTATION_CONTRACT.md

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHANNEL_GET_SNAPSHOT,
  CHANNEL_UPDATE,
  OrchestratorStateIpcController,
  createDefaultOrchestratorStateIpcController,
  type OrchestratorStateIpcMain,
  type OrchestratorStateBroadcast,
} from '../../../src/main/orchestrator-state-ipc.js';
import type {
  OrchestratorStateAggregator,
} from '../../../src/main/orchestrator-state-aggregator.js';
import type { OrchestratorStateSnapshot } from '../../../src/main/orchestrator-state-types.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const WORKSTATION_CONTRACT_PATH = resolve(REPO_ROOT, 'WORKSTATION_CONTRACT.md');

// ─── Test stubs ────────────────────────────────────────────────────────

interface RecordedHandler {
  channel: string;
  fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown;
}

function makeFakeIpcMain(): {
  ipcMain: OrchestratorStateIpcMain;
  handlers: RecordedHandler[];
} {
  const handlers: RecordedHandler[] = [];
  return {
    ipcMain: {
      handle: (channel, fn) => {
        handlers.push({ channel, fn });
      },
    },
    handlers,
  };
}

interface StubAggregator extends OrchestratorStateAggregator {
  setSnapshot(s: OrchestratorStateSnapshot): void;
  emit(s: OrchestratorStateSnapshot): void;
  subscriberCount(): number;
}

function makeStubAggregator(initial: OrchestratorStateSnapshot): StubAggregator {
  let latest = initial;
  const subscribers = new Set<(s: OrchestratorStateSnapshot) => void>();
  return {
    getSnapshot(): OrchestratorStateSnapshot {
      return latest;
    },
    start(): void {},
    stop(): void {},
    onUpdate(cb): () => void {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    setSnapshot(s) {
      latest = s;
    },
    emit(s) {
      latest = s;
      subscribers.forEach((cb) => cb(s));
    },
    subscriberCount() {
      return subscribers.size;
    },
  };
}

function makeBootSnapshot(): OrchestratorStateSnapshot {
  return {
    seq: 0,
    polledAt: null,
    sessions: [],
    attached: null,
    messages: [],
    paused: false,
    daemonReachable: false,
  };
}

describe('MB-T-MVP-W4 probe-07 — IPC controller channels', () => {
  describe('Channel #8 — orchestrator-state:get-snapshot', () => {
    it('registerHandlers calls ipcMain.handle for the get-snapshot channel', () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast: OrchestratorStateBroadcast = vi.fn();
      const { ipcMain, handlers } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      controller.registerHandlers(ipcMain);
      expect(handlers).toHaveLength(1);
      expect(handlers[0]!.channel).toBe(CHANNEL_GET_SNAPSHOT);
      expect(handlers[0]!.channel).toBe('orchestrator-state:get-snapshot');
    });

    it('registered handler returns aggregator.getSnapshot()', async () => {
      const initial = makeBootSnapshot();
      const aggregator = makeStubAggregator(initial);
      const broadcast: OrchestratorStateBroadcast = vi.fn();
      const { ipcMain, handlers } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      controller.registerHandlers(ipcMain);
      const result = await handlers[0]!.fn({});
      expect(result).toEqual(initial);
    });

    it('handler reflects subsequent aggregator state via getSnapshot', async () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast: OrchestratorStateBroadcast = vi.fn();
      const { ipcMain, handlers } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      controller.registerHandlers(ipcMain);
      const updated: OrchestratorStateSnapshot = {
        seq: 5,
        polledAt: '2026-05-18T17:00:00.000Z',
        sessions: [{ name: 's1', computed_status: 'running' }],
        attached: null,
        messages: [],
        paused: false,
        daemonReachable: true,
      };
      aggregator.setSnapshot(updated);
      const result = await handlers[0]!.fn({});
      expect(result).toEqual(updated);
    });
  });

  describe('Channel #9 — orchestrator-state:update', () => {
    it('aggregator emission fans out to broadcast with update channel + snapshot', () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast = vi.fn() as OrchestratorStateBroadcast & ReturnType<typeof vi.fn>;
      const { ipcMain } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      controller.registerHandlers(ipcMain);
      const snapshot: OrchestratorStateSnapshot = {
        seq: 1,
        polledAt: '2026-05-18T17:00:00.000Z',
        sessions: [{ name: 's1' }],
        attached: null,
        messages: [],
        paused: false,
        daemonReachable: true,
      };
      aggregator.emit(snapshot);
      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(broadcast).toHaveBeenCalledWith(CHANNEL_UPDATE, snapshot);
      expect(broadcast).toHaveBeenCalledWith(
        'orchestrator-state:update',
        snapshot,
      );
    });

    it('multiple emissions fan out one broadcast each', () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast = vi.fn() as OrchestratorStateBroadcast & ReturnType<typeof vi.fn>;
      const { ipcMain } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      controller.registerHandlers(ipcMain);
      const s1: OrchestratorStateSnapshot = { ...makeBootSnapshot(), seq: 1 };
      const s2: OrchestratorStateSnapshot = { ...makeBootSnapshot(), seq: 2 };
      const s3: OrchestratorStateSnapshot = { ...makeBootSnapshot(), seq: 3 };
      aggregator.emit(s1);
      aggregator.emit(s2);
      aggregator.emit(s3);
      expect(broadcast).toHaveBeenCalledTimes(3);
      expect(broadcast.mock.calls[0]).toEqual([CHANNEL_UPDATE, s1]);
      expect(broadcast.mock.calls[1]).toEqual([CHANNEL_UPDATE, s2]);
      expect(broadcast.mock.calls[2]).toEqual([CHANNEL_UPDATE, s3]);
    });

    it('dispose function tears down broadcast subscription', () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast = vi.fn() as OrchestratorStateBroadcast & ReturnType<typeof vi.fn>;
      const { ipcMain } = makeFakeIpcMain();
      const controller = createDefaultOrchestratorStateIpcController({
        aggregator,
        broadcast,
      });
      const dispose = controller.registerHandlers(ipcMain);
      expect(aggregator.subscriberCount()).toBe(1);
      aggregator.emit({ ...makeBootSnapshot(), seq: 1 });
      expect(broadcast).toHaveBeenCalledTimes(1);
      dispose();
      expect(aggregator.subscriberCount()).toBe(0);
      aggregator.emit({ ...makeBootSnapshot(), seq: 2 });
      expect(broadcast).toHaveBeenCalledTimes(1);
    });

    it('CHANNEL constants match WORKSTATION_CONTRACT.md §6.6 frozen names', () => {
      expect(CHANNEL_GET_SNAPSHOT).toBe('orchestrator-state:get-snapshot');
      expect(CHANNEL_UPDATE).toBe('orchestrator-state:update');
    });

    it('OrchestratorStateIpcController class accepts deps + exposes registerHandlers', () => {
      const aggregator = makeStubAggregator(makeBootSnapshot());
      const broadcast: OrchestratorStateBroadcast = vi.fn();
      const c = new OrchestratorStateIpcController({ aggregator, broadcast });
      expect(typeof c.registerHandlers).toBe('function');
      const { ipcMain, handlers } = makeFakeIpcMain();
      const dispose = c.registerHandlers(ipcMain);
      expect(handlers).toHaveLength(1);
      expect(typeof dispose).toBe('function');
    });
  });

  describe('WB4-A clarifying amendment — WORKSTATION_CONTRACT.md polledAt JSDoc', () => {
    const contract = readFileSync(WORKSTATION_CONTRACT_PATH, 'utf8');

    it('polledAt type-block comment carries the WB4-A clarifying text', () => {
      expect(contract).toContain(
        'Wall-clock ISO of last successful poll that produced a state change (dedup-coupled per aggregator emission semantics; null until first state-change emission).',
      );
    });

    it('original under-specified polledAt comment is removed', () => {
      // The exact original comment text — verify replacement (and that
      // both versions are not present simultaneously).
      const originalText =
        'Wall-clock ISO of last successful poll; null until first poll completes.';
      expect(contract).not.toContain(originalText);
    });

    it('polledAt field shape unchanged (string | null)', () => {
      expect(contract).toMatch(/readonly polledAt: string \| null;/);
    });
  });
});
