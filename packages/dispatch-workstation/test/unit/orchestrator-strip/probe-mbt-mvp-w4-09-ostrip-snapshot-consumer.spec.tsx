// @vitest-environment happy-dom
//
// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB10 — probe-09:
// OrchestratorStrip mount-entry snapshot consumer.
//
// Verifies src/orchestrator-strip/mount.ts:
//   - SlotSession projection from OrchestratorSessionLite.computed_status
//     + state to SlotSessionStatus (starting/running/done/error)
//   - Prop derivation per §6.6 derived-fields: runningCount, queuedCount,
//     done, totalSteps, erroredCount, attached, attachedName
//   - Throughput history accumulation across multiple snapshot emissions
//     (renderer-side rolling history per §6.6)
//   - Mount lifecycle + bridge subscription/dispose mirrors topbar probe-08

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  tryAutoMountOrchestratorStrip,
  deriveOrchestratorStripProps,
  type OrchestratorStateBridgeShape,
} from '../../../src/orchestrator-strip/mount.js';

interface OrchestratorSessionLite {
  readonly name: string;
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
}

interface AttachedBuildMdState {
  readonly name: string;
  readonly path: string;
  readonly steps: number;
  readonly queue: number;
  readonly done: number;
  readonly running: number;
  readonly errored: number;
}

interface OrchestratorStateSnapshot {
  readonly seq: number;
  readonly polledAt: string | null;
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  readonly attached: AttachedBuildMdState | null;
  readonly messages: ReadonlyArray<unknown>;
  readonly paused: boolean;
  readonly daemonReachable: boolean;
}

function makeBoot(): OrchestratorStateSnapshot {
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

interface FakeBridge extends OrchestratorStateBridgeShape {
  emit(snapshot: OrchestratorStateSnapshot): void;
  subscriberCount(): number;
}

function makeFakeBridge(initial: OrchestratorStateSnapshot): FakeBridge {
  let latest = initial;
  const subs = new Set<(s: OrchestratorStateSnapshot) => void>();
  return {
    async getSnapshot(): Promise<OrchestratorStateSnapshot> {
      return latest;
    },
    onUpdate(cb): () => void {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    emit(s) {
      latest = s;
      subs.forEach((cb) => cb(s));
    },
    subscriberCount() {
      return subs.size;
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MB-T-MVP-W4 probe-09 — OrchestratorStrip mount snapshot consumer', () => {
  describe('deriveOrchestratorStripProps (pure-fn §6.6 derived-fields)', () => {
    it('returns sessions=[] + runningCount=0 + attached=false on boot', () => {
      const props = deriveOrchestratorStripProps(makeBoot(), []);
      expect(props.sessions).toEqual([]);
      expect(props.runningCount).toBe(0);
      expect(props.attached).toBe(false);
      expect(props.attachedName).toBeUndefined();
      expect(props.queuedCount).toBeUndefined();
    });

    it('projects sessions to SlotSession[] with status mapping', () => {
      const props = deriveOrchestratorStripProps(
        {
          ...makeBoot(),
          sessions: [
            { name: 's1', computed_status: 'running' },
            { name: 's2', computed_status: 'idle' },
            { name: 's3', computed_status: 'awaiting_review' },
            { name: 's4', state: 'killed' },
            { name: 's5', computed_status: 'stale' },
            { name: 's6', state: 'armed' },
          ],
        },
        [],
      );
      expect(props.sessions).toEqual([
        { id: 's1', name: 's1', status: 'running' },
        { id: 's2', name: 's2', status: 'starting' },
        { id: 's3', name: 's3', status: 'done' },
        { id: 's4', name: 's4', status: 'error' },
        { id: 's5', name: 's5', status: 'error' },
        { id: 's6', name: 's6', status: 'starting' },
      ]);
    });

    it('derives runningCount from computed_status === "running"', () => {
      const props = deriveOrchestratorStripProps(
        {
          ...makeBoot(),
          sessions: [
            { name: 's1', computed_status: 'running' },
            { name: 's2', computed_status: 'running' },
            { name: 's3', computed_status: 'idle' },
          ],
        },
        [],
      );
      expect(props.runningCount).toBe(2);
    });

    it('sets attached counts from snapshot.attached', () => {
      const props = deriveOrchestratorStripProps(
        {
          ...makeBoot(),
          attached: {
            name: 'BUILD.md',
            path: '/repo/BUILD.md',
            steps: 10,
            queue: 4,
            done: 3,
            running: 2,
            errored: 1,
          },
        },
        [],
      );
      expect(props.attached).toBe(true);
      expect(props.attachedName).toBe('BUILD.md');
      expect(props.queuedCount).toBe(4);
      expect(props.done).toBe(3);
      expect(props.totalSteps).toBe(10);
      expect(props.erroredCount).toBe(1);
    });

    it('ratePerMin defaults to 0 with empty history', () => {
      const props = deriveOrchestratorStripProps(makeBoot(), []);
      expect(props.ratePerMin).toBe(0);
      expect(props.etaSeconds).toBeNull();
    });

    it('computes ratePerMin + etaSeconds from non-empty history', () => {
      const snapshot: OrchestratorStateSnapshot = {
        ...makeBoot(),
        attached: {
          name: 'BUILD.md',
          path: '/repo/BUILD.md',
          steps: 100,
          queue: 60,
          done: 30,
          running: 5,
          errored: 0,
        },
      };
      // 10 done in 1 second → 600/min rate; queue=60 → eta = 60/(600/60) = 6s.
      const props = deriveOrchestratorStripProps(snapshot, [
        { t: 0, done: 20 },
        { t: 1000, done: 30 },
      ]);
      expect(props.ratePerMin).toBeCloseTo(600, 0);
      expect(props.etaSeconds).toBeCloseTo(6, 0);
    });
  });

  describe('tryAutoMountOrchestratorStrip lifecycle', () => {
    it('creates body-level overlay div + renders <OrchestratorStrip />', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountOrchestratorStrip({ bridge });
      expect(result.mounted).toBe(true);
      await flushMicrotasks();
      expect(document.getElementById('orchestrator-strip-mount-root')).not.toBeNull();
      expect(document.querySelector('[data-testid="ostrip-root"]')).not.toBeNull();
      if (result.mounted) result.dispose();
    });

    it('re-renders after getSnapshot resolves with derived sessions', async () => {
      const bridge = makeFakeBridge({
        ...makeBoot(),
        sessions: [
          { name: 's1', computed_status: 'running' },
          { name: 's2', computed_status: 'idle' },
        ],
      });
      const result = tryAutoMountOrchestratorStrip({ bridge });
      await flushMicrotasks();
      const runningStat = document.querySelector(
        '[data-testid="ostrip-stat-running"]',
      );
      expect(runningStat?.textContent).toBe('1');
      // sessions[0] mapped to slot-0 running with pulse.
      const slot0 = document.querySelector('[data-testid="ostrip-slot-0"]');
      expect(slot0?.getAttribute('data-status')).toBe('running');
      if (result.mounted) result.dispose();
    });

    it('renders attached title + count pill when attached non-null', async () => {
      const bridge = makeFakeBridge({
        ...makeBoot(),
        attached: {
          name: 'BUILD.md',
          path: '/repo/BUILD.md',
          steps: 8,
          queue: 3,
          done: 2,
          running: 1,
          errored: 0,
        },
      });
      const result = tryAutoMountOrchestratorStrip({ bridge });
      await flushMicrotasks();
      expect(
        document.querySelector('[data-testid="ostrip-title-text"]')?.textContent,
      ).toBe('BUILD.md');
      expect(
        document.querySelector('[data-testid="ostrip-count"]')?.textContent,
      ).toBe('3/8'); // done+running / total
      if (result.mounted) result.dispose();
    });

    it('re-renders on onUpdate emission with new SlotGrid state', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountOrchestratorStrip({ bridge });
      await flushMicrotasks();
      // Initial: all 64 slots empty.
      expect(
        document.querySelector('[data-testid="ostrip-slot-0"]')?.getAttribute('data-status'),
      ).toBe('empty');
      bridge.emit({
        ...makeBoot(),
        seq: 1,
        sessions: [{ name: 's1', computed_status: 'running' }],
      });
      await flushMicrotasks();
      expect(
        document.querySelector('[data-testid="ostrip-slot-0"]')?.getAttribute('data-status'),
      ).toBe('running');
      if (result.mounted) result.dispose();
    });

    it('accumulates throughput history across emissions + computes rate', async () => {
      const bridge = makeFakeBridge(makeBoot());
      let now = 0;
      const result = tryAutoMountOrchestratorStrip({
        bridge,
        nowMs: () => now,
      });
      await flushMicrotasks();
      // First emit with attached + done=10 at t=0
      now = 0;
      bridge.emit({
        ...makeBoot(),
        seq: 1,
        attached: {
          name: 'B.md',
          path: '/B.md',
          steps: 100,
          queue: 60,
          done: 10,
          running: 5,
          errored: 0,
        },
      });
      await flushMicrotasks();
      // Second emit with done=20 at t=1000 (1 sec later → 600/min rate)
      now = 1000;
      bridge.emit({
        ...makeBoot(),
        seq: 2,
        attached: {
          name: 'B.md',
          path: '/B.md',
          steps: 100,
          queue: 60,
          done: 20,
          running: 5,
          errored: 0,
        },
      });
      await flushMicrotasks();
      const rateStat = document.querySelector('[data-testid="ostrip-stat-rate"]');
      expect(rateStat?.textContent).toBe('600.0/min');
      if (result.mounted) result.dispose();
    });

    it('dispose() unmounts + unsubscribes from onUpdate', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountOrchestratorStrip({ bridge });
      await flushMicrotasks();
      expect(bridge.subscriberCount()).toBe(1);
      if (result.mounted) result.dispose();
      expect(bridge.subscriberCount()).toBe(0);
    });

    it('bridge=null path mounts with em-dash render', async () => {
      const result = tryAutoMountOrchestratorStrip({ bridge: null });
      expect(result.mounted).toBe(true);
      await flushMicrotasks();
      expect(document.querySelector('[data-testid="ostrip-root"]')).not.toBeNull();
      // Stat values default to em-dash with empty props.
      expect(
        document.querySelector('[data-testid="ostrip-stat-running"]')?.textContent,
      ).toBe('—');
      if (result.mounted) result.dispose();
    });
  });
});
