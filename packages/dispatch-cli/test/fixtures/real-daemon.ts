/**
 * Real-daemon fixture for CLI-T06 sanity test.
 *
 * Per Arbitration 3 → A (operator-acked fallback after pre-red
 * surfaced cross-package fixture-import coupling smell):
 * spawn production daemon via tsx in test child process;
 * matches T05 verification pattern.
 *
 * State touch: real daemon's startup() writes to
 * ~/.foxworks-dispatch/token if absent (idempotent —
 * reuses existing first-run token, or creates one
 * permanently). Operator-state-aware per cairn discipline:
 * documented as benign side effect; same path operator's
 * production daemon would use. No registry mutation occurs
 * during the sanity test (test creates + lists + kills via
 * HTTP; daemon writes session entries to ~/.foxworks-
 * dispatch/sessions.json which DOES touch operator state
 * — consider running this test only when operator has
 * authorized live-daemon roundtrip per cluster review).
 *
 * Real daemon binds default port 7878. If another daemon
 * is already running on this machine, spawn fails health
 * probe within 5s timeout; test setup throws.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_BASE_URL = 'http://127.0.0.1:7878';
const HEALTH_POLL_INTERVAL_MS = 100;
const HEALTH_TIMEOUT_MS = 5000;
const KILL_GRACE_MS = 500;

export interface RealDaemonHandle {
  baseUrl: string;
  tokenPath: string;
  pid: number;
  close(): Promise<void>;
}

export async function spawnRealDaemon(): Promise<RealDaemonHandle> {
  // Walk up from this fixture file to repo root.
  // here = .../packages/dispatch-cli/test/fixtures
  // up 4 = .../foxworks-dispatch
  const repoRoot = join(import.meta.dirname, '..', '..', '..', '..');
  const daemonScript = join(
    repoRoot,
    'packages',
    'dispatch-daemon',
    'src',
    'index.ts',
  );

  const proc: ChildProcess = spawn('npx', ['tsx', daemonScript], {
    cwd: repoRoot,
    stdio: 'pipe',
    detached: false,
  });
  const pid = proc.pid ?? 0;

  // Poll /v2/health until 200 or timeout
  const start = Date.now();
  let connected = false;
  while (Date.now() - start < HEALTH_TIMEOUT_MS) {
    try {
      const r = await fetch(`${DEFAULT_BASE_URL}/v2/health`, {
        signal: AbortSignal.timeout(500),
      });
      if (r.ok) {
        connected = true;
        break;
      }
    } catch {
      /* not yet bound */
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }
  if (!connected) {
    proc.kill();
    throw new Error(
      `real daemon did not bind ${DEFAULT_BASE_URL}/v2/health within ${HEALTH_TIMEOUT_MS}ms; ` +
        `possible port conflict with existing daemon process`,
    );
  }

  return {
    baseUrl: DEFAULT_BASE_URL,
    tokenPath: join(homedir(), '.foxworks-dispatch', 'token'),
    pid,
    close: async () => {
      proc.kill();
      // Allow port to release before next test (or operator's
      // production daemon to re-bind).
      await new Promise((r) => setTimeout(r, KILL_GRACE_MS));
    },
  };
}
