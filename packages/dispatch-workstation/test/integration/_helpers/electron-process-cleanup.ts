// MB-F-INTEGRATION-TEST-ELECTRON-PROCESS-LEAK closure helper.
//
// Closes FOLLOWUPS:153 (Tier 1) — workstation integration tests spawn Electron
// processes and don't clean up reliably when tests fail mid-test. This helper
// is wired into `test/setup.ts` so its afterEach + afterAll hooks attach to
// every spec fork in the workstation suite.
//
// Two primitives:
//
//   1. trackChild(child) / killAllTracked() — opt-in per-test tracked-PID kill.
//      Spec files that call trackChild(child) right after spawning get a
//      guaranteed SIGKILL on the child at afterEach, even when the test body
//      throws past its inline try/finally.
//
//   2. sweepOrphanDescendants(rootPid, opts) — afterAll defensive sweep over
//      descendants of rootPid (typically process.pid for the current vitest
//      fork) that match an Electron-shaped comm pattern. Ancestor-bounded by
//      rootPid: the helper ONLY walks PIDs reachable from rootPid via
//      `pgrep -P`, so the operator's daily-driver Workstation (not a
//      descendant of this fork) is safe.
//
// macOS notes:
//   - `node_modules/.bin/electron` is a node shim that spawns the .app bundle;
//     descendants include "Electron Helper (Renderer)" / "Electron Helper (GPU)".
//     All have "Electron" in their comm string and are caught by the default
//     pattern.
//   - On macOS, when a test's spawn shim is killed (via test's inline
//     `child.kill('SIGKILL')` cleanup or a test timeout), the Electron .app
//     processes that the shim forked re-parent to launchd. Ancestor-bounded
//     sweep (pgrep -P process.pid) misses these orphans because their parent
//     chain no longer transits process.pid. WB-final verification observed
//     31 leaks under exactly this pattern. To close the gap, the helper
//     polls descendants of process.pid every 500ms during the test and
//     accumulates observed PIDs into a fork-scoped set. In afterAll we kill
//     any PID in that set that is still alive — re-parenting does not change
//     the PID, so the kill succeeds regardless of who the current parent is.
//     The set is fork-scoped (module-state inside the fork's V8 isolate), so
//     one fork's afterAll cannot interfere with another fork's live processes.

import { execSync } from 'node:child_process';
import { afterAll, afterEach } from 'vitest';
import type { ChildProcess } from 'node:child_process';

const trackedChildren: ChildProcess[] = [];

export function trackChild(child: ChildProcess): void {
  trackedChildren.push(child);
}

export function resetTracked(): void {
  trackedChildren.length = 0;
}

export async function killAllTracked(): Promise<number[]> {
  const killed: number[] = [];
  for (const child of trackedChildren) {
    if (child.pid && !child.killed) {
      try {
        child.kill('SIGKILL');
        killed.push(child.pid);
      } catch {
        // already dead or unreachable
      }
    }
  }
  if (killed.length > 0) {
    await new Promise((r) => setTimeout(r, 50));
  }
  trackedChildren.length = 0;
  return killed;
}

function pgrepChildren(pid: number): number[] {
  try {
    const out = execSync(`pgrep -P ${pid}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out
      .trim()
      .split('\n')
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

function psComm(pid: number): string {
  try {
    const out = execSync(`ps -o comm= -p ${pid}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.trim();
  } catch {
    return '';
  }
}

export interface SweepOpts {
  /** Regex matching the comm string of processes to kill. Default matches
   *  Electron + Code Helper (the macOS .app helper processes). */
  commPattern?: RegExp;
  /** Max BFS depth (defensive cap). Default: 6. */
  maxDepth?: number;
  /** If true, console.warn surviving PIDs that were killed by the sweep so
   *  the leak is visible in CI/test output. Default: true. */
  logKilled?: boolean;
}

const DEFAULT_COMM_PATTERN = /[Ee]lectron|Code Helper/;

export async function sweepOrphanDescendants(
  rootPid: number,
  opts: SweepOpts = {},
): Promise<number[]> {
  const commPattern = opts.commPattern ?? DEFAULT_COMM_PATTERN;
  const maxDepth = opts.maxDepth ?? 6;
  const logKilled = opts.logKilled ?? true;

  // BFS to enumerate descendants reachable from rootPid via pgrep -P.
  // Ancestor-bounded by construction: pgrep -P only returns DIRECT children,
  // and we transitively walk from rootPid only — siblings/cousins not reachable.
  const queue: Array<{ pid: number; depth: number }> = [
    { pid: rootPid, depth: 0 },
  ];
  const visited = new Set<number>();
  const order: number[] = []; // BFS order — killed in reverse for post-order

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const { pid, depth } = next;
    if (visited.has(pid) || depth > maxDepth) continue;
    visited.add(pid);
    if (pid !== rootPid) order.push(pid);
    for (const child of pgrepChildren(pid)) {
      queue.push({ pid: child, depth: depth + 1 });
    }
  }

  const killed: number[] = [];
  // Post-order: kill leaves first so parents don't reparent live children to launchd.
  for (const pid of order.reverse()) {
    const c = psComm(pid);
    if (!commPattern.test(c)) continue;
    try {
      process.kill(pid, 'SIGKILL');
      killed.push(pid);
    } catch {
      // already dead
    }
  }

  if (killed.length > 0) {
    await new Promise((r) => setTimeout(r, 50));
    if (logKilled) {
      // eslint-disable-next-line no-console
      console.warn(
        `[electron-process-cleanup] swept ${killed.length} leaked PID(s) ` +
          `descended from rootPid=${rootPid}: ${killed.join(', ')}`,
      );
    }
  }
  return killed;
}

// Fork-scoped observed-descendants set. Polled at intervals so that PIDs
// spawned during the test are captured BEFORE they have a chance to re-parent
// to launchd. In afterAll we kill any observed PID that is still alive — this
// catches re-parented orphans (PIDs survive re-parenting) without ranging
// across other forks (each fork's set only contains its own descendants).
const observedDescendants = new Set<number>();
let pollTimer: NodeJS.Timeout | null = null;

function snapshotDescendantsOnce(): void {
  const queue: number[] = [process.pid];
  const seen = new Set<number>();
  while (queue.length > 0) {
    const pid = queue.shift();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    if (pid !== process.pid) observedDescendants.add(pid);
    for (const child of pgrepChildren(pid)) queue.push(child);
  }
}

export function startDescendantPolling(intervalMs = 500): void {
  if (pollTimer) return;
  pollTimer = setInterval(snapshotDescendantsOnce, intervalMs);
  // Don't keep the event loop alive solely for this timer.
  pollTimer.unref();
}

export function stopDescendantPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function getObservedDescendants(): readonly number[] {
  return Array.from(observedDescendants);
}

export function clearObservedDescendants(): void {
  observedDescendants.clear();
}

/** Kill any PID in the observed-descendants set that is still alive (regardless
 *  of whether it has re-parented to launchd). PIDs are unique system-wide so
 *  this never crosses fork boundaries. Clears the set after kills. */
export async function killObservedDescendants(opts: {
  logKilled?: boolean;
} = {}): Promise<number[]> {
  const logKilled = opts.logKilled ?? true;
  const killed: number[] = [];
  for (const pid of observedDescendants) {
    if (pid === process.pid) continue;
    if (pid === process.ppid) continue;
    try {
      process.kill(pid, 0); // verify alive
      process.kill(pid, 'SIGKILL');
      killed.push(pid);
    } catch {
      // already dead or not killable
    }
  }
  observedDescendants.clear();
  if (killed.length > 0) {
    await new Promise((r) => setTimeout(r, 100));
    if (logKilled) {
      // eslint-disable-next-line no-console
      console.warn(
        `[electron-process-cleanup] killed ${killed.length} observed PID(s) ` +
          `(includes re-parented orphans): ${killed.join(', ')}`,
      );
    }
  }
  return killed;
}

/** Register vitest afterEach + afterAll hooks for Electron-process cleanup.
 *  Intended to be called once from `test/setup.ts` so the hooks attach to
 *  every spec fork. Safe to call from inside individual spec files too.
 *
 *  Three-stage protection:
 *    1. Descendant polling (started at registration) — snapshots descendants
 *       of this fork's PID every 500ms, accumulating into a fork-scoped
 *       observed-descendants set. Captures Electron PIDs BEFORE they get a
 *       chance to re-parent to launchd.
 *    2. afterEach — kills any opt-in trackChild()-registered survivors.
 *    3. afterAll — stops polling, runs sweepOrphanDescendants (live tree),
 *       then killObservedDescendants (captures re-parented orphans by PID,
 *       fork-isolated by the observed-set's construction).
 *
 *  Fork isolation: each vitest worker fork has its own module-scope
 *  observedDescendants set + pollTimer. PIDs are unique system-wide, so one
 *  fork's afterAll can never accidentally kill another fork's live Electron. */
export function registerElectronCleanup(): void {
  startDescendantPolling();
  afterEach(async () => {
    if (trackedChildren.length > 0) {
      await killAllTracked();
    }
  });
  afterAll(async () => {
    stopDescendantPolling();
    // Capture a final snapshot in case anything was spawned after the last
    // poll tick but before afterAll fired.
    snapshotDescendantsOnce();
    await sweepOrphanDescendants(process.pid);
    await killObservedDescendants();
  });
}
