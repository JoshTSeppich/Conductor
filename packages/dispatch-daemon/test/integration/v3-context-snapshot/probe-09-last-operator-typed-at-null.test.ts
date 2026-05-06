/**
 * MB-T10 — Probe P9: last_operator_typed_at always returns null in v3.0.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §4 line 199 (MB-T10 out of scope —
 * "Operator-typed timestamp tracking (deferred to followup; v3.0 always
 * returns null for last_operator_typed_at)"). The schema field is
 * `string().datetime().nullable()` (§11). v3.0 daemon hard-codes null
 * regardless of session state, registry recency, or any other input.
 *
 * Diverges from P8 in that P8 deferral lifts at MB-T11 while P9 deferral
 * lifts at v3.0.x — P9 is intentionally permanently null in v3.0.
 *
 * RED at WB2: route absent → 404 → field never asserted.
 * GREEN at WB3: handler returns the literal null.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P9 last_operator_typed_at always null in v3.0 (deferred to v3.0.x)', () => {
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

  it('returns last_operator_typed_at: null on every request', async () => {
    const handoffPath = await mkdtempPath('mbt10-p09-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, '# anything\n', 'utf8');
    const registryPath = await mkdtempPath('mbt10-p09-reg-', 'sessions.json');
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
      tokenPath: await mkdtempPath('mbt10-p09-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { last_operator_typed_at: string | null };
    expect(body.last_operator_typed_at).toBeNull();
  });
});
