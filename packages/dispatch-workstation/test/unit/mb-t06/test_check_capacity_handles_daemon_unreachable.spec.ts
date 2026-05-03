// MB-T06 cluster 2 RED — checkSpawnCapacity fails closed when daemon
// is unreachable.
//
// Per WORKSTATION_CONTRACT.md §6.5 fail-closed semantics: if the cap
// check cannot complete (daemon down, network failure, auth missing),
// we MUST NOT silently allow the spawn. The caller (spawn-handler)
// surfaces the daemon failure as a typed error envelope; this test
// asserts checkSpawnCapacity propagates the underlying failure rather
// than swallowing it.

import { describe, it, expect } from 'vitest';
import {
  checkSpawnCapacity,
  type SessionListClient,
} from '../../../src/main/session-cap.js';

describe('MB-T06 cluster 2 — checkSpawnCapacity fail-closed on daemon-unreachable', () => {
  it('propagates daemon-fetch failure (does NOT silently allow spawn)', async () => {
    const client: SessionListClient = {
      async listSessions() {
        const e = new Error('ECONNREFUSED 127.0.0.1:7878') as Error & {
          error_type?: string;
        };
        e.error_type = 'DaemonUnreachable';
        throw e;
      },
    };
    await expect(checkSpawnCapacity(client, 5)).rejects.toMatchObject({
      message: expect.stringContaining('ECONNREFUSED'),
      error_type: 'DaemonUnreachable',
    });
  });
});
