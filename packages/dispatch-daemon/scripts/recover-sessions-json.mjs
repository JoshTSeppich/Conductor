#!/usr/bin/env node
/**
 * MB-F-DAEMON-REGISTRY-FIX WB5 — manual recovery script for
 * ~/.foxworks-dispatch/sessions.json.
 *
 * Operator runs this post-merge to repair a live registry without
 * waiting for the next daemon restart's auto-recovery (WB4). The
 * daemon's startup-time recovery quarantines the corrupt file and
 * starts with an empty registry; this script attempts a SURGICAL
 * repair (drop one extra trailing `}` past valid JSON) so non-empty
 * registries can survive the operator-observed corruption mode.
 *
 * Usage:
 *   node scripts/recover-sessions-json.mjs --in <PATH>
 *                                          [--out <PATH>]
 *                                          [--dry-run]
 *                                          [--backup-suffix <SUFFIX>]
 *
 * Default --out is the same as --in (in-place). Default backup suffix
 * is `.corrupt-<ISO-timestamp>` (with `:` replaced by `-` for path
 * safety on all filesystems).
 *
 * Exit codes:
 *   0  — file is valid + canonical (no work needed) OR repair
 *        succeeded + backup written.
 *   1  — file is unrecoverable OR --dry-run reports work that
 *        would be done.
 *   2  — argv error / IO error (failed read of --in, failed
 *        backup, etc.).
 *
 * No runtime TypeScript or zod dependency: this script is pure
 * .mjs and validates the v2 registry shape via inline structural
 * checks. The dispatch-daemon's writeRegistryV2 still owns the
 * authoritative Zod-based validation at runtime.
 *
 * Recovery strategy (in order):
 *   1. Try JSON.parse(raw). If valid, validate structure. If valid:
 *      compare raw bytes to canonical; if equal → no-op. If not
 *      equal → repair by writing canonical bytes (R5).
 *   2. If JSON.parse fails: trim trailing whitespace, try parse
 *      again. If still fails AND candidate ends with `}`, drop
 *      one trailing `}`, trim, try parse. Surgical fix for the
 *      operator's observed corruption mode (extra `}\n`
 *      appended past valid JSON; Phase 1 §2 KNOWN, FACT-F).
 *   3. If parse + structural-validate pass after trim: write
 *      canonical bytes; backup original.
 *   4. Else: unrecoverable; exit non-zero, no mutation.
 */

import { writeFile, readFile, rename, open, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// ─── argv parsing ─────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { in: null, out: null, dryRun: false, backupSuffix: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.in = argv[++i] ?? null;
    else if (a === '--out') args.out = argv[++i] ?? null;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--backup-suffix') args.backupSuffix = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      printUsage();
      process.exit(2);
    }
  }
  if (!args.in) {
    process.stderr.write('--in <PATH> is required\n');
    printUsage();
    process.exit(2);
  }
  return args;
}

function printUsage() {
  process.stderr.write(
    'usage: node recover-sessions-json.mjs --in <PATH> ' +
      '[--out <PATH>] [--dry-run] [--backup-suffix <SUFFIX>]\n',
  );
}

// ─── structural validation (mirrors RegistrySchemaV2 minimum) ─────

const STATES = new Set(['armed', 'paused', 'held', 'killed']);

function isValidSession(s) {
  if (!s || typeof s !== 'object') return false;
  if (typeof s.cwd !== 'string') return false;
  if (typeof s.tmux_target !== 'string') return false;
  if (typeof s.handoff_path !== 'string') return false;
  if (s.last_prompt_sent_at !== null && typeof s.last_prompt_sent_at !== 'string')
    return false;
  if (s.last_handoff_pulled_at !== null && typeof s.last_handoff_pulled_at !== 'string')
    return false;
  if (!STATES.has(s.state)) return false;
  if (s.last_commit_sha !== null && typeof s.last_commit_sha !== 'string') return false;
  if (s.last_status_json_at !== null && typeof s.last_status_json_at !== 'string')
    return false;
  return true;
}

function isValidV2Registry(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.version !== 2) return false;
  if (!parsed.sessions || typeof parsed.sessions !== 'object') return false;
  for (const session of Object.values(parsed.sessions)) {
    if (!isValidSession(session)) return false;
  }
  return true;
}

function canonicalBytes(parsed) {
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

// ─── recovery strategies ──────────────────────────────────────────

function tryRecover(raw) {
  // Strategy 0: parse as-is.
  try {
    const parsed = JSON.parse(raw);
    if (isValidV2Registry(parsed)) {
      const canonical = canonicalBytes(parsed);
      return {
        recovered: parsed,
        strategy: raw === canonical ? 'none' : 'normalize-bytes',
      };
    }
  } catch (_err) {
    // fall through
  }

  // Strategy 1: trim trailing whitespace, try parse.
  let candidate = raw.replace(/\s*$/, '');
  try {
    const parsed = JSON.parse(candidate);
    if (isValidV2Registry(parsed)) {
      return { recovered: parsed, strategy: 'trim-trailing-whitespace' };
    }
  } catch (_err) {
    // fall through
  }

  // Strategy 2: drop one trailing `}` and re-parse. Targets the
  // operator-observed corruption signature (valid JSON + extra
  // `}\n` past the closing brace).
  if (candidate.endsWith('}')) {
    const less = candidate.slice(0, -1).replace(/\s*$/, '');
    try {
      const parsed = JSON.parse(less);
      if (isValidV2Registry(parsed)) {
        return { recovered: parsed, strategy: 'drop-trailing-brace' };
      }
    } catch (_err) {
      // unrecoverable
    }
  }

  return null;
}

// ─── atomic write (matches src/persist/atomic-write.ts recipe) ─────

async function writeAtomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  const body = canonicalBytes(value);
  const handle = await open(tmp, 'w');
  try {
    await handle.write(body, 0, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(tmp, path);
}

function defaultBackupSuffix() {
  return `.corrupt-${new Date().toISOString().replace(/:/g, '-')}`;
}

// ─── main ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inPath = args.in;
  const outPath = args.out ?? inPath;

  let raw;
  try {
    raw = await readFile(inPath, 'utf8');
  } catch (err) {
    process.stderr.write(`failed to read ${inPath}: ${err.message}\n`);
    process.exit(2);
  }

  const result = tryRecover(raw);

  if (result === null) {
    process.stderr.write(
      `${inPath}: unrecoverable — could not parse or repair into a valid v2 registry. No mutation performed.\n`,
    );
    process.exit(1);
  }

  if (result.strategy === 'none') {
    // Already valid + canonical.
    process.stdout.write(`${inPath}: file is valid; nothing to do.\n`);
    process.exit(0);
  }

  if (args.dryRun) {
    process.stderr.write(
      `${inPath}: would repair via strategy '${result.strategy}'. Re-run without --dry-run to apply.\n`,
    );
    process.exit(1);
  }

  // Backup + write.
  const suffix = args.backupSuffix ?? defaultBackupSuffix();
  const sidecar = `${outPath}${suffix}`;
  // Write the sidecar with the ORIGINAL bytes (preserve forensics)
  // even if --out differs from --in.
  try {
    await writeFile(sidecar, raw, 'utf8');
  } catch (err) {
    process.stderr.write(`failed to write backup ${sidecar}: ${err.message}\n`);
    process.exit(2);
  }

  try {
    await writeAtomicJson(outPath, result.recovered);
  } catch (err) {
    process.stderr.write(`failed to write recovered ${outPath}: ${err.message}\n`);
    process.exit(2);
  }

  process.stdout.write(
    `${outPath}: recovered via strategy '${result.strategy}'. Backup at ${sidecar}.\n`,
  );
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`unexpected error: ${err.stack ?? err.message}\n`);
  process.exit(2);
});
