// @vitest-environment happy-dom
//
// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB11 — probe-10:
// conductor-chat mount-entry snapshot consumer.
//
// Verifies the orchestratorStateBridge-backed ConductorChatBridge
// (replacement of Ticket A's bridge=null stub):
//   (1) mapOrchestratorMessageToConductorVariant — Frame B dispatch
//       degradation + 1:1 mapping for other roles
//   (2) mapSnapshotToChatState — §6.6 derived-fields projection of
//       OrchestratorStateSnapshot → ConductorChatState
//   (3) createConductorChatBridgeFromOrchestratorState — bridge
//       factory wires getInitialState + onStateChange + stub actions
//   (4) Auto-mount via window.orchestratorStateBridge integration

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import {
  mapOrchestratorMessageToConductorVariant,
  mapSnapshotToChatState,
  createConductorChatBridgeFromOrchestratorState,
  type OrchestratorStateBridgeShape,
} from '../../../src/conductor-chat/mount-entry.js';

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

interface OrchestratorMessage {
  readonly role: 'user' | 'assistant' | 'dispatch' | 'system' | 'typing';
  readonly text?: string;
  readonly running?: number;
  readonly id?: string;
}

interface OrchestratorStateSnapshot {
  readonly seq: number;
  readonly polledAt: string | null;
  readonly sessions: ReadonlyArray<OrchestratorSessionLite>;
  readonly attached: AttachedBuildMdState | null;
  readonly messages: ReadonlyArray<OrchestratorMessage>;
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
  vi.resetModules();
  document.body.innerHTML = '';
  delete (window as unknown as { orchestratorStateBridge?: unknown })
    .orchestratorStateBridge;
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as unknown as { orchestratorStateBridge?: unknown })
    .orchestratorStateBridge;
});

describe('MB-T-MVP-W4 probe-10 — conductor-chat snapshot consumer', () => {
  describe('(1) mapOrchestratorMessageToConductorVariant — role mappings', () => {
    it('user role passthrough with id', () => {
      const v = mapOrchestratorMessageToConductorVariant({
        role: 'user',
        text: 'hello',
        id: 'm1',
      });
      expect(v).toEqual({ role: 'user', text: 'hello', id: 'm1' });
    });

    it('user role with missing text → text=""', () => {
      const v = mapOrchestratorMessageToConductorVariant({ role: 'user' });
      expect(v).toEqual({ role: 'user', text: '' });
    });

    it('assistant role passthrough', () => {
      const v = mapOrchestratorMessageToConductorVariant({
        role: 'assistant',
        text: 'ready',
      });
      expect(v).toEqual({ role: 'assistant', text: 'ready' });
    });

    it('system role passthrough', () => {
      const v = mapOrchestratorMessageToConductorVariant({
        role: 'system',
        text: 'boot complete',
      });
      expect(v).toEqual({ role: 'system', text: 'boot complete' });
    });

    it('typing role passthrough with running fallback', () => {
      const v1 = mapOrchestratorMessageToConductorVariant({
        role: 'typing',
        running: 3,
      });
      expect(v1).toEqual({ role: 'typing', running: 3 });
      const v2 = mapOrchestratorMessageToConductorVariant({ role: 'typing' });
      expect(v2).toEqual({ role: 'typing', running: 0 });
    });

    it('dispatch role DEGRADES to system variant (Frame B per WB11 disposition)', () => {
      const v = mapOrchestratorMessageToConductorVariant({
        role: 'dispatch',
        text: 'dispatch: step 3/10 · target s1 · task build-frontend',
        id: 'd1',
      });
      // Frame B: dispatch → system; text passed through verbatim so
      // operator-visible narration carries the format Ticket C
      // narration appender will write.
      expect(v).toEqual({
        role: 'system',
        text: 'dispatch: step 3/10 · target s1 · task build-frontend',
        id: 'd1',
      });
    });

    it('dispatch role with empty text degrades to system with empty text', () => {
      const v = mapOrchestratorMessageToConductorVariant({ role: 'dispatch' });
      expect(v).toEqual({ role: 'system', text: '' });
    });
  });

  describe('(2) mapSnapshotToChatState — full state projection', () => {
    it('boot snapshot → empty messages + null attached + 0 counts', () => {
      const state = mapSnapshotToChatState(makeBoot());
      expect(state).toEqual({
        messages: [],
        attached: null,
        queue: [],
        running: 0,
        total: 0,
        paused: false,
      });
    });

    it('paused passthrough from snapshot.paused', () => {
      const state = mapSnapshotToChatState({ ...makeBoot(), paused: true });
      expect(state.paused).toBe(true);
    });

    it('attached → projection { name, steps } from snapshot.attached', () => {
      const state = mapSnapshotToChatState({
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
      expect(state.attached).toEqual({ name: 'BUILD.md', steps: 10 });
    });

    it('queue.length matches attached.queue (synthesized array)', () => {
      const state = mapSnapshotToChatState({
        ...makeBoot(),
        attached: {
          name: 'b',
          path: '/b',
          steps: 10,
          queue: 7,
          done: 0,
          running: 0,
          errored: 0,
        },
      });
      expect(state.queue.length).toBe(7);
    });

    it('queue is empty when attached null', () => {
      const state = mapSnapshotToChatState(makeBoot());
      expect(state.queue).toEqual([]);
    });

    it('total = attached.steps (0 when not attached)', () => {
      const stateA = mapSnapshotToChatState({
        ...makeBoot(),
        attached: {
          name: 'b',
          path: '/b',
          steps: 12,
          queue: 0,
          done: 0,
          running: 0,
          errored: 0,
        },
      });
      expect(stateA.total).toBe(12);
      const stateB = mapSnapshotToChatState(makeBoot());
      expect(stateB.total).toBe(0);
    });

    it('running prefers attached.running over sessionRunning when attached', () => {
      const state = mapSnapshotToChatState({
        ...makeBoot(),
        sessions: [
          { name: 's1', computed_status: 'running' },
          { name: 's2', computed_status: 'running' },
        ],
        attached: {
          name: 'b',
          path: '/b',
          steps: 5,
          queue: 0,
          done: 0,
          running: 3,
          errored: 0,
        },
      });
      // attached.running=3 wins over sessionRunning=2.
      expect(state.running).toBe(3);
    });

    it('running falls back to sessionRunning when not attached', () => {
      const state = mapSnapshotToChatState({
        ...makeBoot(),
        sessions: [
          { name: 's1', computed_status: 'running' },
          { name: 's2', computed_status: 'idle' },
          { name: 's3', computed_status: 'running' },
        ],
      });
      expect(state.running).toBe(2);
    });

    it('messages array mapped via per-element variant mapper', () => {
      const state = mapSnapshotToChatState({
        ...makeBoot(),
        messages: [
          { role: 'system', text: 's1' },
          { role: 'dispatch', text: 'dispatch: step 1/2 · target t · task k' },
          { role: 'typing', running: 1 },
        ],
      });
      expect(state.messages).toEqual([
        { role: 'system', text: 's1' },
        {
          role: 'system',
          text: 'dispatch: step 1/2 · target t · task k',
        },
        { role: 'typing', running: 1 },
      ]);
    });
  });

  describe('(3) createConductorChatBridgeFromOrchestratorState — factory', () => {
    it('getInitialState returns sync placeholder (canonical intro)', () => {
      const orchestratorBridge = makeFakeBridge(makeBoot());
      const bridge = createConductorChatBridgeFromOrchestratorState(
        orchestratorBridge,
      );
      const initial = bridge.getInitialState!();
      expect(initial.messages).toHaveLength(1);
      expect(initial.messages[0]!.role).toBe('assistant');
      expect(initial.attached).toBeNull();
      expect(initial.running).toBe(0);
    });

    it('onStateChange kicks off async getSnapshot + fires cb', async () => {
      const orchestratorBridge = makeFakeBridge({
        ...makeBoot(),
        sessions: [{ name: 's1', computed_status: 'running' }],
      });
      const bridge = createConductorChatBridgeFromOrchestratorState(
        orchestratorBridge,
      );
      const cb = vi.fn();
      bridge.onStateChange!(cb);
      await flushMicrotasks();
      expect(cb).toHaveBeenCalled();
      const firstState = cb.mock.calls[0]![0] as { running: number };
      expect(firstState.running).toBe(1);
    });

    it('onStateChange subscribes to onUpdate; emissions trigger cb with mapped state', async () => {
      const orchestratorBridge = makeFakeBridge(makeBoot());
      const bridge = createConductorChatBridgeFromOrchestratorState(
        orchestratorBridge,
      );
      const cb = vi.fn();
      bridge.onStateChange!(cb);
      await flushMicrotasks();
      const callsBefore = cb.mock.calls.length;
      orchestratorBridge.emit({
        ...makeBoot(),
        seq: 1,
        paused: true,
        attached: {
          name: 'B.md',
          path: '/B.md',
          steps: 5,
          queue: 2,
          done: 1,
          running: 1,
          errored: 0,
        },
      });
      expect(cb.mock.calls.length).toBeGreaterThan(callsBefore);
      const lastCall = cb.mock.calls[cb.mock.calls.length - 1]![0] as {
        paused: boolean;
        total: number;
        running: number;
      };
      expect(lastCall.paused).toBe(true);
      expect(lastCall.total).toBe(5);
      expect(lastCall.running).toBe(1);
    });

    it('onStateChange returns unsubscribe function that tears down', async () => {
      const orchestratorBridge = makeFakeBridge(makeBoot());
      const bridge = createConductorChatBridgeFromOrchestratorState(
        orchestratorBridge,
      );
      const cb = vi.fn();
      const unsub = bridge.onStateChange!(cb);
      await flushMicrotasks();
      expect(orchestratorBridge.subscriberCount()).toBe(1);
      unsub();
      expect(orchestratorBridge.subscriberCount()).toBe(0);
      // Subsequent emit does not fire cb.
      const callsBefore = cb.mock.calls.length;
      orchestratorBridge.emit({ ...makeBoot(), seq: 2 });
      expect(cb.mock.calls.length).toBe(callsBefore);
    });

    it('send/attach/detach/dispatchNext/togglePause/cancel are stub no-ops', () => {
      const orchestratorBridge = makeFakeBridge(makeBoot());
      const bridge = createConductorChatBridgeFromOrchestratorState(
        orchestratorBridge,
      );
      // No exceptions; no observable effects.
      expect(() => bridge.send!('hello')).not.toThrow();
      expect(() => bridge.attach!()).not.toThrow();
      expect(() => bridge.detach!()).not.toThrow();
      expect(() => bridge.dispatchNext!()).not.toThrow();
      expect(() => bridge.togglePause!()).not.toThrow();
      expect(() => bridge.cancel!()).not.toThrow();
      // None of those triggered an emit or state change.
      expect(orchestratorBridge.subscriberCount()).toBe(0);
    });
  });

  describe('(4) auto-mount via window.orchestratorStateBridge integration', () => {
    function setupShellRoot(): HTMLDivElement {
      const chatRegion = document.createElement('div');
      chatRegion.id = 'chat-region';
      const root = document.createElement('div');
      root.id = 'root';
      chatRegion.appendChild(root);
      document.body.appendChild(chatRegion);
      return root;
    }

    it('mounts conductor-chat into #root using orchestratorStateBridge from window', async () => {
      const root = setupShellRoot();
      const bridge = makeFakeBridge({
        ...makeBoot(),
        sessions: [{ name: 's1', computed_status: 'running' }],
        attached: {
          name: 'BUILD.md',
          path: '/repo/BUILD.md',
          steps: 8,
          queue: 3,
          done: 2,
          running: 2,
          errored: 0,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).orchestratorStateBridge = bridge;

      await import('../../../src/conductor-chat/mount-entry.js');
      await flushMicrotasks();

      // Conductor surface mounted into #root.
      expect(
        root.querySelector('[data-testid="conductor-chat-root"]'),
      ).not.toBeNull();
      // No body-level fallback root.
      expect(document.getElementById('conductor-chat-mount-root')).toBeNull();
      // After async getSnapshot resolves, the bridge subscription is live.
      expect(bridge.subscriberCount()).toBe(1);
    });

    it('falls back to bridge=null when window.orchestratorStateBridge absent (Ticket A render-only)', async () => {
      const root = setupShellRoot();
      // No bridge on window.
      await import('../../../src/conductor-chat/mount-entry.js');
      await flushMicrotasks();
      // Still mounts the surface with DEFAULT_IDLE_STATE rendering.
      expect(
        root.querySelector('[data-testid="conductor-chat-root"]'),
      ).not.toBeNull();
      // The default idle assistant intro bubble is rendered.
      const thread = root.querySelector('[data-testid="conductor-chat-thread"]');
      expect(thread?.textContent).toContain('Conductor ready');
    });
  });
});
