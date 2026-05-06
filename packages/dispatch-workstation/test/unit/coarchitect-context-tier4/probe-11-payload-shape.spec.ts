/**
 * MB-T10 — Probe P11: Tier 4 payload shape across N=1, N=4, N=8 sessions.
 *
 * Verifies that assembleTier4Payload produces a Tier4PayloadSchema-
 * conformant value at the expected v3.0 session counts. The 8-session
 * cap is the rescope §3.5 "capped at 8 sessions = ~24KB max" fixture
 * point; cost-validation under realistic content lands in WB6 (probe
 * P15/P16).
 *
 * RED at WB4: src/coarchitect/tier4-builder.ts does NOT exist yet —
 * vitest fails to load. WB5 creates the module → assertions run.
 */

import { describe, it, expect } from 'vitest';
import { assembleTier4Payload } from '../../../src/coarchitect/tier4-builder.js';
import {
  Tier4PayloadSchema,
  type SessionContextSnapshot,
} from 'dispatch-core/src/v3/schema.js';

function snap(name: string): SessionContextSnapshot {
  return {
    recent_handoff: `# handoff for ${name}\nlatest line`,
    recent_console_tail: `[${name}] last line of stdout\n`,
    pending_intents: [],
    last_action_fired_at: null,
    last_operator_typed_at: null,
  };
}

describe('MB-T10 — P11 Tier 4 payload shape at N={1,4,8}', () => {
  it.each([1, 4, 8])('schema-validates at N=%d sessions', async (n) => {
    const sessionNames = Array.from({ length: n }, (_, i) => `sess-${i}`);
    const payload = await assembleTier4Payload({
      sessionNames,
      fetchSnapshot: async (name) => snap(name),
    });

    // Strict schema parse: rejects unknown keys, validates every field.
    const parsed = Tier4PayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data.sessions_context)).toHaveLength(n);
      for (const name of sessionNames) {
        const entry = parsed.data.sessions_context[name];
        expect(entry).toBeDefined();
        expect(entry?.recent_handoff).toContain(name);
        expect(entry?.recent_console_tail).toContain(name);
      }
    }
  });
});
