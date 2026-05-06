/**
 * MB-T10 — Probe P4: recent_handoff returns null when HANDOFF.md mtime is
 * older than the 60-second freshness window.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.5 line 128 ("last 4KB of HANDOFF.md if
 * newer than 60s"). The freshness threshold is exclusive — at exactly
 * 60s the field stays null (we test 90s old which is unambiguously stale).
 *
 * RED at WB2: route absent → 404 → recent_handoff never asserted.
 * GREEN at WB3: stat-based mtime check returns null when over threshold.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P4 recent_handoff is null when mtime older than 60s', () => {
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

  it('returns null for recent_handoff when HANDOFF.md mtime is 90s old', async () => {
    const handoffPath = await mkdtempPath('mbt10-p04-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, 'stale handoff content\n', 'utf8');
    // 90s ago — 30 seconds beyond the 60s window.
    const ninetySecAgo = new Date(Date.now() - 90_000);
    await utimes(handoffPath, ninetySecAgo, ninetySecAgo);

    const registryPath = await mkdtempPath('mbt10-p04-reg-', 'sessions.json');
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
      tokenPath: await mkdtempPath('mbt10-p04-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_handoff: string | null };
    expect(body.recent_handoff).toBeNull();
  });
});
