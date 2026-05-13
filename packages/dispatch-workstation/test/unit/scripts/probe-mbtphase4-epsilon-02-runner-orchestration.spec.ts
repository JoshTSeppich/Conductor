// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB3 RED —
// probe-mbtphase4-epsilon-02-runner-orchestration: contract probe for
// the visual-diff-runner orchestrator.
//
// Round 11 §3.9 Wave 4 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`. Sub-Q-C=(ii) single launch + multi-
// screenshot; Sub-Q-D=(ii) γ-aligned exit-code mapping inherited
// transitively via runner's state classification.
//
// Encoded contract (4 conditions, all RED at HEAD c5a3a95):
//   (1) Module `packages/dispatch-workstation/scripts/visual-diff-runner.mjs`
//       exists.
//   (2) Exports `runVisualDiff(config, deps): Promise<VisualDiffAggregate>`.
//       Deps-injectable shape allows unit-test injection of mock
//       launchHeadless / captureScreenshot / diffImages (pure-fn-style
//       testability without actually launching electron in the probe).
//   (3) Empty-config (zero targets) → aggregate with empty targets[] +
//       allPassed=true (vacuously) + anyFailed=false + anyTargetAbsent
//       =false. Graceful no-op.
//   (4) Multi-target config with injected mocks: runner iterates targets;
//       per-target results carry name + state + (when state ∈ PASS/FAIL)
//       mismatchPercent; aggregate flags correctly derived
//       (allPassed=AND, anyFailed=OR-on-FAIL, anyTargetAbsent=OR-on-TARGET-ABSENT).
//
// Flips RED → GREEN at WB4 (runner module ship).
//
// Anti-fabrication §2.1: dynamic-import; injected deps avoid real
// electron launch (unit-test scope). γ tooling is the runtime
// dependency; runner-level unit tests stub the γ surface for
// determinism.

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const RUNNER_MODULE_PATH = resolve(
  WORKSTATION_ROOT,
  'scripts/visual-diff-runner.mjs',
);

describe('MB-T-PHASE-4-EPSILON WB3 RED — visual-diff-runner orchestration', () => {
  describe('Condition (1): module file exists', () => {
    it('scripts/visual-diff-runner.mjs exists at filesystem', () => {
      expect(
        existsSync(RUNNER_MODULE_PATH),
        `expected file at ${RUNNER_MODULE_PATH} — WB4 GREEN authors`,
      ).toBe(true);
    });
  });

  describe('Condition (2): runVisualDiff export shape', () => {
    it('runVisualDiff is a function with deps-injectable signature', async () => {
      let run: unknown;
      let importError: Error | undefined;
      try {
        const mod = await import(
          /* @vite-ignore */ '../../../scripts/visual-diff-runner.mjs'
        );
        run = (mod as { runVisualDiff?: unknown }).runVisualDiff;
      } catch (e) {
        importError = e instanceof Error ? e : new Error(String(e));
      }
      expect(
        importError,
        importError ? `import failed: ${importError.message}` : undefined,
      ).toBeUndefined();
      expect(typeof run).toBe('function');
    });
  });

  describe('Condition (3): empty-config graceful no-op', () => {
    it('zero targets → empty aggregate with vacuous-true flags', async () => {
      const mod = await import(
        /* @vite-ignore */ '../../../scripts/visual-diff-runner.mjs'
      );
      const run = (
        mod as {
          runVisualDiff: (
            config: { targets: unknown[] },
            deps?: unknown,
          ) => Promise<{
            targets: unknown[];
            allPassed: boolean;
            anyFailed: boolean;
            anyTargetAbsent: boolean;
          }>;
        }
      ).runVisualDiff;

      const result = await run({ targets: [] });
      expect(result.targets).toHaveLength(0);
      expect(result.allPassed).toBe(true);
      expect(result.anyFailed).toBe(false);
      expect(result.anyTargetAbsent).toBe(false);
    });
  });

  describe('Condition (4): multi-target dispatch + aggregate flags', () => {
    it('iterates targets via injected deps + correctly derives aggregate flags', async () => {
      const mod = await import(
        /* @vite-ignore */ '../../../scripts/visual-diff-runner.mjs'
      );
      const run = (
        mod as {
          runVisualDiff: (
            config: {
              targets: ReadonlyArray<{
                name: string;
                screenshotPath: string;
                targetImagePath: string;
                thresholdPercent: number;
              }>;
            },
            deps?: {
              launchHeadless?: () => Promise<{
                page: unknown;
                dispose: () => Promise<void>;
              }>;
              captureScreenshot?: (o: { page: unknown; outPath: string }) => Promise<string>;
              diffImages?: (o: {
                leftPath: string;
                rightPath: string;
                outDiffPath: string;
              }) => Promise<{ ratio: number; error?: string }>;
            },
          ) => Promise<{
            targets: ReadonlyArray<{
              name: string;
              state: string;
              mismatchPercent?: number;
            }>;
            allPassed: boolean;
            anyFailed: boolean;
            anyTargetAbsent: boolean;
          }>;
        }
      ).runVisualDiff;

      const launchCalls: number[] = [];
      const captureCalls: string[] = [];
      const diffCalls: string[] = [];

      const deps = {
        launchHeadless: async () => {
          launchCalls.push(1);
          return {
            page: { __mock: true },
            dispose: async () => {},
          };
        },
        captureScreenshot: async ({ outPath }: { page: unknown; outPath: string }) => {
          captureCalls.push(outPath);
          return outPath;
        },
        diffImages: async ({ rightPath }: { rightPath: string }) => {
          diffCalls.push(rightPath);
          // Per-target diff result driven by target name suffix
          if (rightPath.includes('PASS')) return { ratio: 0.001 };       // 0.1% → PASS
          if (rightPath.includes('FAIL')) return { ratio: 0.05 };        // 5% → FAIL (>1%)
          if (rightPath.includes('ABSENT'))
            return { ratio: NaN, error: 'TARGET-ABSENT' };
          return { ratio: 0 };
        },
      };

      const result = await run(
        {
          targets: [
            {
              name: 'pass-target',
              screenshotPath: '/tmp/PASS.snap.png',
              targetImagePath: '/tmp/PASS.target.png',
              thresholdPercent: 1.0,
            },
            {
              name: 'fail-target',
              screenshotPath: '/tmp/FAIL.snap.png',
              targetImagePath: '/tmp/FAIL.target.png',
              thresholdPercent: 1.0,
            },
            {
              name: 'absent-target',
              screenshotPath: '/tmp/ABSENT.snap.png',
              targetImagePath: '/tmp/ABSENT.target.png',
              thresholdPercent: 1.0,
            },
          ],
        },
        deps,
      );

      expect(result.targets).toHaveLength(3);
      expect(result.targets[0]?.state).toBe('PASS');
      expect(result.targets[1]?.state).toBe('FAIL');
      expect(result.targets[2]?.state).toBe('TARGET-ABSENT');

      // PASS carries mismatchPercent
      expect(result.targets[0]?.mismatchPercent).toBeCloseTo(0.1, 4);
      // FAIL carries mismatchPercent
      expect(result.targets[1]?.mismatchPercent).toBeCloseTo(5, 4);

      // Aggregate flags
      expect(result.allPassed).toBe(false);          // FAIL present
      expect(result.anyFailed).toBe(true);           // FAIL present
      expect(result.anyTargetAbsent).toBe(true);     // ABSENT present

      // Single launch shared across targets (Sub-Q-C=(ii))
      expect(launchCalls).toHaveLength(1);
      // Per-target capture + diff
      expect(captureCalls).toHaveLength(3);
      expect(diffCalls).toHaveLength(3);
    });
  });
});
