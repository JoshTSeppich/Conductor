/**
 * MB-T10 — Probe P7: pending_intents returns the empty array in v3.0.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §4 line 199 (MB-T10 out of scope:
 * "Pending-intent tracking in orchestrator state (lands in MB-T11)").
 * The schema field exists at WB1; the daemon hard-codes [] until
 * MB-T11 wires real pending-intent tracking on the orchestrator side.
 *
 * The schema also accepts a populated array, so this probe additionally
 * asserts the value-level contract that the v3.0 daemon ALWAYS returns
 * [], not "schema-allows-array".
 *
 * RED at WB2: route absent → 404 → pending_intents never asserted.
 * GREEN at WB3: handler returns the literal [] (or equivalent
 * shape-correct empty array).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P7 pending_intents is [] in v3.0 (MB-T11 will populate)', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  async function mkdtempPath(prefix: string, filename: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    return join(dir, filename);
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  it('returns pending_intents as the empty array regardless of session state', async () => {
    const handoffPath = await mkdtempPath('mbt10-p07-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, '# something\n', 'utf8');
    const registryPath = await mkdtempPath('mbt10-p07-reg-', 'sessions.json');
    const session: SessionV2 = {
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: handoffPath,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    };
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: session },
    });

    ts = await spawnTestServer({
      tokenPath: await mkdtempPath('mbt10-p07-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { pending_intents: unknown };
    expect(Array.isArray(body.pending_intents)).toBe(true);
    expect(body.pending_intents).toEqual([]);
  });
});
