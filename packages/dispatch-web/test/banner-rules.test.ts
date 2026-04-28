import { describe, it, expect } from 'vitest';
import { evaluateBannerRule } from '../src/banner-rules/evaluate.js';
import type { EventV2Type } from 'dispatch-core/src/v2/schema.js';

// T21 — TICKETS.md §2.6 verbatim rule table codified at unit-test
// layer. 14 cells: 7 §5.3 event types × 2 notifications_available
// states. Spec acceptance: "Tests: rule table covered exhaustively."
//
//   event                         | flag=true                   | flag=false
//   handoff_written               | no banner (native fired)     | toast (auto-dismiss, 5s)
//   cairn_violation_detected      | sticky (defense in depth)    | sticky
//   gate_trip                     | sticky                       | sticky
//   state_changed                 | none (kanban updates)        | none
//   prompt_sent                   | none (ticker only)           | none
//   test_status_updated           | none (focused detail only)   | none
//   commit_landed                 | none (ticker only)           | none

function makeEvent(type: EventV2Type['type']): EventV2Type {
  const timestamp = '2026-04-27T12:00:00.000Z';
  const session = 'sherpa';
  switch (type) {
    case 'handoff_written':
      return {
        type,
        timestamp,
        session,
        data: { path: '/h.md', size_bytes: 1 },
      };
    case 'commit_landed':
      return {
        type,
        timestamp,
        session,
        data: { sha: 'abc1234', subject: 'fix bug', branch: 'main' },
      };
    case 'state_changed':
      return {
        type,
        timestamp,
        session,
        data: { from: 'paused', to: 'armed', triggered_by: 'operator' },
      };
    case 'prompt_sent':
      return {
        type,
        timestamp,
        session,
        data: { archived_to: '/p.md', size_chars: 1 },
      };
    case 'test_status_updated':
      return {
        type,
        timestamp,
        session,
        data: { tests_passing: 1, tests_failing: 0, phase: 'green' },
      };
    case 'cairn_violation_detected':
      return {
        type,
        timestamp,
        session,
        data: { violation_type: 'drift', details: 'detail text' },
      };
    case 'gate_trip':
      return {
        type,
        timestamp,
        session,
        data: { gate_name: 'pre-red', context: 'ctx', expected_action: 'ack' },
      };
  }
}

describe('WEB-T21 evaluateBannerRule — §2.6 rule table exhaustive', () => {
  // ─── handoff_written ────────────────────────────────────────────
  it('handoff_written + flag=true → null (native fired)', () => {
    expect(evaluateBannerRule(makeEvent('handoff_written'), true)).toBeNull();
  });
  it('handoff_written + flag=false → toast (auto-dismiss 5s)', () => {
    const r = evaluateBannerRule(makeEvent('handoff_written'), false);
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('toast');
    expect(r?.severity).toBe('info');
    expect(r?.title).toMatch(/handoff written.*sherpa/i);
  });

  // ─── cairn_violation_detected ───────────────────────────────────
  it('cairn_violation_detected + flag=true → sticky (defense in depth)', () => {
    const r = evaluateBannerRule(makeEvent('cairn_violation_detected'), true);
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('sticky');
    expect(r?.severity).toBe('error');
    expect(r?.title).toMatch(/cairn violation.*sherpa/i);
    expect(r?.body).toMatch(/drift/);
    expect(r?.body).toMatch(/detail text/);
  });
  it('cairn_violation_detected + flag=false → sticky', () => {
    const r = evaluateBannerRule(makeEvent('cairn_violation_detected'), false);
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('sticky');
    expect(r?.severity).toBe('error');
  });

  // ─── gate_trip ──────────────────────────────────────────────────
  it('gate_trip + flag=true → sticky', () => {
    const r = evaluateBannerRule(makeEvent('gate_trip'), true);
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('sticky');
    expect(r?.severity).toBe('warn');
    expect(r?.title).toMatch(/gate trip.*sherpa/i);
    expect(r?.body).toMatch(/pre-red/);
    expect(r?.body).toMatch(/ack/);
  });
  it('gate_trip + flag=false → sticky', () => {
    const r = evaluateBannerRule(makeEvent('gate_trip'), false);
    expect(r).not.toBeNull();
    expect(r?.kind).toBe('sticky');
    expect(r?.severity).toBe('warn');
  });

  // ─── state_changed (no banner regardless of flag) ───────────────
  it('state_changed + flag=true → null (kanban updates)', () => {
    expect(evaluateBannerRule(makeEvent('state_changed'), true)).toBeNull();
  });
  it('state_changed + flag=false → null', () => {
    expect(evaluateBannerRule(makeEvent('state_changed'), false)).toBeNull();
  });

  // ─── prompt_sent (no banner regardless of flag) ─────────────────
  it('prompt_sent + flag=true → null (ticker only)', () => {
    expect(evaluateBannerRule(makeEvent('prompt_sent'), true)).toBeNull();
  });
  it('prompt_sent + flag=false → null', () => {
    expect(evaluateBannerRule(makeEvent('prompt_sent'), false)).toBeNull();
  });

  // ─── test_status_updated (no banner regardless of flag) ─────────
  it('test_status_updated + flag=true → null (focused detail only)', () => {
    expect(
      evaluateBannerRule(makeEvent('test_status_updated'), true),
    ).toBeNull();
  });
  it('test_status_updated + flag=false → null', () => {
    expect(
      evaluateBannerRule(makeEvent('test_status_updated'), false),
    ).toBeNull();
  });

  // ─── commit_landed (no banner regardless of flag) ───────────────
  it('commit_landed + flag=true → null (ticker only)', () => {
    expect(evaluateBannerRule(makeEvent('commit_landed'), true)).toBeNull();
  });
  it('commit_landed + flag=false → null', () => {
    expect(evaluateBannerRule(makeEvent('commit_landed'), false)).toBeNull();
  });
});
