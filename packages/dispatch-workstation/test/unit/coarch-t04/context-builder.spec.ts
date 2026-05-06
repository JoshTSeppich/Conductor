// COARCH-T04 Red cluster 4 — Tiered context injection.
// Verifies: buildContext() includes system prompt, build-doc frontmatter, relevant
// ticket section, filtered daemon state, chat history; total token estimate within cap.
//
// RED state: src/coarchitect/context-builder.ts absent → import fails → FAIL.
// GREEN state: buildContext implemented → all 6 tests PASS.
//
// Testing mechanism: vitest unit test. No network/Electron.
// Per ratified P-0.4 Q4 (TIERED): system prompt + build doc + filtered daemon state +
// last 10 turns of chat history + triggering event.
// Cite: WORKSTATION_CONTRACT.md §4.3; MB-S01 ADR measured 7,422 avg input tokens.
//
// HALT SURFACE (partial): "relevant ticket section" is implemented as full build-doc
// inclusion (matching system-prompt.md §"Context-injection at runtime" item 2:
// "Loaded build doc content as the first user message"). The ticket test description
// says "not entire build doc body" but this conflicts with the frozen system prompt.
// Surfaced in coord note. Current implementation: full doc included; relevant section
// presence test passes because relevant section IS present in the full doc.
//
// "Filtered daemon state" per P-0.4-cross-Q3: ALL RUNNING + IDLE sessions (not
// "focused session"). No webview IPC needed.
import { describe, it, expect } from 'vitest';
import { buildContext } from '../../../src/coarchitect/context-builder.js';
import type { BuiltContext } from '../../../src/coarchitect/context-builder.js';

const SYSTEM_PROMPT = 'You are the Foxworks Workstation orchestrator.';

const FRONTMATTER_CONTENT = `---
schema_version: "1.0"
doc_id: "test-2026-05-02"
title: "Test Build Plan"
target_repo: "/test/repo"
author: "Test"
created_at: "2026-05-02T00:00:00-06:00"
allowed_action_types: ["send"]
description: "Test doc"
---

## Tickets {#tickets}

### T01: Sample ticket {#tickets-t01}

**Type:** green
**Domain:** coarchitect
**Phase:** Phase 1
**Depends on:** []
**Allowed actions:** [send]
**Status:** pending

**Description:** Sample ticket for tests.

**Red:** test_sample.spec.ts
**Green:** implement.
**Refactor:** None.
`;

const DAEMON_STATE = {
  sessions: [
    { id: 'sess-1', name: 'foxworks-v3', status: 'RUNNING' },
    { id: 'sess-2', name: 'sherpa-main', status: 'IDLE' },
  ],
};

const CHAT_HISTORY = [
  { role: 'user' as const, content: 'What is the status of T01?' },
  { role: 'assistant' as const, content: '{ "type": "card", "action": "send" }' },
];

const TRIGGERING_EVENT = 'Operator asked: show me current build status';

describe('COARCH-T04 cluster 4: context builder', () => {
  it('includes system prompt in built context', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });
    expect(ctx.systemPrompt).toBe(SYSTEM_PROMPT);
  });

  it('includes build-doc frontmatter in messages context', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });
    // Frontmatter doc_id should appear in the build-doc context tier
    const combined = ctx.messages.map((m) => m.content).join('\n');
    expect(combined).toContain('test-2026-05-02');
  });

  it('includes relevant ticket section content (present because full doc is injected)', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });
    // T01 ticket content should appear in context (full doc included)
    const combined = ctx.messages.map((m) => m.content).join('\n');
    expect(combined).toContain('#tickets-t01');
  });

  it('includes filtered daemon state (all RUNNING + IDLE sessions)', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });
    const combined = ctx.messages.map((m) => m.content).join('\n');
    expect(combined).toContain('sess-1');
    expect(combined).toContain('RUNNING');
  });

  it('includes last N turns of chat history (up to 10 per P-0.4-cross-Q4)', () => {
    const longHistory = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn-${i}`,
    }));
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: longHistory,
      triggeringEvent: TRIGGERING_EVENT,
    });
    // Should include last 10 turns only
    const historyMessages = ctx.messages.filter((m) => m.role !== 'system');
    const historyContent = historyMessages.map((m) => m.content).join('\n');
    expect(historyContent).toContain('turn-14');
    expect(historyContent).not.toContain('turn-4'); // turn-4 is older than last 10
  });

  it('total estimated token count stays under 100k (Sonnet 4.6 context window is 200k)', () => {
    const ctx = buildContext({
      systemPrompt: SYSTEM_PROMPT,
      buildDocContent: FRONTMATTER_CONTENT,
      buildDocSha: 'abc123',
      daemonState: DAEMON_STATE,
      spawnedSessions: null,
      chatHistory: CHAT_HISTORY,
      triggeringEvent: TRIGGERING_EVENT,
    });
    // Rough estimate: chars / 4 ≈ tokens (MB-S01 ADR: 7,422 avg for a 5-ticket doc)
    const totalChars =
      ctx.systemPrompt.length +
      ctx.messages.reduce((s, m) => s + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    expect(
      estimatedTokens,
      `Estimated ${estimatedTokens} tokens; must be < 100,000 (Sonnet 4.6 200k context window)`,
    ).toBeLessThan(100_000);
  });
});
