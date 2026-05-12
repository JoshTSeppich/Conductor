// MB-F-FRAME-C-IPC-LOOKUP-SESSION integration anchor — WB1 RED
// (amended at WB2 RED for cross-session contract alignment with t3's
// `SessionRegistrySource` interface shipped at d18353b).
//
// Contract spec: frame-c-ipc.ts exposes a `createSessionRegistry()` factory
// returning a `SessionRegistry` with three operations:
//   - register(sessionName, entry): stores a `{cwd, branchName}` entry
//   - unregister(sessionName): removes the entry
//   - getSession(name): returns the entry or null (SessionLookupFn-shaped)
//
// The `getSession` method matches t3's `SessionRegistrySource` interface
// verbatim (frame-c-ipc-deps.ts:42-44 at d18353b). t3's production
// factory wires this directly:
//
//   import { createProductionLookupSession } from './frame-c-ipc-deps-production.js';
//   import { createSessionRegistry } from './frame-c-ipc.js';
//   const registry = createSessionRegistry();
//   const lookupSession = createProductionLookupSession(registry);
//   createDefaultFrameCIpcController({ lookupSession, emitScroll, writeFrameMode })
//     .registerHandlers(ipcMain);
//
// The integration-anchor handoff: c5 owns the registry's mutable side
// (register/unregister wired to TileGridApp session lifecycle via a
// preload.mts extension — out of c5 territory; t3 + future WB own that).
// c5 ships only the registry helper. The renderer→main glue is t3 +
// downstream work.
//
// RED state: at HEAD post-revert (9b8a4e9), frame-c-ipc.ts exposes only
// `FrameCIpcController`, `createDefaultFrameCIpcController`, the dep
// interfaces, and the result types. There is no `createSessionRegistry`
// — this import resolves to undefined at runtime.
//
// Closure anchor: FOLLOWUPS.md:329 (MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB
// Tier 2); main.ts:592 STUB `lookupSession: () => null`; t3 ship at
// d18353b (frame-c-ipc-deps.ts + frame-c-ipc-deps-production.ts);
// dispatch-queue row `c5-ticket-wb1`. Closure path:
// (a) c5 exposes the registry helper [this WB ships GREEN at WB3];
// (b) t3 wires the production preload+main glue [partial: factory
//     shipped d18353b; SessionRegistrySource consumer still needs wiring].

import { describe, it, expect } from 'vitest';
import * as frameCIpc from '../../../src/main/frame-c-ipc.js';
import type { SessionRegistrySource } from '../../../src/main/frame-c-ipc-deps.js';

describe('MB-F-FRAME-C-IPC-LOOKUP-SESSION (anchor) — WB1/WB2 session-registry helper', () => {
  it('exports createSessionRegistry factory', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported until WB3 GREEN
    expect(typeof frameCIpc.createSessionRegistry).toBe('function');
  });

  it('getSession returns null for an unregistered session', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    expect(registry.getSession('does-not-exist')).toBeNull();
  });

  it('register + getSession returns the registered entry', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/x' });
    const entry = registry.getSession('sess-a');
    expect(entry).toEqual({ cwd: '/tmp/repo', branchName: 'feat/x' });
  });

  it('unregister removes the entry; subsequent getSession returns null', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/x' });
    registry.unregister('sess-a');
    expect(registry.getSession('sess-a')).toBeNull();
  });

  it('re-register on the same sessionName overwrites the prior entry', () => {
    // Production scenario: a session's branch changes (e.g., operator
    // checkout on the same session's cwd). Re-register replaces the
    // entry rather than appending. The registry has no per-session
    // history — last-write wins.
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'main' });
    registry.register('sess-a', { cwd: '/tmp/repo', branchName: 'feat/y' });
    expect(registry.getSession('sess-a')).toEqual({
      cwd: '/tmp/repo',
      branchName: 'feat/y',
    });
  });

  it('multiple sessions are stored independently', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    registry.register('sess-a', { cwd: '/tmp/a', branchName: 'feat/a' });
    registry.register('sess-b', { cwd: '/tmp/b', branchName: 'feat/b' });
    expect(registry.getSession('sess-a')).toEqual({ cwd: '/tmp/a', branchName: 'feat/a' });
    expect(registry.getSession('sess-b')).toEqual({ cwd: '/tmp/b', branchName: 'feat/b' });
  });

  it('unregister on an unknown sessionName is a no-op (no throw)', () => {
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    expect(() => registry.unregister('never-registered')).not.toThrow();
  });

  it('registry satisfies t3 SessionRegistrySource interface (assignable)', () => {
    // Cross-contract integration: the registry returned by
    // createSessionRegistry() is structurally assignable to t3's
    // SessionRegistrySource interface (frame-c-ipc-deps.ts at d18353b).
    // This is the integration-anchor contract — t3's production factory
    // call site is:
    //   const lookupSession = createProductionLookupSession(registry);
    //
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    const source: SessionRegistrySource = registry;
    expect(typeof source.getSession).toBe('function');
    expect(source.getSession('unknown')).toBeNull();
  });

  it('registry.getSession is directly assignable to SessionLookupFn', () => {
    // The `getSession` method signature `(name) => {cwd, branchName} | null`
    // is identical to `SessionLookupFn` (the WB4-era function type from
    // frame-c-ipc.ts). Direct assignment works without an adapter — this
    // is the legacy path if any consumer needs SessionLookupFn directly
    // rather than going through createProductionLookupSession.
    // @ts-expect-error WB2 RED: createSessionRegistry not yet exported
    const registry = frameCIpc.createSessionRegistry();
    const lookupFn: frameCIpc.SessionLookupFn = registry.getSession.bind(registry);
    expect(typeof lookupFn).toBe('function');
    expect(lookupFn('unknown')).toBeNull();
  });
});
