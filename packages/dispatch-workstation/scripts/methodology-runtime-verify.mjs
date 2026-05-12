// MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β · WB2 GREEN ·
// methodology-runtime-verify.mjs
//
// Closure-path-α "build-freshness gate" workspace-methodology primitive.
// Partial closure of MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP (230cb6c)
// path α and MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS (11f6f29)
// path γ ("runtime-staleness check as standing primitive").
//
// Path β (bundle-inclusion verification) lands at WB4 (separate cairn
// pair WB3 RED + WB4 GREEN) — this file is extended at WB4.
// Path γ (headless screenshot) deferred — separate ticket cycle.
//
// Sub-Q-MBTMRVCAB-A=ii (per-package package.json scripts): this module
// lives in packages/dispatch-workstation/scripts/ and is invoked via
// `pnpm --filter dispatch-workstation verify:build-freshness`. Library
// exports are also importable from vitest unit tests for direct
// classification testing.
//
// Sub-Q-MBTMRVCAB-B=i (sub-session-side bash): no git-hook or CI wiring;
// sub-sessions invoke this script explicitly per the auto-ack §C envelope
// amendment landed at WB5 of this ticket.

import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { argv, exit, stderr, stdout, cwd } from 'node:process';

// ============================================================================
// (α) Build-freshness gate
// ============================================================================

/**
 * Classify a dist artifact's freshness against a HEAD commit timestamp.
 *
 * @param {{ distPath: string, headCommitTimeS: number }} params
 *   distPath — absolute or cwd-relative path to a built artifact
 *               (e.g., `dist/main/main.js`).
 *   headCommitTimeS — HEAD commit time in UTC seconds since epoch
 *               (typically `git log -1 --format=%at`).
 * @returns {{ state: 'FRESH' | 'STALE', distMtimeS: number, headCommitTimeS: number }}
 * @throws if distPath does not exist (build never ran).
 */
export function verifyBuildFreshness({ distPath, headCommitTimeS }) {
  const stats = statSync(distPath); // throws ENOENT if absent
  // fs.statSync.mtimeMs is ms since UNIX epoch (UTC-anchored per node docs).
  // Floor to seconds to compare cleanly against `git log --format=%at` output.
  const distMtimeS = Math.floor(stats.mtimeMs / 1000);
  const state = distMtimeS < headCommitTimeS ? 'STALE' : 'FRESH';
  return { state, distMtimeS, headCommitTimeS };
}

/**
 * Resolve the HEAD commit timestamp in UTC seconds via `git log`.
 * Separated from verifyBuildFreshness for testability (the lib stays
 * deterministic; the CLI wrapper handles git invocation).
 *
 * @param {string} [gitDir] — optional cwd for the git command; defaults to process.cwd().
 * @returns {number} UTC seconds since epoch.
 */
export function readHeadCommitTimeS(gitDir = cwd()) {
  const raw = execFileSync('git', ['log', '-1', '--format=%at'], {
    cwd: gitDir,
    encoding: 'utf8',
  }).trim();
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`readHeadCommitTimeS: unparseable git output ${JSON.stringify(raw)}`);
  }
  return n;
}

// ============================================================================
// CLI entry — invoked via `node scripts/methodology-runtime-verify.mjs ...`
// or `pnpm --filter dispatch-workstation verify:build-freshness ...`
//
// Exit codes:
//   0 — FRESH
//   1 — STALE
//   2 — ERROR (missing file, missing arg, etc.)
// ============================================================================

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--dist-path') {
      opts.distPath = args[++i];
    } else if (a === '--head-time') {
      // Override head commit time (testing/debug escape hatch).
      opts.headTime = Number.parseInt(args[++i], 10);
    } else if (a === '--help' || a === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return opts;
}

function printHelp() {
  stdout.write(`methodology-runtime-verify.mjs — α workspace methodology primitive

Subcommands:
  verify-build-freshness --dist-path <path> [--head-time <utc-seconds>]
      Compare dist mtime to HEAD commit time (or --head-time override).
      Exit 0 = FRESH, 1 = STALE, 2 = ERROR.
`);
}

async function main() {
  const [, , subcommand, ...rest] = argv;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return 0;
  }

  let opts;
  try {
    opts = parseArgs(rest);
  } catch (err) {
    stderr.write(`ERROR: ${err.message}\n`);
    return 2;
  }
  if (opts.help) {
    printHelp();
    return 0;
  }

  if (subcommand === 'verify-build-freshness') {
    if (!opts.distPath) {
      stderr.write('ERROR: --dist-path required\n');
      return 2;
    }
    try {
      const headCommitTimeS = opts.headTime ?? readHeadCommitTimeS();
      const result = verifyBuildFreshness({ distPath: opts.distPath, headCommitTimeS });
      stdout.write(`${result.state} distMtimeS=${result.distMtimeS} headCommitTimeS=${result.headCommitTimeS} delta=${result.distMtimeS - result.headCommitTimeS}s\n`);
      return result.state === 'FRESH' ? 0 : 1;
    } catch (err) {
      stderr.write(`ERROR: ${err.message}\n`);
      return 2;
    }
  }

  stderr.write(`ERROR: unknown subcommand: ${subcommand}\n`);
  printHelp();
  return 2;
}

// Run main() only when invoked directly as a script (not when imported by tests).
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main().then((code) => exit(code));
}
