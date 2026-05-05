// Probe-92 observability infrastructure — pure-function gating helpers.
//
// Defense-in-depth (operator-arbitrated, scout-phase Q3 + Q4): the two
// MB_TEST_HOOKS_*-prefixed environment variables (token-path and
// user-data-dir overrides) MUST require MB_TEST_HOOKS=1 to take
// effect. A production build with MB_TEST_HOOKS unset MUST ignore
// these overrides even if accidentally passed.
//
// Extracting the gating logic into pure functions makes the assertion
// testable in isolation (test/unit/probe-92-test-hooks-env/) without
// spawning Electron. Each helper takes the env object as a parameter
// (rather than reading process.env directly) so unit tests can
// table-drive the gating combinations: { MB_TEST_HOOKS, override }.
//
// Both helpers return `undefined` when the override should NOT apply,
// and the override-string when it SHOULD. Call sites in main.ts
// short-circuit on `undefined` and fall back to production defaults.
//
// This file ships ZERO behavior in production: with MB_TEST_HOOKS
// unset, both helpers always return undefined, and the call sites
// resolve to the same defaults that were in place before the probe
// suite was added.

/**
 * Returns the token path override IFF MB_TEST_HOOKS=1 AND the override
 * env var is set; otherwise undefined.
 *
 * Used by main.ts:`workstation:get-daemon-token` IPC handler. When
 * undefined, the handler falls back to readDaemonTokenForBootstrap()'s
 * default of ~/.foxworks-dispatch/token.
 */
export function getDaemonTokenPathOverride(
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (env.MB_TEST_HOOKS !== '1') return undefined;
  const override = env.MB_TEST_HOOKS_DAEMON_TOKEN_PATH;
  if (typeof override !== 'string' || override.length === 0) return undefined;
  return override;
}

/**
 * Returns the userData directory override IFF MB_TEST_HOOKS=1 AND the
 * override env var is set; otherwise undefined.
 *
 * Used by main.ts pre-whenReady() to call app.setPath('userData', …).
 * When undefined, Electron uses its platform default (e.g.
 * ~/Library/Application Support/Electron on macOS).
 */
export function getUserDataDirOverride(
  env: NodeJS.ProcessEnv,
): string | undefined {
  if (env.MB_TEST_HOOKS !== '1') return undefined;
  const override = env.MB_USER_DATA_DIR;
  if (typeof override !== 'string' || override.length === 0) return undefined;
  return override;
}
