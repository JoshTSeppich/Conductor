// MB-T06 cluster 2 RED — checkSpawnCapacity invokes daemon listSessions.
//
// Per CONDUCTOR_API_CONTRACT.md §4.2: GET /v2/sessions returns
// {sessions: [{name, state, ...}]}. The cluster 2 wrapper around
// isAtCap fetches via the SessionListClient surface and counts active
// sessions. This test asserts the daemon fetch fires and the count is
// derived from the response.

import { describe, it, expect } from 'vitest';
import {
  checkSpawnCapacity,
  type SessionListClient,
  type SessionListResponse,
} from '../../../src/main/session-cap.js';

function makeRecordingClient(response: SessionListResponse): SessionListClient & {
  calls: number;
} {
  let calls = 0;
  const client = {
    get calls() {
      return calls;
    },
    async listSessions() {
      calls += 1;
      return response;
    },
  } as SessionListClient & { calls: number };
  return client;
}

describe('MB-T06 cluster 2 — checkSpawnCapacity fetches sessions from daemon', () => {
  it('invokes listSessions exactly once and uses the count for cap evaluation', async () => {
    const client = makeRecordingClient({
      sessions: [
        { name: 's1', state: 'armed' },
        { name: 's2', state: 'armed' },
        { name: 's3', state: 'paused' },
      ],
    });
    // 3 active < cap=5: should resolve cleanly without throwing.
    await expect(checkSpawnCapacity(client, 5)).resolves.toBeUndefined();
    expect(client.calls).toBe(1);
  });
});
