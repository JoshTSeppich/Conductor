// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB5 RED —
// probe-mbtphase4-epsilon-03-cli-shape: contract probe for the CI-
// friendly methodology-visual-diff-cli entry-point.
//
// Round 11 §3.9 Wave 5 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`. Sub-Q-D=(ii) γ-aligned exit codes:
// 0 = all-PASS or all-TARGET-ABSENT (graceful)
// 1 = any FAIL
// 2 = BUILD-FAILED or LAUNCH-FAILED
//
// Encoded contract (3 conditions, all RED at HEAD 16b288d):
//   (1) Module `packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs`
//       exists at filesystem.
//   (2) Exports `parseArgs(argv)` pure-fn returning structured args
//       `{ configPath?, jsonOutput, thresholdPercent?, skipRebuild }`.
//   (3) Exports `mapAggregateToExitCode(aggregate)` pure-fn:
//       - empty targets → 0 (vacuous)
//       - allPassed → 0
//       - anyFailed → 1
//       - all targets TARGET-ABSENT (anyTargetAbsent + !anyFailed +
//         !allPassed-with-non-empty) → 0 (γ graceful-degradation)
//       - any target LAUNCH-FAILED → 2
//
// Flips RED → GREEN at WB6 (CLI module ship).

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const CLI_MODULE_PATH = resolve(
  WORKSTATION_ROOT,
  'scripts/methodology-visual-diff-cli.mjs',
);

describe('MB-T-PHASE-4-EPSILON WB5 RED — methodology-visual-diff-cli shape', () => {
  describe('Condition (1): module file exists', () => {
    it('scripts/methodology-visual-diff-cli.mjs exists at filesystem', () => {
      expect(
        existsSync(CLI_MODULE_PATH),
        `expected file at ${CLI_MODULE_PATH} — WB6 GREEN authors`,
      ).toBe(true);
    });
  });

  describe('Condition (2): parseArgs structured-args parser', () => {
    it('extracts --config, --json, --threshold, --skip-rebuild flags', async () => {
      let parseArgs: unknown;
      let importError: Error | undefined;
      try {
        const mod = await import(
          /* @vite-ignore */ '../../../scripts/methodology-visual-diff-cli.mjs'
        );
        parseArgs = (mod as { parseArgs?: unknown }).parseArgs;
      } catch (e) {
        importError = e instanceof Error ? e : new Error(String(e));
      }
      expect(
        importError,
        importError ? `import failed: ${importError.message}` : undefined,
      ).toBeUndefined();
      expect(typeof parseArgs).toBe('function');

      const fn = parseArgs as (argv: readonly string[]) => {
        configPath?: string;
        jsonOutput: boolean;
        thresholdPercent?: number;
        skipRebuild: boolean;
      };

      // Empty argv → defaults
      const empty = fn([]);
      expect(empty.configPath).toBeUndefined();
      expect(empty.jsonOutput).toBe(false);
      expect(empty.thresholdPercent).toBeUndefined();
      expect(empty.skipRebuild).toBe(false);

      // Full argv
      const full = fn([
        '--config',
        '/path/to/cfg.json',
        '--json',
        '--threshold',
        '0.5',
        '--skip-rebuild',
      ]);
      expect(full.configPath).toBe('/path/to/cfg.json');
      expect(full.jsonOutput).toBe(true);
      expect(full.thresholdPercent).toBe(0.5);
      expect(full.skipRebuild).toBe(true);

      // Mixed order / partial
      const partial = fn(['--json', '--config', '/x.json']);
      expect(partial.configPath).toBe('/x.json');
      expect(partial.jsonOutput).toBe(true);
      expect(partial.thresholdPercent).toBeUndefined();
      expect(partial.skipRebuild).toBe(false);
    });
  });

  describe('Condition (3): mapAggregateToExitCode (γ-aligned)', () => {
    it('maps aggregate states to exit codes per Sub-Q-D=(ii)', async () => {
      const mod = await import(
        /* @vite-ignore */ '../../../scripts/methodology-visual-diff-cli.mjs'
      );
      const mapExit = (
        mod as {
          mapAggregateToExitCode?: (agg: {
            targets: ReadonlyArray<{ state: string }>;
            allPassed: boolean;
            anyFailed: boolean;
            anyTargetAbsent: boolean;
          }) => number;
        }
      ).mapAggregateToExitCode;
      expect(typeof mapExit).toBe('function');

      // Empty config (vacuous) → 0
      expect(
        mapExit!({
          targets: [],
          allPassed: true,
          anyFailed: false,
          anyTargetAbsent: false,
        }),
      ).toBe(0);

      // All-PASS → 0
      expect(
        mapExit!({
          targets: [{ state: 'PASS' }, { state: 'PASS' }],
          allPassed: true,
          anyFailed: false,
          anyTargetAbsent: false,
        }),
      ).toBe(0);

      // Any FAIL → 1
      expect(
        mapExit!({
          targets: [{ state: 'PASS' }, { state: 'FAIL' }],
          allPassed: false,
          anyFailed: true,
          anyTargetAbsent: false,
        }),
      ).toBe(1);

      // All TARGET-ABSENT, no FAIL → 0 (γ graceful)
      expect(
        mapExit!({
          targets: [{ state: 'TARGET-ABSENT' }, { state: 'TARGET-ABSENT' }],
          allPassed: false,
          anyFailed: false,
          anyTargetAbsent: true,
        }),
      ).toBe(0);

      // Mixed PASS + TARGET-ABSENT (no FAIL) → 0 (γ graceful)
      expect(
        mapExit!({
          targets: [{ state: 'PASS' }, { state: 'TARGET-ABSENT' }],
          allPassed: false,
          anyFailed: false,
          anyTargetAbsent: true,
        }),
      ).toBe(0);

      // Any LAUNCH-FAILED → 2
      expect(
        mapExit!({
          targets: [{ state: 'PASS' }, { state: 'LAUNCH-FAILED' }],
          allPassed: false,
          anyFailed: false,
          anyTargetAbsent: false,
        }),
      ).toBe(2);

      // FAIL + LAUNCH-FAILED → 2 (launch dominates fail per Sub-Q-D)
      expect(
        mapExit!({
          targets: [{ state: 'FAIL' }, { state: 'LAUNCH-FAILED' }],
          allPassed: false,
          anyFailed: true,
          anyTargetAbsent: false,
        }),
      ).toBe(2);
    });
  });
});
