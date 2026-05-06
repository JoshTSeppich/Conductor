/**
 * MB-T10 — Probe P12: Tier 4 payload is gracefully empty when no
 * spawned sessions are registered.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.5: spawnedSessions tier covers "every
 * registered non-killed session." When there are zero, the payload's
 * sessions_context record is an empty object — NOT null, NOT a missing
 * field, NOT an exception. Caller code injects the empty payload as a
 * normal Tier 4 message; the orchestrator sees "(no spawned sessions)"
 * naturally.
 *
 * RED at WB4: src/coarchitect/tier4-builder.ts does NOT exist yet.
 */

import { describe, it, expect, vi } from 'vitest';
import { assembleTier4Payload } from '../../../src/coarchitect/tier4-builder.js';

describe('MB-T10 — P12 Tier 4 payload empty when no spawned sessions', () => {
  it('returns sessions_context = {} when sessionNames is []', async () => {
    const fetchSnapshot = vi.fn();
    const payload = await assembleTier4Payload({
      sessionNames: [],
      fetchSnapshot,
    });

    expect(payload.sessions_context).toEqual({});
    expect(fetchSnapshot).not.toHaveBeenCalled();
  });
});
