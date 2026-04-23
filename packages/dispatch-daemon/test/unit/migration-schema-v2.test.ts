/**
 * DAEMON-T05 — v2 sessions.json schema migration tests.
 *
 * Cluster-closing ticket for D-1 HTTP Foundation. Pure data-layer
 * unit tests (no HTTP, no Fastify). Every probe uses mkdtemp for
 * isolation and hits real `fs` operations — no mocks.
 *
 * Probes (7 total):
 *   P1  readRegistryV2 on nonexistent path → {version: 2, sessions: {}}
 *   P2  readRegistryV2 on v1 file → v2 shape with defaults injected
 *       (state='armed', last_commit_sha=null, last_status_json_at=null);
 *       v1 fields preserved verbatim
 *   P3  Round-trip: writeRegistryV2 → readRegistryV2 deep-equal
 *   P4  Atomic write — no .tmp file left behind post-write
 *   P5  Malformed JSON → throws Error with path in message
 *   P6  Idempotent migration — re-reading after migrate+write yields
 *       unchanged v2 (no double-migration drift)
 *   P7  writeRegistryV2 rejects malformed data via Zod — original file
 *       unchanged, no .tmp artifact on disk
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  readRegistryV2,
  writeRegistryV2,
} from '../../src/migration/schema-v2.js';

describe('DAEMON-T05 — v2 sessions.json schema migration', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {
        /* best-effort */
      });
      tmpDir = null;
    }
  });

  async function mkPath(): Promise<string> {
    tmpDir = await mkdtemp(join(tmpdir(), 'fd-t05-'));
    return join(tmpDir, 'sessions.json');
  }

  it('P1 nonexistent path → {version: 2, sessions: {}}', async () => {
    const path = await mkPath();
    const registry = await readRegistryV2(path);
    expect(registry).toEqual({ version: 2, sessions: {} });
  });

  it('P2 v1 registry → v2 shape with defaults injected; v1 fields preserved', async () => {
    const path = await mkPath();
    const v1 = {
      version: 1,
      sessions: {
        sherpa: {
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
          last_prompt_sent_at: '2026-04-23T12:00:00.000Z',
          last_handoff_pulled_at: null,
        },
      },
    };
    await writeFile(path, JSON.stringify(v1, null, 2) + '\n', 'utf8');

    const registry = await readRegistryV2(path);

    expect(registry.version).toBe(2);
    expect(registry.sessions.sherpa).toEqual({
      // v1 fields preserved verbatim:
      cwd: '/tmp/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/sherpa/HANDOFF.md',
      last_prompt_sent_at: '2026-04-23T12:00:00.000Z',
      last_handoff_pulled_at: null,
      // v2 defaults injected:
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    });
  });

  it('P3 round-trip: writeRegistryV2 → readRegistryV2 deep-equal', async () => {
    const path = await mkPath();
    const data = {
      version: 2 as const,
      sessions: {
        sherpa: {
          cwd: '/tmp/sherpa',
          tmux_target: 'sherpa:0.0',
          handoff_path: '/tmp/sherpa/HANDOFF.md',
          last_prompt_sent_at: null,
          last_handoff_pulled_at: null,
          state: 'armed' as const,
          last_commit_sha: null,
          last_status_json_at: null,
        },
      },
    };
    await writeRegistryV2(path, data);
    const readBack = await readRegistryV2(path);
    expect(readBack).toEqual(data);
  });

  it('P4 atomic write — no .tmp file remains post-write', async () => {
    const path = await mkPath();
    const data = { version: 2 as const, sessions: {} };
    await writeRegistryV2(path, data);
    const entries = await readdir(dirname(path));
    const tmps = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmps).toEqual([]);
  });

  it('P5 malformed JSON → throws Error with path in message', async () => {
    const path = await mkPath();
    await writeFile(path, '{not valid json', 'utf8');
    await expect(readRegistryV2(path)).rejects.toThrow(path);
  });

  it('P6 idempotent migration — re-read after migrate+write yields unchanged v2', async () => {
    const path = await mkPath();
    const v1 = {
      version: 1,
      sessions: {
        alpha: {
          cwd: '/a',
          tmux_target: 'alpha:0.0',
          handoff_path: '/a/HANDOFF.md',
          last_prompt_sent_at: null,
          last_handoff_pulled_at: null,
        },
      },
    };
    await writeFile(path, JSON.stringify(v1, null, 2) + '\n', 'utf8');

    const firstRead = await readRegistryV2(path);
    await writeRegistryV2(path, firstRead);
    const secondRead = await readRegistryV2(path);
    expect(secondRead).toEqual(firstRead);

    // Confirm on-disk file is v2 shape
    const rawBytes = await readFile(path, 'utf8');
    const parsed = JSON.parse(rawBytes);
    expect(parsed.version).toBe(2);
    expect(parsed.sessions.alpha.state).toBe('armed');
  });

  it('P7 writeRegistryV2 rejects malformed data; no .tmp artifact; target unchanged', async () => {
    const path = await mkPath();
    const valid = {
      version: 2 as const,
      sessions: {},
    };
    await writeRegistryV2(path, valid);
    const beforeBytes = await readFile(path, 'utf8');

    const garbage = {
      version: 2,
      sessions: {
        bad: {
          // Intentionally wrong shape: cwd should be string
          cwd: 123,
          tmux_target: 'bad:0.0',
          handoff_path: '/bad/HANDOFF.md',
          last_prompt_sent_at: null,
          last_handoff_pulled_at: null,
          state: 'armed',
          last_commit_sha: null,
          last_status_json_at: null,
        },
      },
    };
    await expect(
      writeRegistryV2(path, garbage as unknown as typeof valid),
    ).rejects.toThrow();

    // Target file unchanged
    const afterBytes = await readFile(path, 'utf8');
    expect(afterBytes).toBe(beforeBytes);

    // No .tmp artifact
    const entries = await readdir(dirname(path));
    const tmps = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmps).toEqual([]);
  });
});
