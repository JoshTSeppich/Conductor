// MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11 production wiring —
// shared types module for Frame-C IPC dependencies.
//
// Re-exports the dependency surface authored at WB4 in `frame-c-ipc.ts`
// (`FrameCIpcDeps`, `SessionLookupFn`, `ScrollEmitter`, `FrameCIpcMain`)
// so downstream consumers (production-factory module here; future stub-
// replacement wire site at main.ts; c5-trinity tile-grid-app integration
// probes) can import the typed deps surface without pulling in the
// `FrameCIpcController` class + its `child_process.spawn`-based default
// git executor. The types continue to live canonically in
// `frame-c-ipc.ts` — this module is a stable types-only seam.
//
// Adds `SessionRegistrySource` — the production-side abstraction that
// the factory in `frame-c-ipc-deps-production.ts` consumes. A concrete
// implementation will be wired in a downstream WB once the c5-trinity
// tile-grid-app integration anchor establishes the renderer→main
// session-shape exposure (cwd + branchName per active session) per the
// coordination plan in
// `docs/coordination/mb-f-frame-c-ipc-lookup-session-production-
// 2026-05-12.md`.

export type {
  FrameCIpcDeps,
  SessionLookupFn,
  ScrollEmitter,
  FrameCIpcMain,
} from './frame-c-ipc.js';

/**
 * Production source of per-session lookup data. Implementations expose
 * `getSession(sessionName)` returning the session's working-directory +
 * branch name, or `null` if the session is not registered (killed,
 * stale, or never spawned).
 *
 * The `SessionLookupFn` returned by `createProductionLookupSession`
 * (see `frame-c-ipc-deps-production.ts`) is a pure pass-through over
 * this method — no caching, no name normalization, no default fill-in.
 * Null propagates unchanged so handlers translate to
 * `error_type='SessionNotFound'` exactly as the WB4 controller contract
 * expects.
 */
export interface SessionRegistrySource {
  getSession(sessionName: string): { cwd: string; branchName: string } | null;
}
