// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB4 (green) —
// max-parallel counter component.
//
// Per ticket body f8fc24d §4 WB4 + Sub-Q-T4-E=(i) renderer-internal
// operator-acked default 2026-05-12 ("accept all defaults"):
//   - N = count of sessions with `status === 'open'` (active).
//   - M = renderer-internal const default 16 (max-parallel limit per
//     wireframe). Tier 3 followup `MB-F-MAX-PARALLEL-CONFIG-SOURCE`
//     recommended for operator-arbitrated config source (env var,
//     persisted setting, daemon config) — filed at WB14 docs.
//   - Renders `<span data-testid="max-parallel-counter">max-parallel
//     · N/M</span>` — text shape per wireframe target 2026-05-11.
//
// Prop-driven (not subscription-driven) — caller passes sessions
// array; component is pure render. ChatShell `renderMaxParallel
// Counter` slot prop (chat-shell.tsx) wires the sessions stream
// from mount.ts (renderer-side subscription to
// `window.workstationBridge.onSpawnResult` per T1 `4414ef9` pattern)
// at production runtime. Tests inject sessions directly for
// component-isolation testing.
//
// Slot ordering per wireframe (from left): Conductor brand →
// Auto/Ask toggle → [bypass-perms WB12] → max-parallel counter
// (this) → cost-meter → plan-timer. Exact slot position inside
// chat-shell-header-bar reconciled at WB12 final layout pass.

import type { CSSProperties } from 'react';

interface SessionEntryShape {
  readonly name: string;
  readonly status?: string;
}

export interface MaxParallelCounterProps {
  readonly sessions: readonly SessionEntryShape[];
  readonly maxParallel: number;
  /**
   * MB-T-WIREFRAME-T10 WB4 — optional pre-computed active count.
   *
   * When supplied, OVERRIDES the inline
   * `sessions.filter(s => s.status === 'open').length` computation.
   * Lets cross-package consumers (e.g. daemon-side
   * `aggregateActiveSessionCount` shipped at MB-T-WIREFRAME-T10 WB2
   * `8ea83a0`) pass authoritative N without re-constructing a
   * synthetic sessions array.
   *
   * When OMITTED, T4 WB4 inline-filter behavior is preserved
   * verbatim (backward-compat). Existing chat-shell slot supplier
   * needs NO changes.
   */
  readonly activeCount?: number;
}

const COUNTER_STYLE: CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

export function MaxParallelCounter(props: MaxParallelCounterProps): JSX.Element {
  const { sessions, maxParallel, activeCount: activeCountProp } = props;
  const activeCount =
    activeCountProp ?? sessions.filter((s) => s.status === 'open').length;
  return (
    <span data-testid="max-parallel-counter" style={COUNTER_STYLE}>
      max-parallel · {activeCount}/{maxParallel}
    </span>
  );
}
