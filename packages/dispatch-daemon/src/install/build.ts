/**
 * pnpm build thin OS-boundary wrapper for DAEMON-T18.
 *
 * Per finding #36 framework: smoke-tested at install time.
 * Logic is mechanical — invoke pnpm --filter dispatch-daemon
 * build with the repo root as cwd; let exec errors surface
 * to the installer's top-level error path.
 *
 * Path A from the build-step arbitration: T18 runs the build
 * itself rather than relying on a prerequisite. S04 ADR
 * specifies plist references dist/index.js; this wrapper
 * produces it.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** OS boundary: smoke-tested at install (finding #36). */
export async function buildDaemonArtifact(repoRoot: string): Promise<void> {
  await execFileP(
    'pnpm',
    ['--filter', 'dispatch-daemon', 'build'],
    { cwd: repoRoot },
  );
}
