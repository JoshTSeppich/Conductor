/**
 * Reusable test-server spawn helper. First introduced in DAEMON-T01;
 * consumed by subsequent DAEMON-T tests (T02 auth, T03 health, etc.).
 *
 * Provides a started daemon on a random port with a convenient handle
 * plus a cleanup function. Tests should call close() in afterEach.
 */

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { startup } from '../../src/lifecycle/startup.js';

export interface TestServer {
  app: FastifyInstance;
  port: number;
  url: string;
  /** Current auth token (populated by DAEMON-T02 green). */
  token: string | undefined;
  close: () => Promise<void>;
}

export interface SpawnTestServerOpts {
  /** Pass a test-isolated token path so tests do not touch the operator's real token file. */
  tokenPath?: string;
  /**
   * Register routes before `app.listen()`. Added in DAEMON-T04
   * so tests can attach throwing routes that exercise the error
   * handler. Fastify 5 rejects route registration after listen,
   * so post-spawn `ts.app.get(...)` is not an option.
   */
  beforeListen?: (app: FastifyInstance) => Promise<void> | void;
  /**
   * Test-isolated sessions.json path. Added in DAEMON-T06 so tests
   * can seed the registry via writeRegistryV2 without touching the
   * operator's real registry.
   */
  registryPath?: string;
}

/**
 * Ensure the fixture never routes tests at the operator's real
 * ~/.foxworks-dispatch/token or ~/.foxworks-dispatch/sessions.json.
 * If the caller omits a path, generate a mkdtemp-isolated default
 * so startup's `getOrCreateToken` and `readRegistryV2` land on a
 * per-invocation tempdir instead of production state.
 */
async function isolatedDefault(prefix: string, filename: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  return join(dir, filename);
}

export async function spawnTestServer(
  opts: SpawnTestServerOpts = {},
): Promise<TestServer> {
  const tokenPath =
    opts.tokenPath ?? (await isolatedDefault('fd-fixture-tok-', 'token'));
  const registryPath =
    opts.registryPath ??
    (await isolatedDefault('fd-fixture-reg-', 'sessions.json'));

  // logger:false silences per-request Pino output for test ergonomics.
  // Production startup() defaults to info-level logging.
  const { server, port, token, close } = await startup({
    port: 0,
    logger: false,
    tokenPath,
    beforeListen: opts.beforeListen,
    registryPath,
  });
  return {
    app: server,
    port,
    url: `http://127.0.0.1:${port}`,
    token,
    close,
  };
}
