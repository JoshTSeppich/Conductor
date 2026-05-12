// MB-T25 WB3 — PlanUsageRing slot component (GREEN).
//
// Operator-confirmed at HALT 0 (2026-05-08): Outcome A (headers exposed)
// 5-WB ladder; bridge surface `coarchitectBridge.onRateLimitUpdate(cb)`
// owned by Terminal D's MB-T34 API client; data contract
// `RateLimitState` with 4 nested-bucket dimensions (requests, tokens
// combined, input-tokens, output-tokens × {limit, remaining, reset}).
//
// Q-MBT25-7=a operator-confirmed at WB1 ack 2026-05-08:
// `selectPrimaryDimension` returns the `tokens` (combined) dimension —
// single-glance UX clarity for v3.0 ship-gate. Multi-dimension
// drilldown deferred to v3.1 followup
// MB-F-T25-MULTI-DIMENSION-RING-DRILLDOWN (filed at WB-final).
//
// Slot ordering left-to-right per A's Q-MBT24-4=far-left disposition:
//   [Auto/Ask MB-T24] | [plan-usage MB-T25 — this] | [cost-meter MB-T26] | [model-mix MB-T27]
//
// Visual + structural template: cost-meter.tsx (MB-T26 WB3) — same
// useEffect-subscribe-at-mount pattern, same SLOT_STYLE shape, same
// data-testid contract convention.
//
// data-testid contract:
//   - chat-shell-plan-usage-slot       wrapper element
//   - chat-shell-plan-usage-countdown  countdown text span
//   - chat-shell-plan-usage-ring-svg   SVG element hosting the ring
//   - chat-shell-plan-usage-ring-tint-{green|yellow|red}  ring stroke

import { useEffect, useState } from 'react';
import {
  arcPath,
  computePercentageUsed,
  formatResetCountdown,
  selectPrimaryDimension,
  tintForPercentage,
  type RateLimitState,
} from './ring-helpers.js';

export interface PlanUsageRingBridge {
  /**
   * Subscribe to rate-limit updates. Implementation (preload.mts
   * MB-T25 zone at WB3) subscribes to `coarchitect:rate-limit-update`
   * webContents.send broadcasts emitted by Terminal D's
   * AnthropicAPIClient (MB-T34 WB-final) after each `/v1/messages`
   * response with `anthropic-ratelimit-*` headers. Returns
   * cleanup-fn matching the onCostUpdate / onStream* / onSpawnResult
   * / onTileDetachClosed pattern.
   *
   * No initial-fetch on subscription registration in v3.0 — ring
   * shows '—' placeholder until first API call. Initial-fetch
   * support deferred to v3.1 followup
   * MB-F-T25-INITIAL-FETCH-ON-MOUNT (filed at WB-final) if operator
   * workflow makes the placeholder annoying.
   */
  readonly onRateLimitUpdate: (
    cb: (state: RateLimitState) => void,
  ) => () => void;
}

export interface PlanUsageRingProps {
  /** Optional bridge — null/undefined → static '—' placeholder. */
  readonly bridge?: PlanUsageRingBridge | null;
}

const RING_RADIUS = 16;
const RING_STROKE_WIDTH = 3;
const SVG_SIZE = 40;

const SLOT_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: 'monospace',
  fontSize: '0.85em',
  padding: '2px 6px',
};

const TINT_TO_HEX: Record<'green' | 'yellow' | 'red', string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

// MB-F-CHATSHELL-POLISH-REMAINING WB2 — countdown typography refinement
// per T7 row 357 polish target. Tabular-nums for stable digit width
// during ticking (load-bearing for `2h 47m` style countdown per
// dispatch §1 wireframe target — without tabular-nums, the seconds/
// minutes digits jitter horizontally as values change). Brighter
// color + subtle fontWeight 500 increases readability vs the
// surrounding ring slot.
const COUNTDOWN_STYLE: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  color: '#cccccc',
  fontWeight: 500,
};

const SVG_VIEWBOX = `${-SVG_SIZE / 2} ${-SVG_SIZE / 2} ${SVG_SIZE} ${SVG_SIZE}`;

export function PlanUsageRing({ bridge }: PlanUsageRingProps = {}): JSX.Element {
  const [state, setState] = useState<RateLimitState | null>(null);

  useEffect(() => {
    if (!bridge) return undefined;
    const cleanup = bridge.onRateLimitUpdate((next) => setState(next));
    return cleanup;
  }, [bridge]);

  const dim = state ? selectPrimaryDimension(state) : null;
  const showLive = state !== null && dim !== null;
  const used = dim ? dim.limit - dim.remaining : 0;
  const pct = dim ? computePercentageUsed(used, dim.limit) : 0;
  const tint = tintForPercentage(pct);
  const path = arcPath(pct, RING_RADIUS, RING_STROKE_WIDTH);
  const countdownText = dim ? formatResetCountdown(dim.reset, Date.now()) : '—';

  return (
    <div data-testid="chat-shell-plan-usage-slot" style={SLOT_STYLE}>
      {showLive ? (
        <svg
          data-testid="chat-shell-plan-usage-ring-svg"
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={SVG_VIEWBOX}
        >
          <path
            d={path}
            fill="none"
            stroke={TINT_TO_HEX[tint]}
            strokeWidth={RING_STROKE_WIDTH}
            strokeLinecap="round"
            data-testid={`chat-shell-plan-usage-ring-tint-${tint}`}
          />
        </svg>
      ) : null}
      <span
        data-testid="chat-shell-plan-usage-countdown"
        style={COUNTDOWN_STYLE}
      >
        {countdownText}
      </span>
    </div>
  );
}
