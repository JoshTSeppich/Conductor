/**
 * DAEMON-T13 — handoff watcher integration tests.
 *
 * Watches HANDOFF.md per non-killed session via fs.watch (S02
 * pattern) and emits `handoff_written` per §5.3 with
 * {path, size_bytes}. Per-session lifecycle managed by
 * WatcherManager: attach on POST /v2/sessions, detach on
 * PATCH state→killed, attachAll at startup (skipping killed),
 * closeAll on shutdown.
 *
 * Wire/ring observation: tests use a pre-seeded EventRing and
 * inspect ring.query() after triggering writes. WS-side
 * delivery is already covered by T12.
 *
 * Probes (5 total per pre-reg):
 *   P1 Daemon starts with 1 armed session → watcher attached;
 *      trigger via stub → ring contains handoff_written with
 *      {path, size_bytes}
 *   P2 Burst (3 triggers) within debounce window → exactly 1
 *      emit; emit timestamp ≥ (last trigger time + debounce);
 *      locks trailing-debounce semantics
 *   P3 2 armed sessions ('a', 'b'); trigger only 'a' → only
 *      session: 'a' event fires (per-key debounce, no
 *      cross-pollination)
 *   P4 PATCH armed→killed → detach; subsequent stub-fire does
 *      NOT emit (settle past debounce, ring still shows only
 *      pre-kill events)
 *   P5 Daemon startup over registry with 2 armed + 1 killed →
 *      attachAll skips killed; triggering on killed session
 *      emits nothing; armed sessions emit normally
 *
 * Debounce window: 50ms per S02 §3.3 (Round 2 finding #20).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { createEventRing } from '../../src/events/history.js';
import type { SessionV2 } from 'dispatch-core/src/v2/schema.js';
import type { TmuxOps } from '../../src/state/transitions.js';

const DEBOUNCE_MS = 50;

describe('DAEMON-T13 — handoff watcher', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t13-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkSessionWorkDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t13-cwd-'));
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

  function stubTmuxOps(): TmuxOps {
    return {
      async sendCtrlC(_t: string) {
        /* no-op success */
      },
      async killSession(_t: string) {
        /* no-op success */
      },
      async sendKeys(_t: string, _x: string) {
        /* no-op */
      },
      async hasSession(_t: string): Promise<boolean> {
        return true;
      },
    };
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('P1 attached watcher → trigger fires handoff_written with {path, size_bytes}', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    await writeFile(handoffPath, 'initial\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({ cwd: workDir, handoff_path: handoffPath }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({ registryPath, eventRing: ring });

    await ts.triggerHandoffWrite('sherpa', { size_bytes: 256 });
    await sleep(DEBOUNCE_MS + 50);

    const events = ring.query({});
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('handoff_written');
    expect(events[0].session).toBe('sherpa');
    expect(events[0].data).toEqual({
      path: handoffPath,
      size_bytes: 256,
    });
  });

  it('P2 burst within debounce → 1 emit; trailing semantics (emit fires after last trigger + debounce)', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    await writeFile(handoffPath, 'initial\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({ cwd: workDir, handoff_path: handoffPath }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({ registryPath, eventRing: ring });

    const t0 = Date.now();
    await ts.triggerHandoffWrite('sherpa', { size_bytes: 100 });
    await sleep(15);
    await ts.triggerHandoffWrite('sherpa', { size_bytes: 200 });
    await sleep(15);
    const tLast = Date.now();
    await ts.triggerHandoffWrite('sherpa', { size_bytes: 300 });

    // Wait past debounce + slop
    await sleep(DEBOUNCE_MS + 75);

    const events = ring.query({});
    expect(events).toHaveLength(1);
    const emitMs = new Date(events[0].timestamp).getTime();
    // Emit must fire AFTER (last trigger + debounce - small slop)
    expect(emitMs - tLast).toBeGreaterThanOrEqual(DEBOUNCE_MS - 10);
    // Emit must NOT have fired earlier than (first trigger + debounce)
    expect(emitMs - t0).toBeGreaterThanOrEqual(DEBOUNCE_MS - 10);
    // The retained data is from the LAST trigger (latest snapshot)
    expect((events[0].data as { size_bytes: number }).size_bytes).toBe(300);
  });

  it('P3 two sessions, trigger only one → only that session emits', async () => {
    const workDirA = await mkSessionWorkDir();
    const workDirB = await mkSessionWorkDir();
    const handoffA = join(workDirA, 'HANDOFF.md');
    const handoffB = join(workDirB, 'HANDOFF.md');
    await writeFile(handoffA, 'a\n', 'utf8');
    await writeFile(handoffB, 'b\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        a: mkSession({ cwd: workDirA, handoff_path: handoffA }),
        b: mkSession({ cwd: workDirB, handoff_path: handoffB }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({ registryPath, eventRing: ring });

    await ts.triggerHandoffWrite('a', { size_bytes: 10 });
    await sleep(DEBOUNCE_MS + 50);

    const events = ring.query({});
    expect(events).toHaveLength(1);
    expect(events[0].session).toBe('a');
    expect(events[0].type).toBe('handoff_written');
  });

  it('P4 PATCH armed→killed → detach; subsequent trigger does NOT emit', async () => {
    const workDir = await mkSessionWorkDir();
    const handoffPath = join(workDir, 'HANDOFF.md');
    await writeFile(handoffPath, 'initial\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({ cwd: workDir, handoff_path: handoffPath }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({
      registryPath,
      eventRing: ring,
      tmuxOps: stubTmuxOps(),
    });

    // Pre-kill: trigger emits
    await ts.triggerHandoffWrite('sherpa', { size_bytes: 50 });
    await sleep(DEBOUNCE_MS + 50);
    const beforeKill = ring.query({}).filter((e) => e.type === 'handoff_written');
    expect(beforeKill).toHaveLength(1);

    // Kill the session
    const r = await fetch(`${ts.url}/v2/sessions/sherpa/state`, {
      method: 'PATCH',
      headers: {
        'x-conductor-token': ts.token ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ state: 'killed' }),
    });
    expect(r.status).toBe(200);

    // Post-kill: trigger does NOT emit a new handoff_written
    await ts.triggerHandoffWrite('sherpa', { size_bytes: 99 });
    await sleep(DEBOUNCE_MS + 50);
    const handoffEvents = ring
      .query({})
      .filter((e) => e.type === 'handoff_written');
    expect(handoffEvents).toHaveLength(1); // unchanged from before-kill
  });

  it('P5 startup with 2 armed + 1 killed → attachAll skips killed; killed emits nothing', async () => {
    const workDirX = await mkSessionWorkDir();
    const workDirY = await mkSessionWorkDir();
    const workDirZ = await mkSessionWorkDir();
    const handoffX = join(workDirX, 'HANDOFF.md');
    const handoffY = join(workDirY, 'HANDOFF.md');
    const handoffZ = join(workDirZ, 'HANDOFF.md');
    await writeFile(handoffX, 'x\n', 'utf8');
    await writeFile(handoffY, 'y\n', 'utf8');
    await writeFile(handoffZ, 'z\n', 'utf8');

    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        x: mkSession({ cwd: workDirX, handoff_path: handoffX, state: 'armed' }),
        y: mkSession({ cwd: workDirY, handoff_path: handoffY, state: 'armed' }),
        z: mkSession({ cwd: workDirZ, handoff_path: handoffZ, state: 'killed' }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({ registryPath, eventRing: ring });

    // Trigger all three; only x and y should emit
    await ts.triggerHandoffWrite('x', { size_bytes: 1 });
    await ts.triggerHandoffWrite('y', { size_bytes: 2 });
    await ts.triggerHandoffWrite('z', { size_bytes: 3 });
    await sleep(DEBOUNCE_MS + 75);

    const events = ring
      .query({})
      .filter((e) => e.type === 'handoff_written')
      .sort((a, b) => a.session.localeCompare(b.session));
    expect(events.map((e) => e.session)).toEqual(['x', 'y']);
    // z (killed) absent — no spurious startup emit either
    expect(events.find((e) => e.session === 'z')).toBeUndefined();
  });
});
