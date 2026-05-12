// @vitest-environment happy-dom
//
// MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB9 (red) —
// PlanTimerText: wireframe-formatted countdown text consuming
// MB-T34 RateLimitState reset-time field.
//
// Per ticket body f8fc24d §4 WB9 + Sub-Q-T4-D=(i) operator-acked
// default 2026-05-12.
//
// Investigation finding [KNOWN]:
//   Direct-read of `src/chat-shell/ring-helpers.ts:26-43` shows:
//     RateLimitDimension { limit; remaining; reset: string | number }
//     RateLimitState { requests | tokens | inputTokens | outputTokens
//                      each RateLimitDimension | null }
//   NO unified `unified_rate_limit_window_resets_at` field — the
//   spec implies daily/hourly resets per-dimension via the `reset`
//   field on each dimension. Closest plan-window signal: use
//   `state.requests?.reset` as primary plan-timer source (rationale:
//   the wireframe "Max plan resets in Xh Xm" implies the daily plan
//   reset, which Anthropic API surfaces via the requests
//   rate-limit dimension reset header). Tier 3 followup
//   `MB-F-PLAN-TIMER-RESET-DIMENSION-SELECTION` may refine source
//   to a more semantically-correct dimension if surfaced.
//   `ring-helpers.ts:117 formatCountdown(resetMsOrIso, nowMs)` is
//   the existing utility for delta computation.
//
// Encoded contract (5 conditions):
//   (1) PlanTimerText component exported from
//       `src/chat-shell/plan-timer-text.tsx`.
//   (2) state=null → renders "Max plan resets in —" placeholder.
//   (3) state.requests.reset = now + 2h47m → matches
//       /Max plan resets in 2h 47m/.
//   (4) state.requests.reset = now + 30s → matches
//       /Max plan resets in 0h 0m/ (truncates to hours/minutes;
//       sub-minute → 0m).
//   (5) state.requests = null AND state.tokens = null → renders
//       "Max plan resets in —" placeholder (no available signal).

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanTimerTextCmp = (props: any) => JSX.Element;

let PlanTimerText: PlanTimerTextCmp | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/chat-shell/plan-timer-text.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    PlanTimerText = (mod as { PlanTimerText?: PlanTimerTextCmp }).PlanTimerText;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

interface RateLimitDimension {
  limit: number;
  remaining: number;
  reset: string | number;
}

interface RateLimitState {
  requests: RateLimitDimension | null;
  tokens: RateLimitDimension | null;
  inputTokens: RateLimitDimension | null;
  outputTokens: RateLimitDimension | null;
}

const NOW_MS = 1_700_000_000_000;

describe('MB-T-WIREFRAME-T4-BOTTOM-RAIL-CONDUCTOR-CONTROLS WB9 — PlanTimerText (Sub-Q-T4-D=i reuse onRateLimitUpdate)', () => {
  describe('Condition (1): PlanTimerText component is exported', () => {
    it('module `src/chat-shell/plan-timer-text.tsx` exports PlanTimerText', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(PlanTimerText).toBeDefined();
    });
  });

  describe('Condition (2): state=null → placeholder', () => {
    it('renders "Max plan resets in —" when state is null', () => {
      expect(PlanTimerText).toBeDefined();
      render(<PlanTimerText state={null} nowMs={NOW_MS} />);
      const timer = screen.queryByTestId('plan-timer-text');
      expect(timer).not.toBeNull();
      expect(timer!.textContent).toMatch(/Max plan resets in —/);
    });
  });

  describe('Condition (3): requests.reset = +2h47m → "2h 47m" countdown', () => {
    it('renders "Max plan resets in 2h 47m" when requests.reset is now+2h47m', () => {
      expect(PlanTimerText).toBeDefined();
      const resetMs = NOW_MS + (2 * 3600 + 47 * 60) * 1000;
      const state: RateLimitState = {
        requests: { limit: 100, remaining: 50, reset: resetMs },
        tokens: null,
        inputTokens: null,
        outputTokens: null,
      };
      render(<PlanTimerText state={state} nowMs={NOW_MS} />);
      const timer = screen.getByTestId('plan-timer-text');
      expect(timer.textContent).toMatch(/Max plan resets in 2h 47m/);
    });
  });

  describe('Condition (4): sub-minute reset → "0h 0m"', () => {
    it('renders "Max plan resets in 0h 0m" when reset is now+30s', () => {
      expect(PlanTimerText).toBeDefined();
      const resetMs = NOW_MS + 30 * 1000;
      const state: RateLimitState = {
        requests: { limit: 100, remaining: 50, reset: resetMs },
        tokens: null,
        inputTokens: null,
        outputTokens: null,
      };
      render(<PlanTimerText state={state} nowMs={NOW_MS} />);
      const timer = screen.getByTestId('plan-timer-text');
      expect(timer.textContent).toMatch(/Max plan resets in 0h 0m/);
    });
  });

  describe('Condition (5): no available signal → placeholder', () => {
    it('renders placeholder when all dimensions are null', () => {
      expect(PlanTimerText).toBeDefined();
      const state: RateLimitState = {
        requests: null,
        tokens: null,
        inputTokens: null,
        outputTokens: null,
      };
      render(<PlanTimerText state={state} nowMs={NOW_MS} />);
      const timer = screen.getByTestId('plan-timer-text');
      expect(timer.textContent).toMatch(/Max plan resets in —/);
    });
  });
});
