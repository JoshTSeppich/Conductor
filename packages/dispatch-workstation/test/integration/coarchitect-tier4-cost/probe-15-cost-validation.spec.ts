/**
 * MB-T10 — Probes P15 + P16 (cost-validation acceptance).
 *
 * CONDUCTOR_V3_RESCOPE.md §3.5 line 136 (operator-revised
 * 2026-05-06 per spikes/MB-T10-COST/README.md Option A): the v3.0
 * Tier 4 acceptance ceiling is **60KB at 8 sessions** — measured
 * 54.40 KB at the schema-permitted maximum field sizes (4KB
 * recent_handoff per Q-MBT10-6=a + 2KB recent_console_tail + 3
 * pending_intents) leaves ~5.6 KB headroom inside the 60KB
 * acceptance window. 60KB is ~7.5% of Sonnet 4.6's 200K-token
 * context window — well within budget.
 *
 * P15 (fixture): 8 sessions × realistic snapshots:
 *   - recent_handoff: 4096 ASCII chars (Q-MBT10-6=a slice ceiling)
 *   - recent_console_tail: 2048 ASCII chars (operator-targeted
 *     stdout-tail size — not capped at the schema layer; this is
 *     the cost-validation fixture upper bound)
 *   - pending_intents: 3 entries with UUID + step/total + summary
 *   - last_action_fired_at: real ISO-8601 datetime
 *   - last_operator_typed_at: null (deferred per rescope §4)
 *
 * P16 (assertion): Buffer.byteLength(JSON.stringify(payload), 'utf8')
 *   must be < 60 * 1024 bytes.
 *
 * P17 (recovery procedure, NOT encoded as a test assertion):
 *   if P16 fails → halt before WB7, file cost-validation spike under
 *   packages/dispatch-workstation/spikes/MB-T10-COST/, surface to
 *   operator. WB7 must NOT ship until cap is restored.
 *
 * Implementation note: this probe uses assembleTier4Payload directly
 * with a mock fetchSnapshot — no live HTTP, no daemon, no IPC. Pure
 * size-budget verification of the v3.0 cap.
 */

import { describe, it, expect } from 'vitest';
import { assembleTier4Payload } from '../../../src/coarchitect/tier4-builder.js';
import type { SessionContextSnapshot } from 'dispatch-core/src/v3/schema.js';

/** Build a 4096-char ASCII handoff — Q-MBT10-6=a slice ceiling. */
function makeHandoff(name: string): string {
  // Mix of markdown-ish content + filler to keep entropy realistic;
  // raw size is what matters for byte-budget. ASCII (1 byte/char).
  const header = `# HANDOFF — ${name}\n\n## Recent activity\n\n`;
  const fillerLine = `- ${name}: did a thing — produced output, ran a check, captured a marker, advanced state.\n`;
  let out = header;
  while (out.length < 4096) {
    out += fillerLine;
  }
  // Slice to exact ceiling per Q-MBT10-6=a.
  return out.slice(out.length - 4096);
}

/** Build a 2048-char ASCII console tail — operator-targeted stdout slice. */
function makeConsoleTail(name: string): string {
  const line = `[${name}] line: build-doc state ok; pending tasks queued; tick.\n`;
  let out = '';
  while (out.length < 2048) {
    out += line;
  }
  return out.slice(out.length - 2048);
}

/** Three pending intents per session — schema-conformant UUIDs. */
function makePendingIntents(name: string): SessionContextSnapshot['pending_intents'] {
  // RFC-4122 v4 UUIDs (hand-built to satisfy z.string().uuid() — the
  // schema validates format, not generation source).
  const baseUuids = [
    '11111111-1111-4111-a111-111111111111',
    '22222222-2222-4222-a222-222222222222',
    '33333333-3333-4333-a333-333333333333',
  ];
  return baseUuids.map((intent_id, idx) => ({
    intent_id,
    step: idx + 1,
    total_steps: 3,
    intent_summary: `[${name}] step ${idx + 1}/3 — synthesize next handoff slice and persist`,
  }));
}

function makeRealisticSnap(name: string): SessionContextSnapshot {
  return {
    recent_handoff: makeHandoff(name),
    recent_console_tail: makeConsoleTail(name),
    pending_intents: makePendingIntents(name),
    last_action_fired_at: '2026-05-06T12:00:00.000Z',
    last_operator_typed_at: null,
  };
}

describe('MB-T10 — P15+P16 Tier 4 cost-validation at N=8 with realistic content', () => {
  it('P15+P16: assembled payload byte-size stays under 60KB at 8 sessions', async () => {
    const sessionNames = Array.from({ length: 8 }, (_, i) => `session-${i + 1}`);
    const fetchSnapshot = async (name: string) => makeRealisticSnap(name);

    const payload = await assembleTier4Payload({ sessionNames, fetchSnapshot });

    // P15 fixture sanity — every session keyed; per-session bytes match
    // the realistic-content fixture spec.
    expect(Object.keys(payload.sessions_context)).toHaveLength(8);
    for (const name of sessionNames) {
      const snap = payload.sessions_context[name];
      expect(snap?.recent_handoff?.length).toBe(4096);
      expect(snap?.recent_console_tail?.length).toBe(2048);
      expect(snap?.pending_intents).toHaveLength(3);
    }

    // P16 acceptance assertion — JSON-serialized UTF-8 byte count under
    // 60KB. CONDUCTOR_V3_RESCOPE.md §3.5 line 136 (operator-revised
    // 2026-05-06 per spikes/MB-T10-COST/README.md Option A): the v3.0
    // ceiling is 60KB at 8 sessions, sized to the schema-permitted
    // maximum per-session field sizes (4KB handoff + 2KB tail +
    // populated pending_intents). 60KB ≈ 7.5% of Sonnet 4.6's 200K-token
    // context window — comfortably within orchestrator-call budget.
    const serialized = JSON.stringify(payload);
    const bytes = Buffer.byteLength(serialized, 'utf8');
    const limit = 60 * 1024;

    // Surface measurement in the assertion message so the cost number is
    // visible in test output regardless of pass/fail (operator-readable).
    expect(
      bytes,
      `MB-T10 cost-validation — assembled Tier 4 payload at N=8: ${bytes} bytes ` +
        `(${(bytes / 1024).toFixed(2)} KB); ceiling ${limit} bytes (60 KB).`,
    ).toBeLessThan(limit);
  });
});
