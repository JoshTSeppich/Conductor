/**
 * Reusable test-server spawn helper. First introduced in DAEMON-T01;
 * consumed by subsequent DAEMON-T tests (T02 auth, T03 health, etc.).
 *
 * Provides a started daemon on a random port with a convenient handle
 * plus a cleanup function. Tests should call close() in afterEach.
 */

import type { FastifyInstance } from 'fastify';
import { startup } from '../../src/lifecycle/startup.js';

export interface TestServer {
  app: FastifyInstance;
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function spawnTestServer(): Promise<TestServer> {
  // logger:false silences per-request Pino output for test ergonomics.
  // Production startup() defaults to info-level logging.
  const { server, port, close } = await startup({ port: 0, logger: false });
  return {
    app: server,
    port,
    url: `http://127.0.0.1:${port}`,
    close,
  };
}
