/**
 * probe-mbf-pcacc-02 — cairn-atomic-commit.sh race-detection mechanism (WB2).
 *
 * Ticket: MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-(β).
 * Session: r12-t1c-w1-parallel-cairn-atomic-commit.
 *
 * Probes:
 *   P1 — `cairn_detect_race` function: all pathspecs staged → returns 0
 *   P2 — `cairn_detect_race` function: missing pathspec → returns 1 + diagnostic
 *   P3 — `cairn_detect_race` function: empty pathspec list → returns 0
 *   P4 — `cairn_detect_race` function: handles renamed-path 'R  old -> new' lines
 *   P5 — integration: race simulated via CAIRN_ATOMIC_TEST_RACE_HOOK (un-stages
 *        the pathspec mid-execution); retry re-adds + succeeds; exit 0 + log
 *        "retry succeeded" on stderr
 *   P6 — integration: persistent race (hook removes working-tree file so retry
 *        also cannot re-stage) → exit non-zero + clear error
 *   P7 — cross-shell: `zsh -c "<script-path> ..."` self-execs via shebang and
 *        completes happy-path identically to bash invocation (Q-ATOMIC-4)
 *
 * P1-P4 source the script as a bash library and invoke `cairn_detect_race`
 * directly with crafted status snapshots. The script's BASH_SOURCE guard
 * prevents `cairn_main` from running on source.
 *
 * P5-P6 use the script's CAIRN_ATOMIC_TEST_RACE_HOOK env var test affordance
 * (documented at scripts/cairn-atomic-commit.sh line ~145). The hook is
 * `eval`'d after `git add` but before status capture, simulating an
 * external session's index sweep.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);
const REPO_ROOT = resolve(__dirname_local, '../../../../');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'cairn-atomic-commit.sh');

function callDetectRace(
  snapshot: string,
  pathspecs: string[],
): { status: number | null; stderr: string } {
  // Build a one-liner: source the script then call cairn_detect_race.
  // We pass the snapshot via env var to keep argv clean from shell-escaping.
  const args = pathspecs.map((p) => `'${p.replace(/'/g, `'\\''`)}'`).join(' ');
  const cmd = `source "${SCRIPT_PATH}" && cairn_detect_race "$CAIRN_TEST_SNAPSHOT" ${args}`;
  const result = spawnSync('/bin/bash', ['-c', cmd], {
    encoding: 'utf8',
    env: { ...process.env, CAIRN_TEST_SNAPSHOT: snapshot },
  });
  return { status: result.status, stderr: result.stderr };
}

interface TempRepoEnv {
  workdir: string;
  bareRemote: string;
  cleanup: () => void;
}

function initTempRepoWithBareRemote(): TempRepoEnv {
  const tmp = mkdtempSync(join(tmpdir(), 'cairn-atomic-race-'));
  const workdir = join(tmp, 'work');
  const bareRemote = join(tmp, 'origin.git');
  mkdirSync(workdir);
  execFileSync('git', ['init', '--bare', '-b', 'main', bareRemote]);
  execFileSync('git', ['init', '-b', 'main', workdir]);
  execFileSync('git', ['-C', workdir, 'config', 'user.email', 'test@example.com']);
  execFileSync('git', ['-C', workdir, 'config', 'user.name', 'Cairn Test']);
  execFileSync('git', ['-C', workdir, 'config', 'commit.gpgsign', 'false']);
  execFileSync('git', ['-C', workdir, 'remote', 'add', 'origin', bareRemote]);
  execFileSync('git', ['-C', workdir, 'commit', '--allow-empty', '-m', 'seed']);
  execFileSync('git', ['-C', workdir, 'push', 'origin', 'main']);
  return {
    workdir,
    bareRemote,
    cleanup: () => rmSync(tmp, { recursive: true, force: true }),
  };
}

describe('probe-mbf-pcacc-02 — cairn-atomic-commit.sh race detection', () => {
  describe('cairn_detect_race (function-level)', () => {
    it('P1 — all pathspecs staged → returns 0', () => {
      const snapshot = 'A  foo.txt\nA  bar.txt\n';
      const { status, stderr } = callDetectRace(snapshot, ['foo.txt', 'bar.txt']);
      expect(status, `stderr=${stderr}`).toBe(0);
    });

    it('P2 — missing pathspec → returns 1 + diagnostic', () => {
      const snapshot = 'A  foo.txt\n';
      const { status, stderr } = callDetectRace(snapshot, ['foo.txt', 'bar.txt']);
      expect(status).toBe(1);
      expect(stderr).toMatch(/race detected.*bar\.txt/i);
    });

    it('P3 — empty pathspec list → returns 0', () => {
      const { status } = callDetectRace('', []);
      expect(status).toBe(0);
    });

    it('P4 — handles renamed-path lines (R  old -> new)', () => {
      const snapshot = 'R  oldname.txt -> newname.txt\n';
      const { status } = callDetectRace(snapshot, ['newname.txt']);
      expect(status).toBe(0);

      // Old name should NOT match (it was renamed away)
      const r2 = callDetectRace(snapshot, ['oldname.txt']);
      expect(r2.status).toBe(1);
    });
  });

  describe('integration: race simulation via CAIRN_ATOMIC_TEST_RACE_HOOK', () => {
    let env: TempRepoEnv;
    beforeEach(() => {
      env = initTempRepoWithBareRemote();
    });
    afterEach(() => {
      env.cleanup();
    });

    it('P5 — transient race: hook un-stages once → retry re-adds → exit 0 + "retry succeeded"', () => {
      writeFileSync(join(env.workdir, 'hello.txt'), 'hello world\n');
      // One-shot hook: un-stage then unset the env var so retry's add survives.
      const hook = `git rm --cached hello.txt >/dev/null 2>&1; unset CAIRN_ATOMIC_TEST_RACE_HOOK`;
      const result = spawnSync(
        '/bin/bash',
        [SCRIPT_PATH, '--no-push', 'hello.txt', '--', 'transient race test'],
        {
          cwd: env.workdir,
          encoding: 'utf8',
          env: { ...process.env, CAIRN_ATOMIC_TEST_RACE_HOOK: hook },
        },
      );
      expect(
        result.status,
        `exit=${result.status} stderr=${result.stderr} stdout=${result.stdout}`,
      ).toBe(0);
      expect(result.stderr).toMatch(/race detected/i);
      expect(result.stderr).toMatch(/retry succeeded/i);
      const log = execFileSync(
        'git',
        ['-C', env.workdir, 'log', '-1', '--pretty=%s'],
        { encoding: 'utf8' },
      ).trim();
      expect(log).toBe('transient race test');
    });

    it('P6 — persistent race: hook deletes working-tree file → retry cannot re-add → exit non-zero + clear error', () => {
      writeFileSync(join(env.workdir, 'hello.txt'), 'hello world\n');
      // Sticky hook: remove working-tree file so retry's `git add` fails to find it.
      const hook = `git rm --cached hello.txt >/dev/null 2>&1; rm -f hello.txt`;
      const result = spawnSync(
        '/bin/bash',
        [SCRIPT_PATH, '--no-push', 'hello.txt', '--', 'persistent race test'],
        {
          cwd: env.workdir,
          encoding: 'utf8',
          env: { ...process.env, CAIRN_ATOMIC_TEST_RACE_HOOK: hook },
        },
      );
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/race detected/i);
      // No commit should have landed
      const log = execFileSync(
        'git',
        ['-C', env.workdir, 'log', '-1', '--pretty=%s'],
        { encoding: 'utf8' },
      ).trim();
      expect(log).toBe('seed');
    });

    it('P7 — cross-shell: zsh-invoked script completes happy-path identically (Q-ATOMIC-4)', () => {
      const zshCheck = spawnSync('which', ['zsh'], { encoding: 'utf8' });
      if (zshCheck.status !== 0) {
        // zsh unavailable on this host — skip rather than fail. Operator system has zsh per CLAUDE.md.
        return;
      }
      writeFileSync(join(env.workdir, 'zsh-hello.txt'), 'hello from zsh\n');
      const result = spawnSync(
        'zsh',
        [
          '-c',
          `"${SCRIPT_PATH}" --no-push zsh-hello.txt -- "zsh self-exec happy path"`,
        ],
        { cwd: env.workdir, encoding: 'utf8' },
      );
      expect(
        result.status,
        `exit=${result.status} stderr=${result.stderr} stdout=${result.stdout}`,
      ).toBe(0);
      const log = execFileSync(
        'git',
        ['-C', env.workdir, 'log', '-1', '--pretty=%s'],
        { encoding: 'utf8' },
      ).trim();
      expect(log).toBe('zsh self-exec happy path');
    });
  });
});
