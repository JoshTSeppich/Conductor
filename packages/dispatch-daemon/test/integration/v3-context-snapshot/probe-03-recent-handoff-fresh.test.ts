/**
 * MB-T10 — Probe P3: recent_handoff returns last 4096 chars of HANDOFF.md
 * when its mtime is within the 60-second freshness window.
 *
 * Per CONDUCTOR_V3_RESCOPE.md §3.5 line 128 ("last 4KB of HANDOFF.md if
 * newer than 60s") + Q-MBT10-6=a (string-char slice via content.slice(-4096)).
 *
 * Seeds a HANDOFF.md with a content payload longer than 4KB so the slice
 * boundary is exercised. Sets file mtime to now-30s (well within window).
 *
 * RED at WB2: route absent → 404 → recent_handoff field never asserted.
 * GREEN at WB3: handler reads + slices + returns the tail in the response.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P3 recent_handoff returns last 4KB when mtime within 60s', () => {
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

  it('returns the last 4096 chars of HANDOFF.md when mtime is 30s old', async () => {
    // 6KB content: last 4096 chars are the tail, first 2048-ish chars
    // must NOT appear in recent_handoff.
    const HEAD_PAYLOAD = 'A'.repeat(2048);
    const TAIL_PAYLOAD = 'B'.repeat(4096);
    const fullContent = HEAD_PAYLOAD + TAIL_PAYLOAD;
    const handoffPath = await mkdtempPath('mbt10-p03-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, fullContent, 'utf8');

    // Set mtime to 30s ago — comfortably inside the 60s window.
    const thirtySecAgo = new Date(Date.now() - 30_000);
    await utimes(handoffPath, thirtySecAgo, thirtySecAgo);

    const registryPath = await mkdtempPath('mbt10-p03-reg-', 'sessions.json');
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
      tokenPath: await mkdtempPath('mbt10-p03-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_handoff: string | null };

    // Q-MBT10-6=a: content.slice(-4096) — exactly the last 4096 chars.
    expect(typeof body.recent_handoff).toBe('string');
    expect(body.recent_handoff).toBe(TAIL_PAYLOAD);
    // The head bytes must not appear (would only happen with no-slice
    // bug or a too-large slice ceiling).
    expect(body.recent_handoff?.includes(HEAD_PAYLOAD)).toBe(false);
  });

  it('returns the full content verbatim when HANDOFF.md is shorter than 4096 chars', async () => {
    const SHORT = '# tiny handoff\n';
    const handoffPath = await mkdtempPath('mbt10-p03b-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, SHORT, 'utf8');
    const recent = new Date(Date.now() - 5_000);
    await utimes(handoffPath, recent, recent);

    const registryPath = await mkdtempPath('mbt10-p03b-reg-', 'sessions.json');
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
      tokenPath: await mkdtempPath('mbt10-p03b-tok-', 'token'),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { recent_handoff: string | null };
    expect(body.recent_handoff).toBe(SHORT);
  });
});
