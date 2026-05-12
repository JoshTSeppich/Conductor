// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB6 (green) — status-color mapping
// module per Sub-Q-T1-C=(i) operator-acked binding "extend TileStatus
// enum + renderer-derived" (2026-05-12, ec60622).
//
// Maps the (extended) TileStatus union to the wireframe four-color
// palette (green/amber/red/grey). Replaces the inline STATUS_DOT_HEX
// literal previously at session-list.tsx:64-70 (which mapped only 3
// statuses + included a dead-code 'collapsed' key that the SessionList
// renderer never reaches because `collapsed` is a separate boolean
// field on TileGridSessionEntry).
//
// Wireframe taxonomy → TileStatus mapping (ticket body §3.3):
//   green  (#5b9d6e) — active/healthy        ← TileStatus 'open'
//   grey   (#888888) — paused/idle           ← TileStatus 'idle'
//   amber  (#c97a3a) — warning + transient   ← TileStatus 'detached' + 'warning'
//   red    (#c54a4a) — error/failure         ← TileStatus 'error'
//   hidden — killed sessions filtered out before reaching here
//            (SessionList filter; this module returns null for 'killed'
//             as a defensive signal but the renderer should not invoke
//             on filtered entries).
//
// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB6 also extends `TileStatus` in
// packages/dispatch-workstation/src/tile-grid/types.ts to include
// 'error' and 'warning' (additive). Existing consumers tolerate via
// fallback patterns at session-list.tsx:124 + tile-header.tsx
// STATUS_DOT_HEX[x] ?? STATUS_DOT_HEX['open']!.

import type { TileStatus } from '../tile-grid/types.js';

// Wireframe four-color palette per ticket body §3.3 Sub-Q-T1-C=(i).
// T7 visual-polish ticket may refine these hex values; for v3.0
// ship they match the audit-doc §1 Dim 5 row + the existing
// session-list.tsx:66-69 green/amber values for continuity.
const GREEN = '#5b9d6e';
const GREY = '#888888';
const AMBER = '#c97a3a';
const RED = '#c54a4a';

/**
 * Map a TileStatus value to the wireframe color hex. Returns `null`
 * for the 'killed' sentinel (SessionList filters killed sessions out
 * before rendering; this module returns null as the "do not render
 * a dot" signal for defensive call sites).
 *
 * Unknown status values fall back to GREEN (matches existing
 * STATUS_DOT_HEX[x] ?? STATUS_DOT_HEX['open']! fallback at
 * session-list.tsx:124 — preserves Wave B WB4 semantics for any
 * downstream consumer that synthesizes status strings outside the
 * TileStatus enum).
 */
export function statusToColor(status: TileStatus): string | null {
  switch (status) {
    case 'open':
      return GREEN;
    case 'idle':
      return GREY;
    case 'detached':
      return AMBER;
    case 'warning':
      return AMBER;
    case 'error':
      return RED;
    case 'killed':
      return null;
    default: {
      // Exhaustiveness guard — if TileStatus union gains new values
      // and this switch is not updated, TypeScript flags via the
      // `_exhaustive: never` cast; runtime falls back to GREEN.
      const _exhaustive: never = status;
      void _exhaustive;
      return GREEN;
    }
  }
}
