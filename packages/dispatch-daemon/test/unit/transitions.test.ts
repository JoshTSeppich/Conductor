/**
 * DAEMON-T08 unit tests for validateTransition per contract §6.1.
 *
 * Table-driven exhaustive matrix over the 4×4 state space. Locks
 * the state machine rules at the unit boundary so route-level
 * tests can focus on integration concerns (side effects,
 * persistence, error shapes).
 *
 * §6.1 valid transitions:
 *   armed  → paused | held | killed
 *   paused → armed | killed
 *   held   → armed | killed
 *   killed → (terminal; no valid transition out)
 *
 * Self-transitions (e.g., armed → armed) are NOT listed in §6.1
 * and therefore invalid. An idempotent PATCH to the current state
 * would have an unclear contract for side effects; treating as
 * 422 is consistent with the listed-transitions-only interpretation.
 */

import { describe, expect, it } from 'vitest';
import { validateTransition } from '../../src/state/transitions.js';
import type { State } from 'dispatch-core/src/v2/schema.js';

describe('DAEMON-T08 unit — validateTransition per §6.1', () => {
  it('P1 matrix: 4×4 (from, to) pairs match §6.1 exactly', () => {
    const cases: Array<{ from: State; to: State; valid: boolean }> = [
      // from armed
      { from: 'armed', to: 'armed', valid: false },
      { from: 'armed', to: 'paused', valid: true },
      { from: 'armed', to: 'held', valid: true },
      { from: 'armed', to: 'killed', valid: true },
      // from paused
      { from: 'paused', to: 'armed', valid: true },
      { from: 'paused', to: 'paused', valid: false },
      { from: 'paused', to: 'held', valid: false },
      { from: 'paused', to: 'killed', valid: true },
      // from held
      { from: 'held', to: 'armed', valid: true },
      { from: 'held', to: 'paused', valid: false },
      { from: 'held', to: 'held', valid: false },
      { from: 'held', to: 'killed', valid: true },
      // from killed (terminal)
      { from: 'killed', to: 'armed', valid: false },
      { from: 'killed', to: 'paused', valid: false },
      { from: 'killed', to: 'held', valid: false },
      { from: 'killed', to: 'killed', valid: false },
    ];
    for (const { from, to, valid } of cases) {
      expect(validateTransition(from, to), `${from} → ${to}`).toBe(valid);
    }
  });
});
