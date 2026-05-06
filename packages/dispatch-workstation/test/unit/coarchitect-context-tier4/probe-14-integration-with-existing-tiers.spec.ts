/**
 * MB-T10 — Probe P14: Tier 4 (spawnedSessions) integrates into the
 * existing buildContext pipeline without modifying tiers 1-3 OR
 * altering tier-5/tier-6 content.
 *
 * Q-MBT10-1=a renumber (operator-arbitrated 2026-05-06):
 *   Tier 1 = system prompt          (Anthropic API system param)
 *   Tier 2 = build doc              (first user message)
 *   Tier 3 = filtered daemon state  (RUNNING + IDLE per P-0.4-cross-Q3)
 *   Tier 4 = spawnedSessions  ← NEW (this ticket)
 *   Tier 5 = chat history (last 10 turns)   ← was Tier 4
 *   Tier 6 = triggering event                ← was Tier 5
 *
 * The probe walks the messages[] returned by buildContext and asserts
 * source-order — Tier 4 sits between daemon state (Tier 3) and chat
 * history (Tier 5). Existing tier 1-3 content is preserved verbatim.
 *
 * RED at WB4: existing buildContext does NOT accept a spawnedSessions
 * parameter. WB5 GREEN extends BuildContextParams + the messages
 * pipeline. WB4.5 (separate refactor commit) renumbers existing
 * comments + the coarch-t04/context-builder.spec.ts header before
 * WB5 lands.
 */

import { describe, it, expect } from 'vitest';
import { buildContext } from '../../../src/coarchitect/context-builder.js';
import type { Tier4Payload } from 'dispatch-core/src/v3/schema.js';

const SYSTEM_PROMPT = 'You are the Foxworks Workstation orchestrator.';
const BUILD_DOC = '# build doc\nSHA-marker-doc-id';

const DAEMON_STATE = {
  sessions: [
    { id: 'sess-1', name: 'foxworks-v3', status: 'RUNNING' },
    { id: 'sess-2', name: 'sherpa-main', status: 'IDLE' },
  ],
};

const CHAT_HISTORY = [
  { role: 'user' as const, content: 'PRIOR-TURN-USER' },
  { role: 'assistant' as const, content: 'PRIOR-TURN-ASSISTANT' },
];

const TRIGGERING_EVENT = 'TRIGGER-EVENT-MARKER';

const TIER4: Tier4Payload = {
  sessions_context: {
    'foxworks-v3': {
      recent_handoff: 'TIER4-HANDOFF-MARKER',
      recent_console_tail: 'TIER4-CONSOLE-MARKER',
      pending_intents: [],
      last_action_fired_at: null,
      last_operator_typed_at: null,
    },
  },
};

describe('MB-T10 — P14 Tier 4 integrates without altering tiers 1-3 or shape of 5-6', () => {
  it('appends Tier 4 message between daemon state (Tier 3) and chat history (Tier 5)', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: BUILD_DOC,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: TIER4,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });

    expect(ctx.systemPrompt).toBe(SYSTEM_PROMPT);

    const contents = ctx.messages.map((m) => m.content);
    const tier2Idx = contents.findIndex((c) => c.includes('SHA-marker-doc-id'));
    const tier3Idx = contents.findIndex((c) => c.includes('foxworks-v3') && c.includes('RUNNING'));
    const tier4Idx = contents.findIndex((c) => c.includes('TIER4-HANDOFF-MARKER'));
    const tier5Idx = contents.findIndex((c) => c.includes('PRIOR-TURN-USER'));
    const tier6Idx = contents.findIndex((c) => c.includes(TRIGGERING_EVENT));

    expect(tier2Idx).toBeGreaterThanOrEqual(0);
    expect(tier3Idx).toBeGreaterThan(tier2Idx);
    expect(tier4Idx).toBeGreaterThan(tier3Idx);
    expect(tier5Idx).toBeGreaterThan(tier4Idx);
    expect(tier6Idx).toBeGreaterThan(tier5Idx);
  });

  it('omits Tier 4 message when spawnedSessions is null', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: BUILD_DOC,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });

    const contents = ctx.messages.map((m) => m.content).join('\n---\n');
    expect(contents).not.toContain('TIER4-HANDOFF-MARKER');
    // Tier 3 and Tier 5/6 still present — Tier 4 absence does not
    // disturb the rest of the pipeline.
    expect(contents).toContain('foxworks-v3');
    expect(contents).toContain('PRIOR-TURN-USER');
    expect(contents).toContain(TRIGGERING_EVENT);
  });

  it('emits Tier 4 message even when sessions_context is empty (no spawned sessions)', () => {
    const emptyTier4: Tier4Payload = { sessions_context: {} };
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: BUILD_DOC,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: emptyTier4,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });

    // The Tier 4 message must be present (so the orchestrator sees
    // an explicit "no spawned sessions" signal rather than missing
    // data). Implementation-defined marker: the message includes the
    // string "spawned" or similar; assert via the JSON shape so this
    // probe survives WB5 phrasing choices.
    const tier4Msg = ctx.messages.find((m) =>
      m.content.includes('"sessions_context"'),
    );
    expect(tier4Msg).toBeDefined();
  });
});
