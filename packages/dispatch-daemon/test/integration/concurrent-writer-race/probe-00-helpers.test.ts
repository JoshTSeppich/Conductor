/**
 * MB-F-DAEMON-CONCURRENT-RACE — probe-00.
 *
 * Helpers contract tests. Single-process — no race. Verifies barrier,
 * race-capture, and spawnChild work in isolation before the actual
 * race probes (probe-01/02/03) build on them.
 *
 * Confidence: KNOWN — straightforward fixture exercise. If probe-00
 * fails the helpers are broken; downstream probes are meaningless
 * until probe-00 passes.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { awaitBarrier, createBarrier } from './helpers/barrier.js';
import { captureRaceState } from './helpers/race-capture.js';
import { spawnChild, type ChildHandle } from './helpers/spawn-child.js';

const CHILD_TIMEOUT = 30_000;

describe('MB-F-DAEMON-CONCURRENT-RACE probe-00 — helpers contract', () => {
  const liveChildren: ChildHandle[] = [];

  afterEach(() => {
    while (liveChildren.length > 0) {
      const c = liveChildren.shift();
      c?.kill();
    }
  });

  async function mkTempDir(): Promise<string> {
    return mkdtemp(join(tmpdir(), 'fd-race-probe00-'));
  }

  async function seedV2Registry(
    path: string,
    sessions: Record<string, Record<string, unknown>>,
  ): Promise<void> {
    const body = `${JSON.stringify({ version: 2, sessions }, null, 2)}\n`;
    await writeFile(path, body, 'utf8');
  }

  function defaultV2Session(): Record<string, unknown> {
    return {
      cwd: '/tmp/fake',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/tmp/fake/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    };
  }

  describe('barrier', () => {
    it('signal makes the barrier file appear; awaitBarrier resolves', async () => {
      const dir = await mkTempDir();
      const barrier = createBarrier(dir);
      const waiter = awaitBarrier(barrier.path, 2000);
      await new Promise((r) => setTimeout(r, 20));
      await barrier.signal();
      await expect(waiter).resolves.toBeUndefined();
    });

    it('awaitBarrier times out when never signalled', async () => {
      const dir = await mkTempDir();
      const barrier = createBarrier(dir);
      await expect(awaitBarrier(barrier.path, 100)).rejects.toThrow(/timed out/);
    });
  });

  describe('race-capture', () => {
    it('reports parsedAs=missing when the file does not exist', async () => {
      const dir = await mkTempDir();
      const r = await captureRaceState(join(dir, 'nope.json'));
      expect(r).toMatchObject({
        bodyOnDisk: null,
        parsedAs: 'missing',
        daemonReadOK: false,
        cliReadOK: false,
        sidecarsPresent: [],
        tmpExists: false,
      });
    });

    it('reports parsedAs=v2 when a valid v2 registry is on disk', async () => {
      const dir = await mkTempDir();
      const path = join(dir, 'sessions.json');
      await seedV2Registry(path, { alpha: defaultV2Session() });
      const r = await captureRaceState(path);
      expect(r.parsedAs).toBe('v2');
      expect(r.daemonReadOK).toBe(true);
      expect(r.cliReadOK).toBe(true); // v1 schema accepts v2 via passthrough
    });

    it('reports parsedAs=v1 when a v1-only registry is on disk', async () => {
      const dir = await mkTempDir();
      const path = join(dir, 'sessions.json');
      const v1Session = {
        cwd: '/tmp/fake',
        tmux_target: 'sherpa:0.0',
        handoff_path: '/tmp/fake/HANDOFF.md',
        last_prompt_sent_at: null,
        last_handoff_pulled_at: null,
      };
      await writeFile(
        path,
        `${JSON.stringify({ version: 1, sessions: { alpha: v1Session } }, null, 2)}\n`,
        'utf8',
      );
      const r = await captureRaceState(path);
      expect(r.parsedAs).toBe('v1');
      expect(r.daemonReadOK).toBe(false);
      expect(r.cliReadOK).toBe(true);
    });

    it('reports parsedAs=unparseable on broken JSON', async () => {
      const dir = await mkTempDir();
      const path = join(dir, 'sessions.json');
      await writeFile(path, '{not json', 'utf8');
      const r = await captureRaceState(path);
      expect(r.parsedAs).toBe('unparseable');
      expect(r.daemonReadOK).toBe(false);
      expect(r.cliReadOK).toBe(false);
    });

    it('detects sidecar files matching <basename>.corrupt-*', async () => {
      const dir = await mkTempDir();
      const path = join(dir, 'sessions.json');
      await seedV2Registry(path, {});
      await writeFile(`${path}.corrupt-2026-01-01T00-00-00Z`, 'old', 'utf8');
      const r = await captureRaceState(path);
      expect(r.sidecarsPresent).toEqual(['sessions.json.corrupt-2026-01-01T00-00-00Z']);
    });

    it('detects leftover .tmp file', async () => {
      const dir = await mkTempDir();
      const path = join(dir, 'sessions.json');
      await seedV2Registry(path, {});
      await writeFile(`${path}.tmp`, 'partial', 'utf8');
      const r = await captureRaceState(path);
      expect(r.tmpExists).toBe(true);
    });
  });

  describe('spawnChild', () => {
    it(
      'cli flavor reads, prints READY, writes on barrier signal',
      async () => {
        const dir = await mkTempDir();
        const path = join(dir, 'sessions.json');
        await seedV2Registry(path, {
          alpha: { ...defaultV2Session(), last_prompt_sent_at: null },
        });
        const barrier = createBarrier(dir);

        const child = spawnChild({
          flavor: 'cli',
          registryPath: path,
          mutate: {
            session: 'alpha',
            field: 'last_prompt_sent_at',
            value: '2026-05-05T00:00:00.000Z',
          },
          barrierPath: barrier.path,
        });
        liveChildren.push(child);

        await child.ready;
        // Child has snapshotted but not written. Disk should still
        // show last_prompt_sent_at: null.
        const before = JSON.parse(await readFile(path, 'utf8')) as {
          sessions: { alpha: { last_prompt_sent_at: string | null } };
        };
        expect(before.sessions.alpha.last_prompt_sent_at).toBeNull();

        await barrier.signal();
        const result = await child.done;
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('DONE');

        const after = JSON.parse(await readFile(path, 'utf8')) as {
          sessions: { alpha: { last_prompt_sent_at: string | null } };
        };
        expect(after.sessions.alpha.last_prompt_sent_at).toBe(
          '2026-05-05T00:00:00.000Z',
        );
      },
      CHILD_TIMEOUT,
    );

    it(
      'daemon flavor reads, prints READY, writes on barrier signal',
      async () => {
        const dir = await mkTempDir();
        const path = join(dir, 'sessions.json');
        await seedV2Registry(path, {
          alpha: { ...defaultV2Session(), state: 'armed' },
        });
        const barrier = createBarrier(dir);

        const child = spawnChild({
          flavor: 'daemon',
          registryPath: path,
          mutate: { session: 'alpha', field: 'state', value: 'paused' },
          barrierPath: barrier.path,
        });
        liveChildren.push(child);

        await child.ready;
        await barrier.signal();
        const result = await child.done;
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('DONE');

        const after = JSON.parse(await readFile(path, 'utf8')) as {
          sessions: { alpha: { state: string } };
        };
        expect(after.sessions.alpha.state).toBe('paused');
      },
      CHILD_TIMEOUT,
    );

    it(
      'no-barrier mode writes immediately after read',
      async () => {
        const dir = await mkTempDir();
        const path = join(dir, 'sessions.json');
        await seedV2Registry(path, {
          alpha: { ...defaultV2Session(), state: 'armed' },
        });

        const child = spawnChild({
          flavor: 'daemon',
          registryPath: path,
          mutate: { session: 'alpha', field: 'state', value: 'paused' },
        });
        liveChildren.push(child);

        const result = await child.done;
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('READY');
        expect(result.stdout).toContain('DONE');

        const after = JSON.parse(await readFile(path, 'utf8')) as {
          sessions: { alpha: { state: string } };
        };
        expect(after.sessions.alpha.state).toBe('paused');
      },
      CHILD_TIMEOUT,
    );

    it(
      'reports an error and exits non-zero on missing session',
      async () => {
        const dir = await mkTempDir();
        const path = join(dir, 'sessions.json');
        await seedV2Registry(path, { alpha: defaultV2Session() });

        const child = spawnChild({
          flavor: 'cli',
          registryPath: path,
          mutate: { session: 'ghost', field: 'last_prompt_sent_at', value: null },
        });
        liveChildren.push(child);

        const result = await child.done;
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toMatch(/ghost/);
      },
      CHILD_TIMEOUT,
    );
  });
});
