/**
 * MB-F-DAEMON-PLAN-COST-ENDPOINTS — Probe P9: end-to-end full shape.
 *
 * Verifies that GET /v2/sessions (LIST) returns each session with the
 * complete enriched shape: existing fields preserved + plan_info
 * passthrough (when present in registry) + cost_info attached on EVERY
 * session (request-time computed). Combines the P7 + P8 invariants
 * across the multi-session list-response path.
 *
 * RED at WB2 — current list handler does not attach cost_info.
 * GREEN at WB3 once the per-session enrichment lands in
 * routes/sessions.ts for the list endpoint.
 *
 * Seeds two sessions:
 *   alpha: HAS plan_info populated → response should carry both
 *          plan_info (passthrough) + cost_info (computed)
 *   zulu:  NO plan_info → response should carry cost_info only
 *
 * Cross-references P2 (existing sessions-read alphabetic-sort probe)
 * to confirm sort-order regression-shield: alpha precedes zulu in
 * response array regardless of plan_info presence.
 *
 * Mock cost_info values must match probe-08 + WB3 implementation.
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

const EXPECTED_MOCK_COST_INFO: CostInfo = {
  usd_today: 0.42,
  usd_this_month: 8.17,
  token_count: 124_500,
};

describe('MB-F-DAEMON-PLAN-COST-ENDPOINTS — P9 end-to-end full shape', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-p09-tok-'));
    return join(dir, 'token');
  }

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-p09-reg-'));
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

  it('GET /v2/sessions returns full enriched shape: plan_info passthrough + cost_info computed per session, alphabetic sort preserved', async () => {
    const alphaPlan: PlanInfo = {
      tier: 'Pro',
      usage_pct: 22,
      reset_ms: 3_600_000,
      plan_id: 'anthropic-pro',
    };

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        zulu: mkSession({
          cwd: '/tmp/zulu',
          tmux_target: 'zulu:0.0',
          handoff_path: '/tmp/zulu/HANDOFF.md',
          // no plan_info on zulu
        }),
        alpha: mkSession({
          cwd: '/tmp/alpha',
          tmux_target: 'alpha:0.0',
          handoff_path: '/tmp/alpha/HANDOFF.md',
          plan_info: alphaPlan,
        }),
      },
    });

    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v2/sessions`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      sessions: Array<{
        name: string;
        plan_info?: PlanInfo;
        cost_info?: CostInfo;
      }>;
    };

    // Alphabetic sort regression shield (mirrors P2 invariant).
    expect(body.sessions.map((s) => s.name)).toEqual(['alpha', 'zulu']);

    // Both sessions get cost_info (computed on every read).
    for (const s of body.sessions) {
      expect(s.cost_info).toEqual(EXPECTED_MOCK_COST_INFO);
    }

    // alpha gets plan_info passthrough; zulu does not.
    const alphaEntry = body.sessions.find((s) => s.name === 'alpha');
    const zuluEntry = body.sessions.find((s) => s.name === 'zulu');
    expect(alphaEntry?.plan_info).toEqual(alphaPlan);
    expect(zuluEntry?.plan_info).toBeUndefined();
  });

  it('GET /v2/sessions on empty registry → still returns {sessions: []} with no plan_info/cost_info anywhere', async () => {
    // Regression-shield for the empty-registry path. P1 in
    // sessions-read.test.ts already covers the bare-empty case;
    // this probe confirms the WB3 enrichment doesn't regress P1
    // when the per-session map() body never executes.
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });

    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v2/sessions`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { sessions: unknown[] };
    expect(body).toEqual({ sessions: [] });
  });
});
