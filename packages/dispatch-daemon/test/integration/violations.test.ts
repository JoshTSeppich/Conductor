/**
 * DAEMON-T17a — POST /v2/sessions/:name/violations integration tests.
 *
 * D-5 cluster-closing ticket. Out-of-band cairn-violation +
 * gate-trip reporting per X2 line 266 + RA-01 Option 1 +
 * contract §6.2.
 *
 * Critical pre-red correction (Round 2 Finding #32 occurrence):
 * §6.2 verbatim says cairn-triggered transitions force session
 * to **paused** (not held). My pre-reg said held throughout;
 * operator ack didn't catch the divergence; pre-red check
 * fallback layer caught it. All references corrected to paused.
 *
 * Source-state matrix per corrected design:
 *   armed  → transition armed→paused; emit state_changed + violation
 *   paused → skip transition; emit only violation event
 *   held   → skip transition; emit only violation event
 *            (§6.1 disallows held→paused; emit-only fills the
 *             §6.2 contract gap with audit-trail rationale.
 *             Documented asymmetry vs PATCH state route, which
 *             is §6.1-strict — held→paused there returns 422.)
 *   killed → 422 verbatim "cannot report violation on terminal
 *            session" per X2 line 266
 *
 * Side effects: armed→paused has NO Ctrl-C per §6.1 verbatim
 * ("operator-initiated; no side effect on CC"). transitions.ts
 * only fires Ctrl-C on armed→held. Cairn is out-of-band review
 * marker; CC continues current step until next handoff cycle
 * after which paused prevents resumption.
 *
 * Emission order: state_changed first, then violation/gate
 * event (arb 3A — consistency with T08 PATCH path's emission
 * point). Lock as MODELED candidate for revision based on UX
 * evidence post-W-5.
 *
 * Response event_id: the violation/gate event's id, not
 * state_changed's (arb 4A — caller acknowledges THAT specific
 * report; state change is derived consequence).
 *
 * Probes (6 total, 7 logical assertions via it.each):
 *   P1 cairn_violation, source=armed → 202 + ring has both
 *      events in order; registry state=paused; response
 *      event_id == violation event id
 *   P2 gate_trip, source=armed → 202 + ring has state_changed
 *      with triggered_by=gate_trip + gate_trip event; state=
 *      paused; event_id == gate_trip event id
 *   P3 it.each([paused, held]) source-state → 202 + ring has
 *      ONLY violation event (no state_changed); state remains
 *      source state
 *   P4 source=killed → 422 verbatim X2 line 266 error message
 *   P5 unknown session → 404 with "no session registered as
 *      \"<name>\"" pattern (consistent with T06/T08/T09)
 *   P6 malformed body → 422 (Zod validation error surfaced)
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../../src/migration/schema-v2.js';
import { createEventRing } from '../../src/events/history.js';
import type { SessionV2, State } from 'dispatch-core/src/v2/schema.js';
import type { TmuxOps } from '../../src/state/transitions.js';

describe('DAEMON-T17a — POST /v2/sessions/:name/violations', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t17a-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkSessionWorkDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t17a-cwd-'));
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/test/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      ...overrides,
    };
  }

  function stubTmuxOps(): TmuxOps {
    return {
      async sendCtrlC(_t: string) {
        /* no-op */
      },
      async killSession(_t: string) {
        /* no-op */
      },
      async sendKeys(_t: string, _x: string) {
        /* no-op */
      },
      async hasSession(_t: string): Promise<boolean> {
        return true;
      },
    };
  }

  function authHeaders(
    token: string | undefined,
  ): Record<string, string> {
    return {
      'x-conductor-token': token ?? '',
      'content-type': 'application/json',
    };
  }

  it('P1 cairn_violation source=armed → 202 + state_changed (to=paused, triggered_by=cairn_violation) THEN cairn_violation_detected', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: join(workDir, 'HANDOFF.md'),
          state: 'armed',
        }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({
      registryPath,
      eventRing: ring,
      tmuxOps: stubTmuxOps(),
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'cairn_violation',
        data: { violation_type: 'drift', details: 'unspecified' },
      }),
    });
    expect(r.status).toBe(202);
    const body = (await r.json()) as { event_id: string };
    expect(typeof body.event_id).toBe('string');
    expect(body.event_id.length).toBeGreaterThan(0);

    // Ring events in oldest-first order (T17 query semantics)
    const events = ring.query({});
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('state_changed');
    expect(events[0].session).toBe('sherpa');
    expect(events[0].data).toEqual({
      from: 'armed',
      to: 'paused',
      triggered_by: 'cairn_violation',
    });
    expect(events[1].type).toBe('cairn_violation_detected');
    expect(events[1].session).toBe('sherpa');
    expect(events[1].data).toEqual({
      violation_type: 'drift',
      details: 'unspecified',
    });

    // Response event_id is the VIOLATION event's id (arb 4A)
    expect(body.event_id).toBe(events[1].event_id);

    // Registry state transitioned to paused
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('paused');
  });

  it('P2 gate_trip source=armed → 202 + state_changed (triggered_by=gate_trip) + gate_trip event', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: join(workDir, 'HANDOFF.md'),
          state: 'armed',
        }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({
      registryPath,
      eventRing: ring,
      tmuxOps: stubTmuxOps(),
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'gate_trip',
        data: {
          gate_name: 'pre-reg',
          context: 'awaiting operator review',
          expected_action: 'review and ack',
        },
      }),
    });
    expect(r.status).toBe(202);
    const body = (await r.json()) as { event_id: string };

    const events = ring.query({});
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('state_changed');
    expect(events[0].data).toEqual({
      from: 'armed',
      to: 'paused',
      triggered_by: 'gate_trip',
    });
    expect(events[1].type).toBe('gate_trip');
    expect(events[1].data).toEqual({
      gate_name: 'pre-reg',
      context: 'awaiting operator review',
      expected_action: 'review and ack',
    });
    expect(body.event_id).toBe(events[1].event_id);

    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('paused');
  });

  it.each([
    { source: 'paused' as State },
    { source: 'held' as State },
  ])(
    'P3 source=$source → 202 + emit-only (no state_changed); state remains $source',
    async ({ source }) => {
      const workDir = await mkSessionWorkDir();
      const registryPath = await mkRegistryPath();
      await writeRegistryV2(registryPath, {
        version: 2,
        sessions: {
          sherpa: mkSession({
            cwd: workDir,
            handoff_path: join(workDir, 'HANDOFF.md'),
            state: source,
          }),
        },
      });

      const ring = createEventRing(100);
      ts = await spawnTestServer({
        registryPath,
        eventRing: ring,
        tmuxOps: stubTmuxOps(),
      });

      const r = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
        method: 'POST',
        headers: authHeaders(ts.token),
        body: JSON.stringify({
          type: 'cairn_violation',
          data: { violation_type: 'fabrication', details: 'inline-test' },
        }),
      });
      expect(r.status).toBe(202);
      const body = (await r.json()) as { event_id: string };

      const events = ring.query({});
      // ONLY the violation event — no state_changed (skip-transition path)
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('cairn_violation_detected');
      expect(events[0].data).toEqual({
        violation_type: 'fabrication',
        details: 'inline-test',
      });
      expect(body.event_id).toBe(events[0].event_id);

      // State unchanged
      const reg = await readRegistryV2(registryPath);
      expect(reg.sessions.sherpa?.state).toBe(source);
    },
  );

  it('P4 source=killed → 422 verbatim "cannot report violation on terminal session"', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: join(workDir, 'HANDOFF.md'),
          state: 'killed',
        }),
      },
    });

    ts = await spawnTestServer({ registryPath });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'cairn_violation',
        data: { violation_type: 'drift', details: 'x' },
      }),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe(
      'cannot report violation on terminal session',
    );
  });

  it('P5 unknown session → 404 with no-session-registered pattern', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });

    const r = await fetch(`${ts.url}/v2/sessions/nope/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'cairn_violation',
        data: { violation_type: 'drift', details: 'x' },
      }),
    });
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe('no session registered as "nope"');
  });

  it('P6 malformed body → 422 (Zod validation)', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: join(workDir, 'HANDOFF.md'),
          state: 'armed',
        }),
      },
    });

    ts = await spawnTestServer({ registryPath });

    // Sub-case A: missing 'type' discriminator
    const r1 = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        data: { violation_type: 'drift', details: 'x' },
      }),
    });
    expect(r1.status).toBe(422);

    // Sub-case B: invalid 'type' value
    const r2 = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'not-a-real-type',
        data: { violation_type: 'drift', details: 'x' },
      }),
    });
    expect(r2.status).toBe(422);

    // Sub-case C: discriminator/data mismatch (gate_trip type with
    // cairn_violation data shape)
    const r3 = await fetch(`${ts.url}/v2/sessions/sherpa/violations`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        type: 'gate_trip',
        data: { violation_type: 'drift', details: 'x' },
      }),
    });
    expect(r3.status).toBe(422);
  });
});
