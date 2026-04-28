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

  // DAEMON-Z-1 Path B: skip build step. Production launchd
  // runtime is tsx + src/index.ts (was node + dist/index.js
  // pre-Z-1 per S04 §3.1; pending S04 amendment per Z-1
  // commit body). Aligns daemon runtime with rest of codebase
  // (tests, dev, install/uninstall scripts all run via tsx).

  const daemonScript = join(
    repoRoot,
    'packages',
    'dispatch-daemon',
    'src',
    'index.ts',
  );

  // DAEMON-Z-1 Path B: invoke node directly with --import
  // tsx loader. tsx CLI wrapper itself cannot be exec'd by
  // launchd (macOS provenance xattr → "Operation not
  // permitted"). node binary is unrestricted; --import tsx
  // loads tsx ESM hooks + runs the .ts source.
  const nodePath = resolveNodeBinary();
  const programArguments = [
    nodePath,
    '--import',
    'tsx',
    daemonScript,
  ];
  console.log(`  node: ${nodePath}`);
  console.log(`  daemon: ${daemonScript}`);
  console.log(`  ProgramArguments: ${JSON.stringify(programArguments)}`);

  const home = findUserHome();
  const stateDir = join(home, '.foxworks-dispatch');
  const logsDir = join(stateDir, 'logs');
  await mkdir(logsDir, { recursive: true });

  const plist = generatePlist({
    label: LABEL,
    programArguments,
    stdoutPath: join(logsDir, 'daemon.out.log'),
    stderrPath: join(logsDir, 'daemon.err.log'),
    // Z-1 Path B: launchd cwd defaults to /; node needs to
    // resolve `tsx` via node_modules at repo root.
    workingDirectory: repoRoot,
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
