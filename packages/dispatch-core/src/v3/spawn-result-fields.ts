/**
 * MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB2 GREEN —
 * Extension fields contract for SpawnSessionResult.
 *
 * Round 11 §3.9 Wave 3 — operator-arbitrated (β)-style scope narrowing
 * (build-doc §1.5 at `2d938dc`).
 *
 * ADDITIVE per CLAUDE.md §1 frozen-surface discipline + §3.4 mechanical
 * translation: this module is a SIBLING file to FROZEN `schema.ts §1-§13`;
 * NOT a §1-§13 modification. Cross-package contract for the workstation
 * extension module + future sibling consumer-wiring sessions.
 *
 * Type-only contract (no runtime logic; the `SPAWN_RESULT_FIELDS_MARKER`
 * constant is a runtime sentinel for the WB1 probe's dist-rebuild
 * verification — it has no production consumers).
 *
 * Sibling consumers:
 *   - `dispatch-workstation/src/main/spawn-session-result-extensions.ts`
 *     (populator; WB3 in this ticket)
 *   - future `dispatch-workstation/src/main/spawn-handler.ts` integration
 *     (sibling-flippable; spreads SpawnResultExtensionFields into
 *     SpawnSessionResult interface)
 *   - future `dispatch-workstation/src/tile-grid/tile-grid.tsx`
 *     TileGridSessionEntry extension (sibling-flippable; FORBIDDEN to
 *     this session)
 */

/**
 * Extension fields for workstation SpawnSessionResult, shipped under
 * MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS (β-style narrowed scope).
 *
 * Field semantics:
 *   - `model`: CC binary model identifier (e.g., 'claude-opus-4-7',
 *     'claude-sonnet-4-6'). Optional — populator returns undefined if
 *     neither explicit caller input nor environment fallback supplies
 *     a value. Sibling consumer renders model badge per T1 badge UX.
 *   - `spawnedAtMs`: workstation-recorded spawn time in ms-since-epoch
 *     (`Date.now()` at populator invocation). Closes
 *     `MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12` closure-
 *     path-(iii): true-session-uptime semantics survive renderer
 *     re-mount when sibling threads this field through
 *     TileGridSessionEntry persistence.
 */
export interface SpawnResultExtensionFields {
  readonly model?: string;
  readonly spawnedAtMs: number;
}

/**
 * Runtime marker constant for WB1 probe's dist-rebuild sentinel.
 *
 * `SpawnResultExtensionFields` is a TypeScript interface (no runtime
 * shape after compilation), so the WB1 RED probe cannot sentinel its
 * existence directly via dynamic-import. This constant is exported
 * solely as the import-resolution sentinel — its value matches the
 * ticket ID for grep-discoverability.
 *
 * Production code should NOT import this constant; it has no
 * runtime utility outside the WB1 contract probe.
 */
export const SPAWN_RESULT_FIELDS_MARKER =
  'MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS';
