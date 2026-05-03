// MB-T06 cluster 2 RED — checkSpawnCapacity filters archived sessions
// out of the cap count.
//
// Per V3_TICKETS.md MB-T06: "RUNNING + IDLE count toward cap;
// AWAITING REVIEW, STALE, KILLED, archived do not." First-pass filter
// implemented in cluster 1 GREEN: state !== 'archived' && state !== 'killed'.
// (Finer state-mapping refinement deferred as
// MB-F-MB-T06-CAP-STATE-FILTER-PRECISION per cluster 1 GREEN.)
//
// This test exercises the archive filter: a daemon response with 3
// active + 4 archived must yield activeCount=3, not 7.

import { describe, it, expect } from 'vitest';
import {
  checkSpawnCapacity,
  SessionCapExceededError,
  type SessionListClient,
} from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 2 — checkSpawnCapacity filters archived sessions', () => {
  it('counts only non-archived sessions when computing activeCount', async () => {
    const client: SessionListClient = {
      async listSessions() {
        return {
          sessions: [
            { name: 'a', state: 'armed' },
            { name: 'b', state: 'paused' },
            { name: 'c', state: 'held' },
            { name: 'd', state: 'archived' },
            { name: 'e', state: 'archived' },
            { name: 'f', state: 'killed' },
            { name: 'g', state: 'archived' },
          ],
        };
      },
    };
    // 3 active (a, b, c) < cap=5: should pass.
    await expect(checkSpawnCapacity(client, 5)).resolves.toBeUndefined();
    // Reduce cap to 3 → 3 active === cap=3: should throw at-cap.
    await expect(checkSpawnCapacity(client, 3)).rejects.toBeInstanceOf(
      SessionCapExceededError,
    );
    // The thrown error reports activeCount=3 (filter excluded the
    // 4 archived/killed entries).
    try {
      await checkSpawnCapacity(client, 3);
      expect.fail('should have thrown');
    } catch (err) {
      const e = err as SessionCapExceededError;
      expect(e.activeCount).toBe(3);
      expect(e.cap).toBe(3);
    }
  });
});
