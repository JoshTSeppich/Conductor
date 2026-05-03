// MB-T06 cluster 1 RED — isAtCap returns true when active count equals cap.
//
// At-cap is the boundary condition that short-circuits spawn. The prompt
// pre-spawn check fires when isAtCap returns true, surfacing a
// SessionCapExceeded WorkstationError before any tmux/daemon work.

import { describe, it, expect } from 'vitest';
import { isAtCap } from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 1 — isAtCap at limit', () => {
  it('returns true when activeCount === cap (5 === 5)', () => {
    expect(isAtCap(5, 5)).toBe(true);
  });
});
