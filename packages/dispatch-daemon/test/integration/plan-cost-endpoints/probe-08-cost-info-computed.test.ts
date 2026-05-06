/**
 * MB-F-DAEMON-PLAN-COST-ENDPOINTS — Probe P8: cost_info computed.
 *
 * Verifies that GET /v2/sessions/:name returns a request-time-computed
 * cost_info sub-object on EVERY session (regardless of registry state),
 * matching the operator-arbitrated I-Q5=a mock values.
 *
 * RED at WB2 — current handler does NOT include cost_info in its
 * response shape. GREEN at WB3 once the handler computes and attaches
 * cost_info on every read.
 *
 * Mock cost_info values (operator-arbitrated I-Q5=a — usd_today
 * matches Layout MOCK_USD_TODAY constant for visual transition
 * symmetry; usd_this_month + token_count from Phase 1 §3.2
 * recommendation accepted by Q-I5=a "etc."):
 *   usd_today:      0.42
 *   usd_this_month: 8.17
 *   token_count:    124500
 *
 * These values MUST match the WB3 daemon implementation. Drift
 * between this test file and routes/sessions.ts will fail this probe.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type {
  SessionV2,
  CostInfo,
} from 'dispatch-core/src/v2/schema.js';

const EXPECTED_MOCK_COST_INFO: CostInfo = {
  usd_today: 0.42,
  usd_this_month: 8.17,
  token_count: 124_500,
};

describe('MB-F-DAEMON-PLAN-COST-ENDPOINTS — P8 cost_info computed', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-p08-tok-'));
    return join(dir, 'token');
  }

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-p08-reg-'));
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

  it('GET /v2/sessions/:name returns cost_info matching the operator-arbitrated mock values', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
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
    const body = (await r.json()) as { cost_info?: CostInfo };
    expect(body.cost_info).toEqual(EXPECTED_MOCK_COST_INFO);
  });

  it('GET /v2/sessions/:name returns cost_info even when registry session has plan_info populated', async () => {
    // Cross-check: cost_info is computed independently of plan_info
    // presence — both fields ship together at WB3, neither blocks
    // the other.
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
          plan_info: {
            tier: 'Team',
            usage_pct: 13,
            reset_ms: 600_000,
            plan_id: 'anthropic-team',
          },
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
    const body = (await r.json()) as { cost_info?: CostInfo };
    expect(body.cost_info).toEqual(EXPECTED_MOCK_COST_INFO);
  });
});
