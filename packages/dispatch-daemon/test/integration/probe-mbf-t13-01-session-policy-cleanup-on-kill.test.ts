/**
 * MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — Probe 01.
 *
 * Verifies that PATCH /v2/sessions/:name/state with state='killed' deletes
 * the corresponding `session_policies` row (closure of FOLLOWUPS.md:170
 * Q-MBT13-1=a side-effect gap). The row body's "stale row could be picked
 * up by a re-spawned session under the same name" risk is closed by this
 * cleanup primitive.
 *
 * Pattern composed per Phase 1 diagnose §I:
 *   - seed registry via writeRegistryV2 (sessions-state.test.ts:117-122)
 *   - PUT /v3/sessions/:name/approval-policy to create the policy row
 *     (approval-policy.ts:94-115)
 *   - PATCH /v2/sessions/:name/state to 'killed'
 *   - SELECT FROM session_policies WHERE session_name=? returns undefined
 *
 * RED at this commit: cleanup not yet wired; SELECT returns the row.
 * GREEN at WB1 GREEN: cleanup wired; SELECT returns undefined.
 *
 * Pre-existing terminal-state side effects preserved:
 *   - registry state persisted as 'killed' (P4 of sessions-state.test.ts)
 *   - tmux killSession called (P4)
 *   - watcherManager.detach fires (T13)
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import type { TmuxOps } from '../../src/state/transitions.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — probe-01 — row deleted on PATCH→killed', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-mbf-t13-reg-'));
    return join(dir, 'sessions.json');
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'cleanup-target:0.0',
      handoff_path: '/tmp/test/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      ...overrides,
    };
  }

  function mkTmuxStub(): TmuxOps {
    return {
      async sendCtrlC(_target: string) {
        /* no-op */
      },
      async killSession(_target: string) {
        /* no-op */
      },
      async sendKeys(_target: string, _text: string) {
        /* unused */
      },
      async hasSession(_target: string): Promise<boolean> {
        return true;
      },
    };
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return {
      'x-conductor-token': token ?? '',
      'content-type': 'application/json',
    };
  }

  it('PATCH state=killed deletes the session_policies row', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { cleanup: mkSession() },
    });
    ts = await spawnTestServer({ registryPath, tmuxOps: mkTmuxStub() });

    // Seed a policy row via the production PUT route.
    const putR = await fetch(
      `${ts.url}/v3/sessions/cleanup/approval-policy`,
      {
        method: 'PUT',
        headers: authHeaders(ts.token),
        body: JSON.stringify({ approval_policy: 'tight' }),
      },
    );
    expect(putR.status).toBe(200);

    // Pre-condition: row exists.
    const pre = ts.db
      .prepare(
        `SELECT session_name, approval_policy
         FROM session_policies WHERE session_name = ?`,
      )
      .get('cleanup') as { approval_policy: string } | undefined;
    expect(pre).toBeDefined();
    expect(pre?.approval_policy).toBe('tight');

    // Transition to killed.
    const r = await fetch(`${ts.url}/v2/sessions/cleanup/state`, {
      method: 'PATCH',
      headers: authHeaders(ts.token),
      body: JSON.stringify({ state: 'killed' }),
    });
    expect(r.status).toBe(200);

    // Post-condition: row deleted by the killed-branch cleanup.
    const post = ts.db
      .prepare(
        `SELECT session_name, approval_policy
         FROM session_policies WHERE session_name = ?`,
      )
      .get('cleanup') as { approval_policy: string } | undefined;
    expect(post).toBeUndefined();
  });

  it('PATCH state=paused does NOT delete the row (non-terminal transition)', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { keep: mkSession() },
    });
    ts = await spawnTestServer({ registryPath, tmuxOps: mkTmuxStub() });

    const putR = await fetch(
      `${ts.url}/v3/sessions/keep/approval-policy`,
      {
        method: 'PUT',
        headers: authHeaders(ts.token),
        body: JSON.stringify({ approval_policy: 'loose' }),
      },
    );
    expect(putR.status).toBe(200);

    const r = await fetch(`${ts.url}/v2/sessions/keep/state`, {
      method: 'PATCH',
      headers: authHeaders(ts.token),
      body: JSON.stringify({ state: 'paused' }),
    });
    expect(r.status).toBe(200);

    const post = ts.db
      .prepare(
        `SELECT session_name, approval_policy
         FROM session_policies WHERE session_name = ?`,
      )
      .get('keep') as { approval_policy: string } | undefined;
    expect(post).toBeDefined();
    expect(post?.approval_policy).toBe('loose');
  });
});
