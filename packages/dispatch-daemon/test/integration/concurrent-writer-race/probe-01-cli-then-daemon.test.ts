/**
 * MB-F-DAEMON-CONCURRENT-RACE — probe-01.
 *
 * Demonstrates FM1 (lost update) in the cli-overwritten-by-daemon
 * direction — daemon's stale snapshot loses CLI's intervening
 * writeRegistry mutation. The OPPOSITE direction of probe-02.
 * Sequential, deterministic. Operator-arbitrated framing per
 * Phase 1 §6 Q1 = THREE PROBES (full coverage of both lost-update
 * directions).
 *
 * Sequence (operator-specified, Phase 2 brief):
 *   1. Seed: alpha + beta both armed; beta.last_prompt_sent_at=null.
 *   2. Spawn daemon-write child with barrier — reads, snapshots
 *      (beta.last_prompt_sent_at=null in snapshot), prints READY,
 *      awaits barrier.
 *   3. Spawn cli-write child without barrier — reads, mutates
 *      beta.last_prompt_sent_at to ISO, writes, exits. Disk
 *      reflects beta.last_prompt_sent_at != null.
 *   4. Sanity midRace: confirm beta.last_prompt_sent_at != null.
 *   5. Signal barrier — daemon writes its STALE snapshot, clobbering
 *      beta.last_prompt_sent_at back to null.
 *   6. Read final via readRegistryV2.
 *   7. Assert beta.last_prompt_sent_at !== null (CORRECT behavior —
 *      daemon should have re-read before writing to avoid lost
 *      update).
 *
 * Daemon's mutation in this probe is arbitrary (alpha.state →
 * "paused"). What matters is that daemon writes ITS WHOLE snapshot,
 * not just the alpha mutation — and the snapshot's stale beta state
 * is what gets lost-updated onto disk.
 *
 * it.fails marker — same pattern as probe-02. Today the assertion
 * fails (daemon overwrites CLI's last_prompt_sent_at). If a fix
 * lands or the bug is masked, the assertion will pass and vitest
 * will surface the test as a failure.
 *
 * Confidence: KNOWN — race shape derived from Phase 1 §1.2 FM1.
 * Operator-arbitrated WB3 spec frozen at Phase 2 turn-on.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistryV2 } from '../../../src/migration/schema-v2.js';
import { createBarrier } from './helpers/barrier.js';
import { spawnChild, type ChildHandle } from './helpers/spawn-child.js';

const PROBE_TIMEOUT = 30_000;

describe('MB-F-DAEMON-CONCURRENT-RACE probe-01 — cli-then-daemon lost update', () => {
  const liveChildren: ChildHandle[] = [];

  afterEach(() => {
    while (liveChildren.length > 0) {
      const c = liveChildren.shift();
      c?.kill();
    }
  });

  it.fails(
    'CLI sets beta.last_prompt_sent_at, then daemon overwrites with stale null snapshot — disk SHOULD retain CLI write',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'fd-race-probe01-'));
      const registryPath = join(dir, 'sessions.json');
      const barrier = createBarrier(dir);

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

      // Step 2: spawn daemon child with barrier — snapshots and waits.
      // Mutation is arbitrary (alpha.state → paused); the lost-update
      // surface is the stale beta.last_prompt_sent_at that rides
      // along in the daemon's full-registry write.
      const daemonChild = spawnChild({
        flavor: 'daemon',
        registryPath,
        mutate: { session: 'alpha', field: 'state', value: 'paused' },
        barrierPath: barrier.path,
      });
      liveChildren.push(daemonChild);

      await daemonChild.ready;

      // Step 3: spawn CLI child WITHOUT barrier — completes immediately.
      const cliChild = spawnChild({
        flavor: 'cli',
        registryPath,
        mutate: {
          session: 'beta',
          field: 'last_prompt_sent_at',
          value: '2026-05-05T11:00:00.000Z',
        },
      });
      liveChildren.push(cliChild);
      const cliResult = await cliChild.done;
      expect(cliResult.exitCode).toBe(0);

      // Step 4: confirm CLI's write landed on disk.
      const midRace = await readRegistryV2(registryPath);
      expect(midRace.sessions.beta!.last_prompt_sent_at).toBe(
        '2026-05-05T11:00:00.000Z',
      );

      // Step 5: signal barrier — daemon writes stale snapshot.
      await barrier.signal();

      const daemonResult = await daemonChild.done;
      expect(daemonResult.exitCode).toBe(0);

      // Step 6 + 7: assert CORRECT behavior. Today the lost update
      // wins — daemon's stale snapshot reset beta.last_prompt_sent_at
      // back to null. it.fails captures the regression-detection signal.
      const finalState = await readRegistryV2(registryPath);
      expect(finalState.sessions.beta!.last_prompt_sent_at).not.toBeNull();
    },
    PROBE_TIMEOUT,
  );
});
