/**
 * DAEMON-S05 — HTTP server library spike.
 *
 * Verifies Fastify 5.x as the daemon's HTTP server library per
 * CONDUCTOR_API_CONTRACT.md §3 (auth) and §4 (REST endpoints).
 *
 * Probes:
 *   P1  GET /v2/health has no auth requirement (contract §4.1)
 *   P2  Auth-gated path without X-Conductor-Token returns 401 + JSON body
 *   P3  Auth-gated path with WRONG token returns 401
 *   P4  Auth-gated path with CORRECT token returns 200 and path param
 *       resolves ({ name: 'sherpa' } from /v2/sessions/:name)
 *   P5  POST with JSON body parses and returns 201 with echoed body
 *   P6  POST with missing required field returns 422 + {"error": "..."}
 *       (matches MODELED default for error shape per §5.1 surface)
 *   P7  PATCH returns 409 with contract-mandated killed-record error body
 *   P8  GET with unknown route returns 404 (Fastify default)
 *   P9  Server shuts down cleanly (for launchd/systemd lifecycle later)
 *
 * Exit 0 on all-pass, 1 on any failure. No persistent state.
 */

import Fastify from 'fastify';

const TOKEN = 'test-token-abc123';

interface ProbeResult {
  name: string;
  pass: boolean;
  detail?: string;
}

async function runSpike(): Promise<ProbeResult[]> {
  const app = Fastify({ logger: false });

  // Contract §3: X-Conductor-Token required on all paths except /v2/health.
  // Fastify hook applies before route handlers. Bypass for health only.
  app.addHook('onRequest', async (request, reply) => {
    const pathOnly = request.url.split('?')[0];
    if (pathOnly === '/v2/health') {
      return;
    }
    const token = request.headers['x-conductor-token'];
    if (token !== TOKEN) {
      reply.code(401).send({ error: 'Invalid or missing X-Conductor-Token' });
    }
  });

  // §4.1 health, no auth.
  app.get('/v2/health', async () => ({
    status: 'ok',
    version: '2.0.0',
    uptime_seconds: Math.floor(process.uptime()),
  }));

  // §4.2 single session by path param.
  app.get('/v2/sessions/:name', async (request) => {
    const { name } = request.params as { name: string };
    return { name, cwd: '/tmp', state: 'armed' };
  });

  // §4.3 POST /v2/sessions — body parse, 422 on missing field.
  app.post('/v2/sessions', async (request, reply) => {
    const body = request.body as { name?: string } | null;
    if (!body?.name) {
      reply.code(422).send({ error: 'name is required' });
      return;
    }
    reply.code(201).send({ name: body.name, state: 'armed' });
  });

  // §6.3 killed re-init: 409 with operator-mandated error body.
  app.patch('/v2/conflict-example', async (_request, reply) => {
    reply.code(409).send({
      error: 'Session name in use (killed record exists). Pick a new name.',
    });
  });

  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  if (!addr || typeof addr === 'string') {
    throw new Error('fastify did not bind a TCP address');
  }
  const url = `http://127.0.0.1:${addr.port}`;

  const results: ProbeResult[] = [];

  async function probe(name: string, fn: () => Promise<{ pass: boolean; detail?: string }>): Promise<void> {
    try {
      const r = await fn();
      results.push({ name, pass: r.pass, detail: r.detail });
    } catch (err) {
      results.push({ name, pass: false, detail: (err as Error).message });
    }
  }

  await probe('P1 GET /v2/health (no auth) → 200 with status/version/uptime', async () => {
    const r = await fetch(`${url}/v2/health`);
    const body = (await r.json()) as { status: string; version: string; uptime_seconds: number };
    return {
      pass:
        r.status === 200 &&
        body.status === 'ok' &&
        body.version === '2.0.0' &&
        typeof body.uptime_seconds === 'number',
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P2 GET /v2/sessions/sherpa without token → 401 + JSON error', async () => {
    const r = await fetch(`${url}/v2/sessions/sherpa`);
    const body = (await r.json()) as { error?: string };
    return {
      pass: r.status === 401 && typeof body.error === 'string',
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P3 GET /v2/sessions/sherpa with WRONG token → 401', async () => {
    const r = await fetch(`${url}/v2/sessions/sherpa`, {
      headers: { 'x-conductor-token': 'wrong-token' },
    });
    return { pass: r.status === 401, detail: `status=${r.status}` };
  });

  await probe('P4 GET /v2/sessions/:name with CORRECT token → 200 + path param echoed', async () => {
    const r = await fetch(`${url}/v2/sessions/sherpa`, {
      headers: { 'x-conductor-token': TOKEN },
    });
    const body = (await r.json()) as { name: string; state: string };
    return {
      pass: r.status === 200 && body.name === 'sherpa' && body.state === 'armed',
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P5 POST /v2/sessions with JSON body → 201 + echoed body', async () => {
    const r = await fetch(`${url}/v2/sessions`, {
      method: 'POST',
      headers: {
        'x-conductor-token': TOKEN,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'test-session' }),
    });
    const body = (await r.json()) as { name: string; state: string };
    return {
      pass: r.status === 201 && body.name === 'test-session',
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P6 POST /v2/sessions with empty body → 422 + {"error": ...}', async () => {
    const r = await fetch(`${url}/v2/sessions`, {
      method: 'POST',
      headers: {
        'x-conductor-token': TOKEN,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const body = (await r.json()) as { error?: string };
    return {
      pass: r.status === 422 && typeof body.error === 'string',
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P7 PATCH /v2/conflict-example → 409 with operator-mandated killed-record error', async () => {
    const r = await fetch(`${url}/v2/conflict-example`, {
      method: 'PATCH',
      headers: { 'x-conductor-token': TOKEN },
    });
    const body = (await r.json()) as { error: string };
    const exactError =
      'Session name in use (killed record exists). Pick a new name.';
    return {
      pass: r.status === 409 && body.error === exactError,
      detail: `status=${r.status} body=${JSON.stringify(body)}`,
    };
  });

  await probe('P8 GET unknown route → 404', async () => {
    const r = await fetch(`${url}/v2/does-not-exist`, {
      headers: { 'x-conductor-token': TOKEN },
    });
    return { pass: r.status === 404, detail: `status=${r.status}` };
  });

  await probe('P9 server closes cleanly', async () => {
    await app.close();
    // If we got here without throwing, close succeeded.
    return { pass: true };
  });

  return results;
}

async function main(): Promise<void> {
  const results = await runSpike();
  console.log('\n=== DAEMON-S05 spike results ===\n');
  let allPassed = true;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    const line = r.detail ? `${mark} ${r.name}\n    ${r.detail}` : `${mark} ${r.name}`;
    console.log(line);
    if (!r.pass) allPassed = false;
  }
  console.log(`\n${allPassed ? 'ALL PROBES PASS' : 'FAILURES — see above'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('spike crashed:', err);
  process.exit(1);
});
