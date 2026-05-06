/**
 * MB-F-DAEMON-PLAN-COST-ENDPOINTS — Probe P7: plan_info passthrough.
 *
 * Verifies that GET /v2/sessions/:name returns the SessionV2 record's
 * plan_info field verbatim when the registry-persisted session has it.
 *
 * RED at WB2 (no production code change yet); GREEN at WB3 once the
 * route handler attaches the per-session enrichment.
 *
 * RED-forcing assertion: at WB2 the existing handler's `...session`
 * spread MAY propagate plan_info incidentally (since WB1 added it
 * to SessionV2). To make probe-07's main contract test unambiguously
 * RED at WB2, we ALSO assert that the response carries cost_info —
 * which is the WB3 attachment that does NOT exist pre-WB3. This
 * couples plan_info passthrough to the WB3 response-shape envelope:
 * "in the post-WB3 response shape, plan_info is correctly forwarded".
 * Probe-08 covers cost_info value semantics; probe-07 covers
 * plan_info value semantics in the same envelope.
 *
 * Mock plan_info shape (operator-arbitrated I-Q1=a):
 *   { tier, usage_pct (0-100 int), reset_ms (int>=0), plan_id }
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type {
  SessionV2,
  PlanInfo,
  CostInfo,
} from 'dispatch-core/src/v2/schema.js';

describe('MB-F-DAEMON-PLAN-COST-ENDPOINTS — P7 plan_info passthrough', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  async function mkTokenPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-p07-tok-'));
    return join(dir, 'token');
  }

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-p07-reg-'));
    return join(dir, 'sessions.json');
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'test:0.0',
      handoff_path: '/tmp/test/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      ...overrides,
    };
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  it('GET /v2/sessions/:name returns plan_info verbatim when registry record has it', async () => {
    const planInfo: PlanInfo = {
      tier: 'Pro',
      usage_pct: 47,
      reset_ms: 8_040_000,
      plan_id: 'anthropic-pro',
    };
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
          plan_info: planInfo,
        }),
      },
    });

    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      plan_info?: PlanInfo;
      cost_info?: CostInfo;
    };
    expect(body.plan_info).toEqual(planInfo);
    // RED-forcing: cost_info is the WB3 attachment that doesn't
    // exist pre-WB3. Asserting its presence ensures probe-07's
    // main contract test fails at WB2 even when the spread
    // mechanism incidentally propagates plan_info. WB3 must
    // attach cost_info on every read for this to flip GREEN.
    expect(body.cost_info).toBeDefined();
  });

  it('GET /v2/sessions/:name omits plan_info field when registry record has none', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
          // plan_info intentionally absent — exercises the optional path
        }),
      },
    });

    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as Record<string, unknown>;
    // Either plan_info is absent OR explicitly undefined — both are
    // valid for the optional field. We assert NOT a populated object.
    expect(body.plan_info).toBeUndefined();
  });
});
