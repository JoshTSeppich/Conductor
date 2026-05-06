/**
 * MB-F-DAEMON-CONCURRENT-RACE — probe-03.
 *
 * Stochastic — captures the actual on-disk outcomes of N=10
 * simultaneous writes. Operator-arbitrated policy per Phase 1 §6
 * Q3 = LOOP N=10 + assert ≥1 iteration exhibits a documented FM3
 * sub-mode. Q2 = it() (NOT it.fails) — captures actual behavior;
 * passes when at least one race-detected outcome is recorded.
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
 * Pass condition: at LEAST one iteration of N=10 shows
 *   FM3b-rename-error || FM3-corrupt || FM3-silent-lost-update.
 * If 0 iterations raced, fail with diagnostic (timing too coarse
 * on this machine; tune polling or barrier latency).
 *
 * Confidence: KNOWN — simultaneous-write race surface derived from
 * Phase 1 §1.2 FM3. Operator-arbitrated WB4 spec frozen at Phase 2
 * turn-on.
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
    'at least one of N=10 iterations exhibits a documented FM3 sub-mode',
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

      const racedCount =
        tally['FM3b-rename-error'] +
        tally['FM3-corrupt'] +
        tally['FM3-silent-lost-update'];

      expect(
        racedCount,
        `Expected ≥1 iteration to exhibit FM3 sub-mode across ${ITERATIONS}; ` +
          `got tally=${JSON.stringify(tally)}. Timing may be too coarse on ` +
          `this machine — investigate barrier polling latency or child startup time.`,
      ).toBeGreaterThanOrEqual(1);
    },
    PROBE_TIMEOUT,
  );
});
