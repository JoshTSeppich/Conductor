/**
 * DAEMON-T06 — GET /v2/sessions + GET /v2/sessions/:name tests.
 *
 * First D-2 ticket; first production consumer of T05's
 * readRegistryV2/writeRegistryV2 layer.
 *
 * Probes (6 total):
 *   P1  GET /v2/sessions on empty registry → {"sessions": []}
 *   P2  GET /v2/sessions with 2 sessions seeded in non-alphabetic
 *       order → response array sorted alphabetically; each element
 *       has name + 8 SessionV2 fields + computed_status
 *   P3  GET /v2/sessions/:name on existing session → full shape
 *       with status_json:null and recent_events:[] (MODELED stubs
 *       per contract §4.2; T15 populates status_json, T17 populates
 *       recent_events)
 *   P4  GET /v2/sessions/unknown → 404 + {"error": "no session
 *       registered as \"unknown\""}
 *   P5  computed_status: last_prompt_sent_at=null → "idle"
 *       (exercises deriveState via the list response)
 *   P6  computed_status: last_prompt_sent_at<handoff mtime,
 *       no pull → "awaiting_review" (exercises real fs.stat on
 *       a mkdtemp-created handoff file with utimes-controlled mtime)
 *
 * Seeding: writeRegistryV2 pre-populates registryPath before each
 * spawnTestServer call. No mocks; real Fastify, real fs, real HTTP.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('DAEMON-T06 — GET /v2/sessions + GET /v2/sessions/:name', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* best-effort */
      });
      ts = null;
    }
  });

  async function mkTokenPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t06-tok-'));
    return join(dir, 'token');
  }

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-t06-reg-'));
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
    return { 'x-conductor-token': token ?? '' };
  }

  it('P1 GET /v2/sessions on empty registry → {"sessions": []}', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { sessions: unknown[] };
    expect(body).toEqual({ sessions: [] });
  });

  it('P2 GET /v2/sessions with 2 sessions (non-alphabetic seed) → sorted alphabetically', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        zulu: mkSession({ cwd: '/tmp/zulu', tmux_target: 'zulu:0.0', handoff_path: '/tmp/zulu/HANDOFF.md' }),
        alpha: mkSession({ cwd: '/tmp/alpha', tmux_target: 'alpha:0.0', handoff_path: '/tmp/alpha/HANDOFF.md' }),
      },
    });
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { sessions: Array<Record<string, unknown>> };
    expect(body.sessions.map((s) => s.name)).toEqual(['alpha', 'zulu']);
    for (const s of body.sessions) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('cwd');
      expect(s).toHaveProperty('tmux_target');
      expect(s).toHaveProperty('handoff_path');
      expect(s).toHaveProperty('last_prompt_sent_at');
      expect(s).toHaveProperty('last_handoff_pulled_at');
      expect(s).toHaveProperty('state');
      expect(s).toHaveProperty('last_commit_sha');
      expect(s).toHaveProperty('last_status_json_at');
      expect(s).toHaveProperty('computed_status');
    }
  });

  it('P3 GET /v2/sessions/:name → full shape with status_json:null + recent_events:[]', async () => {
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
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions/sherpa`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(200);
    const body = (await r.json()) as Record<string, unknown>;
    expect(body.name).toBe('sherpa');
    expect(body.cwd).toBe('/tmp/sherpa');
    expect(body.state).toBe('armed');
    expect(body.status_json).toBeNull();
    expect(body.recent_events).toEqual([]);
    expect(body).toHaveProperty('computed_status');
  });

  it('P4 GET /v2/sessions/unknown → 404 + {"error": "no session registered as \\"unknown\\""}', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions/unknown`, { headers: authHeaders(ts.token) });
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string };
    expect(body.error).toBe('no session registered as "unknown"');
  });

  it('P5 computed_status: never-prompted session → "idle"', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        fresh: mkSession({
          cwd: '/tmp/fresh',
          tmux_target: 'fresh:0.0',
          handoff_path: '/tmp/fresh/HANDOFF.md',
          last_prompt_sent_at: null,
        }),
      },
    });
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions/fresh`, { headers: authHeaders(ts.token) });
    const body = (await r.json()) as { computed_status: string };
    expect(body.computed_status).toBe('idle');
  });

  it('P6 computed_status: prompt sent + fresh handoff mtime → "awaiting_review"', async () => {
    const workDir = await mkdtemp(join(tmpdir(), 'fd-t06-cwd-'));
    const handoffPath = join(workDir, 'HANDOFF.md');
    const promptSentAt = new Date('2026-04-23T14:00:00.000Z');
    const handoffMtime = new Date('2026-04-23T14:05:00.000Z');

    await writeFile(handoffPath, 'fresh handoff', 'utf8');
    await utimes(handoffPath, handoffMtime, handoffMtime);

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          tmux_target: 'sherpa:0.0',
          handoff_path: handoffPath,
          last_prompt_sent_at: promptSentAt.toISOString(),
        }),
      },
    });
    ts = await spawnTestServer({
      tokenPath: await mkTokenPath(),
      registryPath,
    });
    const r = await fetch(`${ts.url}/v2/sessions/sherpa`, { headers: authHeaders(ts.token) });
    const body = (await r.json()) as { computed_status: string };
    expect(body.computed_status).toBe('awaiting_review');
  });
});
