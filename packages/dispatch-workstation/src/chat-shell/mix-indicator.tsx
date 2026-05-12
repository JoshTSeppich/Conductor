// MB-T27 WB2 GREEN — Model mix indicator pure render + container subscription.
//
// Renders the per-model session-count chips (S4.6/O4.6/O4.7·1M/H) in the
// chat-shell-header-bar slot — sibling to MB-T26 cost-meter slot per
// docs/coordination/t26-t27-coord.md slot ordering left-to-right:
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
// Two components exported:
//   - MixIndicator (pure-render): takes sessions prop; groups via
//     modelChipShortcode from src/tile-grid/color-helpers.js (MB-T15).
//   - MixIndicatorContainer (subscriber): useEffect subscribes to
//     bridge.onSpawnResult; maintains session list via useState;
//     idempotent on duplicate sessionName; cleanup on unmount.
//
// [KNOWN] from MB-T27 Phase 1 diagnose §II-D (ed7362c): TileGridSessionEntry
// .model is currently always undefined in production (spawn-handler.ts
// returns no model field; SpawnSuccessReply guard validates only sessionName
// + cwd). v3.0 ship: indicator renders all chips at 0 even when N>0
// sessions live — counts ARE accurate against the field as populated.
// Tier 2 followup MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN to be filed at WB3.
//
// [KNOWN] kill-event propagation gap per Q-MBT27-4=a — no onSessionKilled
// IPC channel exists; chips do NOT decrement when a session is killed.
// "Capability enabled with known limitations" per CLAUDE.md §2.11.
// Tier 2 followup MB-F-T27-KILL-EVENT-PROPAGATION to be filed at WB3.

import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { modelChipShortcode, type ModelChip } from '../tile-grid/color-helpers.js';

/**
 * SessionLike — minimum shape for grouping. Optional `name` used by
 * MixIndicatorContainer for de-duplication on duplicate spawn-result
 * envelopes (e.g. daemon recovery re-fires).
 */
export interface SessionLike {
  readonly name?: string;
  readonly model?: string;
}

/** Bridge surface — onSpawnResult subscription for live session-list updates. */
export interface ModelMixBridge {
  /**
   * Subscribe to spawn-result envelopes from main. Returns cleanup-fn.
   * Mirrors workstationBridge.onSpawnResult (preload.mts:55-56,
   * attachSpawnResultListener); reuses existing IPC per Q-MBT27-3=a
   * (preload.mts UNCHANGED).
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

// Fixed chip order — matches t26-t27-coord.md slot ordering.
// `code` is the modelChipShortcode return value; `testidSuffix` strips
// the `.` and `·` characters for ergonomic data-testid lookup.
const CHIPS: readonly { code: ModelChip; testidSuffix: string; label: string }[] = [
  { code: 'S4.6', testidSuffix: 'S46', label: 'S4.6' },
  { code: 'O4.6', testidSuffix: 'O46', label: 'O4.6' },
  { code: 'O4.7·1M', testidSuffix: 'O471M', label: 'O4.7·1M' },
  { code: 'H', testidSuffix: 'H', label: 'H' },
];

const ROOT_STYLE: CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'monospace',
  fontSize: '0.85em',
};

// MB-F-CHATSHELL-POLISH-REMAINING WB3 — chip border-radius softened
// from `3px` → `4px` per T7 row 357 polish target. Subtle aesthetic
// refinement; matches the visual softness of the broader T7 chat-shell
// polish set.
const CHIP_STYLE: CSSProperties = {
  padding: '1px 4px',
  borderRadius: '4px',
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '2px',
};

function countByChip(sessions: readonly SessionLike[]): Record<ModelChip, number> {
  const counts: Record<ModelChip, number> = {
    'S4.6': 0,
    'O4.6': 0,
    'O4.7·1M': 0,
    H: 0,
  };
  for (const s of sessions) {
    if (typeof s.model !== 'string') continue;
    const chip = modelChipShortcode(s.model);
    if (chip === null) continue; // Q-MBT27-5=a "unknown" bucket NOT shown.
    counts[chip] += 1;
  }
  return counts;
}

export function MixIndicator({ sessions = [] }: MixIndicatorProps = {}): ReactNode {
  const counts = countByChip(sessions);
  return (
    <div
      data-testid="mix-indicator-root"
      style={ROOT_STYLE}
      role="group"
      aria-label="Model mix"
    >
      {CHIPS.map(({ testidSuffix, code, label }) => (
        <span
          key={testidSuffix}
          data-testid={`mix-indicator-chip-${testidSuffix}`}
          style={CHIP_STYLE}
          title={`${label} sessions`}
        >
          <span aria-hidden="true">{label}</span>
          <span data-testid={`mix-indicator-chip-${testidSuffix}-count`}>
            {String(counts[code])}
          </span>
        </span>
      ))}
    </div>
  );
}

// Type guard for spawn-success reply envelope.
// Mirrors tile-grid-app.tsx isSpawnSuccessReply (114-134); extracts
// `model` field defensively even though spawn-handler.ts:387-393 does
// NOT carry it in v3.0 (Tier 2 followup MB-F-T27-MODEL-FIELD-PLUMB-FROM-SPAWN).
interface SpawnSuccessReply {
  readonly type: 'success';
  readonly result: {
    readonly sessionName: string;
    readonly model?: string;
  };
}

function isSpawnSuccessReply(x: unknown): x is SpawnSuccessReply {
  if (x === null || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (r['type'] !== 'success') return false;
  const result = r['result'];
  if (result === null || typeof result !== 'object') return false;
  const sessionName = (result as Record<string, unknown>)['sessionName'];
  return typeof sessionName === 'string' && sessionName.length > 0;
}

export function MixIndicatorContainer({
  bridge,
}: MixIndicatorContainerProps = {}): ReactNode {
  const [sessions, setSessions] = useState<readonly SessionLike[]>([]);

  useEffect(() => {
    if (!bridge) return undefined;
    return bridge.onSpawnResult((reply) => {
      if (!isSpawnSuccessReply(reply)) return;
      const sessionName = reply.result.sessionName;
      const model = reply.result.model;
      setSessions((current) => {
        // Idempotent on duplicate sessionName (daemon-recovery re-fires).
        if (current.some((s) => s.name === sessionName)) return current;
        return [
          ...current,
          {
            name: sessionName,
            ...(typeof model === 'string' ? { model } : {}),
          },
        ];
      });
    });
  }, [bridge]);

  return <MixIndicator sessions={sessions} />;
}
