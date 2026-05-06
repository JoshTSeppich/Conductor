/**
 * MB-T10 — Probe P5: recent_handoff returns null when the per-session
 * HANDOFF.md file is absent (ENOENT on stat/readFile).
 *
 * Diverges from `routes/handoff.ts:64-67` behavior intentionally: the
 * /v2 handoff route 404s on ENOENT (it's the contract for "pull"); the
 * /v3 context-snapshot endpoint is best-effort observability so it
 * degrades to `recent_handoff: null` instead of failing the whole
 * snapshot. Documented in §11 schema doc-comment + diagnose §5.
 *
 * RED at WB2: route absent → 404 → recent_handoff never asserted.
 * GREEN at WB3: ENOENT swallowed → recent_handoff null; status 200.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P5 recent_handoff is null when HANDOFF.md is absent', () => {
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

  it('returns 200 with recent_handoff:null when HANDOFF.md does not exist on disk', async () => {
    // handoff_path points at a path inside an mkdtemp dir but the file
    // is never created — readFile/stat ENOENT exercises the absent path.
    const ghostPath = await mkdtempPath('mbt10-p05-ho-', 'HANDOFF.md');
    // Intentionally do NOT writeFile here.

    const registryPath = await mkdtempPath('mbt10-p05-reg-', 'sessions.json');
    const session: SessionV2 = {
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: ghostPath,
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
      tokenPath: await mkdtempPath('mbt10-p05-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    // Best-effort observability: 200 even though the file is absent.
    // Diverges from /v2/handoff (which 404s on ENOENT) — documented in
    // routes/v3/context-snapshot.ts header per WB3.
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_handoff: string | null };
    expect(body.recent_handoff).toBeNull();
  });
});
