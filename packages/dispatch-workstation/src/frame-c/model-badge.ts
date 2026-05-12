// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB8 (green) — model-badge label
// mapping per Sub-Q-T1-B=(i) operator-acked binding "renderer infer
// model field" (2026-05-12, ec60622) interpreted as pure-renderer
// derivation: TileGridSessionEntry.model already exists as optional
// field per tile-grid.tsx:38 (currently STUB per audit §7 Dim 5 — no
// IPC source populates it today); Frame C renders the value directly
// through this mapping. Spawn-handler modification is NOT required at
// this WB; the field becomes load-bearing if/when a future cycle wires
// model propagation through SpawnSessionResult (sibling closure path
// for audit row).
//
// Maps full CC model identifiers to wireframe-spec short-form badge
// labels per ticket body §1.1 item 2 + §4 WB7 mapping table:
//   'claude-sonnet-4-6' → 'S4.6'
//   'claude-opus-4-6'   → 'O4.6'
//   'claude-opus-4-7'   → 'O4.7'
//   'claude-haiku-4-5'  → 'H'
//   undefined / unknown → '' (empty; SessionList row renders empty
//                              span without affecting layout)
//
// Note on '·1M' suffix (wireframe shows 'O4.7·1M' for the 1M-context-
// window variant): currently not represented in TileGridSessionEntry
// (no `tokenBudget` ≠ context-window distinction at v3.0 ship). When
// a future cycle adds context-window metadata, this module's switch
// extends to emit the '·1M' suffix conditionally. v3.0 ship returns
// 'O4.7' for any opus-4-7 model.

/**
 * Map a CC model identifier to its wireframe-spec short-form badge
 * label. Returns '' for undefined / unknown models — SessionList row
 * renders an empty span without affecting layout per Wave B WB4
 * data-testid contract.
 */
export function modelToLabel(model?: string): string {
  if (model === undefined || model.length === 0) return '';
  switch (model) {
    case 'claude-sonnet-4-6':
      return 'S4.6';
    case 'claude-opus-4-6':
      return 'O4.6';
    case 'claude-opus-4-7':
      return 'O4.7';
    case 'claude-haiku-4-5':
      return 'H';
    default:
      // Unknown model identifier — return empty so SessionList does
      // not display an ambiguous label. Future cycles may extend the
      // mapping table; this fallback preserves honest empty state per
      // ticket body §3.2 Sub-Q-T1-B=(i) "renderer infer" framing
      // (renderer does NOT synthesize labels for unknown identifiers).
      return '';
  }
}
