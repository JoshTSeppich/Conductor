/**
 * MB-F-DAEMON-REGISTRY-FIX WB7 — startup recovers corrupt registry
 * on cold start.
 *
 * Distinct from test/integration/sessions-corruption-recovery.test.ts
 * (WB4) which probes the read-after-recovery API surface. This file
 * focuses on the STARTUP invariants:
 *
 *   P1  Server starts (does not crash) when registry is corrupt
 *       on cold start.
 *   P2  Quarantine sidecar filename matches the
 *       `.corrupt-<ISO-timestamp>` pattern (tests the suffix
 *       contract operator's recovery script will rely on).
 *   P3  After recovery, POST /v2/sessions persists a new session;
 *       GET /v2/sessions/:name reads it back. Proves the recovered
 *       file is WRITABLE through writeRegistryV2, not merely
 *       readable through readRegistryV2.
 *   P4  Recovery hook receives the {path, sidecar, err} record so
 *       operators / observability layers can react to the event
 *       without parsing log streams. Used by tests in lieu of the
 *       silenced fixture logger; exposed in production for the
 *       same reason a watcher-trigger hook is exposed (a
 *       recording test seam doubles as a real observability
 *       primitive).
 *   P5  Two sequential corruption events on the same path produce
 *       two distinct sidecars (timestamps differ; no overwrite).
 *       Defends "what if the operator restarts the daemon AFTER
 *       hand-editing the recovered file again" — should still
 *       quarantine + recover.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendFile,
  mkdtemp,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('WB7 — startup recovers corrupt registry on cold start', () => {
  let ts: TestServer | null = null;
  let ts2: TestServer | null = null;

  afterEach(async () => {
    for (const s of [ts, ts2]) {
      if (s) await s.close().catch(() => {});
    }
    ts = null;
    ts2 = null;
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-wb7-reg-'));
    return join(dir, 'sessions.json');
  }

  async function seedCorruptRegistry(path: string): Promise<void> {
    const goodBody = `${JSON.stringify({ version: 2, sessions: {} }, null, 2)}\n`;
    await writeFile(path, goodBody, 'utf8');
    await appendFile(path, '}\n', 'utf8');
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return {
      'x-conductor-token': token ?? '',
      'content-type': 'application/json',
    };
  }

  it('P1+P2+P3+P4 startup recovers and continues to serve writes', async () => {
    const registryPath = await mkRegistryPath();
    await seedCorruptRegistry(registryPath);

    const recoveryHook = vi.fn();

    // P1: spawnTestServer must succeed.
    ts = await spawnTestServer({
      registryPath,
      // WB7: observation seam — fixture forwards into StartupOpts.
      recoveryHook,
    });

    // P2: sidecar filename matches `.corrupt-<ISO-timestamp>` pattern.
    const dir = dirname(registryPath);
    const entries = await readdir(dir);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
    // ISO timestamp with `:` replaced by `-`. Pattern:
    // .corrupt-YYYY-MM-DDTHH-MM-SS.sssZ
    expect(sidecars[0]).toMatch(
      /^sessions\.json\.corrupt-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/,
    );

    // P3: recovered file is writable. POST /v2/sessions, then read back.
    const post = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
      }),
    });
    expect(post.status).toBe(201);
    const get = await fetch(`${ts.url}/v2/sessions/sherpa`, {
      headers: authHeaders(ts.token),
    });
    expect(get.status).toBe(200);
    const body = (await get.json()) as { name: string; state: string };
    expect(body.name).toBe('sherpa');
    expect(body.state).toBe('armed');

    // P4: recovery hook fired with structured info.
    expect(recoveryHook).toHaveBeenCalledTimes(1);
    const call = recoveryHook.mock.calls[0]![0] as {
      path: string;
      sidecar: string;
      err: string;
    };
    expect(call.path).toBe(registryPath);
    expect(call.sidecar).toBe(join(dir, sidecars[0]!));
    expect(typeof call.err).toBe('string');
    expect(call.err.length).toBeGreaterThan(0);
  });

  it('P5 sequential corruption events produce two distinct sidecars', async () => {
    const registryPath = await mkRegistryPath();
    await seedCorruptRegistry(registryPath);

    const hook1 = vi.fn();
    ts = await spawnTestServer({ registryPath, recoveryHook: hook1 });
    expect(hook1).toHaveBeenCalledTimes(1);
    await ts.close();
    ts = null;

    // Re-corrupt the recovered file and spawn again.
    // Wait long enough that ISO-timestamp differs (>= 1ms).
    await new Promise((r) => setTimeout(r, 5));
    await appendFile(registryPath, '}\n', 'utf8');

    const hook2 = vi.fn();
    ts2 = await spawnTestServer({ registryPath, recoveryHook: hook2 });
    expect(hook2).toHaveBeenCalledTimes(1);

    const dir = dirname(registryPath);
    const entries = await readdir(dir);
    const sidecars = entries.filter((e) =>
      e.startsWith('sessions.json.corrupt-'),
    );
    expect(sidecars).toHaveLength(2);
    expect(sidecars[0]).not.toBe(sidecars[1]);
  });
});
