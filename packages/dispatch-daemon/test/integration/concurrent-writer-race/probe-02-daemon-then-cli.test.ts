/**
 * MB-F-DAEMON-CONCURRENT-RACE — probe-02.
 *
 * Demonstrates FM1 (lost update) in the daemon-overwritten-by-cli
 * direction. Sequential, deterministic. Operator-arbitrated framing
 * per Phase 1 §6 Q1 = THREE PROBES.
 *
 * Sequence (operator-specified, Phase 2 brief):
 *   1. Spawn cli-write child to mutate session "beta"
 *      (CLI snapshots full registry including alpha.state="armed").
 *   2. Wait for child READY (snapshot taken).
 *   3. Spawn daemon-write child (no barrier) to set alpha.state="paused".
 *      Daemon completes synchronously: state="paused" lands on disk.
 *   4. Signal barrier — CLI child writes its STALE snapshot
 *      (alpha.state still "armed" in CLI's snapshot from step 1).
 *   5. Wait for CLI child done.
 *   6. Read final state via readRegistryV2.
 *   7. Assert alpha.state === "paused" (CORRECT behavior).
 *
 * The assertion is what SHOULD hold if there were no race. Today it
 * does NOT hold — CLI's writeRegistry overwrites the daemon's paused
 * state with its stale armed snapshot. So this test is marked
 * `it.fails(...)`: vitest passes the SUITE when the assertion FAILS,
 * which is the regression-detection signal we want.
 *
 * If the assertion passes (no lost update), the test FAILS — that
 * means the bug is gone (or masked) and the operator should be
 * notified to revisit scope.
 *
 * Confidence: KNOWN — race shape derived from Phase 1 §1.2 FM1.
 * Operator-arbitrated WB2 spec frozen at Phase 2 turn-on.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistryV2 } from '../../../src/migration/schema-v2.js';
import { createBarrier } from './helpers/barrier.js';
import { spawnChild, type ChildHandle } from './helpers/spawn-child.js';

const PROBE_TIMEOUT = 30_000;

describe('MB-F-DAEMON-CONCURRENT-RACE probe-02 — daemon-then-cli lost update', () => {
  const liveChildren: ChildHandle[] = [];

  afterEach(() => {
    while (liveChildren.length > 0) {
      const c = liveChildren.shift();
      c?.kill();
    }
  });

  it.fails(
    'daemon writes alpha.state=paused, then CLI overwrites with stale armed snapshot — disk SHOULD show paused',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'fd-race-probe02-'));
      const registryPath = join(dir, 'sessions.json');
      const barrier = createBarrier(dir);

      // Seed: alpha + beta both armed; beta has null last_prompt_sent_at
      // so the CLI child has a non-trivial mutation target on a session
      // OTHER than alpha (CLI is updating beta, but its snapshot still
      // carries alpha.state="armed" — that's the stale field).
      const seed = {
        version: 2 as const,
        sessions: {
          alpha: {
            cwd: '/tmp/alpha',
            tmux_target: 'sherpa:0.0',
            handoff_path: '/tmp/alpha/HANDOFF.md',
            last_prompt_sent_at: null,
            last_handoff_pulled_at: null,
            state: 'armed' as const,
            last_commit_sha: null,
            last_status_json_at: null,
          },
          beta: {
            cwd: '/tmp/beta',
            tmux_target: 'sherpa:0.1',
            handoff_path: '/tmp/beta/HANDOFF.md',
            last_prompt_sent_at: null,
            last_handoff_pulled_at: null,
            state: 'armed' as const,
            last_commit_sha: null,
            last_status_json_at: null,
          },
        },
      };
      await writeFile(registryPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');

      // Step 1: spawn CLI child with barrier — snapshots and waits.
      const cliChild = spawnChild({
        flavor: 'cli',
        registryPath,
        mutate: {
          session: 'beta',
          field: 'last_prompt_sent_at',
          value: '2026-05-05T10:00:00.000Z',
        },
        barrierPath: barrier.path,
      });
      liveChildren.push(cliChild);

      // Step 2: wait for CLI snapshot.
      await cliChild.ready;

      // Step 3: spawn daemon child WITHOUT barrier — completes immediately.
      const daemonChild = spawnChild({
        flavor: 'daemon',
        registryPath,
        mutate: { session: 'alpha', field: 'state', value: 'paused' },
      });
      liveChildren.push(daemonChild);
      const daemonResult = await daemonChild.done;
      expect(daemonResult.exitCode).toBe(0);

      // Verify daemon's write actually landed before signaling barrier.
      const midRace = await readRegistryV2(registryPath);
      expect(midRace.sessions.alpha!.state).toBe('paused');

      // Step 4: signal barrier — CLI writes its stale snapshot.
      await barrier.signal();

      // Step 5: wait for CLI done.
      const cliResult = await cliChild.done;
      expect(cliResult.exitCode).toBe(0);

      // Step 6 + 7: assert CORRECT behavior. Today this fails — CLI
      // has overwritten alpha.state="paused" with its stale "armed".
      // The it.fails marker captures that the assertion is expected
      // NOT to hold under current code.
      const finalState = await readRegistryV2(registryPath);
      expect(finalState.sessions.alpha!.state).toBe('paused');
    },
    PROBE_TIMEOUT,
  );
});
