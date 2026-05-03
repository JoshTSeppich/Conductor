// MB-T06 cluster 1 RED — isAtCap returns false when zero active sessions.
//
// Empty-state guard: a freshly-installed Workstation with no registered
// sessions must allow spawning. This is the canonical happy-path entry
// condition for the spawn flow.

import { describe, it, expect } from 'vitest';
import { isAtCap } from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 1 — isAtCap zero active', () => {
  it('returns false when activeCount is 0 (cap=5)', () => {
    expect(isAtCap(0, 5)).toBe(false);
  });
});
