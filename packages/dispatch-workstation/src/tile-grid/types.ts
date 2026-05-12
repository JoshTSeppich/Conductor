// MB-T15 WB1 — shared type primitives for tile-grid modules.
//
// Extracted from tile.tsx so non-JSX modules (color-helpers.ts and any
// future pure-fn helpers) can import these types without pulling
// tile.tsx into tsc scope. tile.tsx is .tsx and lives in the tsconfig
// exclude list (workstation tsconfig doesn't enable JSX); .ts files
// in src/tile-grid/ remain in tsc scope.
//
// This file is intentionally type-only — no runtime exports.

/**
 * Per-tile lifecycle status driving the tile-status-indicator color
 * (MB-T15) + the body content (MB-T12 WB11a placeholder rendering).
 *
 *   idle     — tile mounted but console not yet bound (pre-spawn-result
 *              or post-close)
 *   open     — console:open fired; ConsolePanel is bound + streaming
 *   killed   — session was killed; tile awaits parent removal
 *   detached — tile body is rendering in a separate BrowserWindow
 *              (WB11b); main-grid tile shows the detached placeholder
 *
 * MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB6 — additive extension per
 * Sub-Q-T1-C=(i) operator-acked binding (2026-05-12, ec60622):
 *
 *   error    — renderer-derived from PTY-tail sentinel detection
 *              (e.g., quiescence-timeout, ACTION-block parse error,
 *              PTY-scrape failure). Maps to wireframe red dot via
 *              frame-c/status-color.ts statusToColor.
 *   warning  — renderer-derived from PTY-tail sentinel detection
 *              (transient anomalies that don't escalate to error).
 *              Maps to wireframe amber (alias of detached).
 *
 * Existing consumers (session-list.tsx:124, tile-header.tsx) tolerate
 * the additive extension via fallback pattern STATUS_DOT_HEX[x] ??
 * STATUS_DOT_HEX['open']! — unknown statuses degrade to GREEN. The
 * NEW frame-c/status-color.ts statusToColor switch handles all values
 * explicitly with an exhaustiveness `never` guard.
 */
export type TileStatus =
  | 'idle'
  | 'open'
  | 'killed'
  | 'detached'
  | 'error'
  | 'warning';
