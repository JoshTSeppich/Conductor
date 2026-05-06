/**
 * MB-T10 — Probe P10: assembleTier4Payload calls the snapshot fetcher
 * once per registered session name.
 *
 * The new tier-4 builder is a pure function injected with:
 *   - sessionNames: string[]   (caller filters out killed sessions)
 *   - fetchSnapshot: (name: string) => Promise<SessionContextSnapshot>
 *
 * RED at WB4: src/coarchitect/tier4-builder.ts does NOT exist yet —
 * vitest fails to load this probe file. WB5 GREEN creates the module
 * with the assembleTier4Payload export and this probe flips PASS.
 *
 * GREEN at WB5: each registered name produces exactly one
 * fetchSnapshot call; the resulting Tier4Payload has one record entry
 * per name.
 */

import { describe, it, expect, vi } from 'vitest';
import { assembleTier4Payload } from '../../../src/coarchitect/tier4-builder.js';
import type { SessionContextSnapshot } from 'dispatch-core/src/v3/schema.js';

function emptySnap(): SessionContextSnapshot {
  return {
    recent_handoff: null,
    recent_console_tail: null,
    pending_intents: [],
    last_action_fired_at: null,
    last_operator_typed_at: null,
  };
}

describe('MB-T10 — P10 assembleTier4Payload loops registered sessions', () => {
  it('calls fetchSnapshot exactly once per session name', async () => {
    const fetchSnapshot = vi.fn(async (_name: string) => emptySnap());
    const sessionNames = ['alpha', 'bravo', 'charlie'];

    await assembleTier4Payload({ sessionNames, fetchSnapshot });

    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    const calledWith = fetchSnapshot.mock.calls.map((c) => c[0]).sort();
    expect(calledWith).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('keys the resulting sessions_context record by session name', async () => {
    const fetchSnapshot = vi.fn(async (name: string) => ({
      ...emptySnap(),
      recent_handoff: `handoff-for-${name}`,
    }));
    const payload = await assembleTier4Payload({
      sessionNames: ['alpha', 'bravo'],
      fetchSnapshot,
    });

    expect(Object.keys(payload.sessions_context).sort()).toEqual(['alpha', 'bravo']);
    expect(payload.sessions_context['alpha']?.recent_handoff).toBe('handoff-for-alpha');
    expect(payload.sessions_context['bravo']?.recent_handoff).toBe('handoff-for-bravo');
  });
});
