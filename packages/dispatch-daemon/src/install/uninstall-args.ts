/**
 * Uninstaller arg parser for DAEMON-T19.
 *
 * Per pre-reg arbitration 3: simple positional flag check;
 * no need for a full CLI library. The only flag is --clean,
 * which opts out of the default state-preservation behavior.
 *
 * Pure function — fully unit-tested. Order-agnostic; ignores
 * unrecognized flags (operator can pass through other args
 * without breaking parsing).
 */

export interface UninstallArgs {
  /** When true, uninstaller will prompt to remove
   *  ~/.foxworks-dispatch/ state dir (with double-confirm).
   *  When false (default), state dir is preserved across
   *  reinstalls. */
  clean: boolean;
}

export function parseUninstallArgs(argv: string[]): UninstallArgs {
  return {
    clean: argv.includes('--clean'),
  };
}
