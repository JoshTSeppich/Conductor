#!/usr/bin/env tsx
/**
 * CLI-Z2-1 — binary-on-PATH user-invocation smoke test.
 *
 * Catches the surface gap finding #51 names: Phase Z smoke tests
 * covered daemon-side (Z-1), web-side (Z-3), CLI-internal-via-tsx
 * (Z-4) but not the binary-on-PATH user-invocation path that the
 * install instructions point at. v2.0.0 shipped with `fd init`
 * unusable on that surface — bug #1 (no workspace bin link) and
 * bug #2 (built CLI imports source-tree paths via
 * `dispatch-core/src/...js`; finding #52).
 *
 * Phases:
 *   1. fd --version  — exercises bin-link resolution AND built-
 *      CLI ESM resolution. Reproduces both bugs against current
 *      main.
 *   2. fd init smoke-onpath --cwd <tmpdir> --target dummy:0.0
 *      — exercises real first-action behavior end-to-end.
 *   3. fd list — round-trip read; assert smoke-onpath name in
 *      tab-separated output.
 *   4. fd kill smoke-onpath --yes — tear-down via T03 HTTP path.
 *      `dummy:0.0` survives kill per T08 MODELED + DAEMON-F10
 *      (tmux side-effect failures are tolerated; registry
 *      transition succeeds regardless).
 *   5. rm -rf <tmpdir>.
 *
 * Daemon-up requirement: phase 4 is HTTP-only per X2 line 351
 * (T03 commands NOT v1-faded). Preflight checks /v2/health and
 * fails fast with a clear message if daemon is down. Mirrors
 * smoke-test-cli's daemon-up scenario gate.
 *
 * Run via: pnpm --filter dispatch-cli smoke-test-onpath
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SMOKE_NAME = `smoke-onpath-${process.pid}-${Date.now()}`;
const HEALTH_URL = 'http://127.0.0.1:7878/v2/health';
const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');

interface PhaseResult {
  phase: string;
  exit: number;
  stdout: string;
  stderr: string;
}

function runFd(args: string[]): PhaseResult {
  const result = spawnSync('pnpm', ['exec', 'fd', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return {
    phase: `fd ${args.join(' ')}`,
    exit: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function fail(p: PhaseResult, msg: string): never {
  console.error(`✗ ${p.phase}`);
  console.error(`  ${msg}`);
  if (p.stdout.trim()) console.error(`  stdout: ${p.stdout.trim()}`);
  if (p.stderr.trim()) console.error(`  stderr: ${p.stderr.trim()}`);
  process.exit(1);
}

function ok(p: PhaseResult): void {
  console.log(`✓ ${p.phase}`);
}

async function preflightDaemon(): Promise<void> {
  try {
    const res = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      console.error(
        `✗ daemon /v2/health returned ${res.status}; bring daemon up before running this smoke`,
      );
      console.error(`  bring daemon up: pnpm --filter dispatch-daemon install:daemon`);
      process.exit(1);
    }
  } catch (err) {
    console.error(
      `✗ daemon /v2/health unreachable at ${HEALTH_URL}: ${(err as Error).message}`,
    );
    console.error(`  bring daemon up: pnpm --filter dispatch-daemon install:daemon`);
    process.exit(1);
  }
}

let tmp: string | undefined;
try {
  await preflightDaemon();

  const v = runFd(['--version']);
  if (v.exit !== 0) fail(v, 'fd --version failed (resolution or build issue)');
  if (!/\d+\.\d+\.\d+/.test(v.stdout)) {
    fail(v, `fd --version did not emit semver; got: ${v.stdout.trim()}`);
  }
  ok(v);

  tmp = mkdtempSync(join(tmpdir(), 'fd-onpath-'));
  const init = runFd([
    'init',
    SMOKE_NAME,
    '--cwd',
    tmp,
    '--target',
    'dummy:0.0',
  ]);
  if (init.exit !== 0) fail(init, 'fd init failed');
  ok(init);

  const list = runFd(['list']);
  if (list.exit !== 0) fail(list, 'fd list failed');
  if (!list.stdout.includes(SMOKE_NAME)) {
    fail(list, `fd list output did not contain "${SMOKE_NAME}"`);
  }
  ok(list);

  const kill = runFd(['kill', SMOKE_NAME, '--yes']);
  if (kill.exit !== 0) fail(kill, 'fd kill failed');
  ok(kill);

  console.log(`\n✓ binary-on-PATH smoke green (4/4 phases)`);
} finally {
  if (tmp) {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}
