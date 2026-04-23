/**
 * DAEMON-S04 — launchd LaunchAgent spike.
 *
 * Verifies user-level LaunchAgent mechanism for daemon lifecycle
 * (auto-start at login, KeepAlive on crash, log destinations).
 * launchd is the deployment story under the daemon's uptime story;
 * CONDUCTOR_API_CONTRACT.md doesn't spec deployment directly, but
 * §6.3 session-state-survives-daemon-restart invariant only holds
 * if the daemon reliably restarts — which is what this spike tests.
 *
 * Uses `launchctl bootstrap gui/<uid>` / `bootout` (current commands
 * on macOS 11+). The `launchctl load`/`unload` form still works but
 * is deprecated.
 *
 * Probes:
 *   P1  launchctl bootstrap loads a user LaunchAgent plist cleanly
 *   P2  RunAtLoad fires: toy daemon starts and writes its PID
 *   P3  KeepAlive restarts the daemon after external SIGKILL: the
 *       PID in the pid file changes
 *   P4  StandardOutPath captures stdout (log destination verified)
 *   P5  launchctl bootout unloads cleanly
 *   P6  Re-bootout is idempotent/safe (acceptable behavior: error
 *       with a known "not loaded" pattern, not a wedged state)
 *
 * Isolation:
 *   - Unique label per run: com.foxworks.dispatch-daemon.spike.<pid>
 *   - All plist + toy + logs + pid file live inside one mkdtemp dir
 *   - No touch to ~/Library/LaunchAgents
 *   - Cleanup in finally: bootout + rm -rf workdir
 *
 * Exit 0 on all-pass, 1 on any failure.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileP = promisify(execFile);

interface ProbeResult {
  name: string;
  pass: boolean;
  detail?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tryReadPidFile(path: string): Promise<number | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const pid = parseInt(raw.trim(), 10);
    if (Number.isFinite(pid) && pid > 0) return pid;
    return null;
  } catch {
    return null;
  }
}

async function waitForPid(path: string, timeoutMs: number): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pid = await tryReadPidFile(path);
    if (pid !== null) return pid;
    await sleep(50);
  }
  return null;
}

async function waitForPidChange(
  path: string,
  originalPid: number,
  timeoutMs: number,
): Promise<number | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pid = await tryReadPidFile(path);
    if (pid !== null && pid !== originalPid) return pid;
    await sleep(50);
  }
  return null;
}

async function runSpike(): Promise<ProbeResult[]> {
  const uid = process.getuid!();
  const spikePid = process.pid;
  const label = `com.foxworks.dispatch-daemon.spike.${spikePid}`;
  const serviceTarget = `gui/${uid}/${label}`;

  const workDir = await mkdtemp(join(tmpdir(), 'fd-s04-'));
  const toyScriptPath = join(workDir, 'toy-daemon.mjs');
  const plistPath = join(workDir, `${label}.plist`);
  const logOutPath = join(workDir, 'daemon.out.log');
  const logErrPath = join(workDir, 'daemon.err.log');
  const pidFilePath = join(workDir, 'daemon.pid');

  // Toy daemon: ESM. Writes PID to argv[2], logs to stdout
  // (captured by launchd's StandardOutPath).
  const toyScript = `import { writeFileSync } from 'node:fs';
writeFileSync(process.argv[2], String(process.pid));
console.log('started at', new Date().toISOString(), 'pid', process.pid);
setInterval(() => console.log('alive at', new Date().toISOString()), 500);
`;
  await writeFile(toyScriptPath, toyScript, 'utf8');
  await chmod(toyScriptPath, 0o755);

  const nodePath = process.execPath;

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${toyScriptPath}</string>
    <string>${pidFilePath}</string>
  </array>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${logOutPath}</string>
  <key>StandardErrorPath</key>
  <string>${logErrPath}</string>
</dict>
</plist>
`;
  await writeFile(plistPath, plist, 'utf8');

  const results: ProbeResult[] = [];
  let loaded = false;

  async function cleanup(): Promise<void> {
    if (loaded) {
      try {
        await execFileP('launchctl', ['bootout', serviceTarget]);
      } catch {
        // already booted out or never loaded; ignore
      }
      loaded = false;
    }
    await rm(workDir, { recursive: true, force: true });
  }

  try {
    // P1 — bootstrap
    try {
      await execFileP('launchctl', ['bootstrap', `gui/${uid}`, plistPath]);
      loaded = true;
      results.push({ name: 'P1 launchctl bootstrap loads plist', pass: true });
    } catch (err) {
      const msg = (err as Error).message;
      results.push({
        name: 'P1 launchctl bootstrap loads plist',
        pass: false,
        detail: `bootstrap failed: ${msg.slice(0, 300)}`,
      });
      return results;
    }

    // P2 — RunAtLoad: toy daemon starts and writes pid
    const firstPid = await waitForPid(pidFilePath, 5000);
    results.push({
      name: 'P2 RunAtLoad fires — toy daemon starts, writes pid',
      pass: firstPid !== null,
      detail:
        firstPid !== null
          ? `pid=${firstPid}`
          : 'pid file not written within 5s',
    });
    if (firstPid === null) return results;

    // P3 — KeepAlive: wait out launchd's default 10s ThrottleInterval
    // (exited-too-quickly throttle) before killing, so the restart is
    // not artificially delayed by the throttle window. Production
    // daemons run for minutes/hours before a crash; throttle does not
    // apply in real use. Spike must wait ≥10s post-launch to isolate
    // pure KeepAlive-after-crash behavior.
    await sleep(11_000);
    try {
      process.kill(firstPid, 'SIGKILL');
    } catch (err) {
      results.push({
        name: 'P3 KeepAlive restarts after SIGKILL (post-throttle-window)',
        pass: false,
        detail: `kill failed for pid ${firstPid}: ${(err as Error).message}`,
      });
      return results;
    }

    const secondPid = await waitForPidChange(pidFilePath, firstPid, 8000);
    results.push({
      name: 'P3 KeepAlive restarts after SIGKILL (post-throttle-window)',
      pass: secondPid !== null,
      detail:
        secondPid !== null
          ? `original=${firstPid} restarted=${secondPid}`
          : `pid did not change from ${firstPid} within 8s`,
    });

    // P4 — StandardOutPath captures stdout
    await sleep(600);
    const logContent = await readFile(logOutPath, 'utf8').catch(() => '');
    const sawStarted = logContent.includes('started at');
    const sawAlive = logContent.includes('alive at');
    results.push({
      name: 'P4 StandardOutPath captures toy stdout',
      pass: sawStarted && sawAlive,
      detail: `logBytes=${logContent.length} sawStarted=${sawStarted} sawAlive=${sawAlive}`,
    });

    // P5 — bootout cleanly
    try {
      await execFileP('launchctl', ['bootout', serviceTarget]);
      loaded = false;
      results.push({ name: 'P5 launchctl bootout unloads cleanly', pass: true });
    } catch (err) {
      const msg = (err as Error).message;
      results.push({
        name: 'P5 launchctl bootout unloads cleanly',
        pass: false,
        detail: `bootout failed: ${msg.slice(0, 300)}`,
      });
    }

    // P6 — re-bootout is idempotent (expected to error with a known
    // "not loaded" pattern; that's acceptable)
    try {
      await execFileP('launchctl', ['bootout', serviceTarget]);
      // Unexpected: success on already-booted-out label
      results.push({
        name: 'P6 re-bootout is idempotent/safe',
        pass: true,
        detail: 'unexpected: bootout on already-unloaded label returned 0',
      });
    } catch (err) {
      const msg = (err as Error).message;
      const idempotentPattern =
        /No such process|not loaded|Could not find (service|specified service)|No such file|Boot-out failed/i;
      results.push({
        name: 'P6 re-bootout is idempotent/safe',
        pass: idempotentPattern.test(msg),
        detail: `expected error pattern; got: ${msg.slice(0, 200)}`,
      });
    }

    return results;
  } finally {
    // logErrPath is referenced in the plist but we don't assert on
    // its contents — if the toy crashes unexpectedly, any stderr
    // lands here and would be surfaced by failed probes.
    void logErrPath;
    await cleanup();
  }
}

async function main(): Promise<void> {
  const results = await runSpike();
  console.log('\n=== DAEMON-S04 spike results ===\n');
  let allPassed = true;
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    const line = r.detail ? `${mark} ${r.name}\n    ${r.detail}` : `${mark} ${r.name}`;
    console.log(line);
    if (!r.pass) allPassed = false;
  }
  console.log(`\n${allPassed ? 'ALL PROBES PASS' : 'FAILURES — see above'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('spike crashed:', err);
  process.exit(1);
});
