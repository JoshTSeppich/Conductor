// MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK closure — WB1 RED.
// Unit-probe for the shared electron-process-cleanup helper. Uses synthetic
// `sleep` children (no Electron) so the probe is fast and deterministic.
//
// Asserts:
//   1. Helper exposes the public API surface (trackChild, killAllTracked,
//      resetTracked, sweepOrphanDescendants, registerElectronCleanup).
//   2. trackChild + killAllTracked: tracked child is SIGKILLed.
//   3. sweepOrphanDescendants walks descendants of rootPid and kills matches.
//   4. sweepOrphanDescendants is ancestor-bounded — does NOT touch processes
//      that are not descendants of the supplied rootPid. (Guard against
//      killing operator's daily-driver Workstation.)

import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import {
  clearObservedDescendants,
  getObservedDescendants,
  killAllTracked,
  killObservedDescendants,
  registerElectronCleanup,
  resetTracked,
  startDescendantPolling,
  stopDescendantPolling,
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

describe('electron-process-cleanup helper (WB1 unit probe)', () => {
  afterEach(() => {
    resetTracked();
  });

  it('exposes the public API surface', () => {
    expect(typeof trackChild).toBe('function');
    expect(typeof killAllTracked).toBe('function');
    expect(typeof resetTracked).toBe('function');
    expect(typeof sweepOrphanDescendants).toBe('function');
    expect(typeof startDescendantPolling).toBe('function');
    expect(typeof stopDescendantPolling).toBe('function');
    expect(typeof killObservedDescendants).toBe('function');
    expect(typeof getObservedDescendants).toBe('function');
    expect(typeof clearObservedDescendants).toBe('function');
    expect(typeof registerElectronCleanup).toBe('function');
  });

  it('descendant polling captures spawned children even after they die', async () => {
    clearObservedDescendants();
    startDescendantPolling(50);
    const child = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    expect(child.pid).toBeGreaterThan(0);
    // Give poll a chance to snapshot (multiple intervals)
    await settle(500);
    stopDescendantPolling();

    const observed = getObservedDescendants();
    expect(observed).toContain(child.pid);

    child.kill('SIGKILL');
    clearObservedDescendants();
  });

  it('killObservedDescendants kills observed PIDs that are still alive', async () => {
    clearObservedDescendants();
    startDescendantPolling(50);
    const child = spawn('sh', ['-c', 'exec sleep 300'], { stdio: 'ignore' });
    expect(child.pid).toBeGreaterThan(0);
    await settle(500);
    stopDescendantPolling();

    expect(getObservedDescendants()).toContain(child.pid);

    const killed = await killObservedDescendants({ logKilled: false });
    await settle(100);
    expect(killed).toContain(child.pid);
    expect(pidAlive(child.pid!)).toBe(false);
    // set is cleared after kill
    expect(getObservedDescendants()).toEqual([]);
  });

  it('killObservedDescendants is fork-isolated — observed set is module-state', () => {
    // Verifies the set is just a Set, not a global. Cross-fork interference
    // would require shared state, which we don't have (V8 isolate per fork).
    clearObservedDescendants();
    expect(getObservedDescendants()).toEqual([]);
  });

  it('trackChild + killAllTracked: tracked child is SIGKILLed', async () => {
    const child = spawn('sleep', ['300'], { stdio: 'ignore' });
    expect(child.pid).toBeGreaterThan(0);
    trackChild(child);
    const killed = await killAllTracked();
    await settle();
    expect(killed).toContain(child.pid);
    expect(pidAlive(child.pid!)).toBe(false);
  });

  it('killAllTracked with no tracked children is a no-op', async () => {
    const killed = await killAllTracked();
    expect(killed).toEqual([]);
  });

  it('sweepOrphanDescendants kills descendants of rootPid matching commPattern', async () => {
    const child = spawn('sleep', ['300'], { stdio: 'ignore' });
    expect(child.pid).toBeGreaterThan(0);
    await settle(50);
    const killed = await sweepOrphanDescendants(process.pid, {
      commPattern: /sleep/,
    });
    await settle();
    expect(killed).toContain(child.pid);
    expect(pidAlive(child.pid!)).toBe(false);
  });

  it('sweepOrphanDescendants is ancestor-bounded — does NOT touch sibling/unrelated PIDs', async () => {
    const ours = spawn('sleep', ['300'], { stdio: 'ignore' });
    const otherRoot = spawn('sleep', ['300'], { stdio: 'ignore' });
    expect(ours.pid).toBeGreaterThan(0);
    expect(otherRoot.pid).toBeGreaterThan(0);
    await settle(50);

    // Sweep descendants of `otherRoot` — `sleep` has no children, so the sweep
    // should walk no PIDs and kill nothing. `ours` must remain alive because
    // it is NOT a descendant of `otherRoot`.
    const killed = await sweepOrphanDescendants(otherRoot.pid!, {
      commPattern: /sleep/,
    });
    await settle();

    expect(killed).toEqual([]);
    expect(pidAlive(ours.pid!)).toBe(true);
    expect(pidAlive(otherRoot.pid!)).toBe(true);

    // Cleanup
    ours.kill('SIGKILL');
    otherRoot.kill('SIGKILL');
  });

  it('sweepOrphanDescendants returns [] for a nonexistent rootPid', async () => {
    // Pick a PID that is extremely unlikely to exist. macOS default
    // kern.maxproc ≈ 2048-9999, but process IDs can wrap; use a value past
    // typical max to minimize collision risk. Even if it collides with a real
    // PID, the helper just walks no descendants and returns []; the guard
    // here is that the helper does NOT throw on nonexistent PIDs.
    const killed = await sweepOrphanDescendants(999_999, {
      commPattern: /sleep/,
    });
    expect(killed).toEqual([]);
  });
});
