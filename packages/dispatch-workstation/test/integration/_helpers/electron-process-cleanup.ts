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
//   - On macOS, when the main Electron process is killed, helpers may briefly
//     re-parent to launchd before exiting. Helpers that re-parent are out of
//     reach for the ancestor-bounded sweep — accepted limitation. The main
//     process kill should trigger helper exit via process-group propagation
//     in the common case.

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

/** Register vitest afterEach + afterAll hooks for Electron-process cleanup.
 *  Intended to be called once from `test/setup.ts` so the hooks attach to
 *  every spec fork. Safe to call from inside individual spec files too. */
export function registerElectronCleanup(): void {
  afterEach(async () => {
    if (trackedChildren.length > 0) {
      await killAllTracked();
    }
  });
  afterAll(async () => {
    await sweepOrphanDescendants(process.pid);
  });
}
