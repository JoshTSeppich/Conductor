#!/usr/bin/env tsx
/**
 * DAEMON-T18 launchd installer entry point.
 *
 * Run via: pnpm --filter dispatch-daemon install:daemon
 *
 * Composes the testable helpers (plist generation + path
 * resolution) with the OS-boundary wrappers (build, plist
 * write, launchctl bootstrap). Idempotent per arbitration
 * 1A: re-running on an already-loaded daemon prints a
 * message and exits 0 rather than breaking the running
 * process.
 *
 * Post-install: prints CS-03 instructions for granting
 * notification permission to the daemon-as-launchd process.
 * S03 ADR §"Tradeoffs" + §"Cross-session impacts"
 * established that launchd-launched processes have a
 * different parent identity than terminal-launched, so
 * permission granted to Terminal.app does NOT carry over.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generatePlist } from '../src/install/plist.js';
import {
  findUserHome,
  resolveNodeBinary,
  resolveRepoRoot,
} from '../src/install/paths.js';
import { buildDaemonArtifact } from '../src/install/build.js';
import {
  bootstrapLaunchAgent,
  formatBootstrapCommand,
  getCurrentUid,
  isAlreadyHandledLaunchctlError,
} from '../src/install/launchctl.js';

const LABEL = 'com.foxworks.dispatch-daemon';

async function main(): Promise<void> {
  console.log('Foxworks Dispatch — daemon installer');

  const repoRoot = resolveRepoRoot(import.meta.dirname);
  console.log(`  repo root: ${repoRoot}`);

  console.log('  building daemon (pnpm --filter dispatch-daemon build)...');
  await buildDaemonArtifact(repoRoot);

  const daemonScript = join(
    repoRoot,
    'packages',
    'dispatch-daemon',
    'dist',
    'index.js',
  );

  const nodePath = resolveNodeBinary();
  console.log(`  node: ${nodePath}`);
  console.log(`  daemon: ${daemonScript}`);

  const home = findUserHome();
  const stateDir = join(home, '.foxworks-dispatch');
  const logsDir = join(stateDir, 'logs');
  await mkdir(logsDir, { recursive: true });

  const plist = generatePlist({
    label: LABEL,
    nodePath,
    daemonScript,
    stdoutPath: join(logsDir, 'daemon.out.log'),
    stderrPath: join(logsDir, 'daemon.err.log'),
  });

  const launchAgentsDir = join(home, 'Library', 'LaunchAgents');
  await mkdir(launchAgentsDir, { recursive: true });
  const plistPath = join(launchAgentsDir, `${LABEL}.plist`);
  await writeFile(plistPath, plist, 'utf8');
  console.log(`  plist: ${plistPath}`);

  const uid = getCurrentUid();
  try {
    await bootstrapLaunchAgent({ uid, plistPath });
    console.log('  ✓ daemon loaded via launchctl bootstrap');
  } catch (err) {
    if (isAlreadyHandledLaunchctlError(err)) {
      console.log(
        '  ℹ daemon already loaded (idempotent re-run; no-op per arb 1A)',
      );
    } else {
      console.error(
        `\nlaunchctl bootstrap failed: ${(err as Error).message}`,
      );
      console.error(
        `\nyou can retry manually:\n  ${formatBootstrapCommand({ uid, plistPath })}`,
      );
      throw err;
    }
  }

  console.log('');
  console.log('────────────────────────────────────────────────────────');
  console.log('Post-install: grant notification permission (CS-03)');
  console.log('────────────────────────────────────────────────────────');
  console.log('  1. Open System Settings → Notifications');
  console.log(
    '  2. Find "Foxworks Dispatch Daemon" (or "terminal-notifier")',
  );
  console.log('  3. Enable "Allow Notifications"');
  console.log(
    '  4. Restart daemon if permission was granted post-first-run:',
  );
  console.log(`       launchctl kickstart -k gui/${uid}/${LABEL}`);
  console.log('');
}

main().catch((err) => {
  console.error('\nInstaller failed:', (err as Error).message);
  process.exit(1);
});
