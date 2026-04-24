/**
 * DAEMON-T09 — POST /v2/sessions/:name/prompts integration tests.
 *
 * Operator arbitrations locked at T09 pre-reg:
 *   - Decision 1 (request field): `body` per SendPromptRequest
 *     schema (operator-published 551c469). Contract §4.4 example
 *     showing `prompt` is treated as drifted documentation.
 *   - Decision 2 (archived_to optionality): schema-optional;
 *     v2.0 production always populates.
 *
 * Probes (7 total):
 *   P1  Valid send (happy path): 200 + {sent_at, archived_to};
 *       archive file written with assembled body+footer; sendKeys
 *       called with assembled text; session.last_prompt_sent_at
 *       updated in registry.
 *   P2  Missing `body` field → 422.
 *   P3  Empty `body` string → 422 (SendPromptRequest enforces min(1)).
 *   P4  Unknown session name → 404.
 *   P5  Non-armed state (table-driven over paused/held/killed) →
 *       422 each; sendKeys NOT called; registry NOT updated.
 *   P6  hasSession(target) returns false → 503; sendKeys NOT called.
 *   P7  Footer idempotency: body already containing HANDOFF_FOOTER
 *       → archive contains the footer EXACTLY ONCE; sendKeys
 *       receives text with footer exactly once.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../../src/migration/schema-v2.js';
import type { TmuxOps } from '../../src/state/transitions.js';
import type { SessionV2, State } from 'dispatch-core/src/v2/schema.js';
import { HANDOFF_FOOTER } from 'dispatch-core/src/prompt/footer.js';

describe('DAEMON-T09 — POST /v2/sessions/:name/prompts', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t09-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkArchiveRoot(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t09-arc-'));
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

  interface TmuxStub {
    calls: Array<
      | { op: 'sendCtrlC'; target: string }
      | { op: 'killSession'; target: string }
      | { op: 'sendKeys'; target: string; text: string }
      | { op: 'hasSession'; target: string }
    >;
    hasSessionReturn: { value: boolean };
    tmuxOps: TmuxOps;
  }

  function mkTmuxStub(): TmuxStub {
    const calls: TmuxStub['calls'] = [];
    const hasSessionReturn = { value: true };
    return {
      calls,
      hasSessionReturn,
      tmuxOps: {
        async sendCtrlC(target) {
          calls.push({ op: 'sendCtrlC', target });
        },
        async killSession(target) {
          calls.push({ op: 'killSession', target });
        },
        async sendKeys(target, text) {
          calls.push({ op: 'sendKeys', target, text });
        },
        async hasSession(target) {
          calls.push({ op: 'hasSession', target });
          return hasSessionReturn.value;
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
  ): Promise<{ stub: TmuxStub; registryPath: string; archiveRoot: string }> {
    const registryPath = await mkRegistryPath();
    const archiveRoot = await mkArchiveRoot();
    await writeRegistryV2(registryPath, { version: 2, sessions: initial });
    const stub = mkTmuxStub();
    ts = await spawnTestServer({
      registryPath,
      tmuxOps: stub.tmuxOps,
      archiveRoot,
    });
    return { stub, registryPath, archiveRoot };
  }

  it('P1 valid send → 200 + archive written + sendKeys called + registry updated', async () => {
    const { stub, registryPath, archiveRoot } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    const body = 'do the thing';
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ body }),
    });
    expect(r.status).toBe(200);
    const respBody = (await r.json()) as {
      sent_at: string;
      archived_to: string;
    };
    expect(typeof respBody.sent_at).toBe('string');
    expect(typeof respBody.archived_to).toBe('string');

    // Archive file exists at archived_to and contains assembled prompt
    const archived = await readFile(respBody.archived_to, 'utf8');
    expect(archived).toContain(body);
    expect(archived).toContain(HANDOFF_FOOTER);

    // Archive lives under <archiveRoot>/sherpa/
    expect(respBody.archived_to.startsWith(join(archiveRoot, 'sherpa'))).toBe(
      true,
    );

    // sendKeys called once with target + assembled text
    const sendKeysCalls = stub.calls.filter((c) => c.op === 'sendKeys');
    expect(sendKeysCalls).toHaveLength(1);
    expect(sendKeysCalls[0]).toMatchObject({
      op: 'sendKeys',
      target: 'sherpa:0.0',
    });
    expect((sendKeysCalls[0] as { text: string }).text).toContain(body);
    expect((sendKeysCalls[0] as { text: string }).text).toContain(
      HANDOFF_FOOTER,
    );

    // hasSession was called as preflight
    expect(stub.calls.some((c) => c.op === 'hasSession')).toBe(true);

    // Registry updated
    const reg = await readRegistryV2(registryPath);
    expect(reg.sessions.sherpa?.last_prompt_sent_at).toBe(respBody.sent_at);
  });

  it('P2 missing body field → 422', async () => {
    await seedAndSpawn({ sherpa: mkSession() });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(422);
    const j = (await r.json()) as { error?: unknown };
    expect(typeof j.error).toBe('string');
  });

  it('P3 empty body string → 422 (SendPromptRequest min(1))', async () => {
    await seedAndSpawn({ sherpa: mkSession() });
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ body: '' }),
    });
    expect(r.status).toBe(422);
  });

  it('P4 unknown session name → 404', async () => {
    await seedAndSpawn({});
    const r = await fetch(`${ts!.url}/v2/sessions/nope/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ body: 'hi' }),
    });
    expect(r.status).toBe(404);
  });

  it('P5 non-armed state (paused/held/killed) → 422 each, no side effects', async () => {
    for (const badState of ['paused', 'held', 'killed'] as const satisfies readonly State[]) {
      const { stub, registryPath } = await seedAndSpawn({
        sherpa: mkSession({ state: badState }),
      });
      const before = (await readRegistryV2(registryPath)).sessions.sherpa
        ?.last_prompt_sent_at;
      const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
        method: 'POST',
        headers: authHeaders(ts!.token),
        body: JSON.stringify({ body: 'hi' }),
      });
      expect(r.status, `state=${badState}`).toBe(422);
      const after = (await readRegistryV2(registryPath)).sessions.sherpa
        ?.last_prompt_sent_at;
      expect(after).toBe(before);
      expect(stub.calls.some((c) => c.op === 'sendKeys')).toBe(false);
      // afterEach closes ts; reseed in next iteration
      await ts!.close();
      ts = null;
    }
  });

  it('P6 hasSession returns false → 503 + sendKeys not called', async () => {
    const { stub, registryPath } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    stub.hasSessionReturn.value = false;
    const before = (await readRegistryV2(registryPath)).sessions.sherpa
      ?.last_prompt_sent_at;
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ body: 'hi' }),
    });
    expect(r.status).toBe(503);
    expect(stub.calls.some((c) => c.op === 'sendKeys')).toBe(false);
    const after = (await readRegistryV2(registryPath)).sessions.sherpa
      ?.last_prompt_sent_at;
    expect(after).toBe(before);
  });

  it('P7 footer idempotency: pre-footed body archived + sent with single footer', async () => {
    const { stub } = await seedAndSpawn({
      sherpa: mkSession({ tmux_target: 'sherpa:0.0' }),
    });
    const preFooted = `main instruction\n\n${HANDOFF_FOOTER}`;
    const r = await fetch(`${ts!.url}/v2/sessions/sherpa/prompts`, {
      method: 'POST',
      headers: authHeaders(ts!.token),
      body: JSON.stringify({ body: preFooted }),
    });
    expect(r.status).toBe(200);
    const respBody = (await r.json()) as { archived_to: string };
    const archived = await readFile(respBody.archived_to, 'utf8');
    const occurrences = archived.split(HANDOFF_FOOTER).length - 1;
    expect(occurrences).toBe(1);

    const sendKeysCall = stub.calls.find((c) => c.op === 'sendKeys') as
      | { text: string }
      | undefined;
    expect(sendKeysCall).toBeDefined();
    const sentOccurrences =
      sendKeysCall!.text.split(HANDOFF_FOOTER).length - 1;
    expect(sentOccurrences).toBe(1);
  });
});
