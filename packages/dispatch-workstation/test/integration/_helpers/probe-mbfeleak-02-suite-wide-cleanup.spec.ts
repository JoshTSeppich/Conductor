// MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK closure — WB2 ratify meta-probe.
//
// Ratifies the electron-process-cleanup helper end-to-end for the
// suite-wide-cleanup scenarios it is designed for. Uses synthetic
// `sh -c 'exec sleep 300'` children with custom commPatterns instead of
// real Electron processes — keeps the probe fast (no .app launch) while
// exercising the actual pgrep -P + ps + process.kill mechanism on real OS
// processes.
//
// End-to-end Electron coverage is provided by the WB-final full-suite run,
// which is the actual acceptance criterion for FOLLOWUPS:153 closure.

import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import {
  killAllTracked,
  registerElectronCleanup,
  resetTracked,
  sweepOrphanDescendants,
  trackChild,
} from './electron-process-cleanup.js';

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

async function settle(ms = 100): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe('WB2 ratify — multi-child ancestor sweep at scale', () => {
  afterEach(() => resetTracked());

  it('sweep cleans N=5 untracked children spawned in this test', async () => {
    const children = [];
    for (let i = 0; i < 5; i++) {
      const c = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
      expect(c.pid).toBeGreaterThan(0);
      children.push(c);
    }
    await settle(50);

    const killed = await sweepOrphanDescendants(process.pid, {
      commPattern: /sleep/,
      logKilled: false,
    });
    await settle(150);

    for (const c of children) {
      expect(pidAlive(c.pid!)).toBe(false);
    }
    expect(killed.length).toBeGreaterThanOrEqual(children.length);
  });

  it('mixed: tracked-then-killAllTracked + untracked-then-sweep compose', async () => {
    const trackedKid = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    const orphanKid = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    expect(trackedKid.pid).toBeGreaterThan(0);
    expect(orphanKid.pid).toBeGreaterThan(0);

    trackChild(trackedKid);
    await settle(50);

    // Phase 1: killAllTracked reaps only the tracked kid.
    const tk = await killAllTracked();
    expect(tk).toContain(trackedKid.pid);
    await settle(100);
    expect(pidAlive(trackedKid.pid!)).toBe(false);
    expect(pidAlive(orphanKid.pid!)).toBe(true);

    // Phase 2: ancestor sweep reaps the orphan.
    const sk = await sweepOrphanDescendants(process.pid, {
      commPattern: /sleep/,
      logKilled: false,
    });
    expect(sk).toContain(orphanKid.pid);
    await settle(100);
    expect(pidAlive(orphanKid.pid!)).toBe(false);
  });

  it('sweep with default commPattern (Electron) skips non-Electron children', async () => {
    // Default commPattern is /[Ee]lectron|Code Helper/. A `sleep` child should
    // NOT be killed by the default sweep — confirms the commPattern guard.
    const sleepKid = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    expect(sleepKid.pid).toBeGreaterThan(0);
    await settle(50);

    const killed = await sweepOrphanDescendants(process.pid, {
      logKilled: false,
    });
    await settle(100);

    expect(killed).not.toContain(sleepKid.pid);
    expect(pidAlive(sleepKid.pid!)).toBe(true);

    sleepKid.kill('SIGKILL');
  });
});

describe('WB2 ratify — registerElectronCleanup() afterEach reaps tracked children', () => {
  // Register inside this describe so the hooks attach to this describe's scope.
  // Vitest hook order: inner-scope (describe) afterEach fires BEFORE outer-scope.
  registerElectronCleanup();

  let spawnedPid: number | undefined;

  it('test A: spawns a tracked child', async () => {
    const c = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    expect(c.pid).toBeGreaterThan(0);
    spawnedPid = c.pid;
    trackChild(c);
    await settle(50);
    expect(pidAlive(spawnedPid!)).toBe(true);
  });

  it('test B: tracked child from test A was reaped by afterEach', async () => {
    // Between test A and test B, the registered afterEach hook fired and
    // called killAllTracked() — so spawnedPid should be dead by now.
    expect(spawnedPid).toBeDefined();
    await settle(50);
    expect(pidAlive(spawnedPid!)).toBe(false);
  });
});
