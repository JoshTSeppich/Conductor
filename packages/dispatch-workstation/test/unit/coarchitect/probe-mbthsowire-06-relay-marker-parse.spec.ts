// MB-T-HSO-WIRE WB6 (red) — pty-stream-relay marker-parse observer +
// dispatchActionVariant caller contract probe.
//
// Asserts the 5 conditions per ticket §4 WB6 (line 239):
//   (1) Observer subscribes to broadcaster fan-out (IConsoleBroadcaster);
//       chunks from sessions other than `__orchestrator_active` are ignored
//       (filtering condition mirrors pty-stream-relay.ts:47-48).
//   (2) Chunks pass through a Pattern B accumulator (WB1 spike binding,
//       commit 3c9629b ADR §V): per-session string buffer; on each chunk,
//       parseActionMarker is called against the buffer; on match, the
//       parsed block is STRIPPED (up to and including `[/ACTION]`) and
//       the parser is re-invoked to consume any subsequent markers in
//       the same burst (WB1 spike Concern (i): multi-marker-in-buffer).
//   (3) Valid markers invoke `dispatchActionVariant(parsed, dispatchDeps)`
//       where `parsed` is the ParsedActionMarker returned by the parser
//       and `dispatchDeps` is the router's injected ActionVariantDispatchDeps.
//   (4) Malformed markers (unknown action type, missing required fields)
//       result in `dispatchActionVariant` returning `kind:'error'`; the
//       router MUST invoke `deps.onError` with the error message (no
//       silent drop — Q4 acceptance).
//   (5) Approval-policy interception placeholder. Per action-variant-ipc.ts:
//       :264-266, dispatchActionVariant consumes `deps.resolveApproval`
//       internally BEFORE firing the variant — the router's responsibility
//       is to construct and forward the dispatchDeps surface (including
//       resolveApproval, which is the placeholder for WB7 and the real
//       MB-T13 shim for WB9 per `MB-F-T13-SETTINGS-DEFAULT-POLICY-INTEGRATION`).
//       The router does NOT author a separate gate layer.
//
// WB1 spike binding (3c9629b ADR §V): WB7 GREEN MUST implement Pattern B
// + per-session buffering + strip-and-re-parse. Buffer-size cap omitted
// (MODELED — DEFER per ADR).
//
// Architecture choice (Choice X extend-relay vs Choice Y sibling-router)
// operator-arbitrated at HALT-WB7-PRE-COMMIT. This probe assumes Choice Y
// (`src/main/action-marker-router.ts` new module) per WB1 ADR §V advisory
// + codebase separation-of-concerns convention (tile-token-scraper.ts,
// swarm-state-writer.ts, peer-summary-harvester.ts all separate modules).
// If operator selects Choice X at HALT-WB7-PRE-COMMIT, the import path on
// line ~70 below is renamed to `../../src/main/pty-stream-relay.js` and
// the factory symbol either re-exported or renamed. All behavioral
// assertions below are architecture-agnostic.
//
// RED state today: `src/main/action-marker-router.ts` does not exist;
// `await import(...)` fails; `registerActionMarkerRouter` remains
// undefined; the 7 behavioral `it` blocks all fail at the first
// `expect(registerActionMarkerRouter).toBeDefined()` guard.
// WB7 GREEN flips RED → GREEN.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { ParsedActionMarker } from '../../../src/coarchitect/chat-content-markers.js';
import type {
  ActionVariantDispatchDeps,
  ActionVariantDispatchResult,
} from '../../../src/main/action-variant-ipc.js';

// ─────────────────────────────────────────────────────────────────────────────
// Structural deps the router consumes — mirrors pty-stream-relay's
// IConsoleBroadcaster shape (testable without Electron imports).
// ─────────────────────────────────────────────────────────────────────────────

type IConsoleBroadcaster = {
  addStdoutObserver: (
    fn: (sessionName: string, chunk: string) => void,
  ) => () => void;
};

type DispatchFn = (
  parsed: ParsedActionMarker,
  deps: ActionVariantDispatchDeps,
) => Promise<ActionVariantDispatchResult>;

type ActionMarkerRouterDeps = {
  broadcaster: IConsoleBroadcaster;
  dispatch: DispatchFn;
  dispatchDeps: ActionVariantDispatchDeps;
  onError: (message: string) => void;
};

type RegisterActionMarkerRouter = (deps: ActionMarkerRouterDeps) => () => void;

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic import — RED state preserves clear "factory undefined" failure
// messages across all 7 behavioral tests rather than a single hard import-
// time crash for the whole spec file.
// ─────────────────────────────────────────────────────────────────────────────

let registerActionMarkerRouter: RegisterActionMarkerRouter | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const mod = await import('../../../src/main/action-marker-router.js');
    registerActionMarkerRouter = (
      mod as { registerActionMarkerRouter?: RegisterActionMarkerRouter }
    ).registerActionMarkerRouter;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — fresh stubs per test to isolate observer state.
// ─────────────────────────────────────────────────────────────────────────────

function makeStubBroadcaster(): {
  broadcaster: IConsoleBroadcaster;
  fire: (sessionName: string, chunk: string) => void;
} {
  const observers: Array<(s: string, c: string) => void> = [];
  return {
    broadcaster: {
      addStdoutObserver: vi.fn((fn: (s: string, c: string) => void) => {
        observers.push(fn);
        return () => {
          const i = observers.indexOf(fn);
          if (i >= 0) observers.splice(i, 1);
        };
      }),
    },
    fire(sessionName, chunk) {
      for (const obs of [...observers]) obs(sessionName, chunk);
    },
  };
}

function makeStubDispatch(): ReturnType<typeof vi.fn> {
  return vi.fn(async (parsed: ParsedActionMarker, _deps: ActionVariantDispatchDeps) => {
    return {
      kind: 'fired' as const,
      actionType: parsed.actionType as ActionVariantDispatchResult extends { actionType: infer T }
        ? T
        : never,
      sessionName: parsed.fields['sessionName'] ?? 'unknown',
      firedAt: new Date().toISOString(),
    } as ActionVariantDispatchResult;
  });
}

function makeStubDispatchDeps(): ActionVariantDispatchDeps {
  return {
    resolveApproval: vi.fn(async () => ({
      approvalRequired: false,
      reason: 'wb7-placeholder',
    })),
    fireSendPrompt: vi.fn(async () => undefined),
    fireSpawn: vi.fn(async () => ({ sessionName: 'stub' })),
    fireKill: vi.fn(async () => undefined),
    firePullHandoff: vi.fn(async () => ({
      content: '',
      written_at: '',
      archived_to: '',
    })),
    fireAssignTask: vi.fn(async () => ({ intent_id: 'stub' })),
  };
}

const KILL_FIXTURE = [
  '[ACTION:kill-session]',
  'sessionName: sess-stale',
  'rationale: idle 30m',
  '[/ACTION]',
].join('\n');

const SEND_PROMPT_FIXTURE = [
  '[ACTION:send-prompt-to-session]',
  'sessionName: sess-b',
  'prompt: hello peer',
  'rationale: WB-handoff',
  '[/ACTION]',
].join('\n');

const ASSIGN_TASK_FIXTURE = [
  '[ACTION:assign-task]',
  'sessionName: sess-z',
  'ticketScope: MB-T99',
  'rationale: scoped',
  '[/ACTION]',
].join('\n');

const UNKNOWN_TYPE_FIXTURE = [
  '[ACTION:foo-bar]',
  'sessionName: sess-x',
  'rationale: bogus',
  '[/ACTION]',
].join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('MB-T-HSO-WIRE WB6 — registerActionMarkerRouter factory shape', () => {
  it('module exports registerActionMarkerRouter factory', () => {
    if (importError) {
      throw new Error(
        `import failed (expected at WB6 RED; WB7 GREEN authors the module): ${importError.message}`,
      );
    }
    expect(registerActionMarkerRouter).toBeDefined();
  });
});

describe('MB-T-HSO-WIRE WB6 — Condition (1): __orchestrator_active filter', () => {
  it('subscribes to broadcaster on registration', () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const cleanup = registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: makeStubDispatch(),
      dispatchDeps: makeStubDispatchDeps(),
      onError: vi.fn(),
    });
    expect(stub.broadcaster.addStdoutObserver).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('ignores chunks from sessions other than __orchestrator_active', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const dispatch = makeStubDispatch();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps: makeStubDispatchDeps(),
      onError: vi.fn(),
    });
    stub.fire('sess-some-peer', KILL_FIXTURE);
    await new Promise((r) => setTimeout(r, 10));
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('MB-T-HSO-WIRE WB6 — Condition (2): Pattern B accumulator + strip-and-re-parse', () => {
  it('16B-chunked marker invokes dispatch exactly once after closer received (WB1 spike binding)', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const dispatch = makeStubDispatch();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps: makeStubDispatchDeps(),
      onError: vi.fn(),
    });
    for (let i = 0; i < KILL_FIXTURE.length; i += 16) {
      stub.fire('__orchestrator_active', KILL_FIXTURE.slice(i, i + 16));
    }
    await new Promise((r) => setTimeout(r, 10));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [parsed] = dispatch.mock.calls[0]!;
    expect((parsed as ParsedActionMarker).actionType).toBe('kill-session');
    expect((parsed as ParsedActionMarker).fields['sessionName']).toBe(
      'sess-stale',
    );
  });

  it('multi-marker burst invokes dispatch per marker (WB1 spike Concern (i): strip-and-re-parse)', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const dispatch = makeStubDispatch();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps: makeStubDispatchDeps(),
      onError: vi.fn(),
    });
    stub.fire('__orchestrator_active', `${KILL_FIXTURE}\n${SEND_PROMPT_FIXTURE}`);
    await new Promise((r) => setTimeout(r, 10));
    expect(dispatch).toHaveBeenCalledTimes(2);
    const types = dispatch.mock.calls.map(
      (c) => (c[0] as ParsedActionMarker).actionType,
    );
    expect(types).toEqual(['kill-session', 'send-prompt-to-session']);
  });
});

describe('MB-T-HSO-WIRE WB6 — Condition (3): dispatchActionVariant caller shape', () => {
  it('passes ParsedActionMarker + injected dispatchDeps to dispatch', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const dispatch = makeStubDispatch();
    const dispatchDeps = makeStubDispatchDeps();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps,
      onError: vi.fn(),
    });
    stub.fire('__orchestrator_active', ASSIGN_TASK_FIXTURE);
    await new Promise((r) => setTimeout(r, 10));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [parsed, depsArg] = dispatch.mock.calls[0]!;
    expect((parsed as ParsedActionMarker).actionType).toBe('assign-task');
    expect((parsed as ParsedActionMarker).fields).toMatchObject({
      sessionName: 'sess-z',
      ticketScope: 'MB-T99',
      rationale: 'scoped',
    });
    expect(depsArg).toBe(dispatchDeps);
  });
});

describe('MB-T-HSO-WIRE WB6 — Condition (4): malformed marker emits chat error', () => {
  it('dispatch returning kind:error triggers onError with the message (no silent drop)', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    const stub = makeStubBroadcaster();
    const dispatch = vi.fn(
      async (): Promise<ActionVariantDispatchResult> => ({
        kind: 'error',
        message: 'unknown action type: foo-bar',
      }),
    );
    const onError = vi.fn();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps: makeStubDispatchDeps(),
      onError,
    });
    stub.fire('__orchestrator_active', UNKNOWN_TYPE_FIXTURE);
    await new Promise((r) => setTimeout(r, 10));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatch(/unknown action type/);
  });
});

describe('MB-T-HSO-WIRE WB6 — Condition (5): approval-policy interception via dispatchDeps.resolveApproval', () => {
  it('router forwards dispatchDeps (containing resolveApproval) to dispatch unchanged', async () => {
    expect(registerActionMarkerRouter).toBeDefined();
    // Per action-variant-ipc.ts:264-266, dispatchActionVariant consumes
    // resolveApproval BEFORE firing each variant. The router's only
    // responsibility for Condition (5) is to forward the dispatchDeps
    // surface, including resolveApproval, unmodified.
    const stub = makeStubBroadcaster();
    const dispatch = makeStubDispatch();
    const dispatchDeps = makeStubDispatchDeps();
    registerActionMarkerRouter!({
      broadcaster: stub.broadcaster,
      dispatch: dispatch as unknown as DispatchFn,
      dispatchDeps,
      onError: vi.fn(),
    });
    stub.fire('__orchestrator_active', KILL_FIXTURE);
    await new Promise((r) => setTimeout(r, 10));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [, depsArg] = dispatch.mock.calls[0]!;
    // Identity check: same dispatchDeps object passed through.
    expect(depsArg).toBe(dispatchDeps);
    // resolveApproval is the WB7 placeholder for WB9 real-shim swap.
    expect((depsArg as ActionVariantDispatchDeps).resolveApproval).toBe(
      dispatchDeps.resolveApproval,
    );
  });
});
