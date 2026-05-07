// MB-T15 WB2 — color-helpers pure-fn implementations.
//
// Pure helpers for the tile-header chrome (MB-T15). Per Q-MBT15-1=a +
// Q-MBT15-5=b + Q-MBT15-6=a operator dispositions
// (docs/coordination/mb-t15-decisions-2026-05-07.md).
//
// All functions are pure (no side effects, no I/O). Hex color literals
// are placeholders consistent with the dark theme (#0a0a0a background);
// operator confirms exact values during WB3 review or post-ship
// followup. Tests in test/unit/tile-grid-color-helpers/probe-01-*.

import type { TileStatus } from './types.js';

/** Status-dot color per tile lifecycle state (Q-MBT15-5=b). */
export type StatusDotColor = 'gray' | 'green' | 'yellow' | 'red';

/** Operator-coined model chip shortcodes (Q-MBT15-1=a). */
export type ModelChip = 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H';

/** Token meter tint band (Q-MBT15-6=a). */
export type TokenMeterTint = 'normal' | 'warn' | 'danger';

/**
 * Map a TileStatus to its status-dot color (Q-MBT15-5=b).
 *   open          → green
 *   killed        → red
 *   idle          → gray
 *   detached      → gray (UI is in dimmed/placeholder state)
 *
 * `yellow` is unused in v3.0; reserved for future states (gap-detected,
 * daemon-disconnect) per the decisions doc §I.
 */
export function statusDotColor(status: TileStatus): StatusDotColor {
  switch (status) {
    case 'open':
      return 'green';
    case 'killed':
      return 'red';
    case 'idle':
    case 'detached':
    default:
      return 'gray';
  }
}

/**
 * Map an SDK model name to the operator-coined chip shortcode
 * (Q-MBT15-1=a). Returns null for unknown SDK names.
 *
 * Mapping (decisions doc §I, tentative — operator confirms during WB3):
 *   claude-sonnet-4-6           → S4.6
 *   claude-opus-4-6             → O4.6
 *   claude-opus-4-7  (and any suffix) → O4.7·1M  (1M context assumed
 *                                                   for v3.0 use cases)
 *   claude-haiku-4-5-*          → H  (haiku family, any suffix)
 *
 * Edge cases:
 *   - empty string → null
 *   - non-claude SDK (e.g., gpt-4, mistral-*) → null
 *   - non-string callers handled by TypeScript (signature is string)
 */
export function modelChipShortcode(sdkName: string): ModelChip | null {
  if (sdkName === 'claude-sonnet-4-6') return 'S4.6';
  if (sdkName === 'claude-opus-4-6') return 'O4.6';
  if (sdkName === 'claude-opus-4-7' || sdkName.startsWith('claude-opus-4-7-')) {
    return 'O4.7·1M';
  }
  if (sdkName.startsWith('claude-haiku-')) return 'H';
  return null;
}

/**
 * Map a model chip shortcode to its display color (Q-MBT15-1=a + brief's
 * "fixed color palette per S4.6/O4.6/O4.7·1M/H"). Hex codes are
 * placeholders consistent with the dark theme; operator confirms exact
 * values during WB3 review or post-ship followup.
 */
export function modelChipColor(chip: ModelChip): string {
  switch (chip) {
    case 'S4.6':
      return '#4a9eff'; // blue/cyan — Sonnet
    case 'O4.6':
      return '#a36cff'; // light purple — Opus 4.6
    case 'O4.7·1M':
      return '#7c3eed'; // deeper purple — Opus 4.7 (1M context)
    case 'H':
      return '#facc15'; // amber/yellow — Haiku
  }
}

/**
 * Map a token-usage ratio (tokensUsed / tokenBudget) to its tint band
 * (Q-MBT15-6=a). Thresholds (strict greater-than):
 *   ratio > 0.85 → danger
 *   ratio > 0.7  → warn
 *   otherwise    → normal
 *
 * Boundary semantics: at exactly 0.7, ratio is `normal` (not > 0.7).
 * At exactly 0.85, ratio is `warn` (not > 0.85). Defensive on edge
 * cases:
 *   - NaN          → normal
 *   - negative     → normal
 *   - >1.0 (overshoot) → danger
 */
export function tokenMeterTint(ratio: number): TokenMeterTint {
  if (Number.isNaN(ratio)) return 'normal';
  if (ratio > 0.85) return 'danger';
  if (ratio > 0.7) return 'warn';
  return 'normal';
}
