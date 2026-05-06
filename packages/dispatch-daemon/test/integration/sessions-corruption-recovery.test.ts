/**
 * MB-F-DAEMON-REGISTRY-FIX WB4 — end-to-end corruption recovery probe.
 *
 * Reproduces the operator-observed corruption signature byte-for-byte:
 * a valid v2 registry plus an extra `}\n` appended past the closing
 * brace (Phase 1 §2 KNOWN; tail+xxd evidence in operator Phase 2
 * brief FACT-F). Spawns the daemon against the corrupt file and
 * asserts the daemon recovers + serves traffic without operator
 * intervention.
 *
 * Probes:
 *   P1  spawnTestServer succeeds (daemon does NOT crash on a
 *       corrupt registry at startup).
 *   P2  GET /v2/sessions returns 200 with `{"sessions":[]}` —
 *       startup quarantined the corrupt file and replaced it
 *       with a fresh empty v2 registry.
 *   P3  Quarantine sidecar exists at `<registryPath>.corrupt-*`
 *       and contains the original (corrupt) bytes byte-for-byte.
 *   P4  Target file at <registryPath> now parses cleanly as the
 *       fresh empty v2 registry.
 *
 * The narrower per-component recovery probes live at:
 *   - test/unit/persist-read-with-recovery.test.ts (WB1)
 *   - test/integration/startup-corrupt-registry-recovery.test.ts (WB7)
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  appendFile,
  mkdtemp,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('WB4 — daemon recovers from operator-style corrupt sessions.json', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-wb4-reg-'));
    return join(dir, 'sessions.json');
  }

  async function seedCorruptRegistry(path: string): Promise<string> {
    // Write a known-good empty v2 registry, then append `}\n` to
    // reproduce the operator-observed corruption signature exactly.
    const goodBody = `${JSON.stringify({ version: 2, sessions: {} }, null, 2)}\n`;
    await writeFile(path, goodBody, 'utf8');
    await appendFile(path, '}\n', 'utf8');
    return goodBody;
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  it('P1+P2+P3+P4 corrupt-on-load → daemon spawns, quarantines, serves empty list', async () => {
    const registryPath = await mkRegistryPath();
    const goodBody = await seedCorruptRegistry(registryPath);
    const corruptBytes = await readFile(registryPath, 'utf8');
    expect(corruptBytes).toBe(`${goodBody}}\n`);

    // P1: spawnTestServer must succeed (no throw / crash).
    ts = await spawnTestServer({ registryPath });

    // P2: GET /v2/sessions returns 200 + empty list.
    const r = await fetch(`${ts.url}/v2/sessions`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { sessions: unknown[] };
    expect(body).toEqual({ sessions: [] });

    // P3: quarantine sidecar exists with original corrupt bytes.
    const dir = dirname(registryPath);
    const entries = await readdir(dir);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
    const sidecarBody = await readFile(join(dir, sidecars[0]!), 'utf8');
    expect(sidecarBody).toBe(corruptBytes);

    // P4: target file is now fresh v2 empty registry.
    const targetBody = await readFile(registryPath, 'utf8');
    expect(JSON.parse(targetBody)).toEqual({ version: 2, sessions: {} });
  });
});
