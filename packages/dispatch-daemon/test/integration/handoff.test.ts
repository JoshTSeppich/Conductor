/**
 * DAEMON-T10 — GET /v2/sessions/:name/handoff integration tests.
 *
 * Probes (4 total):
 *   P1  Valid pull (compound):
 *         - 200 + response shape matches PullHandoffResponse
 *           ({content, written_at: ISO, archived_to})
 *         - content == handoff file contents
 *         - written_at == fs.stat mtime as ISO string
 *         - archive file exists at archived_to with same content
 *         - clipboardCopy stub recorded one call with content
 *         - session.last_handoff_pulled_at updated in registry
 *   P2  Unknown session → 404 + {error: "no session registered as ..."}
 *   P3  Session exists but handoff file missing (ENOENT) → 404 +
 *       {error: "handoff file not found at <path>"} (path in body for
 *       operator debuggability per MODELED decision)
 *   P4  clipboardCopy throws → 200 still returned (best-effort
 *       clipboard); content + archive + registry update still happen.
 *       MODELED parallel to T08 tmux-failure tolerance.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('DAEMON-T10 — GET /v2/sessions/:name/handoff', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t10-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkArchiveRoot(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t10-arc-'));
  }

  async function mkSessionWorkDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t10-cwd-'));
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'sherpa:0.0',
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

  it('P1 valid pull: 200 + shape, content, archive, clipboard, registry update', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    const handoffContent = 'phase complete; see archive\n';
    await writeFile(handoffPath, handoffContent, 'utf8');
    // Pin mtime so written_at assertion is deterministic.
    const mtime = new Date('2026-04-23T18:00:00.000Z');
    await utimes(handoffPath, mtime, mtime);

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: handoffPath,
        }),
      },
    });

    const archiveRoot = await mkArchiveRoot();
    const clipboardCalls: string[] = [];

    ts = await spawnTestServer({
      registryPath,
      archiveRoot,
      clipboardCopy: async (content) => {
        clipboardCalls.push(content);
      },
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/handoff`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      content: string;
      written_at: string;
      archived_to: string;
    };

    expect(body.content).toBe(handoffContent);
    expect(body.written_at).toBe(mtime.toISOString());
    expect(typeof body.archived_to).toBe('string');
    expect(body.archived_to.startsWith(join(archiveRoot, 'sherpa'))).toBe(true);

    // Archive file exists with same content
    const archived = await readFile(body.archived_to, 'utf8');
    expect(archived).toBe(handoffContent);

    // Clipboard called exactly once with the content
    expect(clipboardCalls).toEqual([handoffContent]);

    // Registry updated
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.last_handoff_pulled_at).toBeTruthy();
    // Pulled-at timestamp should parse as a valid ISO string close to now
    const pulledAt = new Date(reg.sessions.sherpa!.last_handoff_pulled_at!);
    expect(Number.isFinite(pulledAt.getTime())).toBe(true);
  });

  it('P2 unknown session → 404 + {error: "no session registered as ..."}', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions/nope/handoff`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe('no session registered as "nope"');
  });

  it('P3 handoff file missing (ENOENT) → 404 + {error includes path}', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    // Intentionally do NOT create the file.

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: handoffPath,
        }),
      },
    });

    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions/sherpa/handoff`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string };
    expect(body.error).toContain('handoff file not found');
    expect(body.error).toContain(handoffPath);
  });

  it('P4 clipboardCopy throws → 200 still returned; content + archive + registry intact', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    const handoffContent = 'pulled despite clipboard failure\n';
    await writeFile(handoffPath, handoffContent, 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: handoffPath,
        }),
      },
    });

    const archiveRoot = await mkArchiveRoot();
    ts = await spawnTestServer({
      registryPath,
      archiveRoot,
      clipboardCopy: async (_content) => {
        throw new Error('pbcopy unavailable');
      },
    });

    const r = await fetch(`${ts.url}/v2/sessions/sherpa/handoff`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as {
      content: string;
      archived_to: string;
    };
    expect(body.content).toBe(handoffContent);
    expect(body.archived_to.startsWith(join(archiveRoot, 'sherpa'))).toBe(true);

    // Archive still written
    const archived = await readFile(body.archived_to, 'utf8');
    expect(archived).toBe(handoffContent);

    // Registry still updated
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.last_handoff_pulled_at).toBeTruthy();

    // Sanity: stat the handoff to confirm fs is sane
    await stat(handoffPath);
  });
});
