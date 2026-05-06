/**
 * MB-T10 — Probe P1: GET /v3/sessions/:name/context-snapshot success shape.
 *
 * Verifies the new daemon endpoint registered at WB3 returns 200 with
 * a body matching SessionContextSnapshotSchema for a known session.
 * Asserts every field is present (not just any-shape JSON).
 *
 * RED at WB2: route does not exist; daemon's setNotFoundHandler returns
 * 404 `{"error": "Not found"}`. Status assertion (200) + every field
 * assertion fails.
 *
 * GREEN at WB3: routes/v3/context-snapshot.ts factory registers the
 * route in startup.ts after registerTicketsStateRoutes (Q-MBT10-3=b).
 *
 * Authority: CONDUCTOR_V3_RESCOPE.md §3.5 lines 121-134; v3 schema
 * §11 (commit 55ee8cf at HEAD~1 of sess-mbt10).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../../fixtures/server.js';
import { writeRegistryV2 } from '../../../src/migration/schema-v2.js';
import {
  SessionContextSnapshotSchema,
  type SessionContextSnapshot,
} from 'dispatch-core/src/v3/schema.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';

describe('MB-T10 — P1 GET /v3/sessions/:name/context-snapshot success shape', () => {
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

  async function seedSession(): Promise<{ registryPath: string; handoffPath: string }> {
    const handoffPath = await mkdtempPath('mbt10-p01-ho-', 'HANDOFF.md');
    await writeFile(handoffPath, '# handoff snippet\n', 'utf8');
    const registryPath = await mkdtempPath('mbt10-p01-reg-', 'sessions.json');
    const session: SessionV2 = {
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: handoffPath,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    };
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: { sherpa: session },
    });
    return { registryPath, handoffPath };
  }

  it('returns 200 with the SessionContextSnapshot shape for a known session', async () => {
    const { registryPath } = await seedSession();
    ts = await spawnTestServer({
      tokenPath: await mkdtempPath('mbt10-p01-tok-', 'token'),
      registryPath,
    });

    const r = await fetch(`${ts.url}/v3/sessions/sherpa/context-snapshot`, {
      headers: authHeaders(ts.token),
    });
    expect(r.status).toBe(200);

    const body = (await r.json()) as unknown;
    // Schema parse asserts: every field present, types correct, .strict()
    // rejects unknown keys (Q-MBT10-4=a). At WB2 the body is
    // `{"error": "Not found"}` — schema parse fails — RED.
    const parsed = SessionContextSnapshotSchema.safeParse(body);
    expect(parsed.success).toBe(true);

    // Belt-and-suspenders explicit field assertions in case schema
    // evolves: every field present per CONDUCTOR_V3_RESCOPE.md §3.5.
    if (parsed.success) {
      const snap: SessionContextSnapshot = parsed.data;
      expect('recent_handoff' in snap).toBe(true);
      expect('recent_console_tail' in snap).toBe(true);
      expect(Array.isArray(snap.pending_intents)).toBe(true);
      expect('last_action_fired_at' in snap).toBe(true);
      expect('last_operator_typed_at' in snap).toBe(true);
    }
  });
});
