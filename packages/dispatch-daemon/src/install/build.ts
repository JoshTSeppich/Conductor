/**
 * pnpm build thin OS-boundary wrapper.
 *
 * Status: UNUSED under Z-1 Path B (operator-arbitrated
 * pivot). Path B aligned the production launchd runtime
 * with the rest of the codebase (tsx + src/index.ts);
 * compiled `dist/` artifact no longer needed for daemon
 * launch. This helper preserved for v2.1 Path C (esbuild
 * bundle) per S04 followup #5.
 *
 * Original Path A mandate (rejected at Z-1 mid-fix): build
 * dispatch-daemon + dispatch-core to dist/ for `node + dist/
 * index.js` plist runtime. Pivot rationale captured in Z-1
 * commit body verbatim.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

/** OS boundary; preserved for v2.1 bundler path. */
export async function buildDaemonArtifact(repoRoot: string): Promise<void> {
  await execFileP(
    'pnpm',
    ['--filter', 'dispatch-core', 'build'],
    { cwd: repoRoot },
  );
  await execFileP(
    'pnpm',
    ['--filter', 'dispatch-daemon', 'build'],
    { cwd: repoRoot },
  );
}
