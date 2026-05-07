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
 */
export type TileStatus = 'idle' | 'open' | 'killed' | 'detached';
