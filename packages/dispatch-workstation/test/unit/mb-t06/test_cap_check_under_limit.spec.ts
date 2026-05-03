// MB-T06 cluster 1 RED — isAtCap returns false when active count below cap.
//
// Per V3_TICKETS.md MB-T06 + WORKSTATION_CONTRACT.md §8.1: the spawn
// pipeline checks concurrent-session-cap before invoking buildSpawnEnv.
// isAtCap is the pure boolean predicate at the bottom of that check;
// checkSpawnCapacity (cluster 2) wraps it with the daemon fetch.
//
// Default cap = 5 per MB-T06 ticket-prompt fallback; vision §10.11 Q3
// notes a 4-5 sustained-active range. Cap value is constructor-injected
// for testability and configurable via MB-T11/W-T19 settings UI later
// (see MB-F-MB-T06-CAP-SETTINGS followup).

import { describe, it, expect } from 'vitest';
import { isAtCap } from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 1 — isAtCap under limit', () => {
  it('returns false when activeCount < cap (3 < 5)', () => {
    expect(isAtCap(3, 5)).toBe(false);
  });
});
