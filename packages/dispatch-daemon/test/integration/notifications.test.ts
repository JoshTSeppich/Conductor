/**
 * DAEMON-T16 — native notifications + GET /v2/health.
 *
 * Subscribes to the bus emit fan-out via the existing
 * bus.subscribe() pattern (T12 symmetric — notifications
 * consumer reads same queue as WS clients). Filters event
 * types per S03 §Event-to-notification mapping (handoff_
 * written, cairn_violation_detected) plus T16 arbitration 1
 * extension (gate_trip → sticky native, parallel to
 * cairn_violation). Calls notify(input) with type-specific
 * shape per arbitration 2.
 *
 * /v2/health route registered by T16 per scope arbitration
 * Option A: S03's notifications_available field requires a
 * working /v2/health endpoint. Decomposition gap caught at
 * pre-reg authoring (parallel to T17 ring-buffer pull-
 * forward in D-3). Auth-exempt per §4.1 + auth.ts:74-76.
 *
 * Probes (7 total per pre-reg):
 *   P1 handoff_written → notify with brief/silent shape
 *      (wait:false, sound:false; size_bytes in message)
 *   P2 cairn_violation_detected → sticky notify
 *      (wait:true; violation_type in message)
 *   P3 gate_trip → sticky notify (arb 1A; gate_name in
 *      message; locks the at-ticket-time arbitration)
 *   P4 commit_landed → notify NOT called (locks event-type
 *      filtering; out of subscription scope)
 *   P5 notificationsAvailable=false → no notify for any of
 *      the eligible types (locks graceful-degradation)
 *   P6 GET /v2/health (no auth header) → 200 with
 *      {status, version, uptime_seconds, notifications_
 *      available}; locks the route registration AND the
 *      auth-exempt path end-to-end
 *   P7 notify throws on first event → warn-log + next event
 *      still processed (locks arb 6A resilience)
 */

import { afterEach, describe, expect, it } from 'vitest';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import type { NotifyInput } from '../../src/notifications/index.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SETTLE_MS = 50;

describe('DAEMON-T16 — notifications + /v2/health', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  it('P1 handoff_written → brief/silent notify (size_bytes in message)', async () => {
    ts = await spawnTestServer({ notificationsAvailable: true });
    ts.emit({
      session: 'sherpa',
      type: 'handoff_written',
      data: { path: '/tmp/HANDOFF.md', size_bytes: 256 },
    });
    await sleep(SETTLE_MS);

    expect(ts.notifyCalls).toHaveLength(1);
    const call = ts.notifyCalls[0];
    expect(call.title).toBe('Foxworks Dispatch — sherpa');
    expect(call.wait).toBe(false);
    expect(call.sound).toBe(false);
    expect(call.message).toContain('256');
  });

  it('P2 cairn_violation_detected → sticky notify (violation_type in message)', async () => {
    ts = await spawnTestServer({ notificationsAvailable: true });
    ts.emit({
      session: 'sherpa',
      type: 'cairn_violation_detected',
      data: { violation_type: 'drift', details: 'unspecified' },
    });
    await sleep(SETTLE_MS);

    expect(ts.notifyCalls).toHaveLength(1);
    const call = ts.notifyCalls[0];
    expect(call.title).toBe('Foxworks Dispatch — sherpa');
    expect(call.wait).toBe(true);
    expect(call.message).toContain('drift');
  });

  it('P3 gate_trip → sticky notify (gate_name in message; arb 1A)', async () => {
    ts = await spawnTestServer({ notificationsAvailable: true });
    ts.emit({
      session: 'sherpa',
      type: 'gate_trip',
      data: {
        gate_name: 'pre-reg',
        context: 'unspecified',
        expected_action: 'review',
      },
    });
    await sleep(SETTLE_MS);

    expect(ts.notifyCalls).toHaveLength(1);
    const call = ts.notifyCalls[0];
    expect(call.title).toBe('Foxworks Dispatch — sherpa');
    expect(call.wait).toBe(true);
    expect(call.message).toContain('pre-reg');
  });

  it('P4 commit_landed → notify NOT called (out of subscription scope)', async () => {
    ts = await spawnTestServer({ notificationsAvailable: true });
    ts.emit({
      session: 'sherpa',
      type: 'commit_landed',
      data: { sha: 'abc1234', subject: 'feat', branch: 'main' },
    });
    ts.emit({
      session: 'sherpa',
      type: 'state_changed',
      data: { from: 'armed', to: 'held', triggered_by: 'operator' },
    });
    ts.emit({
      session: 'sherpa',
      type: 'prompt_sent',
      data: { archived_to: '/p', size_chars: 10 },
    });
    ts.emit({
      session: 'sherpa',
      type: 'test_status_updated',
      data: { tests_passing: 1, tests_failing: 0, phase: 'green' },
    });
    await sleep(SETTLE_MS);

    expect(ts.notifyCalls).toHaveLength(0);
  });

  it('P5 notificationsAvailable=false → no notify for any eligible type', async () => {
    ts = await spawnTestServer({ notificationsAvailable: false });
    ts.emit({
      session: 'sherpa',
      type: 'handoff_written',
      data: { path: '/p', size_bytes: 1 },
    });
    ts.emit({
      session: 'sherpa',
      type: 'cairn_violation_detected',
      data: { violation_type: 'drift', details: 'x' },
    });
    ts.emit({
      session: 'sherpa',
      type: 'gate_trip',
      data: {
        gate_name: 'g',
        context: 'c',
        expected_action: 'e',
      },
    });
    await sleep(SETTLE_MS);

    expect(ts.notifyCalls).toHaveLength(0);
  });

  it('P6 GET /v2/health (no auth header) → 200 with full S03 shape', async () => {
    ts = await spawnTestServer({ notificationsAvailable: true });

    // CRITICAL: no auth header. Locks /v2/health auth-exempt
    // behavior end-to-end (auth.ts:74-76 + route registration).
    const r = await fetch(`${ts.url}/v2/health`);
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      status: string;
      version: string;
      uptime_seconds: number;
      notifications_available: boolean;
    };
    expect(body.status).toBe('ok');
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
    expect(typeof body.uptime_seconds).toBe('number');
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(body.notifications_available).toBe(true);

    // Sub-case: auth-disabled state still works for false flag
    await ts.close();
    ts = await spawnTestServer({ notificationsAvailable: false });
    const r2 = await fetch(`${ts.url}/v2/health`);
    expect(r2.status).toBe(200);
    const body2 = (await r2.json()) as { notifications_available: boolean };
    expect(body2.notifications_available).toBe(false);
  });

  it('P7 notify throws on first event → next event still processed (arb 6A)', async () => {
    let callIndex = 0;
    const calls: NotifyInput[] = [];
    ts = await spawnTestServer({
      notificationsAvailable: true,
      notify: async (input) => {
        calls.push(input);
        callIndex += 1;
        if (callIndex === 1) {
          throw new Error('first notify call fails');
        }
      },
    });

    ts.emit({
      session: 'sherpa',
      type: 'handoff_written',
      data: { path: '/p', size_bytes: 1 },
    });
    await sleep(20);
    ts.emit({
      session: 'sherpa',
      type: 'handoff_written',
      data: { path: '/p', size_bytes: 2 },
    });
    await sleep(SETTLE_MS);

    expect(calls).toHaveLength(2);
    expect(calls[0].message).toContain('1');
    expect(calls[1].message).toContain('2');
  });
});
