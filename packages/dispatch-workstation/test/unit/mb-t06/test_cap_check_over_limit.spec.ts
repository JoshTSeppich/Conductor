// MB-T06 cluster 1 RED — isAtCap returns true even when active count
// exceeds cap (data-drift scenario).
//
// Over-cap is theoretically unreachable when only the workstation spawns
// sessions, but the daemon registers anything that POSTs /v2/sessions
// (CLI, scripts, other tools). A workstation that came online into an
// already-over-cap state must still refuse new spawns until the count
// drops back below cap. isAtCap encodes this as `activeCount >= cap`,
// not `activeCount === cap`.

import { describe, it, expect } from 'vitest';
import { isAtCap } from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 1 — isAtCap over limit', () => {
  it('returns true when activeCount > cap (6 > 5) — data-drift case', () => {
    expect(isAtCap(6, 5)).toBe(true);
  });
});
