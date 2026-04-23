/**
 * DAEMON-T01 — Fastify scaffold + server lifecycle tests.
 *
 * Probes:
 *   P1  buildServer() returns a FastifyInstance that is ready()
 *   P2  startup({port: 0}) binds an ephemeral port (> 0)
 *   P3  TCP connect succeeds after startup completes
 *   P4  HTTP GET on unknown path returns 404 (Fastify default shape;
 *       T04 customizes to {"error": "..."} later)
 *   P5  shutdown closes in <2s and releases the port (second startup
 *       on same port succeeds)
 *
 * No mocks. Real Fastify, real sockets. port:0 for isolation.
 */

import { afterEach, describe, expect, it } from 'vitest';
import net from 'node:net';
import { buildServer } from '../../src/server.js';
import { startup } from '../../src/lifecycle/startup.js';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';

describe('DAEMON-T01 — Fastify scaffold + server lifecycle', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {
        /* cleanup is best-effort */
      });
      ts = null;
    }
  });

  it('P1 buildServer() returns a FastifyInstance that is ready()', async () => {
    const app = await buildServer();
    await app.ready();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.close).toBe('function');
    await app.close();
  });

  it('P2 startup({port: 0}) binds an ephemeral port > 0', async () => {
    ts = await spawnTestServer();
    expect(ts.port).toBeGreaterThan(0);
    expect(ts.app).toBeDefined();
  });

  it('P3 TCP connect succeeds after startup completes', async () => {
    ts = await spawnTestServer();
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect(ts!.port, '127.0.0.1', () => {
        socket.end();
        resolve();
      });
      socket.on('error', reject);
      socket.setTimeout(2000, () => {
        socket.destroy();
        reject(new Error('TCP connect timeout'));
      });
    });
  });

  it('P4 HTTP GET on unknown path returns 404 (Fastify default)', async () => {
    ts = await spawnTestServer();
    const response = await fetch(`${ts.url}/unknown-path`);
    expect(response.status).toBe(404);
  });

  it('P5 shutdown closes in <2s and releases the port', async () => {
    const first = await spawnTestServer();
    const reservedPort = first.port;

    const start = Date.now();
    await first.close();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);

    // Rebind on the same port — proves the port was released by shutdown
    const second = await startup({ port: reservedPort });
    ts = {
      app: second.server,
      port: second.port,
      url: `http://127.0.0.1:${second.port}`,
      close: second.close,
    };
    expect(second.port).toBe(reservedPort);
  });
});
