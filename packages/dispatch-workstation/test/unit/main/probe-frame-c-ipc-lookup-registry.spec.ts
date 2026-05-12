// MB-F-FRAME-C-IPC-LOOKUP-SESSION integration anchor — WB1 RED.
//
// Contract spec: frame-c-ipc.ts exposes a `createSessionRegistry()` factory
// returning a `SessionRegistry` with three operations:
//   - register(sessionName, entry): stores a `{cwd, branchName}` entry
//   - unregister(sessionName): removes the entry
//   - lookup: SessionLookupFn — returns the entry or null
//
// The `lookup` operation is THE integration handoff: t3-ticket-body-0905's
// production deps factory (frame-c-ipc-deps-production.ts) wires
// `createDefaultFrameCIpcController({ lookupSession: registry.lookup, ... })`
// at main.ts. Renderer-side (TileGridApp) publishes session lifecycle via a
// bridge method (out of c5 territory; preload.mts + main.ts wiring is t3's
// production-factory work).
//
// RED state: at HEAD pre-WB2-GREEN, frame-c-ipc.ts exposes only
// `FrameCIpcController`, `createDefaultFrameCIpcController`, the dep
// interfaces, and the result types. There is no `createSessionRegistry`
// nor a `SessionRegistryEntry` type — these imports resolve to undefined
// at runtime and the destructuring throws.
//
// Closure anchor: FOLLOWUPS.md:329 (MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB
// Tier 2); main.ts:592 STUB `lookupSession: () => null`; dispatch-queue
// row `c5-ticket-wb1` + dep-row `t3-ticket-body-0905`. Closure path:
// (a) c5 exposes the registry helper as the integration anchor;
// (b) t3 wires the production preload+main glue.

import { describe, it, expect } from 'vitest';
import * as frameCIpc from '../../../src/main/frame-c-ipc.js';

describe('MB-F-FRAME-C-IPC-LOOKUP-SESSION (anchor) — WB1 session-registry helper', () => {
  it('exports createSessionRegistry factory', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported until WB2 GREEN
    expect(typeof frameCIpc.createSessionRegistry).toBe('function');
  });

  it('lookup returns null for an unregistered session', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    expect(registry.lookup('does-not-exist')).toBeNull();
  });

  it('register + lookup returns the registered entry', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/x' });
    const entry = registry.lookup('sess-a');
    expect(entry).toEqual({ cwd: '/tmp/repo', branchName: 'feat/x' });
  });

  it('unregister removes the entry; subsequent lookup returns null', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/x' });
    registry.unregister('sess-a');
    expect(registry.lookup('sess-a')).toBeNull();
  });

  it('re-register on the same sessionName overwrites the prior entry', () => {
    // Production scenario: a session's branch changes (e.g., operator
    // checkouts on the same session's cwd). Re-register replaces the
    // entry rather than appending. The registry has no per-session
    // history — last-write wins.
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'main' });
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/y' });
    expect(registry.lookup('sess-a')).toEqual({
      cwd: '/tmp/repo',
      branchName: 'feat/y',
    });
  });

  it('multiple sessions are stored independently', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/a', branchName: 'feat/a' });
    registry.register('sess-b', { cwd: '/tmp/b', branchName: 'feat/b' });
    expect(registry.lookup('sess-a')).toEqual({ cwd: '/tmp/a', branchName: 'feat/a' });
    expect(registry.lookup('sess-b')).toEqual({ cwd: '/tmp/b', branchName: 'feat/b' });
  });

  it('unregister on an unknown sessionName is a no-op (no throw)', () => {
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    expect(() => registry.unregister('never-registered')).not.toThrow();
  });

  it('registry.lookup satisfies the SessionLookupFn shape (assignable)', () => {
    // Type compatibility: registry.lookup is directly assignable to a
    // FrameCIpcDeps.lookupSession field. This is the integration-anchor
    // contract — t3's deps factory does:
    //   createDefaultFrameCIpcController({ lookupSession: registry.lookup, ... })
    // @ts-expect-error WB1 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    const lookupFn: frameCIpc.SessionLookupFn = registry.lookup;
    expect(typeof lookupFn).toBe('function');
    expect(lookupFn('unknown')).toBeNull();
  });
});
