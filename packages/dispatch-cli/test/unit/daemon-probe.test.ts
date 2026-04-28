/**
 * CLI-T04 — daemon-dead fallback unit tests.
 *
 * Per X2 §CLI-T04 lines 345-354 + contract §7.2 verbatim:
 *   "If daemon is not running (GET /v2/health fails), fd v1
 *    commands fall back to direct fd v1 behavior — read/write
 *    sessions.json directly, use tmux transport directly,
 *    no HTTP."
 *
 * Per X2 line 351 verbatim:
 *   "New fd commands (CLI-T03 kill/pause/etc) are NOT faded
 *    back — they require daemon. Fall back error message:
 *    'This command requires the Conductor daemon. Start it
 *    with `launchctl ...`.'"
 *
 * Per finding #36 framework: testable helpers (probeDaemon
 * returns boolean; assertDaemonRunning throws on probe-fail)
 * get red→green TDD. Real network probe on unreachable port
 * 65535 honors operator's "no mocked daemon in T01-T04"
 * instruction. Probe-true paths (daemon live) smoke-tested
 * at CLI-T05 + T06.
 *
 * Probes (3 logical):
 *   P1 probeDaemon on unreachable port returns false
 *      (timeout/connection-refused; never throws)
 *   P2 runInitDispatch with useHttp=undefined + unreachable
 *      baseUrl → probe runs, fails, dispatcher falls to v1
 *      path (registry write observable per T01 P5 pattern).
 *      Locks T04's auto-probe-default-fallback semantic.
 *   P3 runKill (T03 command) on unreachable baseUrl →
 *      throws Error containing "requires the Conductor
 *      daemon" verbatim per X2 line 351. Locks T03
 *      daemon-required guard placement (Arbitration 3A:
 *      per-command guard).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { probeDaemon } from '../../src/lib/daemon-client.js';
import { runInitDispatch } from '../../src/lib/dispatch.js';
import { runKill } from '../../src/commands/kill.js';

// Port 65535 confirmed unbound at pre-red Check 3.
const UNREACHABLE_BASE = 'http://127.0.0.1:65535';

describe('CLI-T04 — daemon-dead fallback', () => {
  let cleanupPaths: string[] = [];

  afterEach(async () => {
    for (const p of cleanupPaths) {
      await rm(p, { recursive: true, force: true }).catch(() => {
        /* best-effort */
      });
    }
    cleanupPaths = [];
  });

  async function mkRegistryPath(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'fd-clit04-reg-'));
    cleanupPaths.push(dir);
    return join(dir, 'sessions.json');
  }

  it('P1 probeDaemon on unreachable port → false (never throws)', async () => {
    // Probe MUST always return boolean; failure conditions
    // (connection refused, timeout, non-200) all map to false
    // per Arbitration 4 (finding #36 OS-boundary tolerance).
    const result = await probeDaemon({
      baseUrl: UNREACHABLE_BASE,
      timeoutMs: 500,
    });
    expect(result).toBe(false);
  });

  it('P2 runInitDispatch (useHttp=undefined) + probe-fail → v1 path; registry observable', async () => {
    const registryPath = await mkRegistryPath();
    // No useHttp opt — triggers T04 auto-probe per Arbitration 2A.
    // Unreachable baseUrl → probe fails → dispatcher falls to v1.
    await runInitDispatch(
      {
        name: 'sherpa',
        cwd: '/tmp/sherpa',
        target: 'sherpa:0.0',
        registryPath,
      },
      { baseUrl: UNREACHABLE_BASE },
    );
    // v1 path wrote to registry. HTTP path would have thrown
    // before any registry write (no daemon to POST to).
    const reg = await readRegistry(registryPath);
    expect(reg.sessions.sherpa).toBeDefined();
    expect(reg.sessions.sherpa?.cwd).toBe('/tmp/sherpa');
  });

  it('P3 runKill (T03) on unreachable daemon → throws "requires the Conductor daemon"', async () => {
    // T03 commands have NO v1 fallback per X2 line 351 verbatim.
    // Per Arbitration 3A: per-command guard prepends
    // assertDaemonRunning before any HTTP attempt; throws the
    // X2-verbatim error message on probe-fail.
    await expect(
      runKill({
        name: 'sherpa',
        yes: true, // skip confirm prompt; probe should fail first anyway
        baseUrl: UNREACHABLE_BASE,
      }),
    ).rejects.toThrow(/requires the Conductor daemon/);
  });
});
