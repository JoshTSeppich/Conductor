/**
 * Path resolution helpers for DAEMON-T18 / T19 installers.
 *
 * resolveRepoRoot is a pure function — walks up from a
 * starting directory until it finds the CONDUCTOR_API_
 * CONTRACT.md marker (S04 ADR §"Bootstrap requires absolute
 * paths" §5: "Detect by walking up from a known marker file
 * (CONDUCTOR_API_CONTRACT.md at repo root)"). Throws with
 * an operator-helpful message if the walk-up reaches the
 * filesystem root without finding the marker (arb 2: "run
 * installer from inside foxworks-dispatch repo").
 *
 * resolveNodeBinary returns process.execPath — the absolute
 * path to the node binary that ran the current process. The
 * installer is invoked via `pnpm --filter dispatch-daemon
 * install:daemon` which spawns tsx via node, so execPath is
 * exactly the node we want plist's ProgramArguments[0] to
 * reference. Pure access to a Node API; no unit test per
 * finding #36 framework (test would just be `expect(x).toBe
 * (process.execPath)` which carries no information).
 */

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';

const REPO_MARKER = 'CONDUCTOR_API_CONTRACT.md';

export function resolveRepoRoot(startDir: string): string {
  let current = resolve(startDir);
  while (true) {
    const markerPath = resolve(current, REPO_MARKER);
    if (existsSync(markerPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `${REPO_MARKER} not found in walk-up from ${startDir}; ` +
          `run installer from inside the foxworks-dispatch repo`,
      );
    }
    current = parent;
  }
}

/** OS-adjacent (smoke-tested at install time per finding #36). */
export function resolveNodeBinary(): string {
  return process.execPath;
}

/** OS-adjacent (smoke-tested at install time per finding #36). */
export function findUserHome(): string {
  return homedir();
}
