// MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11 production wiring —
// RED probe for `frame-c-ipc-deps-production.ts` factory module.
//
// Context (per t3-frame-c-lookup-stub.txt territorial manifest +
// orchestrator-dispatch 2026-05-12):
//   `main.ts:592` currently passes `lookupSession: () => null` into
//   `createDefaultFrameCIpcController({...})`. The stub causes every
//   frame-c:diff / frame-c:merge / frame-c:focus invocation to fail with
//   `error_type='SessionNotFound'`. The followup
//   `MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11` (Tier 2) tracks
//   replacement of the stub with a production factory.
//
// Production factory contract (this probe asserts):
//   `frame-c-ipc-deps-production.ts` exports `createProductionLookupSession`
//   which takes a `SessionRegistrySource` (a minimal lookup interface this
//   probe defines + the production module exports) and returns a function
//   conforming to the `SessionLookupFn` signature from `frame-c-ipc.ts`
//   (`(name: string) => {cwd, branchName} | null`).
//
// Pass-through semantics (no caching, no default rewriting, no name
// massaging):
//   - hit: source.getSession('foo') → {cwd:'/a', branchName:'b'} ⇒
//     lookupSession('foo') === same value
//   - miss: source.getSession('foo') → null ⇒ lookupSession('foo') === null
//
// Coordination posture (per dispatch-queue 2026-05-12 dep notation):
//   This WB ships the factory MODULE only. The actual replacement of the
//   `() => null` stub at `main.ts:592` is the responsibility of a
//   downstream WB which consumes this module + the c5-trinity
//   tile-grid-app integration anchor (which exposes per-session cwd +
//   branchName from renderer to main via `onPersistSessions`-or-equivalent
//   plumbing). The module shipped here is the stable integration target
//   that the stub-replacement WB consumes. See
//   `docs/coordination/mb-f-frame-c-ipc-lookup-session-production-
//   2026-05-12.md` for the full coordination plan.
//
// RED state at probe authoring HEAD:
//   `packages/dispatch-workstation/src/main/frame-c-ipc-deps-production.ts`
//   does not exist (verified via `ls` at WB1 authoring time). All three
//   `it` blocks fail at the per-test
//   `expect(createProductionLookupSession).toBeDefined()` guard. Pattern
//   mirrors the WB3 RED probe at
//   `test/unit/frame-c-ipc/probe-mbtwbdpfa-03-ipc-channels.spec.ts`.

import { describe, it, expect, beforeAll } from 'vitest';

interface SessionRegistrySource {
  getSession(sessionName: string): { cwd: string; branchName: string } | null;
}

type SessionLookupFn = (
  sessionName: string,
) => { cwd: string; branchName: string } | null;

type CreateProductionLookupSession = (
  source: SessionRegistrySource,
) => SessionLookupFn;

let createProductionLookupSession: CreateProductionLookupSession | undefined;

beforeAll(async () => {
  try {
    const mod = await import(
      '../../../src/main/frame-c-ipc-deps-production.js'
    );
    createProductionLookupSession = (
      mod as {
        createProductionLookupSession?: CreateProductionLookupSession;
      }
    ).createProductionLookupSession;
  } catch {
    createProductionLookupSession = undefined;
  }
});

describe('frame-c-ipc-deps-production factory wiring', () => {
  it('exports createProductionLookupSession from frame-c-ipc-deps-production.ts', () => {
    expect(createProductionLookupSession).toBeDefined();
    expect(typeof createProductionLookupSession).toBe('function');
  });

  it('passes through a hit: source returns {cwd, branchName} → lookup returns identical value', () => {
    expect(createProductionLookupSession).toBeDefined();
    const expected = { cwd: '/tmp/session-foo', branchName: 'feat/foo' };
    const source: SessionRegistrySource = {
      getSession: (name) => (name === 'session-foo' ? expected : null),
    };
    const lookup = createProductionLookupSession!(source);
    const result = lookup('session-foo');
    expect(result).toEqual(expected);
    // Reference equality also held — pure pass-through, no defensive copy.
    expect(result).toBe(expected);
  });

  it('passes through a miss: source returns null → lookup returns null', () => {
    expect(createProductionLookupSession).toBeDefined();
    const source: SessionRegistrySource = {
      getSession: () => null,
    };
    const lookup = createProductionLookupSession!(source);
    expect(lookup('session-not-registered')).toBeNull();
  });
});
