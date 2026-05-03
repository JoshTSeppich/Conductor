// MB-T05 — Spawn-env allowlist construction.
//
// Per WORKSTATION_CONTRACT.md §8.1 amended (cf1848a):
//   "The Workstation spawn handler (MB-T05) MUST construct the env
//    passed to `tmux new-session` from a documented closed allowlist
//    at `docs/adr/MB-T05-env-allowlist-amendment.md`. The spawn handler
//    MUST NOT inherit `process.env` indiscriminately."
//
// The allowlist (per ADR §3) and exclusion rationale (per ADR §4) are
// codified here. Refinements follow the ADR §6 process: paired docs:
// + feat: commits with operator arbitration.

/**
 * Deterministic PATH passed to tmux. Per ADR §3.1: Homebrew prefix
 * prepended ahead of system paths so `claude` and `tmux` at
 * /opt/homebrew/bin resolve in the launchd-minimal-PATH spawn context
 * (KNOWN per MB-S02 §3.2 evidence; without prepend, B2 mode fails
 * PATH lookup for both binaries).
 */
export const ALLOWLIST_PATH =
  '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin';

/**
 * Constant TERM passed to tmux. tmux rewrites to `tmux-256color` inside
 * the pane regardless of input TERM (KNOWN per MB-S02 §4 — all three
 * pty-*.txt files report tmux-256color). xterm-256color is the
 * canonical "rich terminal" hint to pass tmux at session creation.
 */
export const ALLOWLIST_TERM = 'xterm-256color';

/**
 * Default LANG when source env does not set it. en_US.UTF-8 ensures
 * UTF-8 locale for claude TUI output (emoji, non-ASCII, box-drawing).
 * Per ADR §3 row 6: KNOWN required.
 */
export const DEFAULT_LANG = 'en_US.UTF-8';

/**
 * Default SHELL when source env does not set it. tmux falls back to
 * $SHELL for default-shell behavior even when an explicit pane command
 * is passed (per ADR §3 row 5).
 */
export const DEFAULT_SHELL = '/bin/zsh';

/**
 * The closed allowlist of var names that may appear in the env passed
 * to `tmux new-session`. Anything not in this list is dropped at
 * construction time. New additions follow ADR §6 (operator-arbitrated
 * + paired docs:/feat: commits).
 */
export const ALLOWLIST_KEYS = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TERM',
  'TMPDIR',
  'ANTHROPIC_API_KEY',
] as const;

export type AllowlistedKey = typeof ALLOWLIST_KEYS[number];

export type SpawnEnv = Partial<Record<AllowlistedKey, string>>;

/**
 * Build the env passed to `tmux new-session` from the operator's
 * source env (typically Electron's `process.env`) plus the
 * caller-supplied `apiKey` (decrypted from Electron `safeStorage` per
 * WORKSTATION_CONTRACT.md §8.3).
 *
 * Returns ONLY allowlisted keys. Anything outside the allowlist —
 * `npm_*`, `NVM_*`, `HOMEBREW_*`, `__CF*`, `XPC_*`, `TMUX*`,
 * `SSH_AUTH_SOCK`, `EDITOR`, etc. — is dropped per the closed-allowlist
 * model and the per-row rationale in ADR §4.
 *
 * PATH and TERM are constants (NOT inherited from source env). LANG,
 * SHELL fall back to documented defaults if absent. LC_ALL, TMPDIR are
 * passthrough-or-omit. HOME, USER, LOGNAME, ANTHROPIC_API_KEY are
 * load-bearing — caller is responsible for ensuring they are present
 * (HOME, USER usually from Electron's process.env; ANTHROPIC_API_KEY
 * from safeStorage).
 */
export function buildSpawnEnv(
  sourceEnv: NodeJS.ProcessEnv | Record<string, string | undefined>,
  apiKey: string,
): SpawnEnv {
  const env: SpawnEnv = {
    PATH: ALLOWLIST_PATH,
    TERM: ALLOWLIST_TERM,
    LANG: sourceEnv.LANG ?? DEFAULT_LANG,
    SHELL: sourceEnv.SHELL ?? DEFAULT_SHELL,
    ANTHROPIC_API_KEY: apiKey,
  };

  if (sourceEnv.HOME !== undefined) env.HOME = sourceEnv.HOME;
  if (sourceEnv.USER !== undefined) env.USER = sourceEnv.USER;
  // LOGNAME falls back to USER per ADR §3 row 4.
  if (sourceEnv.LOGNAME !== undefined) {
    env.LOGNAME = sourceEnv.LOGNAME;
  } else if (sourceEnv.USER !== undefined) {
    env.LOGNAME = sourceEnv.USER;
  }
  // LC_ALL passthrough-only — absence is operator's choice (ADR §3 row 7).
  if (sourceEnv.LC_ALL !== undefined) env.LC_ALL = sourceEnv.LC_ALL;
  // TMPDIR passthrough-or-omit (ADR §3 row 9).
  if (sourceEnv.TMPDIR !== undefined) env.TMPDIR = sourceEnv.TMPDIR;

  return env;
}
