// MB-T-METHODOLOGY-RUNTIME-VERIFICATION-CLOSURE-α-β · WB2 + WB4 GREEN ·
// methodology-runtime-verify.mjs
//
// Closure-path-α "build-freshness gate" + closure-path-β "bundle-inclusion
// verification" workspace-methodology primitives. Closes
// MB-F-METHODOLOGY-RUNTIME-VERIFICATION-GAP (230cb6c) paths α + β and
// MB-F-RUNTIME-BUILD-STALENESS-INVISIBLE-PROGRESS (11f6f29) paths α + γ.
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

import { statSync, readFileSync } from 'node:fs';
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
// (β) Bundle-inclusion verification
// ============================================================================

/**
 * Grep a built artifact for fingerprint substrings and classify
 * PASS/FAIL based on per-fingerprint occurrence counts.
 *
 * @param {{ distPath: string, fingerprints: readonly string[] }} params
 *   distPath — absolute or cwd-relative path to a built artifact.
 *   fingerprints — non-empty list of substrings expected to appear ≥1 time
 *                  each. Empty list → ERROR (vacuous PASS is incident-class
 *                  per Sub-Q-MBTMRVCAB-C=i operator-arbitrated 2026-05-12).
 * @returns {{ state: 'PASS' | 'FAIL', results: Array<{ fingerprint: string, count: number }> }}
 * @throws if distPath does not exist OR fingerprints is empty.
 */
export function verifyBundleFingerprint({ distPath, fingerprints }) {
  if (!Array.isArray(fingerprints) || fingerprints.length === 0) {
    throw new Error('verifyBundleFingerprint: fingerprints must be a non-empty array');
  }
  const contents = readFileSync(distPath, 'utf8'); // throws ENOENT if absent
  const results = fingerprints.map((fingerprint) => ({
    fingerprint,
    count: countOccurrences(contents, fingerprint),
  }));
  const state = results.every((r) => r.count >= 1) ? 'PASS' : 'FAIL';
  return { state, results };
}

function countOccurrences(haystack, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count += 1;
    idx += needle.length;
  }
  return count;
}

// ============================================================================
// CLI entry — invoked via `node scripts/methodology-runtime-verify.mjs ...`
// or `pnpm --filter dispatch-workstation verify:build-freshness ...`
// or `pnpm --filter dispatch-workstation verify:bundle-fingerprint ...`
//
// Exit codes:
//   0 — FRESH / PASS
//   1 — STALE / FAIL
//   2 — ERROR (missing file, missing arg, etc.)
// ============================================================================

function parseArgs(args) {
  const opts = { fingerprint: [] };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--dist-path') {
      opts.distPath = args[++i];
    } else if (a === '--head-time') {
      // Override head commit time (testing/debug escape hatch).
      opts.headTime = Number.parseInt(args[++i], 10);
    } else if (a === '--fingerprint') {
      opts.fingerprint.push(args[++i]);
    } else if (a === '--help' || a === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return opts;
}

function printHelp() {
  stdout.write(`methodology-runtime-verify.mjs — α + β workspace methodology primitives

Subcommands:
  verify-build-freshness --dist-path <path> [--head-time <utc-seconds>]
      Compare dist mtime to HEAD commit time (or --head-time override).
      Exit 0 = FRESH, 1 = STALE, 2 = ERROR.

  verify-bundle-fingerprint --dist-path <path> --fingerprint <s1> [--fingerprint <s2> ...]
      Grep <path> for each fingerprint substring; fail if any count is 0.
      Exit 0 = PASS, 1 = FAIL, 2 = ERROR.
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

  if (subcommand === 'verify-bundle-fingerprint') {
    if (!opts.distPath) {
      stderr.write('ERROR: --dist-path required\n');
      return 2;
    }
    if (opts.fingerprint.length === 0) {
      stderr.write('ERROR: at least one --fingerprint required\n');
      return 2;
    }
    try {
      const result = verifyBundleFingerprint({
        distPath: opts.distPath,
        fingerprints: opts.fingerprint,
      });
      stdout.write(`${result.state}\n`);
      for (const r of result.results) {
        stdout.write(`  ${r.fingerprint}: ${r.count}\n`);
      }
      return result.state === 'PASS' ? 0 : 1;
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
