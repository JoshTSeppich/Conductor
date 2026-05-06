/**
 * MB-T10 — Probe P2: GET /v3/sessions/:name/context-snapshot unknown
 * session returns 404 with the canonical session-not-found error body.
 *
 * The route MUST distinguish from a route-not-found 404 because the
 * Fastify default not-found handler ALSO returns 404 (with body
 * `{"error": "Not found"}`). The route-handler-emitted body matches
 * the existing `routes/handoff.ts:52` and `routes/sessions.ts:129`
 * convention: `{"error": "no session registered as \"<name>\""}`.
 * Asserting the verbatim message text disambiguates RED-at-WB2 (route
 * absent → "Not found") from GREEN-at-WB3 (route present + session-
 * not-found path → verbatim message).
 *
 * RED at WB2: setNotFoundHandler emits `{"error": "Not found"}`;
 *             body-text assertion fails.
 * GREEN at WB3: route handler emits the verbatim convention message.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';

describe('MB-T10 — P2 GET context-snapshot 404 for unknown session', () => {
  let ts: TestServer | null = null;

  afterEach(async () => {
    if (ts) {
      await ts.close().catch(() => {});
      ts = null;
    }
  });

  async function mkdtempPath(prefix: string, filename: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), prefix));
    return join(dir, filename);
  }

  function authHeaders(token: string | undefined): Record<string, string> {
    return { 'x-conductor-token': token ?? '' };
  }

  it('returns 404 with the verbatim session-not-found message for unknown :name', async () => {
    // Empty registry — any :name is unknown.
    const registryPath = await mkdtempPath('mbt10-p02-reg-', 'sessions.json');
    await writeRegistryV2(registryPath, { version: 2, sessions: {} });

    ts = await spawnTestServer({
      tokenPath: await mkdtempPath('mbt10-p02-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/ghost/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(404);

    const body = (await r.json()) as { error?: string };
    // Verbatim convention message — disambiguates from setNotFoundHandler's
    // generic "Not found" body that fires when the route itself is absent.
    // Matches handoff.ts:52 + sessions.ts:129 convention.
    expect(body.error).toBe('no session registered as "ghost"');
  });
});
