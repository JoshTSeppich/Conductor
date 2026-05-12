// MB-F-FRAME-C-IPC-LOOKUP-SESSION-STUB-2026-05-11 production wiring —
// factory for the production `SessionLookupFn` consumed by
// `FrameCIpcController` (see `frame-c-ipc.ts`).
//
// Replaces the WB4-era `() => null` stub at `main.ts:592`. The literal
// edit of `main.ts` to call this factory is the responsibility of a
// downstream WB (out-of-territory for the t3-frame-c-lookup-stub
// session). This module ships the stable, tested factory so the
// downstream wire-up is a one-line swap.
//
// Design (per coordination doc
// `docs/coordination/mb-f-frame-c-ipc-lookup-session-production-
// 2026-05-12.md`):
//   - Input: a `SessionRegistrySource` (defined in `frame-c-ipc-deps.ts`)
//     — the production-side abstraction over per-session cwd/branchName
//     data. A concrete implementation lives in a downstream module owned
//     by the integration WB; this factory does NOT itself reach into
//     TileGridApp state or any IPC primitive, keeping it Node-pure and
//     unit-testable.
//   - Output: a `SessionLookupFn` (the WB4-era signature from
//     `frame-c-ipc.ts`) — pure pass-through of `source.getSession`. No
//     caching, no defensive copy, no error swallowing. Null propagates
//     unchanged so the controller's existing handler logic translates
//     `null` → `error_type='SessionNotFound'`.

import type {
  SessionLookupFn,
  SessionRegistrySource,
} from './frame-c-ipc-deps.js';

export function createProductionLookupSession(
  source: SessionRegistrySource,
): SessionLookupFn {
  return (sessionName) => source.getSession(sessionName);
}
