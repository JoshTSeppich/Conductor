/**
 * MB-F-DAEMON-CONCURRENT-RACE — probe-03.
 *
 * Stochastic — captures the actual on-disk outcomes of N=10
 * simultaneous writes. Operator-arbitrated policy per Phase 1 §6
 * Q3 = LOOP N=10. Q2 = it() (NOT it.fails) — captures actual
 * behavior.
 *
 * Each iteration:
 *   1. Seed: alpha.state="armed", beta.last_prompt_sent_at=null.
 *   2. Spawn cli-write child WITH barrier (mutation: beta
 *      last_prompt_sent_at → ISO).
 *   3. Spawn daemon-write child WITH barrier (mutation: alpha
 *      state → "paused").
 *   4. Await both READY (both have snapshotted the original seed).
 *   5. barrier.signal() — both attempt rename near-simultaneously.
 *   6. Await both done.
 *   7. captureRaceState — categorise the iteration's outcome.
 *
 * Outcome taxonomy (Phase 1 §1.2 FM3 sub-modes):
 *
 *   FM3b-rename-error
 *     One or both children exit non-zero. Typically ENOENT from
 *     `rename(<path>.tmp, <path>)` because the other writer
 *     already moved the shared <path>.tmp. KNOWN — Node surfaces
 *     this as 'ENOENT: no such file or directory, rename ...'.
 *
 *   FM3-corrupt
 *     race-capture reports parsedAs === 'unparseable'. Indicates
 *     bytes-level interleaving from concurrent writes to the
 *     shared <path>.tmp followed by mid-flight rename. Less likely
 *     at small registry sizes; documented for completeness.
 *
 *   FM3-silent-lost-update
 *     Both children exit 0 and the file parses cleanly, but one
 *     writer's mutation is missing from the final state. Combines
 *     FM3a (tmp-truncate-then-rename) and FM3c (daemon's readback
 *     retry validates against the OTHER writer's bytes and returns
 *     success). KNOWN-most-frequent outcome under the barrier-
 *     coordinated simultaneous write pattern.
 *
 *   no-race-detected
 *     Both mutations present in final state. Only possible if the
 *     writes serialised cleanly enough that one read AFTER the
 *     other's rename. Logged but does NOT count toward the assert.
 *
 * MB-F-DAEMON-CONCURRENT-RACE-FIX (sess-g, parallel-batch-6) updated
 * the assertion model:
 *
 *   PRE-FIX assertion (sess-c-shipped): `racedCount >= 1` —
 *     captured the existence of FM3 sub-modes at HEAD `b3da626`.
 *
 *   POST-FIX assertion (sess-g-shipped, this file): FM3b-rename-error
 *     and FM3-corrupt MUST be zero across all N=10 iterations. The
 *     proper-lockfile primitive integrated into writeAtomicJson
 *     serialises concurrent rename + tmp ownership, eliminating
 *     these two FM3 sub-modes outright.
 *
 *   FM3-silent-lost-update is INTENTIONALLY left unasserted: the
 *     write-only lock that sess-g shipped does NOT address FM1
 *     (lost-update from stale snapshots), because FM1 is a caller-
 *     side read-modify-write hazard that spans the entire
 *     read→mutate→write window — not just the rename. Each writer
 *     reads BEFORE acquiring the lock, so when both writers reach
 *     the lock with their stale-but-otherwise-consistent snapshots,
 *     each writes its own whole-registry value; whoever writes last
 *     wins. The result classifies as FM3-silent-lost-update under
 *     the existing classifier even though the proximate cause is
 *     FM1, not FM3.
 *
 *   no-race-detected is left unasserted because its rate depends
 *     on barrier polling latency + child startup interleaving and
 *     is machine-dependent.
 *
 *   FM1 — full lost-update fix — is deferred to a future batch:
 *     MB-F-DAEMON-CONCURRENT-RACE-FIX-FM1. Likely paths: caller-
 *     side lock spanning read→mutate→write, field-level patch
 *     protocol, or HTTP-mandatory single-writer. Operator pick at
 *     next batch turn-on. probe-01 + probe-02 stay `it.fails`
 *     post-sess-g; both correctly demonstrate FM1 still fires.
 *
 * Confidence: KNOWN — simultaneous-write race surface derived from
 * Phase 1 §1.2 FM3. sess-g WB3 (commit `23517d7`) integrates the
 * proper-lockfile primitive. Sample tally observed at sess-g WB4:
 *   {"FM3b-rename-error":0, "FM3-corrupt":0,
 *    "FM3-silent-lost-update":10, "no-race-detected":0}
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBarrier } from './helpers/barrier.js';
import { captureRaceState, type RaceCapture } from './helpers/race-capture.js';
import {
  spawnChild,
  type ChildHandle,
  type ChildResult,
} from './helpers/spawn-child.js';

const PROBE_TIMEOUT = 60_000;
const ITERATIONS = 10;

type Outcome =
  | 'FM3b-rename-error'
  | 'FM3-corrupt'
  | 'FM3-silent-lost-update'
  | 'no-race-detected';

interface IterationRecord {
  iteration: number;
  outcome: Outcome;
  cliExitCode: number | null;
  daemonExitCode: number | null;
  finalAlphaState: string | undefined;
  finalBetaLastPromptSentAt: string | null | undefined;
  capture: RaceCapture;
  cliStderr: string;
  daemonStderr: string;
}

describe('MB-F-DAEMON-CONCURRENT-RACE probe-03 — simultaneous race (N=10)', () => {
  const liveChildren: ChildHandle[] = [];

  afterEach(() => {
    while (liveChildren.length > 0) {
      const c = liveChildren.shift();
      c?.kill();
    }
  });

  function seedBody(): string {
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
    return `${JSON.stringify(seed, null, 2)}\n`;
  }

  function classify(
    cli: ChildResult,
    daemon: ChildResult,
    capture: RaceCapture,
    expectedBetaTimestamp: string,
  ): Outcome {
    if (cli.exitCode !== 0 || daemon.exitCode !== 0) {
      return 'FM3b-rename-error';
    }
    if (capture.parsedAs === 'unparseable' || capture.parsedAs === 'missing') {
      return 'FM3-corrupt';
    }

    let alphaState: string | undefined;
    let betaLastPromptSentAt: string | null | undefined;
    if (capture.bodyOnDisk !== null) {
      try {
        const parsed = JSON.parse(capture.bodyOnDisk) as {
          sessions?: Record<
            string,
            { state?: string; last_prompt_sent_at?: string | null }
          >;
        };
        alphaState = parsed.sessions?.alpha?.state;
        betaLastPromptSentAt = parsed.sessions?.beta?.last_prompt_sent_at;
      } catch {
        return 'FM3-corrupt';
      }
    }

    const cliMutationPresent = betaLastPromptSentAt === expectedBetaTimestamp;
    const daemonMutationPresent = alphaState === 'paused';

    if (cliMutationPresent && daemonMutationPresent) {
      return 'no-race-detected';
    }
    return 'FM3-silent-lost-update';
  }

  async function runOne(
    iteration: number,
    expectedBetaTimestamp: string,
  ): Promise<IterationRecord> {
    const dir = await mkdtemp(join(tmpdir(), `fd-race-probe03-${iteration}-`));
    const registryPath = join(dir, 'sessions.json');
    await writeFile(registryPath, seedBody(), 'utf8');
    const barrier = createBarrier(dir);

    const cliChild = spawnChild({
      flavor: 'cli',
      registryPath,
      mutate: {
        session: 'beta',
        field: 'last_prompt_sent_at',
        value: expectedBetaTimestamp,
      },
      barrierPath: barrier.path,
    });
    liveChildren.push(cliChild);

    const daemonChild = spawnChild({
      flavor: 'daemon',
      registryPath,
      mutate: { session: 'alpha', field: 'state', value: 'paused' },
      barrierPath: barrier.path,
    });
    liveChildren.push(daemonChild);

    await Promise.all([cliChild.ready, daemonChild.ready]);
    await barrier.signal();
    const [cliResult, daemonResult] = await Promise.all([
      cliChild.done,
      daemonChild.done,
    ]);

    const capture = await captureRaceState(registryPath);
    const outcome = classify(cliResult, daemonResult, capture, expectedBetaTimestamp);

    let alphaState: string | undefined;
    let betaLastPromptSentAt: string | null | undefined;
    if (capture.bodyOnDisk !== null) {
      try {
        const parsed = JSON.parse(capture.bodyOnDisk) as {
          sessions?: Record<
            string,
            { state?: string; last_prompt_sent_at?: string | null }
          >;
        };
        alphaState = parsed.sessions?.alpha?.state;
        betaLastPromptSentAt = parsed.sessions?.beta?.last_prompt_sent_at;
      } catch {
        // already classified as corrupt above
      }
    }

    return {
      iteration,
      outcome,
      cliExitCode: cliResult.exitCode,
      daemonExitCode: daemonResult.exitCode,
      finalAlphaState: alphaState,
      finalBetaLastPromptSentAt: betaLastPromptSentAt,
      capture,
      cliStderr: cliResult.stderr,
      daemonStderr: daemonResult.stderr,
    };
  }

  it(
    'FM3b-rename-error and FM3-corrupt are zero across N=10 (FM1 silent-lost-update may still fire post-write-only-lock)',
    async () => {
      const records: IterationRecord[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const ts = `2026-05-05T12:${String(i).padStart(2, '0')}:00.000Z`;
        records.push(await runOne(i, ts));
      }

      const tally: Record<Outcome, number> = {
        'FM3b-rename-error': 0,
        'FM3-corrupt': 0,
        'FM3-silent-lost-update': 0,
        'no-race-detected': 0,
      };
      for (const r of records) tally[r.outcome] += 1;

      // Print the tally so operator review of `pnpm test:race` output
      // sees the FM distribution. Vitest --reporter=default surfaces
      // console.log calls.
      // eslint-disable-next-line no-console
      console.log(
        `[probe-03] FM tally over ${ITERATIONS} iterations:`,
        JSON.stringify(tally),
      );
      for (const r of records) {
        // eslint-disable-next-line no-console
        console.log(
          `[probe-03] iter=${r.iteration} outcome=${r.outcome} ` +
            `cliExit=${r.cliExitCode} daemonExit=${r.daemonExitCode} ` +
            `alphaState=${r.finalAlphaState} betaLPS=${r.finalBetaLastPromptSentAt} ` +
            `parsedAs=${r.capture.parsedAs} tmpExists=${r.capture.tmpExists}`,
        );
      }

      // sess-g post-fix assertion: the proper-lockfile primitive in
      // writeAtomicJson eliminates FM3b-rename-error and FM3-corrupt
      // outright. Both must be zero across all N=10 iterations.
      // FM3-silent-lost-update may still fire (FM1 is out of scope for
      // this batch; see MB-F-DAEMON-CONCURRENT-RACE-FIX-FM1).
      // no-race-detected rate is machine-dependent; left unasserted.
      expect(
        tally['FM3b-rename-error'],
        `FM3b-rename-error must be 0 post-fix (lock prevents tmp ` +
          `collision yielding rename ENOENT); got tally=${JSON.stringify(tally)}.`,
      ).toBe(0);
      expect(
        tally['FM3-corrupt'],
        `FM3-corrupt must be 0 post-fix (lock prevents byte-level ` +
          `interleaving); got tally=${JSON.stringify(tally)}.`,
      ).toBe(0);
    },
    PROBE_TIMEOUT,
  );
});
