#!/usr/bin/env tsx
/**
 * DAEMON-Z-1 — real-environment installer/uninstaller smoke test.
 *
 * Per Phase Z scope: launchctl install + uninstall on actual
 * machine; port conflict + token reuse edges. This script
 * automates 6 of 7 scenarios (S1-S5 + S7); S6 (port conflict)
 * is operator-manual per pre-reg arbitration 2.
 *
 * Exit 0 on full success; non-zero with diagnostic on failure.
 *
 * Run via: pnpm --filter dispatch-daemon smoke-test
 *
 * Authority sources held OPEN at authoring (finding #37):
 *   - T18 install flow (commit 2264773): build →
 *     resolveRepoRoot → resolveNodeBinary → generatePlist →
 *     bootstrapLaunchAgent
 *   - T19 uninstall flow (commit 58b77f3): bootout (tolerant
 *     of "not loaded") → unlink plist → optional --clean
 *   - S04 ADR §3.1 plist label "com.foxworks.dispatch-daemon"
 *   - S04 ADR §3 KeepAlive/RunAtLoad/ThrottleInterval
 *   - T16 /v2/health endpoint
 *
 * Cleanup discipline (per arbitration 3): smoke test ends
 * with full uninstall + state-reset verification. try/finally
 * ensures uninstall runs even on mid-test failure.
 */

import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const LABEL = 'com.foxworks.dispatch-daemon';
const PLIST_PATH = join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');
const STATE_DIR = join(homedir(), '.foxworks-dispatch');
const HEALTH_URL = 'http://127.0.0.1:7878/v2/health';
const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_POLL_INTERVAL_MS = 200;

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: StepResult[] = [];

function record(name: string, ok: boolean, detail: string): void {
  results.push({ name, ok, detail });
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${name}: ${detail}`);
}

async function runInstaller(): Promise<void> {
  await execFileP('pnpm', ['--filter', 'dispatch-daemon', 'install:daemon'], {
    cwd: getRepoRoot(),
  });
}

async function runUninstaller(): Promise<void> {
  await execFileP(
    'pnpm',
    ['--filter', 'dispatch-daemon', 'uninstall:daemon'],
    { cwd: getRepoRoot() },
  );
}

function getRepoRoot(): string {
  // smoke-test.ts lives at packages/dispatch-daemon/scripts/
  // up 3 = repo root
  return join(import.meta.dirname, '..', '..', '..');
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
      /* not bound yet */
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }
  return false;
}

async function launchctlListed(): Promise<boolean> {
  try {
    const { stdout } = await execFileP('launchctl', ['list']);
    return stdout.includes(LABEL);
  } catch {
    return false;
  }
}

/** Poll launchctl list until expected presence/absence, or timeout.
 *  bootout returns before launchd commits domain release → brief
 *  race where list still shows the unloaded service. */
async function waitForLaunchctlState(
  expectedListed: boolean,
  timeoutMs = 3000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const listed = await launchctlListed();
    if (listed === expectedListed) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function readTokenIfPresent(): Promise<string | null> {
  try {
    return (await readFile(TOKEN_PATH, 'utf8')).trim();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log('Foxworks Dispatch — Z-1 smoke test');
  console.log('────────────────────────────────────────');

  // Pre-flight: capture initial state
  const initialTokenExists = existsSync(TOKEN_PATH);
  const initialTokenContent = await readTokenIfPresent();
  const initialPlistExists = existsSync(PLIST_PATH);
  const initialDaemonLoaded = await launchctlListed();
  console.log(`pre-flight state:`);
  console.log(`  token exists: ${initialTokenExists}`);
  console.log(`  plist exists: ${initialPlistExists}`);
  console.log(`  daemon loaded: ${initialDaemonLoaded}`);

  if (initialPlistExists || initialDaemonLoaded) {
    console.error(
      '\nABORT: pre-flight found existing plist or loaded daemon. ' +
        'Run `pnpm --filter dispatch-daemon uninstall:daemon` manually first.',
    );
    process.exit(2);
  }

  let testFailed = false;

  try {
    // ─── S1 fresh install ──────────────────────────────────────
    console.log('\n[S1] fresh install:');
    await runInstaller();
    const s1Listed = await launchctlListed();
    record(
      'S1.launchctl-list',
      s1Listed,
      s1Listed ? `${LABEL} present` : 'NOT in launchctl list',
    );
    const s1Health = await probeHealth();
    record(
      'S1.health-200',
      s1Health,
      s1Health ? `GET ${HEALTH_URL} → 200 within ${HEALTH_TIMEOUT_MS}ms` : 'health probe failed',
    );
    const s1Plist = existsSync(PLIST_PATH);
    record(
      'S1.plist-written',
      s1Plist,
      s1Plist ? PLIST_PATH : 'plist missing',
    );

    // ─── S3 token reuse (verifies BEFORE S2 to catch any
    //     install-time mutation) ──────────────────────────────
    console.log('\n[S3] token reuse:');
    const postInstallToken = await readTokenIfPresent();
    if (initialTokenExists) {
      const preserved = postInstallToken === initialTokenContent;
      record(
        'S3.existing-token-preserved',
        preserved,
        preserved
          ? 'pre-existing token unchanged'
          : 'token CHANGED unexpectedly',
      );
    } else {
      record(
        'S3.token-created',
        postInstallToken !== null,
        postInstallToken !== null
          ? `created at ${TOKEN_PATH}`
          : 'token NOT created',
      );
    }

    // ─── S2 idempotent re-install ──────────────────────────────
    console.log('\n[S2] idempotent re-install:');
    let reinstallOk = true;
    let reinstallMsg = 're-run exited 0 with idempotent message';
    try {
      await runInstaller();
    } catch (err) {
      reinstallOk = false;
      reinstallMsg = `re-run failed: ${(err as Error).message.slice(0, 100)}`;
    }
    record('S2.re-install-idempotent', reinstallOk, reinstallMsg);
    const s2StillLoaded = await launchctlListed();
    record(
      'S2.daemon-still-loaded',
      s2StillLoaded,
      s2StillLoaded ? 'daemon still in launchctl' : 'daemon LOST after re-install',
    );

    // ─── S4 uninstall happy path ───────────────────────────────
    console.log('\n[S4] uninstall happy path:');
    await runUninstaller();
    // Wait for launchd to commit domain release (bootout returns
    // before the list reflects the unload — brief race window).
    const s4Removed = await waitForLaunchctlState(false, 3000);
    record(
      'S4.launchctl-removed',
      s4Removed,
      s4Removed ? `${LABEL} no longer listed` : 'still in launchctl after uninstall (3s timeout)',
    );
    const s4Plist = existsSync(PLIST_PATH);
    record(
      'S4.plist-removed',
      !s4Plist,
      !s4Plist ? 'plist file gone' : 'plist still present',
    );
    // Verify daemon process actually stopped responding
    const s4HealthDown = !(await probeHealthQuick());
    record(
      'S4.health-unreachable',
      s4HealthDown,
      s4HealthDown ? 'health endpoint unreachable' : 'daemon STILL responding',
    );

    // ─── S5 idempotent re-uninstall ───────────────────────────
    console.log('\n[S5] idempotent re-uninstall:');
    let s5Ok = true;
    let s5Msg = 're-uninstall exited 0 (tolerant of not-loaded)';
    try {
      await runUninstaller();
    } catch (err) {
      s5Ok = false;
      s5Msg = `re-uninstall failed: ${(err as Error).message.slice(0, 100)}`;
    }
    record('S5.re-uninstall-idempotent', s5Ok, s5Msg);

    // ─── S7 state preservation (default uninstall preserves) ──
    console.log('\n[S7] state preservation default:');
    const stateDirExists = existsSync(STATE_DIR);
    record(
      'S7.state-dir-preserved',
      stateDirExists,
      stateDirExists ? `${STATE_DIR} intact` : 'state dir REMOVED unexpectedly',
    );
    const finalToken = await readTokenIfPresent();
    record(
      'S7.token-preserved',
      finalToken !== null,
      finalToken !== null ? 'token file present' : 'token REMOVED unexpectedly',
    );
    if (initialTokenExists && finalToken !== null) {
      const stillSame = finalToken === initialTokenContent;
      record(
        'S7.token-unchanged-from-initial',
        stillSame,
        stillSame ? 'token byte-identical to initial' : 'token CONTENT CHANGED',
      );
    }
  } catch (err) {
    testFailed = true;
    console.error(
      `\nABORTED mid-test: ${(err as Error).message}`,
    );
    // Best-effort cleanup
    console.error('attempting cleanup uninstall...');
    try {
      await runUninstaller();
      console.error('  cleanup uninstall completed');
    } catch (e) {
      console.error(`  cleanup uninstall FAILED: ${(e as Error).message.slice(0, 100)}`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────');
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
    process.exit(1);
  }
  console.log('\nALL Z-1 SCENARIOS PASS (S1-S5 + S7).');
  console.log('S6 (port-conflict) is operator-manual per pre-reg arbitration 2.');
}

async function probeHealthQuick(): Promise<boolean> {
  try {
    const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(500) });
    return r.ok;
  } catch {
    return false;
  }
}

void statSync; // (unused; reserved for future per-scenario fs assertions)

main().catch((err) => {
  console.error('Smoke test crashed:', (err as Error).message);
  process.exit(1);
});
