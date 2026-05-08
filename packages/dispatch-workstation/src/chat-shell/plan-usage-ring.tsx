// MB-T25 WB1 — PlanUsageRing slot component (RED scaffold).
//
// Operator-confirmed at HALT 0 (2026-05-08): Outcome A (headers exposed)
// 5-WB ladder; bridge surface `coarchitectBridge.onRateLimitUpdate(cb)`
// owned by Terminal D's MB-T34 API client; data contract
// `RateLimitState` with 4 nested-bucket dimensions (requests, tokens
// combined, input-tokens, output-tokens × {limit, remaining, reset}).
//
// Slot ordering left-to-right per A's Q-MBT24-4=far-left disposition:
//   [Auto/Ask MB-T24] | [plan-usage MB-T25 — this] | [cost-meter MB-T26] | [model-mix MB-T27]
//
// Visual + structural template: cost-meter.tsx (MB-T26 WB3) — same
// useEffect-subscribe-at-mount pattern, same SLOT_STYLE shape, same
// data-testid contract convention.
//
// data-testid contract (probe-07-plan-usage-ring asserts):
//   - chat-shell-plan-usage-slot       wrapper element
//   - chat-shell-plan-usage-countdown  countdown text span
//   - chat-shell-plan-usage-ring-svg   SVG element hosting the ring
//
// At WB1 (red), the component renders the wrapper element (incidental
// pass) but no useEffect subscription, no state, no SVG content, no
// em-dash placeholder formatting. Probe-07 GREEN assertions FAIL until
// WB3 wires the real implementation. WB2 GREEN ships ring-helpers.ts
// pure fns that this component will consume at WB3.

import { useEffect, useState } from 'react';
import type { RateLimitState } from './ring-helpers.js';

export interface PlanUsageRingBridge {
  /**
   * Subscribe to rate-limit updates. Implementation (Terminal D's
   * preload.mts MB-T25 zone at WB3) immediately invokes
   * `coarchitect:getRateLimit` to fetch the most recent state then
   * subscribes to live `coarchitect:rate-limit-update` broadcasts
   * emitted by Terminal D's AnthropicAPIClient after each
   * `/v1/messages` response with `anthropic-ratelimit-*` headers.
   * Returns cleanup-fn matching the onCostUpdate / onStream* /
   * onSpawnResult / onTileDetachClosed pattern.
   */
  readonly onRateLimitUpdate: (
    cb: (state: RateLimitState) => void,
  ) => () => void;
}

export interface PlanUsageRingProps {
  /** Optional bridge — null/undefined → static placeholder state. */
  readonly bridge?: PlanUsageRingBridge | null;
}

const SLOT_STYLE: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: 'monospace',
  fontSize: '0.85em',
  padding: '2px 6px',
};

export function PlanUsageRing({ bridge }: PlanUsageRingProps = {}): JSX.Element {
  // WB1 RED scaffold: state held but not wired; useEffect not subscribing.
  // WB3 GREEN replaces this stub with real subscription + ring rendering.
  const [_state, _setState] = useState<RateLimitState | null>(null);
  void bridge;
  void useEffect;

  return (
    <div data-testid="chat-shell-plan-usage-slot" style={SLOT_STYLE}>
      <span data-testid="chat-shell-plan-usage-countdown">
        WB1 RED scaffold
      </span>
    </div>
  );
}
