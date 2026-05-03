// MB-T05 cluster 1 — buildSpawnEnv allowlist construction.
//
// Per WORKSTATION_CONTRACT.md §8.1 amended (cf1848a) + the per-var
// rationale in docs/adr/MB-T05-env-allowlist-amendment.md §3:
//
//   PATH       — constructed deterministically (Homebrew prefix prepended)
//   HOME       — passthrough from process.env
//   USER       — passthrough
//   LOGNAME    — passthrough (or fallback to USER per ADR §3 row 4)
//   SHELL      — passthrough (or fallback to /bin/zsh)
//   LANG       — passthrough (or fallback to en_US.UTF-8)
//   LC_ALL     — passthrough IF set (otherwise omitted)
//   TERM       — constant "xterm-256color"
//   TMPDIR     — passthrough (macOS per-user scratch dir)
//   ANTHROPIC_API_KEY — injected by caller from Electron safeStorage
//
// Spawn handler MUST NOT inherit process.env indiscriminately
// (§8.1 amended explicit prohibition).
//
// RED state: src/main/spawn-env.ts does not exist; import fails.
// GREEN state: buildSpawnEnv returns an object containing exactly the
// allowlisted vars (10 when all source vars present + LC_ALL).

import { describe, it, expect } from 'vitest';
import { buildSpawnEnv, ALLOWLIST_PATH } from '../../../src/main/spawn-env.js';

describe('MB-T05 cluster 1 — buildSpawnEnv allowlist', () => {
  it('P1 returns EXACTLY the 10 allowlisted vars when all source vars present', () => {
    const sourceEnv = {
      HOME: '/Users/test',
      USER: 'test',
      LOGNAME: 'test',
      SHELL: '/bin/zsh',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      TMPDIR: '/var/folders/test/T/',
      // Vars that MUST be excluded (process.env noise):
      PATH: '/some/operator/PATH',                         // overridden by allowlist constant
      TERM: 'xterm',                                       // overridden by xterm-256color constant
      NVM_DIR: '/Users/test/.nvm',
      npm_config_prefix: '/Users/test/.npm',
      __CFBundleIdentifier: 'com.foxworks.workstation',
      TMUX: 'should-not-leak',
      SHLVL: '3',
    };
    const env = buildSpawnEnv(sourceEnv, 'sk-ant-test-key');
    const keys = Object.keys(env).sort();
    expect(keys).toEqual([
      'ANTHROPIC_API_KEY',
      'HOME',
      'LANG',
      'LC_ALL',
      'LOGNAME',
      'PATH',
      'SHELL',
      'TERM',
      'TMPDIR',
      'USER',
    ]);
  });

  it('P2 PATH is the allowlist constant (Homebrew prefix prepended), NOT process.env.PATH', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u', PATH: '/operator/custom/bin' },
      'k',
    );
    expect(env.PATH).toBe(
      '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin',
    );
    // Cross-check that the exported constant matches the per-row value.
    expect(env.PATH).toBe(ALLOWLIST_PATH);
  });

  it('P3 TERM is the xterm-256color constant, NOT process.env.TERM', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u', TERM: 'screen' },
      'k',
    );
    expect(env.TERM).toBe('xterm-256color');
  });

  it('P4 ANTHROPIC_API_KEY comes from caller-supplied apiKey (NOT process.env)', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u', ANTHROPIC_API_KEY: 'leaked-from-process-env' },
      'sk-ant-injected',
    );
    expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-injected');
  });
});
