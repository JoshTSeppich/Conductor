/**
 * launchctl thin OS-boundary wrappers for DAEMON-T18 / T19.
 *
 * Per finding #36 framework: actual launchctl invocation is
 * smoke-tested by the operator at install time (cannot run
 * in CI without real system service interaction; mocking
 * defeats the purpose). Functions here remain thin — single
 * execFile call each — so the mocking surface is the OS
 * boundary, not buried logic.
 *
 * formatBootstrapCommand is a pure helper exported for
 * diagnostic logging; it produces the equivalent shell
 * command operators can copy-paste if the installer fails
 * partway through and they need to retry manually.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export interface LaunchctlOpts {
  /** Operator's uid as a string (process.getuid()?.toString()).
   *  launchctl gui/<uid>/<label> domain. */
  uid: string;
  /** Absolute path to the plist (bootstrap) or full domain
   *  target (bootout uses the label as last path segment). */
  plistPath: string;
}

export function formatBootstrapCommand(opts: LaunchctlOpts): string {
  return `launchctl bootstrap gui/${opts.uid} ${opts.plistPath}`;
}

/** OS boundary: smoke-tested at install (finding #36). */
export async function bootstrapLaunchAgent(
  opts: LaunchctlOpts,
): Promise<void> {
  await execFileP('launchctl', [
    'bootstrap',
    `gui/${opts.uid}`,
    opts.plistPath,
  ]);
}

/** Returns the current operator uid as a string for plist
 *  domain construction. Errors on non-posix (Windows) where
 *  process.getuid is undefined; v2 is darwin-only per S04. */
export function getCurrentUid(): string {
  const uid = process.getuid?.();
  if (uid === undefined) {
    throw new Error(
      'process.getuid() unavailable — launchd installer is darwin-only for v2',
    );
  }
  return uid.toString();
}

/** Idempotency error pattern per S04 §"6. Re-bootout error
 *  pattern" — extended for bootstrap's already-loaded case
 *  (S04 spike documented bootout's "No such process" but
 *  not bootstrap's already-loaded variant; expanded regex
 *  covers both directions for safety; smoke test will
 *  surface if pattern misses real-world variant). */
const ALREADY_LOADED_OR_UNLOADED_REGEX =
  /already (loaded|bootstrapped)|service already|No such process|not loaded|Could not find (service|specified service)|No such file|Boot-out failed|exit code: 17/i;

export function isAlreadyHandledLaunchctlError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? '';
  return ALREADY_LOADED_OR_UNLOADED_REGEX.test(msg);
}
