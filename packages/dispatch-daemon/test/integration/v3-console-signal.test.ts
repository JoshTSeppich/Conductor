/**
 * CONSOLE-T01 cluster 4 — POST /v3/sessions/:name/console/signal.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.4 (frozen at a7e8d4f, v2.2.0).
 * Body: `{signal: "SIGINT" | "SIGTERM" | "SIGHUP"}`. Response (200):
 * `{accepted: true, dispatch_method: "pty_byte"|"send_keys"|"kill_2"|"tmux_kill_session"}`.
 * Errors: SessionNotFound (404), SessionNotRunning (422),
 * SignalNotSupported (422).
 *
 * Per §4.7.1 signal dispatch table (data-grounded by MB-S06 §3):
 *   SIGINT  → tmux send-keys C-c (sends PTY byte 0x03) → "send_keys"
 *   SIGTERM → process.kill(panePid, SIGTERM) → "kill_2"
 *   SIGHUP  → process.kill(panePid, SIGHUP)  → "kill_2"
 *
 * RED state pre-cluster-4: ConsoleOps.sendSignal does not exist; route
 * for /signal not registered. POST returns 404 with default JSON envelope.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { recordingConsoleOps } from '../fixtures/console-ops.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

async function mkRegistryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c4-reg-'));
  return join(dir, 'sessions.json');
}

function makeSession(overrides: Partial<SessionV2> = {}): SessionV2 {
  return {
    name: 'sherpa',
    cwd: '/tmp/repo',
    tmux_target: 'sherpa:0.0',
    handoff_path: '/tmp/repo/HANDOFF.md',
    state: 'armed',
    last_prompt_sent_at: null,
    last_handoff_pulled_at: null,
    last_commit_sha: null,
    last_status_json_at: null,
    ...overrides,
  };
}

describe('CONSOLE-T01 cluster 4 — POST /v3/sessions/:name/console/signal', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  function authedJson(body: unknown): RequestInit {
    return {
      method: 'POST',
      headers: {
        'x-conductor-token': ts?.token ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    };
  }

  it('P1 SIGINT → 200 + dispatch_method="send_keys"; sendSignal called with SIGINT', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/sherpa/console/signal`,
      authedJson({ signal: 'SIGINT' }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { accepted: boolean; dispatch_method: string };
    expect(body.accepted).toBe(true);
    expect(body.dispatch_method).toBe('send_keys');
    expect(recorded.signals.length).toBe(1);
    expect(recorded.signals[0]).toEqual({ target: 'sherpa:0.0', signal: 'SIGINT' });
  });

  it('P2 SIGTERM → 200 + dispatch_method="kill_2"; sendSignal called with SIGTERM', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/sherpa/console/signal`,
      authedJson({ signal: 'SIGTERM' }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { accepted: boolean; dispatch_method: string };
    expect(body.accepted).toBe(true);
    expect(body.dispatch_method).toBe('kill_2');
    expect(recorded.signals[0]).toEqual({ target: 'sherpa:0.0', signal: 'SIGTERM' });
  });

  it('P3 SIGHUP → 200 + dispatch_method="kill_2"', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/sherpa/console/signal`,
      authedJson({ signal: 'SIGHUP' }),
    );
    expect(r.status).toBe(200);
    const body = (await r.json()) as { accepted: boolean; dispatch_method: string };
    expect(body.dispatch_method).toBe('kill_2');
  });

  it('P4 SIGUSR1 → 422 + error.type=SignalNotSupported; sendSignal NOT called', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/sherpa/console/signal`,
      authedJson({ signal: 'SIGUSR1' }),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SignalNotSupported');
    expect(recorded.signals.length).toBe(0);
  });

  it('P5 SessionNotRunning when killed → 422', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { dead: makeSession({ name: 'dead', state: 'killed' }) },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/dead/console/signal`,
      authedJson({ signal: 'SIGINT' }),
    );
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotRunning');
    expect(recorded.signals.length).toBe(0);
  });

  it('P6 SessionNotFound when :name unknown → 404', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const recorded = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: recorded.ops });

    const r = await fetch(
      `${ts.url}/v3/sessions/no-such/console/signal`,
      authedJson({ signal: 'SIGINT' }),
    );
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotFound');
  });
});
