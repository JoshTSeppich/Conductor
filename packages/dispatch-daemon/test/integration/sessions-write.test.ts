/**
 * DAEMON-T07 — POST /v2/sessions tests.
 *
 * First Blocker 1 enforcement (new sessions start in state='armed')
 * and first Blocker 3 enforcement (409 with verbatim error body
 * when name collides with a killed record).
 *
 * Probes (6 total):
 *   P1  Valid POST (4 fields) → 201 with 10-field response body
 *       (state='armed' per Blocker 1; computed_status='idle' for a
 *       never-prompted session; nulls for timestamp / commit fields).
 *       Response shape matches T06 list-array-item shape per §3.4
 *       "consistency interpretation" of contract's "full session
 *       entry" wording — operator-acked as MODELED decision (b).
 *   P2  Missing required field → 422 + {"error": "..."}
 *   P3  Invalid tmux_target format (fails CreateSessionRequest
 *       regex) → 422
 *   P4  Duplicate name, existing session in state:'armed' →
 *       409 + {"error": "Session \"<name>\" already registered."}
 *       (operator-acked Option 1 for non-killed collisions;
 *       message pattern matches T06's 404 stylistic)
 *   P5  Duplicate name, existing session in state:'killed' →
 *       409 + Blocker 3 verbatim: {"error": "Session name in use
 *       (killed record exists). Pick a new name."}
 *   P6  After successful POST, readRegistryV2 shows the new
 *       session persisted with all expected fields
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('DAEMON-T07 — POST /v2/sessions + Blocker 1/3 enforcement', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t07-reg-'));
    return join(dir, 'sessions.json');
  }

  function mkSession(overrides: Partial<SessionV2> = {}): SessionV2 {
    return {
      cwd: '/tmp/test',
      tmux_target: 'test:0.0',
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
    return {
      'x-conductor-token': token ?? '',
      'content-type': 'application/json',
    };
  }

  it('P1 valid POST → 201 with 10-field body (state=armed, computed_status=idle)', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(201);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({
      name: 'sherpa',
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/sherpa/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
      computed_status: 'idle',
    });
  });

  it('P2 missing required field → 422 + {"error": ...}', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        // name omitted
        cwd: '/tmp/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error?: unknown };
    expect(typeof body.error).toBe('string');
  });

  it('P3 invalid tmux_target format → 422', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        tmux_target: 'not-valid-format',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(422);
  });

  it('P4 duplicate name, existing armed → 409 + "Session \\"<name>\\" already registered."', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
        }),
      },
    });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'sherpa',
        cwd: '/tmp/other',
        tmux_target: 'sherpa:1.0',
        handoff_path: '/tmp/other/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(409);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe('Session "sherpa" already registered.');
  });

  it('P5 duplicate name, existing killed → 409 + Blocker 3 verbatim', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          state: 'killed',
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
        }),
      },
    });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/sherpa/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(409);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe(
      'Session name in use (killed record exists). Pick a new name.',
    );
  });

  it('P6 after successful POST, readRegistryV2 shows new session persisted', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({ registryPath });
    const r = await fetch(`${ts.url}/v2/sessions`, {
      method: 'POST',
      headers: authHeaders(ts.token),
      body: JSON.stringify({
        name: 'beta',
        cwd: '/tmp/beta',
        tmux_target: 'beta:0.0',
        handoff_path: '/tmp/beta/HANDOFF.md',
      }),
    });
    expect(r.status).toBe(201);
    const registry = await readRegistryV2(registryPath);
    expect(registry.sessions.beta).toEqual({
      cwd: '/tmp/beta',
      tmux_target: 'beta:0.0',
      handoff_path: '/tmp/beta/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    });
  });
});
