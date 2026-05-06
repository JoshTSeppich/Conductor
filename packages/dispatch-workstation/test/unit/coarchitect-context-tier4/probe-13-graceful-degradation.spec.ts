/**
 * MB-T10 — Probe P13: a failed snapshot fetch for one session does NOT
 * block the assembly for other sessions.
 *
 * Per Q-MBT10-7=a (operator arbitration 2026-05-06): "Per-session
 * try/catch with stub injection. Failed sessions get
 * { recent_handoff: null, recent_console_tail: null, pending_intents:
 * [], ... } keyed by name; no metadata key needed in v3.0."
 *
 * Two RED-state observations encoded by this probe:
 *   - The failed session is still keyed in sessions_context (does NOT
 *     drop, does NOT throw, does NOT reject the whole assemble).
 *   - The successful sibling sessions retain their real snapshot data.
 *
 * RED at WB4: src/coarchitect/tier4-builder.ts does NOT exist yet.
 * GREEN at WB5: per-session try/catch with stub injection on failure.
 */

import { describe, it, expect } from 'vitest';
import { assembleTier4Payload } from '../../../src/coarchitect/tier4-builder.js';
import type { SessionContextSnapshot } from 'dispatch-core/src/v3/schema.js';

function realSnap(name: string): SessionContextSnapshot {
  return {
    recent_handoff: `real-handoff-${name}`,
    recent_console_tail: `real-tail-${name}`,
    pending_intents: [],
    last_action_fired_at: null,
    last_operator_typed_at: null,
  };
}

describe('MB-T10 — P13 graceful per-session degradation', () => {
  it('keeps successful siblings + injects stub for the failing session', async () => {
    const fetchSnapshot = async (name: string) => {
      if (name === 'broken') {
        throw new Error('fake daemon unreachable');
      }
      return realSnap(name);
    };

    const payload = await assembleTier4Payload({
      sessionNames: ['alpha', 'broken', 'charlie'],
      fetchSnapshot,
    });

    // All three names keyed. Q-MBT10-7=a explicit: do NOT drop the
    // failing session; surface it with stub fields.
    expect(Object.keys(payload.sessions_context).sort()).toEqual([
      'alpha',
      'broken',
      'charlie',
    ]);

    // Successful siblings retain real data.
    expect(payload.sessions_context['alpha']?.recent_handoff).toBe('real-handoff-alpha');
    expect(payload.sessions_context['charlie']?.recent_console_tail).toBe('real-tail-charlie');

    // Failing session gets the stub (Q-MBT10-7=a verbatim shape).
    const broken = payload.sessions_context['broken'];
    expect(broken).toBeDefined();
    expect(broken?.recent_handoff).toBeNull();
    expect(broken?.recent_console_tail).toBeNull();
    expect(broken?.pending_intents).toEqual([]);
    expect(broken?.last_action_fired_at).toBeNull();
    expect(broken?.last_operator_typed_at).toBeNull();
  });

  it('does not throw even if every fetcher rejects', async () => {
    const fetchSnapshot = async (_name: string) => {
      throw new Error('all fetchers fail');
    };

    const payload = await assembleTier4Payload({
      sessionNames: ['x', 'y'],
      fetchSnapshot,
    });

    expect(Object.keys(payload.sessions_context).sort()).toEqual(['x', 'y']);
    for (const name of ['x', 'y']) {
      const stub = payload.sessions_context[name];
      expect(stub?.recent_handoff).toBeNull();
      expect(stub?.recent_console_tail).toBeNull();
    }
  });
});
