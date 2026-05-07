// MB-T15 WB1 — color-helpers stub module.
//
// Pure-fn helpers for the tile-header chrome (MB-T15). WB1 ships the
// type signatures + Q-MBT15 disposition comments; impls land at WB2
// alongside their unit tests. Stubs throw to keep the RED state honest
// (calling them at runtime fails until WB2 lands).
//
// Per Q-MBT15 dispositions (operator-confirmed 2026-05-07; see
// docs/coordination/mb-t15-decisions-2026-05-07.md):
//   Q-MBT15-1=a — operator-confirmed model SDK→shortcode mapping
//                 captured as a literal Record (defined at WB2).
//   Q-MBT15-5=b — TileStatus → dot color: idle→gray, open→green,
//                 killed→red, detached→gray; yellow unused in v3.0.
//   Q-MBT15-6=a — token meter: horizontal bar with tint thresholds
//                 (>0.7 warn, >0.85 danger).

import type { TileStatus } from './types.js';

/** Status-dot color per tile lifecycle state (Q-MBT15-5=b). */
export type StatusDotColor = 'gray' | 'green' | 'yellow' | 'red';

/** Operator-coined model chip shortcodes (Q-MBT15-1=a). */
export type ModelChip = 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H';

/** Token meter tint band (Q-MBT15-6=a). */
export type TokenMeterTint = 'normal' | 'warn' | 'danger';

/**
 * Map a TileStatus to its status-dot color (Q-MBT15-5=b).
 * WB2 implementation; WB1 stub throws.
 */
export function statusDotColor(_status: TileStatus): StatusDotColor {
  throw new Error('MB-T15 WB1 stub: statusDotColor implementation lands at WB2');
}

/**
 * Map an SDK model name (e.g., "claude-sonnet-4-6") to the operator-coined
 * chip shortcode (Q-MBT15-1=a). Returns null for unknown SDK names.
 * WB2 implementation; WB1 stub throws.
 */
export function modelChipShortcode(_sdkName: string): ModelChip | null {
  throw new Error('MB-T15 WB1 stub: modelChipShortcode implementation lands at WB2');
}

/**
 * Map a model chip shortcode to its display color (Q-MBT15-1=a + brief's
 * "fixed color palette per S4.6/O4.6/O4.7·1M/H"). Operator confirms exact
 * hex codes during decisions doc review; WB2 captures them in the impl.
 * WB1 stub throws.
 */
export function modelChipColor(_chip: ModelChip): string {
  throw new Error('MB-T15 WB1 stub: modelChipColor implementation lands at WB2');
}

/**
 * Map a token-usage ratio (tokensUsed / tokenBudget, 0..1+) to its tint
 * band (Q-MBT15-6=a). Thresholds: >0.7 warn, >0.85 danger; otherwise
 * normal. WB2 implementation; WB1 stub throws.
 */
export function tokenMeterTint(_ratio: number): TokenMeterTint {
  throw new Error('MB-T15 WB1 stub: tokenMeterTint implementation lands at WB2');
}
