// @vitest-environment happy-dom
//
// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB10 — probe-08:
// Topbar mount-entry snapshot consumer.
//
// Verifies src/topbar/mount.ts:
//   - tryAutoMountTopbar creates body-level overlay div + renders <Topbar />
//   - Initial render with em-dash placeholders (no snapshot yet)
//   - After getSnapshot resolves, re-renders with derived paneCount/
//     runningCount/buildMdAttached/queue/done per §6.6 derived-fields
//   - After onUpdate emission, re-renders with new derived props
//   - dispose() unmounts + unsubscribes
//   - bridge=null (preload unavailable) keeps em-dash render

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  tryAutoMountTopbar,
  deriveTopbarProps,
  type OrchestratorStateBridgeShape,
} from '../../../src/topbar/mount.js';

const EM_DASH = '—';

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
  setNext(snapshot: OrchestratorStateSnapshot): void;
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
    setNext(s) {
      latest = s;
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

describe('MB-T-MVP-W4 probe-08 — Topbar mount snapshot consumer', () => {
  describe('deriveTopbarProps (pure-fn §6.6 derived-fields)', () => {
    it('returns paneCount=0 + runningCount=0 + buildMdAttached=false on boot', () => {
      const props = deriveTopbarProps(makeBoot());
      expect(props.paneCount).toBe(0);
      expect(props.runningCount).toBe(0);
      expect(props.buildMdAttached).toBe(false);
      expect(props.buildMdQueue).toBeUndefined();
      expect(props.buildMdDone).toBeUndefined();
    });

    it('derives paneCount from sessions.length', () => {
      const props = deriveTopbarProps({
        ...makeBoot(),
        sessions: [
          { name: 's1' },
          { name: 's2' },
          { name: 's3' },
        ],
      });
      expect(props.paneCount).toBe(3);
    });

    it('derives runningCount from sessions filtered to computed_status running', () => {
      const props = deriveTopbarProps({
        ...makeBoot(),
        sessions: [
          { name: 's1', computed_status: 'running' },
          { name: 's2', computed_status: 'idle' },
          { name: 's3', computed_status: 'running' },
        ],
      });
      expect(props.runningCount).toBe(2);
    });

    it('sets buildMdAttached + queue + done when attached non-null', () => {
      const props = deriveTopbarProps({
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
      });
      expect(props.buildMdAttached).toBe(true);
      expect(props.buildMdQueue).toBe(4);
      expect(props.buildMdDone).toBe(3);
    });

    it('omits envLabel + budget* (Tier-2 followup territory)', () => {
      const props = deriveTopbarProps(makeBoot());
      expect(props.envLabel).toBeUndefined();
      expect(props.budgetUsedDollars).toBeUndefined();
      expect(props.budgetTotalDollars).toBeUndefined();
    });
  });

  describe('tryAutoMountTopbar lifecycle', () => {
    it('creates body-level overlay div + renders <Topbar /> initially', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountTopbar({ bridge });
      expect(result.mounted).toBe(true);
      await flushMicrotasks();
      const root = document.getElementById('topbar-mount-root');
      expect(root).not.toBeNull();
      expect(document.querySelector('[data-testid="topbar-root"]')).not.toBeNull();
      if (result.mounted) result.dispose();
    });

    it('initial render shows em-dash placeholders (pre-snapshot)', async () => {
      const bridge = makeFakeBridge(makeBoot());
      // Pretend getSnapshot is slow — don't resolve yet; check initial DOM.
      const slowBridge: OrchestratorStateBridgeShape = {
        getSnapshot: () => new Promise(() => {}),
        onUpdate: bridge.onUpdate.bind(bridge),
      };
      const result = tryAutoMountTopbar({ bridge: slowBridge });
      await flushMicrotasks();
      // The initial render uses Topbar with no props → em-dash for everything.
      const paneCount = document.querySelector('[data-testid="topbar-pane-count"]');
      expect(paneCount?.textContent).toBe(EM_DASH);
      if (result.mounted) result.dispose();
    });

    it('re-renders after getSnapshot resolves with derived props', async () => {
      const bridge = makeFakeBridge({
        ...makeBoot(),
        sessions: [{ name: 's1', computed_status: 'running' }],
      });
      const result = tryAutoMountTopbar({ bridge });
      await flushMicrotasks();
      const paneCount = document.querySelector('[data-testid="topbar-pane-count"]');
      const runningCount = document.querySelector(
        '[data-testid="topbar-running-count"]',
      );
      expect(paneCount?.textContent).toBe('1 pane');
      expect(runningCount?.textContent).toBe('1 running');
      if (result.mounted) result.dispose();
    });

    it('re-renders on onUpdate emission with new derived props', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountTopbar({ bridge });
      await flushMicrotasks();
      expect(document.querySelector('[data-testid="topbar-pane-count"]')?.textContent)
        .toBe('0 panes');
      bridge.emit({
        ...makeBoot(),
        seq: 1,
        sessions: [
          { name: 's1', computed_status: 'running' },
          { name: 's2', computed_status: 'idle' },
        ],
      });
      await flushMicrotasks();
      expect(document.querySelector('[data-testid="topbar-pane-count"]')?.textContent)
        .toBe('2 panes');
      expect(document.querySelector('[data-testid="topbar-running-count"]')?.textContent)
        .toBe('1 running');
      if (result.mounted) result.dispose();
    });

    it('renders queue:N · done:M block when attached non-null', async () => {
      const bridge = makeFakeBridge({
        ...makeBoot(),
        attached: {
          name: 'BUILD.md',
          path: '/repo/BUILD.md',
          steps: 5,
          queue: 2,
          done: 1,
          running: 1,
          errored: 1,
        },
      });
      const result = tryAutoMountTopbar({ bridge });
      await flushMicrotasks();
      const queueDone = document.querySelector('[data-testid="topbar-queue-done"]');
      expect(queueDone?.textContent).toBe('queue: 2 · done: 1');
      if (result.mounted) result.dispose();
    });

    it('dispose() unmounts root + unsubscribes from onUpdate', async () => {
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountTopbar({ bridge });
      await flushMicrotasks();
      expect(bridge.subscriberCount()).toBe(1);
      if (result.mounted) result.dispose();
      expect(bridge.subscriberCount()).toBe(0);
    });

    it('bridge=null path mounts with em-dash render + dispose works', async () => {
      const result = tryAutoMountTopbar({ bridge: null });
      expect(result.mounted).toBe(true);
      await flushMicrotasks();
      const paneCount = document.querySelector('[data-testid="topbar-pane-count"]');
      expect(paneCount?.textContent).toBe(EM_DASH);
      if (result.mounted) result.dispose();
    });

    it('reuses existing root element when provided via rootElementId', async () => {
      const preCreated = document.createElement('div');
      preCreated.id = 'test-custom-root';
      document.body.appendChild(preCreated);
      const bridge = makeFakeBridge(makeBoot());
      const result = tryAutoMountTopbar({
        bridge,
        rootElementId: 'test-custom-root',
      });
      await flushMicrotasks();
      expect(document.querySelectorAll('#test-custom-root').length).toBe(1);
      // No additional topbar-mount-root created.
      expect(document.getElementById('topbar-mount-root')).toBeNull();
      if (result.mounted) result.dispose();
    });
  });
});
