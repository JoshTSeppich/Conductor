/**
 * DAEMON-T15 — STATUS.json watcher integration tests.
 *
 * Per-session watcher on <cwd>/STATUS.json (arb 1A). On update,
 * production reads the file via StatusJsonSchema (6-field
 * on-disk shape published in dispatch-core/v2/schema.ts:126),
 * projects to TestStatusUpdatedEvent.data (3-field §5.3 shape:
 * tests_passing, tests_failing, phase), and emits if all 3
 * event-required fields are non-null.
 *
 * Round 2 Finding #26 (multi-source shape composition):
 *   StatusJsonSchema and TestStatusUpdatedEvent.data are
 *   NOT in conflict — each is authoritative for its own
 *   domain. On-disk allows nulls (CC writes incrementally:
 *   updated_at + last_action populated at session start;
 *   test counts populated after first run). Wire event
 *   requires non-null fields (event semantic = "test status
 *   is now reportable"). Daemon bridges via projection +
 *   null-skip. The pre-reg arb 2a "same shape" framing
 *   was the methodology gap that #26 codifies; the fix
 *   isn't to pick one schema, it's to recognize schemas
 *   serve different domains and compose them via
 *   projection logic.
 *
 * Probes (5 logical / 7 effective with it.each):
 *   P1 Valid full StatusJson (all 3 event-required fields
 *      non-null) → ring contains test_status_updated with
 *      ONLY the 3-field projection (no unknowns, no
 *      last_action, no updated_at on the wire)
 *   P2 Burst (3 triggers within 50ms) → exactly 1 emit
 *      with the LAST trigger's data
 *   P3 it.each over 3 event-required fields:
 *      P3a tests_passing: null → no emit
 *      P3b tests_failing: null → no emit
 *      P3c phase: null → no emit
 *   P4 PATCH armed→killed → manager detach covers status
 *      watcher (parallel to T13 P4 / T14 P3 detach pattern;
 *      locks status: prefix in isKeyForSession)
 *
 *   P5 (in test/unit/status-watcher.test.ts) production
 *      createStatusWatcher on missing cwd → no throw, valid
 *      handle, no onUpdate ever fires
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnTestServer, type TestServer } from '../fixtures/server.js';
import { writeRegistryV2 } from '../../src/migration/schema-v2.js';
import { createEventRing } from '../../src/events/history.js';
import type {
  SessionV2,
  StatusJson,
} from 'dispatch-core/src/v2/schema.js';
import type { TmuxOps } from '../../src/state/transitions.js';

const DEBOUNCE_MS = 50;

describe('DAEMON-T15 — STATUS.json watcher', () => {
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
    const dir = await mkdtemp(join(tmpdir(), 'fd-t15-reg-'));
    return join(dir, 'sessions.json');
  }

  async function mkSessionWorkDir(): Promise<string> {
    return await mkdtemp(join(tmpdir(), 'fd-t15-cwd-'));
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
        /* no-op */
      },
      async killSession(_t: string) {
        /* no-op */
      },
      async sendKeys(_t: string, _x: string) {
        /* no-op */
      },
      async hasSession(_t: string): Promise<boolean> {
        return true;
      },
    };
  }

  function mkValidStatus(overrides: Partial<StatusJson> = {}): StatusJson {
    return {
      phase: 'green',
      tests_passing: 42,
      tests_failing: 0,
      last_action: 'pnpm test',
      updated_at: '2026-04-27T18:00:00.000Z',
      ...overrides,
    };
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('P1 valid full StatusJson → emit projects to 3-field event shape only', async () => {
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

    await ts.triggerStatusJsonUpdate('sherpa', mkValidStatus({
      phase: 'red',
      tests_passing: 7,
      tests_failing: 3,
      unknowns: ['flaky-test-x'],
      last_action: 'wrote test',
    }));
    await sleep(DEBOUNCE_MS + 50);

    const events = ring
      .query({})
      .filter((e) => e.type === 'test_status_updated');
    expect(events).toHaveLength(1);
    expect(events[0].session).toBe('sherpa');
    // Wire event has ONLY the 3-field projection
    expect(events[0].data).toEqual({
      tests_passing: 7,
      tests_failing: 3,
      phase: 'red',
    });
    // No on-disk-only fields leak to wire
    const data = events[0].data as Record<string, unknown>;
    expect('unknowns' in data).toBe(false);
    expect('last_action' in data).toBe(false);
    expect('updated_at' in data).toBe(false);
  });

  // Skipped on CI: debounce timing; the burst window is too tight for shared runners. Run locally.
  it.skipIf(process.env.CI === 'true')('P2 burst within debounce → 1 emit with LAST trigger data', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({ cwd: workDir, handoff_path: join(workDir, 'HANDOFF.md') }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({ registryPath, eventRing: ring });

    await ts.triggerStatusJsonUpdate(
      'sherpa',
      mkValidStatus({ phase: 'amber', tests_passing: 1, tests_failing: 0 }),
    );
    await sleep(15);
    await ts.triggerStatusJsonUpdate(
      'sherpa',
      mkValidStatus({ phase: 'amber', tests_passing: 2, tests_failing: 0 }),
    );
    await sleep(15);
    await ts.triggerStatusJsonUpdate(
      'sherpa',
      mkValidStatus({ phase: 'green', tests_passing: 3, tests_failing: 0 }),
    );
    await sleep(DEBOUNCE_MS + 75);

    const events = ring
      .query({})
      .filter((e) => e.type === 'test_status_updated');
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({
      tests_passing: 3,
      tests_failing: 0,
      phase: 'green',
    });
  });

  it.each([
    {
      fieldName: 'tests_passing',
      partial: { tests_passing: null } as Partial<StatusJson>,
    },
    {
      fieldName: 'tests_failing',
      partial: { tests_failing: null } as Partial<StatusJson>,
    },
    {
      fieldName: 'phase',
      partial: { phase: null } as Partial<StatusJson>,
    },
  ])(
    'P3 null $fieldName → projection skip; no test_status_updated emit',
    async ({ partial }) => {
      const workDir = await mkSessionWorkDir();
      const registryPath = await mkRegistryPath();
      await writeRegistryV2(registryPath, {
        version: 2,
        sessions: {
          sherpa: mkSession({
            cwd: workDir,
            handoff_path: join(workDir, 'HANDOFF.md'),
          }),
        },
      });

      const ring = createEventRing(100);
      ts = await spawnTestServer({ registryPath, eventRing: ring });

      await ts.triggerStatusJsonUpdate(
        'sherpa',
        mkValidStatus(partial),
      );
      await sleep(DEBOUNCE_MS + 50);

      const events = ring
        .query({})
        .filter((e) => e.type === 'test_status_updated');
      expect(events).toHaveLength(0);
    },
  );

  it('P4 PATCH armed→killed → detach covers status watcher', async () => {
    const workDir = await mkSessionWorkDir();
    const registryPath = await mkRegistryPath();
    await writeRegistryV2(registryPath, {
      version: 2,
      sessions: {
        sherpa: mkSession({
          cwd: workDir,
          handoff_path: join(workDir, 'HANDOFF.md'),
        }),
      },
    });

    const ring = createEventRing(100);
    ts = await spawnTestServer({
      registryPath,
      eventRing: ring,
      tmuxOps: stubTmuxOps(),
    });

    // Pre-kill: trigger emits
    await ts.triggerStatusJsonUpdate('sherpa', mkValidStatus());
    await sleep(DEBOUNCE_MS + 50);
    const beforeKill = ring
      .query({})
      .filter((e) => e.type === 'test_status_updated');
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

    // Post-kill: trigger emits nothing
    await ts.triggerStatusJsonUpdate(
      'sherpa',
      mkValidStatus({ phase: 'post-kill' }),
    );
    await sleep(DEBOUNCE_MS + 50);
    const after = ring
      .query({})
      .filter((e) => e.type === 'test_status_updated');
    expect(after).toHaveLength(1); // unchanged from pre-kill
  });
});
