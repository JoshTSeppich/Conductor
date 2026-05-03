// MB-T05 cluster 1 — buildSpawnEnv passthrough behavior for optional vars.
//
// Per docs/adr/MB-T05-env-allowlist-amendment.md §3:
//   - LC_ALL: passthrough IF set; absence is operator's choice → omit
//   - LOGNAME: fallback to USER if absent
//   - SHELL:   fallback to /bin/zsh if absent
//   - LANG:    fallback to en_US.UTF-8 if absent (UTF-8 required for claude TUI)
//   - TMPDIR:  passthrough; if absent (rare on macOS) omit
//
// HOME and USER are KNOWN required by claude/git/ssh; if absent in source
// env, omit (the spawn handler's caller is responsible for failing loud
// rather than spawning a session that immediately misbehaves).

import { describe, it, expect } from 'vitest';
import { buildSpawnEnv } from '../../../src/main/spawn-env.js';

describe('MB-T05 cluster 1 — buildSpawnEnv optional vars', () => {
  it('P1 omits LC_ALL when source env does not have it', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u', LANG: 'en_US.UTF-8' /* no LC_ALL */ },
      'k',
    );
    expect('LC_ALL' in env).toBe(false);
  });

  it('P2 forwards LC_ALL when source env has it', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u', LC_ALL: 'C.UTF-8' },
      'k',
    );
    expect(env.LC_ALL).toBe('C.UTF-8');
  });

  it('P3 LOGNAME falls back to USER when absent', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'alice' /* no LOGNAME */ },
      'k',
    );
    expect(env.LOGNAME).toBe('alice');
  });

  it('P4 SHELL falls back to /bin/zsh when absent', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u' /* no SHELL */ },
      'k',
    );
    expect(env.SHELL).toBe('/bin/zsh');
  });

  it('P5 LANG falls back to en_US.UTF-8 when absent', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u' /* no LANG */ },
      'k',
    );
    expect(env.LANG).toBe('en_US.UTF-8');
  });

  it('P6 TMPDIR omitted when source env does not have it (rare; not synthesized)', () => {
    const env = buildSpawnEnv(
      { HOME: '/h', USER: 'u' /* no TMPDIR */ },
      'k',
    );
    expect('TMPDIR' in env).toBe(false);
  });
});
