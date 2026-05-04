// Batch 6 Session A — followup MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION
// (cairn finding #72).
//
// Resolves the absolute path of the `claude` executable at workstation
// startup. The spawn pipeline passes this absolute path verbatim into
// the tmux argv, bypassing PATH lookup inside the closed-allowlist env
// constructed by spawn-env.ts. The dogfood-validated symptom: tmux
// inherits the closed PATH allowlist (which excludes `~/.local/bin`,
// the Anthropic official-installer location), `tmux new-session`
// returns exit-0, then claude fails to exec asynchronously and the
// session dies — leaving the workstation with an orphaned daemon
// record.
//
// resolveClaudeBin is async + injectable. Production wiring runs
// `which claude` via execFile; tests inject a stub locator so unit
// tests do not depend on a real claude install.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export class ClaudeBinNotFoundError extends Error {
  readonly code = 'ClaudeBinNotFound';
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeBinNotFoundError';
  }
}

export interface ResolveClaudeBinDeps {
  /**
   * Locate a binary by name and return its absolute path. Default
   * implementation runs `/usr/bin/which <cmd>`. Tests inject stubs.
   */
  runWhich?: (cmd: string) => Promise<string>;
}

async function defaultRunWhich(cmd: string): Promise<string> {
  // /usr/bin/which is present on macOS + most Linux distros at this
  // absolute path. Using the absolute path here mirrors the reason
  // we resolve `claude` to an absolute path: avoid PATH dependency
  // inside the workstation main-process invocation context.
  const { stdout } = await execFileP('/usr/bin/which', [cmd]);
  return stdout;
}

export async function resolveClaudeBin(
  deps: ResolveClaudeBinDeps = {},
): Promise<string> {
  const which = deps.runWhich ?? defaultRunWhich;
  let raw: string;
  try {
    raw = await which('claude');
  } catch (err) {
    throw new ClaudeBinNotFoundError(
      `Failed to resolve claude binary on PATH: ${(err as Error).message}`,
    );
  }
  const path = raw.trim();
  if (path.length === 0) {
    throw new ClaudeBinNotFoundError(
      '`which claude` returned empty output — claude binary not found on PATH.',
    );
  }
  return path;
}
