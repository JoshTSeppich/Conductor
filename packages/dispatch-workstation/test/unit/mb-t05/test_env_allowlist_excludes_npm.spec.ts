// MB-T05 cluster 1 — buildSpawnEnv excludes process.env noise.
//
// Per docs/adr/MB-T05-env-allowlist-amendment.md §4: vars present in
// the operator's CLI baseline (or in npx-electron-spawned process.env)
// but deliberately NOT forwarded by the spawn handler:
//
//   NVM_DIR, NVM_BIN, NVM_INC, NVM_CD_FLAGS  — claude is a binary, not nvm-managed
//   npm_*  (19 vars per MB-S02 §3.1)         — npx artifacts; not used by claude
//   HOMEBREW_*, INFOPATH, FPATH               — interactive zsh prompt convenience
//   PNPM_HOME                                  — operator pnpm prefix
//   TMUX, TMUX_PANE                            — tmux sets these inside the pane
//   __CFBundleIdentifier, __CF_*, OSLog*, XPC_* — macOS launchd metadata
//   TERM_SESSION_ID, TERM_PROGRAM, TERM_PROGRAM_VERSION — Terminal.app-specific
//   SSH_AUTH_SOCK                              — refinement candidate
//   EDITOR, VISUAL                             — refinement candidate
//   SHLVL, PWD, OLDPWD, _                      — shell-managed
//
// MB-S02 spike evidence demonstrated 19 npm_* divergences in B1 mode —
// these are npx-injected artifacts and would NOT be present in a shipped
// .app launch, so excluding them is safe and aligned with B2 mode.

import { describe, it, expect } from 'vitest';
import { buildSpawnEnv } from '../../../src/main/spawn-env.js';

describe('MB-T05 cluster 1 — buildSpawnEnv excludes process.env noise', () => {
  it('P1 excludes nvm vars', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        NVM_DIR: '/Users/test/.nvm',
        NVM_BIN: '/Users/test/.nvm/versions/node/v20/bin',
        NVM_INC: '/Users/test/.nvm/versions/node/v20/include/node',
        NVM_CD_FLAGS: '-q',
      },
      'k',
    );
    expect('NVM_DIR' in env).toBe(false);
    expect('NVM_BIN' in env).toBe(false);
    expect('NVM_INC' in env).toBe(false);
    expect('NVM_CD_FLAGS' in env).toBe(false);
  });

  it('P2 excludes ALL npm_* vars', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        npm_command: 'install',
        npm_config_prefix: '/Users/test/.npm',
        npm_config_user_agent: 'pnpm/8.0.0',
        npm_lifecycle_event: 'npx',
        npm_node_execpath: '/Users/test/.nvm/.../bin/node',
      },
      'k',
    );
    const npmKeys = Object.keys(env).filter((k) => k.startsWith('npm_'));
    expect(npmKeys).toEqual([]);
  });

  it('P3 excludes Homebrew shell-env convenience + INFOPATH/FPATH', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        HOMEBREW_PREFIX: '/opt/homebrew',
        HOMEBREW_CELLAR: '/opt/homebrew/Cellar',
        HOMEBREW_REPOSITORY: '/opt/homebrew',
        INFOPATH: '/opt/homebrew/share/info:',
        FPATH: '/opt/homebrew/share/zsh/site-functions',
      },
      'k',
    );
    expect('HOMEBREW_PREFIX' in env).toBe(false);
    expect('HOMEBREW_CELLAR' in env).toBe(false);
    expect('HOMEBREW_REPOSITORY' in env).toBe(false);
    expect('INFOPATH' in env).toBe(false);
    expect('FPATH' in env).toBe(false);
  });

  it('P4 excludes TMUX-set vars (would confuse nested tmux)', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        TMUX: '/tmp/tmux-501/default,12345,0',
        TMUX_PANE: '%0',
      },
      'k',
    );
    expect('TMUX' in env).toBe(false);
    expect('TMUX_PANE' in env).toBe(false);
  });

  it('P5 excludes shell/macOS metadata: SHLVL, PWD, OLDPWD, _, __CF*, XPC_*, TERM_*', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        SHLVL: '3',
        PWD: '/operator/cwd',
        OLDPWD: '/operator/prev',
        _: '/usr/local/bin/some-cmd',
        __CFBundleIdentifier: 'com.foxworks.workstation',
        __CF_USER_TEXT_ENCODING: '0x1F5:0x0:0x0',
        OSLogRateLimit: '500',
        XPC_FLAGS: '0x0',
        XPC_SERVICE_NAME: '0',
        TERM_SESSION_ID: 'w0t0p0',
        TERM_PROGRAM: 'Apple_Terminal',
        TERM_PROGRAM_VERSION: '455',
      },
      'k',
    );
    expect('SHLVL' in env).toBe(false);
    expect('PWD' in env).toBe(false);
    expect('OLDPWD' in env).toBe(false);
    expect('_' in env).toBe(false);
    expect('__CFBundleIdentifier' in env).toBe(false);
    expect('__CF_USER_TEXT_ENCODING' in env).toBe(false);
    expect('OSLogRateLimit' in env).toBe(false);
    expect('XPC_FLAGS' in env).toBe(false);
    expect('XPC_SERVICE_NAME' in env).toBe(false);
    expect('TERM_SESSION_ID' in env).toBe(false);
    expect('TERM_PROGRAM' in env).toBe(false);
    expect('TERM_PROGRAM_VERSION' in env).toBe(false);
  });

  it('P6 excludes refinement-candidates that are NOT in the v3.0 allowlist (SSH_AUTH_SOCK, EDITOR, VISUAL)', () => {
    const env = buildSpawnEnv(
      {
        HOME: '/h',
        USER: 'u',
        SSH_AUTH_SOCK: '/private/tmp/com.apple.launchd.xyz/Listeners',
        EDITOR: 'vim',
        VISUAL: 'vim',
      },
      'k',
    );
    expect('SSH_AUTH_SOCK' in env).toBe(false);
    expect('EDITOR' in env).toBe(false);
    expect('VISUAL' in env).toBe(false);
  });
});
