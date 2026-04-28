#!/usr/bin/env tsx
/**
 * DAEMON-Z-4 — CLI ↔ daemon real-environment binding smoke test.
 *
 * Per Phase Z scope: fd commands route through daemon when
 * running, fall back to v1 when not. Per arbitration 1A:
 * single orchestration script (install daemon → daemon-up
 * scenarios → uninstall daemon → daemon-down scenarios →
 * cleanup).
 *
 * Per arbitration 2B: CLI invoked via bin/fd.ts spawn (not
 * direct function calls) — exercises operator-facing
 * surface end-to-end + production-runtime path per
 * finding #49 discipline (don't substitute test-convenient
 * runtime for production runtime).
 *
 * Per arbitration 3A: state-touch acknowledged. Sessions
 * created with `z4-smoke-${pid}-${timestamp}` prefix; cleanup
 * at end removes ONLY z4-smoke-* entries (preserves operator
 * state per operator pre-reg ack: "do NOT auto-purge anything
 * at startup that doesn't match the smoke-test prefix").
 *
 * Authority sources (finding #37 verbatim discipline):
 *   §7.2 verbatim warn text: "Conductor daemon not running;
 *     using fd v1 fallback"
 *   X2 line 351 verbatim T03 hard-fail: "This command requires
 *     the Conductor daemon. Start it with `launchctl ...`."
 *   T01 dispatcher behavior (probe → HTTP/v1 routing)
 *   T03 commands (assertDaemonRunning gate)
 *   Z-1 plist runtime (node + --import tsx + WorkingDirectory)
 *
 * Run via: pnpm --filter dispatch-cli smoke-test-cli
 */

import { spawn } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SMOKE_PREFIX = `z4-smoke-${process.pid}-${Date.now()}`;
const SESSIONS_PATH = join(homedir(), '.foxworks-dispatch', 'sessions.json');
const HEALTH_URL = 'http://127.0.0.1:7878/v2/health';
const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_POLL_INTERVAL_MS = 200;

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: StepResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`);
}

function getRepoRoot(): string {
  // smoke-test-cli.ts lives at packages/dispatch-cli/scripts/
  // up 3 = repo root
  return join(import.meta.dirname, '..', '..', '..');
}

async function runFd(args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(
      'pnpm',
      [
        '--filter',
        'dispatch-cli',
        'exec',
        'tsx',
        'src/bin/fd.ts',
        ...args,
      ],
      {
        cwd: getRepoRoot(),
        stdio: 'pipe',
      },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

async function runDaemonInstaller(): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(
      'pnpm',
      ['--filter', 'dispatch-daemon', 'install:daemon'],
      { cwd: getRepoRoot(), stdio: 'pipe' },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

async function runDaemonUninstaller(): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(
      'pnpm',
      ['--filter', 'dispatch-daemon', 'uninstall:daemon'],
      { cwd: getRepoRoot(), stdio: 'pipe' },
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

async function probeHealth(): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const r = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(500),
      });
      if (r.ok) return true;
    } catch {
      /* not bound */
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }
  return false;
}

async function probeHealthQuick(): Promise<boolean> {
  try {
    const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(500) });
    return r.ok;
  } catch {
    return false;
  }
}

interface RegistryV2 {
  version: number;
  sessions: Record<string, unknown>;
}

/** v2-shaped pre-seed entry written before S5/S6 to verify
 *  that v1 fallback writeback (Z-4 finding #50) preserves
 *  v2-only fields byte-identically per §7.2 spirit. */
interface PreSeedSession {
  cwd: string;
  tmux_target: string;
  handoff_path: string;
  last_prompt_sent_at: string | null;
  last_handoff_pulled_at: string | null;
  state: string;
  last_commit_sha: string | null;
  last_status_json_at: string | null;
}

function readRegistry(): RegistryV2 | null {
  try {
    const raw = readFileSync(SESSIONS_PATH, 'utf8');
    return JSON.parse(raw) as RegistryV2;
  } catch {
    return null;
  }
}

function cleanupSmokeEntries(): { removed: string[]; preserved: number } {
  const reg = readRegistry();
  if (!reg) return { removed: [], preserved: 0 };
  const removed: string[] = [];
  const newSessions: Record<string, unknown> = {};
  for (const [name, session] of Object.entries(reg.sessions)) {
    if (name.startsWith('z4-smoke-')) {
      removed.push(name);
    } else {
      newSessions[name] = session;
    }
  }
  if (removed.length > 0) {
    reg.sessions = newSessions;
    writeFileSync(SESSIONS_PATH, JSON.stringify(reg, null, 2), 'utf8');
  }
  return { removed, preserved: Object.keys(newSessions).length };
}

async function main(): Promise<void> {
  console.log('Foxworks Dispatch — Z-4 CLI ↔ daemon smoke test');
  console.log('────────────────────────────────────────────────');

  // Pre-flight: state survey
  const initialReg = readRegistry();
  const initialCount = initialReg
    ? Object.keys(initialReg.sessions).length
    : 0;
  const staleSmoke =
    initialReg
      ? Object.keys(initialReg.sessions).filter((n) =>
          n.startsWith('z4-smoke-'),
        )
      : [];
  console.log(`pre-flight state:`);
  console.log(`  sessions.json entries: ${initialCount}`);
  console.log(`  stale z4-smoke-* sessions: ${staleSmoke.length}`);
  if (staleSmoke.length > 0) {
    console.error(
      `\nABORT: stale z4-smoke-* entries from prior run: ${staleSmoke.join(', ')}\n` +
        `Operator should review + remove manually before re-running.`,
    );
    process.exit(2);
  }

  const initialDaemonUp = await probeHealthQuick();
  console.log(`  daemon currently up: ${initialDaemonUp}`);
  if (initialDaemonUp) {
    console.error(
      '\nABORT: daemon already running on 7878. ' +
        'Run `pnpm --filter dispatch-daemon uninstall:daemon` first.',
    );
    process.exit(2);
  }

  let testFailed = false;

  try {
    // ─── PHASE 1: install daemon ──────────────────────────────
    console.log('\n[PHASE 1] install daemon for daemon-up scenarios');
    const installResult = await runDaemonInstaller();
    if (installResult.exitCode !== 0) {
      throw new Error(
        `daemon installer exited ${installResult.exitCode}: ${installResult.stderr.slice(0, 200)}`,
      );
    }
    const installHealthy = await probeHealth();
    if (!installHealthy) {
      throw new Error('daemon installed but /v2/health unreachable');
    }
    console.log('  ✓ daemon installed + bound 7878');

    // ─── DAEMON-UP SCENARIOS (S1-S4) ──────────────────────────
    const upName = `${SMOKE_PREFIX}-up`;
    const upCwd = `/tmp/${upName}`;

    console.log('\n[S1] daemon-up: fd init via HTTP path');
    const s1 = await runFd([
      'init',
      upName,
      '--cwd',
      upCwd,
      '--target',
      'z4:0.0',
    ]);
    record(
      'S1.exit-zero',
      s1.exitCode === 0,
      s1.exitCode === 0 ? 'fd init exited 0' : `exit ${s1.exitCode}: ${s1.stderr.slice(0, 100)}`,
    );
    const s1Reg = readRegistry();
    const s1Created = !!s1Reg?.sessions[upName];
    record(
      'S1.session-in-registry',
      s1Created,
      s1Created ? `${upName} present in sessions.json (HTTP-written)` : 'session NOT in registry',
    );

    console.log('\n[S2] daemon-up: fd list shows the session');
    const s2 = await runFd(['list']);
    const s2Listed = s2.stdout.includes(upName);
    record(
      'S2.list-includes-session',
      s2Listed,
      s2Listed ? `output contains ${upName}` : `${upName} missing from list output`,
    );
    record(
      'S2.list-format',
      /\t.*\t/.test(s2.stdout),
      'tab-separated <name>\\t<cwd>\\t<target> shape',
    );

    console.log('\n[S3] daemon-up: fd kill --yes via PATCH state');
    const s3 = await runFd(['kill', upName, '--yes']);
    record(
      'S3.exit-zero',
      s3.exitCode === 0,
      s3.exitCode === 0 ? 'fd kill exited 0' : `exit ${s3.exitCode}: ${s3.stderr.slice(0, 100)}`,
    );
    const s3Reg = readRegistry();
    const s3State = (s3Reg?.sessions[upName] as { state?: string } | undefined)
      ?.state;
    record(
      'S3.state-killed',
      s3State === 'killed',
      `session.state = ${s3State ?? 'undefined'}`,
    );

    console.log('\n[S4] daemon-up: stderr clean (no fallback warn)');
    const stderrJoined = s1.stderr + s2.stderr + s3.stderr;
    const noWarn = !stderrJoined.includes(
      'Conductor daemon not running; using fd v1 fallback',
    );
    record(
      'S4.stderr-clean',
      noWarn,
      noWarn
        ? 'no fallback warn under daemon-up (probe succeeded)'
        : 'fallback warn present despite daemon running',
    );

    // ─── PHASE 3: uninstall daemon ────────────────────────────
    console.log('\n[PHASE 3] uninstall daemon for daemon-down scenarios');
    const uninstallResult = await runDaemonUninstaller();
    if (uninstallResult.exitCode !== 0) {
      throw new Error(
        `daemon uninstaller exited ${uninstallResult.exitCode}: ${uninstallResult.stderr.slice(0, 200)}`,
      );
    }
    // Allow brief settle for launchd domain release
    await new Promise((r) => setTimeout(r, 1500));
    const stillUp = await probeHealthQuick();
    if (stillUp) {
      throw new Error('daemon still responding after uninstall');
    }
    console.log('  ✓ daemon uninstalled + 7878 unreachable');

    // ─── PRE-SEED v2-shaped entry for S5/S6 round-trip ────────
    // Z-4 finding #50 refinement: write a v2-shaped session
    // BEFORE the v1 fallback fd init, with state/last_commit_
    // sha/last_status_json_at populated to non-default values.
    // After fd init (v1 writeback path), re-read + assert
    // byte-identical preservation. This catches the silent-
    // data-loss failure mode that A1-only would have shipped:
    // strip-unknown drops v2 fields; writeback loses them; all
    // sessions reset to state='armed' on next daemon startup.
    // With A2 .passthrough(), v2 fields ride through untouched.
    const preSeedName = `${SMOKE_PREFIX}-preseed`;
    const preSeedSession: PreSeedSession = {
      cwd: `/tmp/${preSeedName}`,
      tmux_target: 'preseed:0.0',
      handoff_path: `/tmp/${preSeedName}/HANDOFF.md`,
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      state: 'paused', // v2-only field; non-default value
      last_commit_sha: 'abc1234deadbeef', // v2-only field
      last_status_json_at: '2026-04-28T10:00:00.000Z', // v2-only
    };
    const preSeedReg = readRegistry();
    if (!preSeedReg) {
      throw new Error('cannot pre-seed: sessions.json missing');
    }
    preSeedReg.sessions[preSeedName] = preSeedSession;
    writeFileSync(
      SESSIONS_PATH,
      JSON.stringify(preSeedReg, null, 2),
      'utf8',
    );
    console.log(
      `\n[pre-seed] wrote v2-shaped entry "${preSeedName}" with state=paused, last_commit_sha=abc1234deadbeef, last_status_json_at=2026-04-28T10:00:00.000Z`,
    );

    // ─── DAEMON-DOWN SCENARIOS (S5-S7) ────────────────────────
    const downName = `${SMOKE_PREFIX}-down`;
    const downCwd = `/tmp/${downName}`;

    console.log('\n[S5] daemon-down: fd init via v1 fallback + verbatim warn');
    const s5 = await runFd([
      'init',
      downName,
      '--cwd',
      downCwd,
      '--target',
      'z4:0.0',
    ]);
    record(
      'S5.exit-zero',
      s5.exitCode === 0,
      s5.exitCode === 0 ? 'fd init exited 0 (v1 path)' : `exit ${s5.exitCode}: ${s5.stderr.slice(0, 100)}`,
    );
    const s5Warn = s5.stderr.includes(
      'Conductor daemon not running; using fd v1 fallback',
    );
    record(
      'S5.verbatim-warn',
      s5Warn,
      s5Warn
        ? '§7.2 verbatim warn text on stderr'
        : 'expected warn text missing',
    );
    const s5Reg = readRegistry();
    const s5Created = !!s5Reg?.sessions[downName];
    record(
      'S5.session-in-registry',
      s5Created,
      s5Created ? `${downName} written via v1 path` : 'session NOT in registry',
    );

    // S5b: round-trip preservation (Z-4 finding #50 + operator-
    // refined assertion). Pre-seed entry's v2-only fields MUST
    // be byte-identical after v1 fallback writeback. With A2
    // .passthrough(), Zod preserves unknown fields → write-back
    // includes them. Without A2, this asserts fails (silent
    // data-loss caught before ship).
    const s5PreSeedAfter = s5Reg?.sessions[preSeedName] as
      | PreSeedSession
      | undefined;
    const preserved =
      !!s5PreSeedAfter &&
      s5PreSeedAfter.state === 'paused' &&
      s5PreSeedAfter.last_commit_sha === 'abc1234deadbeef' &&
      s5PreSeedAfter.last_status_json_at === '2026-04-28T10:00:00.000Z';
    record(
      'S5b.preseed-v2-fields-preserved',
      preserved,
      preserved
        ? 'pre-seed v2-only fields (state, last_commit_sha, last_status_json_at) byte-identical after v1 writeback'
        : `v2 field DRIFT: state=${s5PreSeedAfter?.state} last_commit_sha=${s5PreSeedAfter?.last_commit_sha} last_status_json_at=${s5PreSeedAfter?.last_status_json_at}`,
    );

    console.log('\n[S6] daemon-down: fd list shows v1-written session');
    const s6 = await runFd(['list']);
    const s6Listed = s6.stdout.includes(downName);
    record(
      'S6.list-includes-down-session',
      s6Listed,
      s6Listed ? `output contains ${downName}` : 'session missing from list',
    );

    console.log('\n[S7] daemon-down: fd kill throws X2 line 351 verbatim');
    const s7 = await runFd(['kill', downName, '--yes']);
    record(
      'S7.exit-nonzero',
      s7.exitCode !== 0,
      s7.exitCode !== 0
        ? `fd kill exited ${s7.exitCode}`
        : 'fd kill unexpectedly exited 0 (T03 guard MISSING)',
    );
    const s7Verbatim = s7.stderr.includes(
      'This command requires the Conductor daemon',
    );
    record(
      'S7.verbatim-error',
      s7Verbatim,
      s7Verbatim
        ? 'X2 line 351 verbatim T03-fallback message on stderr'
        : 'expected error message missing',
    );
  } catch (err) {
    testFailed = true;
    console.error(`\nABORTED: ${(err as Error).message}`);
    // Best-effort cleanup
    try {
      console.error('attempting daemon uninstall (best-effort cleanup)...');
      await runDaemonUninstaller();
    } catch {
      /* ignore */
    }
  }

  // ─── PHASE 5: cleanup z4-smoke-* registry entries ─────────
  console.log('\n[PHASE 5] cleanup z4-smoke-* sessions');
  const cleanup = cleanupSmokeEntries();
  console.log(
    `  removed ${cleanup.removed.length} z4-smoke-* entries; preserved ${cleanup.preserved} non-smoke entries`,
  );
  if (cleanup.removed.length > 0) {
    console.log(`  removed: ${cleanup.removed.join(', ')}`);
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────');
  console.log('Summary:');
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`  passed: ${passed}/${results.length}`);
  console.log(`  failed: ${failed}/${results.length}`);
  if (failed > 0 || testFailed) {
    console.log('\nFailed steps:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  ✗ ${r.name}: ${r.detail}`);
    }
    if (existsSync(SESSIONS_PATH)) {
      console.log(
        `\nResidual cleanup: any leftover z4-smoke-* entries in ${SESSIONS_PATH} should be reviewed manually.`,
      );
    }
    process.exit(1);
  }
  console.log('\nALL Z-4 SCENARIOS PASS (S1-S7).');
  console.log('Daemon-up + daemon-down CLI binding verified end-to-end.');
}

main().catch((err) => {
  console.error('Smoke test crashed:', (err as Error).message);
  process.exit(1);
});
