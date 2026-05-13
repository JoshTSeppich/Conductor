// MB-T-PHASE-4-METHODOLOGY-EPSILON-VISUAL-DIFF WB6 GREEN —
// methodology-visual-diff-cli.mjs
//
// Round 11 §3.9 Wave 5 — operator-arbitrated (β)-style narrowing per
// build-doc §1.5 at `7e623a3`. Sub-Q-D=(ii) γ-aligned exit-code mapping.
// Sub-Q-E=(ii): package.json scripts entry deferred to sibling/operator.
//
// CI-friendly entry-point for the visual-diff pipeline. Composes
// visual-diff-config (loader) + visual-diff-runner (orchestrator) into
// a single invokable script with:
//   - argument parsing (--config, --json, --threshold, --skip-rebuild)
//   - structured JSON output (when --json) for CI consumption
//   - human-readable summary output (default)
//   - γ-aligned exit code mapping (Sub-Q-D=(ii))
//
// Invocation:
//   node packages/dispatch-workstation/scripts/methodology-visual-diff-cli.mjs \
//     --config docs/coordination/visual-diff-config.json --json
//
// Sibling/operator may add a package.json scripts entry per Sub-Q-E
// once canonical wireframe target PNG lands; this session does not
// touch package.json (FORBIDDEN per manifest).

import { argv, exit, stdout, stderr } from 'node:process';
import { loadVisualDiffConfigFromFile } from './visual-diff-config.mjs';
import { runVisualDiff } from './visual-diff-runner.mjs';

/**
 * @typedef {Object} ParsedArgs
 * @property {string}  [configPath]
 * @property {boolean} jsonOutput
 * @property {number}  [thresholdPercent]
 * @property {boolean} skipRebuild
 */

/**
 * Parse argv into structured options. Pure-fn; deterministic; no
 * process.exit on unknown flags (caller policy).
 *
 * Supported flags:
 *   --config <path>      — JSON config file path (loadFromFile)
 *   --json               — emit JSON to stdout instead of human-readable
 *   --threshold <number> — override default 1.0% mismatch threshold
 *   --skip-rebuild       — reserved (runner does not currently rebuild;
 *                          forward-compat flag for sibling-extended
 *                          runner that adds pre-launch build)
 *
 * @param {ReadonlyArray<string>} args
 * @returns {ParsedArgs}
 */
export function parseArgs(args) {
  /** @type {ParsedArgs} */
  const out = { jsonOutput: false, skipRebuild: false };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--config' && typeof args[i + 1] === 'string') {
      out.configPath = args[i + 1];
      i += 1;
    } else if (token === '--json') {
      out.jsonOutput = true;
    } else if (token === '--threshold' && typeof args[i + 1] === 'string') {
      const parsed = parseFloat(args[i + 1]);
      if (!Number.isNaN(parsed)) {
        out.thresholdPercent = parsed;
      }
      i += 1;
    } else if (token === '--skip-rebuild') {
      out.skipRebuild = true;
    }
  }
  return out;
}

/**
 * Map a VisualDiffAggregate to a process exit code per Sub-Q-D=(ii).
 *
 *   any LAUNCH-FAILED         → 2  (build/launch infrastructure issue;
 *                                   dominates FAIL classification)
 *   any FAIL                  → 1  (visual regression detected)
 *   empty / all-PASS /
 *     PASS+TARGET-ABSENT mix  → 0  (graceful per anti-fabrication §2.3)
 *
 * @param {{
 *   targets: ReadonlyArray<{ state: string }>,
 *   allPassed: boolean,
 *   anyFailed: boolean,
 *   anyTargetAbsent: boolean,
 * }} aggregate
 * @returns {number}
 */
export function mapAggregateToExitCode(aggregate) {
  const anyLaunchFailed = aggregate.targets.some(
    (t) => t.state === 'LAUNCH-FAILED',
  );
  if (anyLaunchFailed) return 2;
  if (aggregate.anyFailed) return 1;
  return 0;
}

/**
 * Render a human-readable summary of the aggregate to a string.
 *
 * @param {Parameters<typeof mapAggregateToExitCode>[0] & { durationMs?: number }} aggregate
 * @returns {string}
 */
function formatHumanSummary(aggregate) {
  const lines = [];
  if (aggregate.targets.length === 0) {
    lines.push('Visual diff: no targets configured (vacuous PASS)');
  } else {
    for (const t of aggregate.targets) {
      lines.push(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `  • ${/** @type {{ name?: string }} */ (t).name ?? '<unnamed>'}: ${t.state}`,
      );
    }
  }
  const summary =
    `Visual diff aggregate: ${aggregate.targets.length} targets · ` +
    `allPassed=${aggregate.allPassed} · anyFailed=${aggregate.anyFailed} · ` +
    `anyTargetAbsent=${aggregate.anyTargetAbsent}`;
  lines.unshift(summary);
  if (typeof aggregate.durationMs === 'number') {
    lines.push(`duration=${(aggregate.durationMs / 1000).toFixed(1)}s`);
  }
  return lines.join('\n');
}

/**
 * CLI entry-point. Loads config (file or empty default), invokes runner,
 * emits output, returns the exit code (caller `process.exit`).
 *
 * Test-injectable deps allow unit-test verification of the full
 * compose-pipeline without touching real filesystem or electron.
 *
 * @param {ReadonlyArray<string>} args
 * @param {Object} [deps]
 * @param {typeof loadVisualDiffConfigFromFile} [deps.loadConfig]
 * @param {typeof runVisualDiff} [deps.runDiff]
 * @param {{ write: (s: string) => void }} [deps.stdout]
 * @returns {Promise<number>} exit code per mapAggregateToExitCode
 */
export async function runCli(args, deps = {}) {
  const parsed = parseArgs(args);
  const loadConfig = deps.loadConfig ?? loadVisualDiffConfigFromFile;
  const runDiff = deps.runDiff ?? runVisualDiff;
  const out = deps.stdout ?? stdout;

  const config = parsed.configPath
    ? loadConfig(parsed.configPath)
    : { targets: [] };

  const aggregate = await runDiff(config);

  if (parsed.jsonOutput) {
    out.write(`${JSON.stringify(aggregate, null, 2)}\n`);
  } else {
    out.write(`${formatHumanSummary(aggregate)}\n`);
  }

  return mapAggregateToExitCode(aggregate);
}

// CLI direct-invocation guard: only run when this file is invoked
// directly (`node scripts/methodology-visual-diff-cli.mjs ...`),
// NOT when imported (e.g., by probes).
if (import.meta.url === `file://${argv[1]}`) {
  runCli(argv.slice(2))
    .then((code) => exit(code))
    .catch((err) => {
      stderr.write(`methodology-visual-diff-cli: ${err?.message ?? err}\n`);
      exit(2);
    });
}
