/**
 * MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — Probe 02 (idempotency).
 *
 * The session_policies cleanup is best-effort housekeeping at the
 * killed-state branch of PATCH /v2/sessions/:name/state. The cleanup
 * MUST be safe when no row exists for the session (e.g., the session
 * was spawned but the operator never assigned a per-session approval
 * policy — sessions.json registry has the v2 row but session_policies
 * has nothing to clean up).
 *
 * Underlying invariant: SQLite DELETE against a non-matching WHERE
 * predicate returns `changes = 0` and does not throw. The probe
 * verifies the route-level surface (200 response + no thrown error)
 * + the DB-level surface (no row before, no row after).
 *
 * Pre-existing terminal-state semantics preserved [KNOWN per
 * sessions-state.test.ts P5]: a subsequent PATCH to anything other
 * than 'killed' on a killed session returns 422 (terminal state per
 * §6.1); the cleanup primitive is not re-invoked because the second
 * transition is rejected before reaching the killed-branch code path.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import type { TmuxOps } from '../../src/state/transitions.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-F-T13-SESSION-POLICY-CLEANUP-ON-KILL — probe-02 — cleanup is idempotent on no-row', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-mbf-t13-idem-'));
    return join(dir, 'sessions.json');
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'idem-target:0.0',
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

  it('PATCH state=killed on a session with NO policy row returns 200 and leaves the table unchanged', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { unset: mkSession() },
    });
    ts = await spawnTestServer({ registryPath, tmuxOps: mkTmuxStub() });

    // Pre-condition: no row for 'unset' (we never PUT one).
    const pre = ts.db
      .prepare(
        `SELECT session_name FROM session_policies WHERE session_name = ?`,
      )
      .get('unset');
    expect(pre).toBeUndefined();

    // Transition to killed. Cleanup branch fires DELETE against an
    // empty result set — SQLite returns changes=0 and does not throw.
    const r = await fetch(`${ts.url}/v2/sessions/unset/state`, {
      method: 'PATCH',
      headers: authHeaders(ts.token),
      body: JSON.stringify({ state: 'killed' }),
    });
    expect(r.status).toBe(200);

    // Post-condition: still no row.
    const post = ts.db
      .prepare(
        `SELECT session_name FROM session_policies WHERE session_name = ?`,
      )
      .get('unset');
    expect(post).toBeUndefined();
  });

  it('deleteSessionPolicy via repeated invocation reports zero changes when no row matches', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { repeat: mkSession() },
    });
    ts = await spawnTestServer({ registryPath, tmuxOps: mkTmuxStub() });

    // Seed a policy row, then invoke deleteSessionPolicy directly via
    // the fixture's db handle TWICE. First call deletes the row
    // (changes=1); second call is a no-op against the now-empty
    // table (changes=0). Both return a valid RunResult — no throw.
    ts.db
      .prepare(
        `INSERT OR REPLACE INTO session_policies
           (session_name, approval_policy, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run('repeat', 'medium', new Date().toISOString());

    const { deleteSessionPolicy } = await import(
      '../../src/db/session-policies.js'
    );

    const first = deleteSessionPolicy(ts.db, 'repeat');
    expect(first.changes).toBe(1);

    const second = deleteSessionPolicy(ts.db, 'repeat');
    expect(second.changes).toBe(0);

    // Third invocation against a session that NEVER had a row — also
    // changes=0, no throw.
    const third = deleteSessionPolicy(ts.db, 'never-existed');
    expect(third.changes).toBe(0);
  });
});
