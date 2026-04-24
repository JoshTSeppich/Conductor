/**
 * DAEMON-T08 integration — PATCH /v2/sessions/:name/state.
 *
 * Route-level probes with injected tmux stub so Ctrl-C and
 * tmux-kill side effects are observable without hitting real
 * tmux. Production default tmuxOps calls dispatch-core's
 * transport module (SPIKES.md §Spike 01/03, KNOWN from fd v1).
 *
 * Probes (P2–P9, 8 total; unit matrix P1 lives in
 * test/unit/transitions.test.ts):
 *   P2  armed → paused: 200 + no tmux side effect + persisted
 *   P3  armed → held: 200 + sendCtrlC called once with target
 *                       + registry state='held'
 *   P4  armed → killed: 200 + killSession called once + registry
 *                       state='killed'
 *   P5  killed → armed: 422 (terminal state; §6.1)
 *   P6  paused → held: 422 (invalid transition; §6.1)
 *   P7  unknown session: 404
 *   P8  tmux-kill failure tolerated: stub throws on killSession;
 *       response still 200; registry still updated
 *   P9  Ctrl-C failure tolerated (symmetric with P8 per
 *       operator-acked MODELED decision; DAEMON-F10 followup
 *       filed for semantic-distinction reconsideration post-MVP):
 *       stub throws on sendCtrlC; response still 200; registry
 *       state='held'
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
import type { TmuxOps } from '../../src/state/transitions.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('DAEMON-T08 integration — PATCH /v2/sessions/:name/state', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t08-reg-'));
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

  interface TmuxStub {
    calls: Array<{ op: 'sendCtrlC' | 'killSession'; target: string }>;
    throwOnCtrlC: { value: boolean };
    throwOnKill: { value: boolean };
    tmuxOps: TmuxOps;
  }

  function mkTmuxStub(): TmuxStub {
    const calls: Array<{ op: 'sendCtrlC' | 'killSession'; target: string }> = [];
    const throwOnCtrlC = { value: false };
    const throwOnKill = { value: false };
    return {
      calls,
      throwOnCtrlC,
      throwOnKill,
      tmuxOps: {
        async sendCtrlC(target) {
          calls.push({ op: 'sendCtrlC', target });
          if (throwOnCtrlC.value) throw new Error('tmux unavailable');
        },
        async killSession(target) {
          calls.push({ op: 'killSession', target });
          if (throwOnKill.value) throw new Error('tmux unavailable');
        },
        // DAEMON-T09 extended TmuxOps with sendKeys + hasSession.
        // T08 doesn't exercise these; provide no-op satisfiers so
        // the interface contract holds.
        async sendKeys(_target: string, _text: string) {
          /* T08 unused */
        },
        async hasSession(_target: string): Promise<boolean> {
          return true;
        },
      },
    };
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return {
      'x-conductor-token': token ?? '',
      'content-type': 'application/json',
    };
  }

  async function seedAndSpawn(
    initial: Record<string, SessionV2>,
  ): Promise<{ stub: TmuxStub; registryPath: string }> {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, { version: 2, sessions: initial });
    const stub = mkTmuxStub();
    ts = await spawnTestServer({ registryPath, tmuxOps: stub.tmuxOps });
    return { stub, registryPath };
  }

  it('P2 armed → paused: 200, no tmux side effect, registry persisted', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'paused' }),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { state: string };
    expect(body.state).toBe('paused');
    expect(stub.calls).toEqual([]);
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('paused');
  });

  it('P3 armed → held: 200 + sendCtrlC called once with target', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'held' }),
    });
    expect(r.status).toBe(200);
    expect(stub.calls).toEqual([{ op: 'sendCtrlC', target: 'sherpa:0.0' }]);
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('held');
  });

  it('P4 armed → killed: 200 + killSession called once', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'killed' }),
    });
    expect(r.status).toBe(200);
    expect(stub.calls).toEqual([{ op: 'killSession', target: 'sherpa:0.0' }]);
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('killed');
  });

  it('P5 killed → armed: 422 (terminal state per §6.1)', async () => {
    await seedAndSpawn({
      sherpa: mkSession({ state: 'killed' }),
    });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'armed' }),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error?: unknown };
    expect(typeof body.error).toBe('string');
  });

  it('P6 paused → held: 422 (invalid per §6.1)', async () => {
    await seedAndSpawn({
      sherpa: mkSession({ state: 'paused' }),
    });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'held' }),
    });
    expect(r.status).toBe(422);
  });

  it('P7 unknown session: 404', async () => {
    await seedAndSpawn({});
    const r = await fetch(`${ts!.url}/v2/sessions/nope/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'paused' }),
    });
    expect(r.status).toBe(404);
  });

  it('P8 tmux-kill failure tolerated: 200 + registry still updated', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    stub.throwOnKill.value = true;
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'killed' }),
    });
    expect(r.status).toBe(200);
    expect(stub.calls).toEqual([{ op: 'killSession', target: 'sherpa:0.0' }]);
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('killed');
  });

  it('P9 Ctrl-C failure tolerated: 200 + registry state="held"', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    stub.throwOnCtrlC.value = true;
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ state: 'held' }),
    });
    expect(r.status).toBe(200);
    expect(stub.calls).toEqual([{ op: 'sendCtrlC', target: 'sherpa:0.0' }]);
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.state).toBe('held');
  });
});
