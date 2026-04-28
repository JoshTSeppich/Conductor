#!/usr/bin/env tsx
/**
 * DAEMON-T19 launchd uninstaller entry point.
 *
 * Run via: pnpm --filter dispatch-daemon uninstall:daemon
 *   With --clean: pnpm --filter dispatch-daemon uninstall:daemon -- --clean
 *
 * Tolerant of "not loaded" errors per S04 §6 (already-unloaded
 * → exit 0 idempotent). Default preserves state dir; --clean
 * flag with double-confirm prompt removes ~/.foxworks-dispatch/.
 *
 * Composes T18's shared helpers (paths.ts, launchctl.ts) +
 * T19's uninstall-args.ts. Real launchctl bootout + fs writes
 * are OS-boundary wrappers smoke-tested at operator uninstall
 * time per finding #36.
 */

import { rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { findUserHome } from '../src/install/paths.js';
import {
  bootoutLaunchAgent,
  formatBootoutCommand,
  getCurrentUid,
  isAlreadyHandledLaunchctlError,
} from '../src/install/launchctl.js';
import { parseUninstallArgs } from '../src/install/uninstall-args.js';

const LABEL = 'com.foxworks.dispatch-daemon';

async function confirmCleanState(): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      'Remove ~/.foxworks-dispatch/ (state, sessions, token)? This cannot be undone. [y/N] ',
      (answer) => {
        rl.close();
        resolve(/^y(es)?$/i.test(answer.trim()));
      },
    );
  });
}

async function main(): Promise<void> {
  console.log('Foxworks Dispatch — daemon uninstaller');

  const args = parseUninstallArgs(process.argv.slice(2));
  const home = findUserHome();
  const uid = getCurrentUid();

  // 1. launchctl bootout — tolerant of "not loaded" per S04 §6
  try {
    await bootoutLaunchAgent({ uid, label: LABEL });
    console.log('  ✓ daemon unloaded via launchctl bootout');
  } catch (err) {
    if (isAlreadyHandledLaunchctlError(err)) {
      console.log('  ℹ daemon was not loaded (idempotent re-run)');
    } else {
      console.error(
        `\nlaunchctl bootout failed: ${(err as Error).message}`,
      );
      console.error(
        `\nyou can retry manually:\n  ${formatBootoutCommand({ uid, label: LABEL })}`,
      );
      throw err;
    }
  }

  // 2. Remove plist
  const plistPath = join(
    home,
    'Library',
    'LaunchAgents',
    `${LABEL}.plist`,
  );
  try {
    await unlink(plistPath);
    console.log(`  ✓ removed plist: ${plistPath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('  ℹ plist already absent (idempotent)');
    } else {
      throw err;
    }
  }

  // 3. State cleanup — only with --clean flag + double-confirm
  const stateDir = join(home, '.foxworks-dispatch');
  if (args.clean) {
    const ok = await confirmCleanState();
    if (ok) {
      await rm(stateDir, { recursive: true, force: true });
      console.log(`  ✓ removed state dir: ${stateDir}`);
    } else {
      console.log('  ℹ state preserved (operator declined at prompt)');
    }
  } else {
    console.log(
      `  ℹ state preserved at ${stateDir} (use --clean to remove)`,
    );
  }

  console.log('\nUninstall complete.');
}

main().catch((err) => {
  console.error('\nUninstaller failed:', (err as Error).message);
  process.exit(1);
});
