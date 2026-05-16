// MB-T-PHASE-4-BOTTOM-RAIL-FINAL-INTEGRATION WB2 (green) —
// max-parallel pluggable-source seam for the bottom-rail
// MaxParallelCounter slot.
//
// Operator decision 2026-05-16 (BR-IMPL-1=(b) DEFER): production wiring
// (raw-fs <userData>/max-parallel.json reader + main-process singleton +
// renderer IPC subscription) becomes Tier-1 followup
// MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-WORKSTATION-CONTRACT-66-
// AMENDMENT-2026-05-16 at WB-final (mirrors MB-F-MOUNT-WIRING-
// HTTPSESSIONLISTCLIENT-PROD-WIRING-DEFERRED at 7c8a957 precedent).
//
// This module ships only the renderer-side INTERFACE seam. The seam
// defines:
//
//   - `MaxParallelSource` — the pluggable-source contract that
//     mount.ts's `resolveRenderMaxParallelCounter` factory consumes
//     when constructing the MaxParallelCounter slot supplier.
//   - `RENDERER_INTERNAL_MAX_PARALLEL_DEFAULT` — the renderer-internal
//     const default (16) per T4 WB4 inline-default precedent at
//     `max-parallel-counter.tsx:7-9` ("M = renderer-internal const
//     default 16 (max-parallel limit per wireframe)"). Under
//     BR-IMPL-1=(b) DEFER, the renderer falls back to this constant
//     when no source is supplied — production raw-fs reader fills in
//     at the Tier-1 followup.
//
// The interface is intentionally minimal: a synchronous read() returning
// the current maxParallel ceiling. Async/subscription variants (e.g.
// `onUpdate(cb)`) are NOT in scope under this WB — adding them now
// would speculate on the production wiring shape that the Tier-1
// followup will arbitrate. The seam is forward-compatible: future
// followup can either extend the interface OR ship a second `MaxParallel
// SourceSubscribable` interface that wraps a sync read().
//
// Sub-Q binding rows cited:
//   - BR-1=(b) DEFER — pluggable-source seam, no IPC channel.
//   - BR-3=(b) raw-fs <userData>/max-parallel.json — DEFERRED.
//   - BR-IMPL-2 deferred — placement under src/chat-shell/ accepted
//     because no raw-fs read happens here (renderer-bundle safe under
//     CLAUDE.md §3.7); raw-fs reader is followup-territory in main/.

/**
 * Pluggable source-of-truth for the max-parallel ceiling rendered by
 * the bottom-rail MaxParallelCounter slot.
 *
 * Under BR-IMPL-1=(b) DEFER scope, the only in-tree implementation is
 * {@link createDefaultMaxParallelSource} (returns the renderer-internal
 * const default 16). Production raw-fs / IPC-backed implementations
 * land via Tier-1 followup MB-F-BOTTOM-RAIL-IMPL-PROD-WIRING-DEFERRED-
 * WORKSTATION-CONTRACT-66-AMENDMENT-2026-05-16.
 */
export interface MaxParallelSource {
  /**
   * Returns the current max-parallel ceiling. Sync by design — render-
   * path callers (MountChatShellOptions consumers) cannot await.
   *
   * Implementations that need async resolution (e.g. raw-fs read or
   * IPC round-trip) must do so eagerly out-of-band and expose only
   * the latest cached value here.
   */
  readonly read: () => number;
}

/**
 * Renderer-internal const default for the max-parallel ceiling.
 *
 * Preserves T4 WB4 inline-default precedent (max-parallel-counter.tsx
 * docstring lines 7-9: "M = renderer-internal const default 16 (max-
 * parallel limit per wireframe)"). Lives in this module so the
 * Tier-1 followup has a single import-site to override when shipping
 * the production raw-fs / IPC source.
 */
export const RENDERER_INTERNAL_MAX_PARALLEL_DEFAULT = 16;

/**
 * Default {@link MaxParallelSource} for the BR-IMPL-1=(b) DEFER
 * workstation-internal scope. Always returns
 * {@link RENDERER_INTERNAL_MAX_PARALLEL_DEFAULT}.
 *
 * mount.ts consumes this when no explicit source is supplied via
 * `MountChatShellOptions.maxParallelSource`. The Tier-1 followup
 * supplies a raw-fs-backed source that overrides this default.
 */
export function createDefaultMaxParallelSource(): MaxParallelSource {
  return {
    read: () => RENDERER_INTERNAL_MAX_PARALLEL_DEFAULT,
  };
}
