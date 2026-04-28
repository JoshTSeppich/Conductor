/**
 * CLI-T02 — fd status WS subscription helpers unit tests.
 *
 * Per finding #36 framework: testable helpers (URL builder,
 * pure reducer, health response parser, WS-state→indicator
 * predicate) get red→green TDD; WS integration smoke-tested
 * at CLI-T05 via existing v1 regression suite running with
 * a live daemon.
 *
 * Per Shape A sequencing arbitration (parallel to T01
 * Shape B): runStatusV2 (WS-enabled) ships alongside
 * runStatus (v1 polling); dispatcher routes via default
 * useHttp=false (T01 wiring carries forward; T04 will
 * invert based on /v2/health probe). 25 existing tests
 * stay green at every commit per cairn red/green discipline.
 *
 * Probes (4 logical / 6 effective via it.each on P2):
 *   P1 buildWsUrl(baseUrl, token) → ws:// URL with
 *      URL-encoded token in query string per contract §5.1
 *      ("auth: token in query string ?token=<token>")
 *   P2 applyEventToState reducer — 3 sub-cases via it.each
 *      covering the three reducer categories per refined
 *      P2 scope (corrected at pre-red against verbatim
 *      SessionSchemaV2 fields):
 *        P2a state-mutation (state_changed → session.state
 *            updated; field IS in SessionV2 schema)
 *        P2b observation-marker (handoff_written →
 *            observed_handoff_at set; underlying SessionV2
 *            unchanged because last_handoff_written_at is
 *            NOT in the schema — TUI tracks locally)
 *        P2c informational-feed (cairn_violation_detected →
 *            appended to recent_violations TUI feed;
 *            session state untouched)
 *   P3 parseHealthResponse(json) — extracts notifications_
 *      available boolean; returns false on missing/invalid
 *      (S03 graceful-degradation default per §"Graceful
 *      degradation")
 *   P4 shouldShowFallbackIndicator(wsState) — true when
 *      'disconnected'; false when 'open' or 'connecting'
 */

import { describe, expect, it } from 'vitest';
import { buildWsUrl, shouldShowFallbackIndicator } from '../../src/lib/ws-client.js';
import { applyEventToState, type TuiSessionState } from '../../src/lib/tui-state.js';
import { parseHealthResponse } from '../../src/lib/daemon-client.js';

describe('CLI-T02 — WS helpers + TUI reducer', () => {
  it('P1 buildWsUrl produces ws:// URL with URL-encoded token in query string', () => {
    expect(buildWsUrl('http://127.0.0.1:7878', 'abc123')).toBe(
      'ws://127.0.0.1:7878/v2/events/stream?token=abc123',
    );
    // Tokens with special chars must be URL-encoded
    expect(buildWsUrl('http://127.0.0.1:7878', 'a/b+c=d')).toBe(
      'ws://127.0.0.1:7878/v2/events/stream?token=a%2Fb%2Bc%3Dd',
    );
    // https → wss
    expect(buildWsUrl('https://example.com', 'tok')).toBe(
      'wss://example.com/v2/events/stream?token=tok',
    );
  });

  function mkBaseState(): Map<string, TuiSessionState> {
    const m = new Map<string, TuiSessionState>();
    m.set('sherpa', {
      session: {
        cwd: '/tmp/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
        last_prompt_sent_at: null,
        last_handoff_pulled_at: null,
        state: 'armed',
        last_commit_sha: null,
        last_status_json_at: null,
      },
    });
    return m;
  }

  it.each([
    {
      label: 'P2a state-mutation (state_changed → session.state)',
      event: {
        type: 'state_changed',
        timestamp: '2026-04-28T07:00:00.000Z',
        session: 'sherpa',
        data: { from: 'armed', to: 'paused', triggered_by: 'cairn_violation' },
      },
      assert: (out: Map<string, TuiSessionState>) => {
        // session.state field IS in SessionSchemaV2 — directly mutated
        expect(out.get('sherpa')!.session.state).toBe('paused');
        // No observation markers set on a state_changed event
        expect(out.get('sherpa')!.observed_handoff_at).toBeUndefined();
      },
    },
    {
      label: 'P2b observation-marker (handoff_written → observed_handoff_at)',
      event: {
        type: 'handoff_written',
        timestamp: '2026-04-28T07:01:00.000Z',
        session: 'sherpa',
        data: { path: '/tmp/sherpa/HANDOFF.md', size_bytes: 256 },
      },
      assert: (out: Map<string, TuiSessionState>) => {
        // last_handoff_written_at is NOT in SessionSchemaV2 (verified at
        // pre-red Check 5); TUI tracks observation locally
        expect(out.get('sherpa')!.observed_handoff_at).toBe(
          '2026-04-28T07:01:00.000Z',
        );
        // Underlying SessionV2 unchanged
        expect(out.get('sherpa')!.session.state).toBe('armed');
        expect(out.get('sherpa')!.session.last_handoff_pulled_at).toBeNull();
      },
    },
    {
      label: 'P2c informational-feed (cairn_violation_detected → recent_violations)',
      event: {
        type: 'cairn_violation_detected',
        timestamp: '2026-04-28T07:02:00.000Z',
        session: 'sherpa',
        data: { violation_type: 'drift', details: 'observed' },
      },
      assert: (out: Map<string, TuiSessionState>) => {
        // Informational feed appended; session state untouched.
        // (state change for cairn-triggered transition arrives via
        // separate state_changed event per §6.2)
        expect(out.get('sherpa')!.recent_violations).toEqual([
          {
            violation_type: 'drift',
            details: 'observed',
            at: '2026-04-28T07:02:00.000Z',
          },
        ]);
        expect(out.get('sherpa')!.session.state).toBe('armed');
      },
    },
  ])('P2 applyEventToState — $label', ({ event, assert }) => {
    const out = applyEventToState(mkBaseState(), event);
    assert(out);
  });

  it('P3 parseHealthResponse extracts notifications_available; defaults false', () => {
    expect(
      parseHealthResponse({
        status: 'ok',
        version: '0.0.0',
        uptime_seconds: 5,
        notifications_available: true,
      }),
    ).toEqual({ notifications_available: true });

    expect(
      parseHealthResponse({
        status: 'ok',
        version: '0.0.0',
        uptime_seconds: 5,
        notifications_available: false,
      }),
    ).toEqual({ notifications_available: false });

    // Missing field → false (S03 graceful-degradation default)
    expect(
      parseHealthResponse({
        status: 'ok',
        version: '0.0.0',
        uptime_seconds: 5,
      }),
    ).toEqual({ notifications_available: false });

    // Non-object body → false (defensive)
    expect(parseHealthResponse(null)).toEqual({ notifications_available: false });
    expect(parseHealthResponse('garbage')).toEqual({ notifications_available: false });
  });

  it('P4 shouldShowFallbackIndicator — true on disconnected, false otherwise', () => {
    expect(shouldShowFallbackIndicator('disconnected')).toBe(true);
    expect(shouldShowFallbackIndicator('open')).toBe(false);
    expect(shouldShowFallbackIndicator('connecting')).toBe(false);
  });
});
