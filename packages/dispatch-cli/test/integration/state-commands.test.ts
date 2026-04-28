/**
 * CLI-T06 — fd kill/pause/hold/arm integration tests.
 *
 * Per X2 §CLI-T06 line 367 verbatim: "Uses mock daemon (HTTP
 * + WS fixtures) for speed." T06 is OUTSIDE the T01-T04 "no
 * mocked daemon" constraint window per operator pre-reg ack.
 *
 * Mock daemon = node:http server (Arbitration 1A) bound to
 * an ephemeral port via listen(0). Tests configure per-route
 * responses + observe CLI behavior.
 *
 * 4 commands × 4 paths = 16 effective tests via it.each:
 *   happy-path: mock returns 200 → command succeeds
 *   invalid-transition (422): mock returns daemon-error body
 *     → command throws verbatim error message
 *   unknown-session (404): mock returns daemon-error body
 *     → command throws verbatim error message
 *   daemon-dead: mock /v2/health absent (probe fails) →
 *     command throws X2-line-351 verbatim error
 *
 * Plus 1 test for fd kill --yes flag bypasses TTY confirm.
 *
 * Total: 17 effective tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  spawnMockDaemon,
  type MockDaemonHandle,
} from '../fixtures/mock-daemon.js';
import { runArm } from '../../src/commands/arm.js';
import { runHold } from '../../src/commands/hold.js';
import { runKill } from '../../src/commands/kill.js';
import { runPause } from '../../src/commands/pause.js';
import type { State } from 'dispatch-core/src/v2/schema.js';

interface CommandSpec {
  label: string;
  target: State;
  run: (args: {
    name: string;
    baseUrl: string;
    tokenPath: string;
    yes?: boolean;
  }) => Promise<void>;
}

const COMMANDS: CommandSpec[] = [
  {
    label: 'kill',
    target: 'killed',
    run: (args) => runKill({ ...args, yes: true }),
  },
  { label: 'pause', target: 'paused', run: runPause },
  { label: 'hold', target: 'held', run: runHold },
  { label: 'arm', target: 'armed', run: runArm },
];

describe('CLI-T06 — state command integration', () => {
  let mock: MockDaemonHandle | null = null;
  let tokenPath: string = '';

  beforeEach(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fd-clit06-tok-'));
    tokenPath = join(dir, 'token');
    await writeFile(tokenPath, 'test-token-abc123\n', 'utf8');
  });

  afterEach(async () => {
    if (mock) {
      await mock.close();
      mock = null;
    }
  });

  it.each(COMMANDS)(
    'happy: fd $label sends PATCH state with target=$target → 200',
    async ({ label, target, run }) => {
      mock = await spawnMockDaemon();
      mock.setHealthOk(true);
      mock.setStateResponse({
        status: 200,
        body: { name: 'sherpa', state: target },
      });

      await expect(
        run({
          name: 'sherpa',
          baseUrl: mock.baseUrl,
          tokenPath,
        }),
      ).resolves.toBeUndefined();

      const calls = mock.getStateCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0].path).toBe('/v2/sessions/sherpa/state');
      expect(calls[0].method).toBe('PATCH');
      expect(calls[0].body).toEqual({ state: target });
      expect(calls[0].headers['x-conductor-token']).toBe('test-token-abc123');
      void label;
    },
  );

  it.each(COMMANDS)(
    'invalid-transition: fd $label → 422 daemon error surfaced verbatim',
    async ({ run }) => {
      mock = await spawnMockDaemon();
      mock.setHealthOk(true);
      mock.setStateResponse({
        status: 422,
        body: {
          error:
            'invalid state transition for "sherpa": killed → paused (per contract §6.1)',
        },
      });

      await expect(
        run({ name: 'sherpa', baseUrl: mock.baseUrl, tokenPath }),
      ).rejects.toThrow(/invalid state transition/);
    },
  );

  it.each(COMMANDS)(
    'unknown-session: fd $label → 404 daemon error surfaced verbatim',
    async ({ run }) => {
      mock = await spawnMockDaemon();
      mock.setHealthOk(true);
      mock.setStateResponse({
        status: 404,
        body: { error: 'no session registered as "ghost"' },
      });

      await expect(
        run({ name: 'ghost', baseUrl: mock.baseUrl, tokenPath }),
      ).rejects.toThrow(/no session registered as "ghost"/);
    },
  );

  it.each(COMMANDS)(
    'daemon-dead: fd $label with health probe failing → X2-line-351 error',
    async ({ run }) => {
      mock = await spawnMockDaemon();
      mock.setHealthOk(false); // /v2/health returns 503

      await expect(
        run({ name: 'sherpa', baseUrl: mock.baseUrl, tokenPath }),
      ).rejects.toThrow(/requires the Conductor daemon/);
    },
  );

  it('fd kill --yes bypasses TTY confirm prompt', async () => {
    mock = await spawnMockDaemon();
    mock.setHealthOk(true);
    mock.setStateResponse({
      status: 200,
      body: { name: 'sherpa', state: 'killed' },
    });

    // No TTY interaction — yes:true bypasses confirmAction
    await expect(
      runKill({
        name: 'sherpa',
        yes: true,
        baseUrl: mock.baseUrl,
        tokenPath,
      }),
    ).resolves.toBeUndefined();

    expect(mock.getStateCalls()).toHaveLength(1);
  });
});
