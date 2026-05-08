// MB-T27 WB1 RED — Model mix indicator scaffold.
//
// Renders the per-model session-count chips (S4.6/O4.6/O4.7·1M/H) in
// the chat-shell-header-bar slot — sibling to MB-T26 cost-meter slot
// per docs/coordination/t26-t27-coord.md slot ordering left-to-right:
//   [plan-usage MB-T25 future] | [cost-meter MB-T26] | [model-mix MB-T27]
//
// Operator-confirmed dispositions (HALT 0, 2026-05-07):
//   - Q-MBT27-3=a: data source = workstationBridge.onSpawnResult
//     (subscribes locally; preload.mts UNCHANGED).
//   - Q-MBT27-5=a: undefined / unmapped models NOT counted in any
//     chip ("unknown" bucket); zero-state chips still render at 0.
//   - Q-MBT27-7=a: data-testid contract:
//       mix-indicator-root            outer container
//       mix-indicator-chip-S46        Sonnet 4.6 chip wrapper
//       mix-indicator-chip-O46        Opus 4.6 chip wrapper
//       mix-indicator-chip-O471M      Opus 4.7 (1M context) chip wrapper
//       mix-indicator-chip-H          Haiku 4.5 chip wrapper
//       mix-indicator-chip-{N}-count  per-chip count span (text)
//
// WB1 RED status: stubs return null → probe-01 (8 tests) all FAIL.
// WB2 GREEN: pure-render impl using modelChipShortcode from
// src/tile-grid/color-helpers.js + container subscribes to
// bridge.onSpawnResult and maintains session list via useState.
//
// [KNOWN] from MB-T27 Phase 1 diagnose §II-D: TileGridSessionEntry.model
// is currently always undefined in production (spawn-handler.ts returns
// no model field; SpawnSuccessReply guard validates only sessionName +
// cwd). v3.0 ship: indicator renders all chips at 0 even when N>0
// sessions live — counts ARE accurate against the field as populated.
// Tier 2 followup MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN filed at WB3.

import type { ReactNode } from 'react';

/**
 * SessionLike — minimum shape for grouping; subset of
 * TileGridSessionEntry (src/tile-grid/tile-grid.tsx:29).
 */
export interface SessionLike {
  readonly model?: string;
}

/**
 * Bridge surface — onSpawnResult subscription for live session-list
 * updates. Mirrors workstationBridge.onSpawnResult from preload.mts:55.
 */
export interface ModelMixBridge {
  /**
   * Subscribe to spawn-result envelopes. Returns cleanup-fn.
   * WB2 GREEN: container wraps this to maintain a session list,
   * groups entries by modelChipShortcode(session.model), and renders
   * counts per chip.
   */
  readonly onSpawnResult: (cb: (reply: unknown) => void) => () => void;
}

export interface MixIndicatorProps {
  /** Pre-grouped sessions list — pure-render path used by probe-01 tests. */
  readonly sessions?: readonly SessionLike[];
}

export interface MixIndicatorContainerProps {
  /** Bridge — null/undefined → empty session list (zero-state chips). */
  readonly bridge?: ModelMixBridge | null;
}

// === BEGIN: MB-T27 WB1 RED stubs — WB2 GREEN fills in ===
// MixIndicator (pure-render). WB1 RED: returns null → probe-01 tests
// fail (no mix-indicator-root element in the DOM, no chip elements
// found). WB2 GREEN: renders 4 fixed chips with counts grouped by
// modelChipShortcode(); zero-state preserves all 4 chips visible.
export function MixIndicator(_props: MixIndicatorProps = {}): ReactNode {
  return null;
}

// MixIndicatorContainer (subscriber). WB1 RED: returns null. WB2 GREEN:
// useState<readonly SessionLike[]>([]) + useEffect subscribes to
// bridge.onSpawnResult; on each spawn-result success reply, appends
// the session (idempotent on duplicate sessionName); renders
// <MixIndicator sessions={...} />. Note: kill-event propagation is
// out of scope for v3.0 per Q-MBT27-4=a (Tier 2 followup
// MB-F-T27-KILL-EVENT-PROPAGATION filed at WB3).
export function MixIndicatorContainer(
  _props: MixIndicatorContainerProps = {},
): ReactNode {
  return null;
}
// === END: MB-T27 WB1 RED stubs ===
