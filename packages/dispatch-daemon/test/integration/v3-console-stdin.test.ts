/**
 * CONSOLE-T01 cluster 2 — POST /v3/sessions/:name/console/stdin.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.2 (frozen at a7e8d4f, v2.2.0):
 * write bytes to the named session's tmux PTY STDIN. Body shape:
 * `{bytes: string, encoding?: "utf8" | "base64"}`. Response (200):
 * `{accepted: true, stdin_seq: number}`. Errors: SessionNotFound (404),
 * SessionNotRunning (422 — session in killed state), EncodingInvalid
 * (422), BackpressureRejected (503).
 *
 * Per §4.7.2 implementation note (CRITICAL): this endpoint MUST use a
 * NEW pasteRawBytes helper using `tmux paste-buffer -r`. Per MB-S06 §3
 * KNOWN finding, the existing sendKeys helper translates LF→CR for
 * prompt-submit semantics — conflating would silently corrupt
 * operator-typed multi-line input. The fixture's recordingConsoleOps
 * captures every pasteRawBytes call so tests assert byte-faithfulness.
 *
 * RED state pre-cluster-2: src/console/paste-raw-bytes.ts and the
 * src/routes/v3/console.ts route are not yet wired into startup; POST
 * returns 404 (the JSON 404 envelope from setNotFoundHandler).
 * spawnTestServer's consoleOps option does not yet exist; tests
 * import it expecting that GREEN ships both the option and the
 * default impl.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import type { ConsoleOps } from '../../src/console/console-ops.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

interface RecordedPaste {
  target: string;
  bytes: Buffer;
}

function recordingConsoleOps(): {
  ops: ConsoleOps;
  recorded: RecordedPaste[];
} {
  const recorded: RecordedPaste[] = [];
  const ops: ConsoleOps = {
    async pasteRawBytes(target: string, bytes: Buffer): Promise<void> {
      recorded.push({ target, bytes: Buffer.from(bytes) });
    },
  };
  return { ops, recorded };
}

async function mkRegistryPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'console-t01-c2-reg-'));
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

describe('CONSOLE-T01 cluster 2 — POST /v3/sessions/:name/console/stdin', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  it('P1 valid utf8 POST → 200 + {accepted, stdin_seq=1}; pasteRawBytes called with raw bytes', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const { ops, recorded } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'hello, 世界 🦊\n' }),
    });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { accepted: boolean; stdin_seq: number };
    expect(body.accepted).toBe(true);
    expect(body.stdin_seq).toBe(1);

    expect(recorded.length).toBe(1);
    expect(recorded[0].target).toBe('sherpa:0.0');
    expect(recorded[0].bytes.toString('utf8')).toBe('hello, 世界 🦊\n');
    // Critical: the LF (0x0a) at end is NOT translated to CR (0x0d).
    // (The pasteRawBytes helper uses paste-buffer -r per MB-S06 §3.)
    expect(recorded[0].bytes[recorded[0].bytes.length - 1]).toBe(0x0a);
  });

  it('P1b stdin_seq increments monotonically per session per call', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const { ops } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    const seqs: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
        method: 'POST',
        headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
        body: JSON.stringify({ bytes: `call ${i}\n` }),
      });
      const body = (await r.json()) as { stdin_seq: number };
      seqs.push(body.stdin_seq);
    }
    expect(seqs).toEqual([1, 2, 3]);
  });

  it('P2 base64 encoding decodes before passing to pasteRawBytes', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const { ops, recorded } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    // Bytes contain a single Ctrl-C (0x03) — not UTF-8-safe to round
    // through JSON as a raw string. base64 = "Aw==".
    const ctrlC = Buffer.from([0x03]);
    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: ctrlC.toString('base64'), encoding: 'base64' }),
    });
    expect(r.status).toBe(200);
    expect(recorded[0].bytes.length).toBe(1);
    expect(recorded[0].bytes[0]).toBe(0x03);
  });

  it('P3 SessionNotRunning when session is in killed state → 422 + error.type', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { dead: makeSession({ name: 'dead', state: 'killed' }) },
    });
    const { ops, recorded } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    const r = await fetch(`${ts.url}/v3/sessions/dead/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'whatever\n' }),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotRunning');
    // No bytes sent to the dead pane.
    expect(recorded.length).toBe(0);
  });

  it('P4 EncodingInvalid (encoding="xml") → 422 + error.type', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const { ops, recorded } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'whatever', encoding: 'xml' }),
    });
    expect(r.status).toBe(422);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('EncodingInvalid');
    expect(recorded.length).toBe(0);
  });

  it('P5 SessionNotFound when :name is not in registry → 404 + error.type', async () => {
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: makeSession() },
    });
    const { ops } = recordingConsoleOps();
    ts = await spawnTestServer({ registryPath, consoleOps: ops });

    const r = await fetch(`${ts.url}/v3/sessions/no-such-session/console/stdin`, {
      method: 'POST',
      headers: { 'x-conductor-token': ts.token ?? '', 'content-type': 'application/json' },
      body: JSON.stringify({ bytes: 'hi\n' }),
    });
    expect(r.status).toBe(404);
    const body = (await r.json()) as { error: string; type?: string };
    expect(body.type).toBe('SessionNotFound');
  });
});
