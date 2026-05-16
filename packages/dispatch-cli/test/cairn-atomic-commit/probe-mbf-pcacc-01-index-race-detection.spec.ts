/**
 * probe-mbf-pcacc-01 — cairn-atomic-commit.sh existence + invocation contract (WB1 RED).
 *
 * Ticket: MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-(β).
 * Session: r12-t1c-w1-parallel-cairn-atomic-commit.
 *
 * File-name slug describes the broad subject area (atomic-commit/index-race
 * testing). Per the WB ladder in /tmp/r12-t1c-w1-parallel-cairn-atomic-commit-dispatch.txt,
 * probe-01 carries the WB1 contract: existence + invocation. Probe-02 (sibling
 * file) carries the WB2 race-detection mechanism.
 *
 * Probes:
 *   P1 — scripts/cairn-atomic-commit.sh exists and is executable
 *   P2 — happy-path E2E: `<pathspec> -- "<msg>"` in a temp repo with a bare
 *        origin remote → exit 0, commit lands on HEAD, push lands on the bare
 *        remote
 *   P3 — invocation guard: missing pathspec → non-zero exit + usage on stderr
 *   P4 — invocation guard: missing message (no `--` block) → non-zero exit
 *
 * The temp-repo + bare-origin construction (no network) means probe runs are
 * fully hermetic. Operator's real `origin` remote is never touched.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
  accessSync,
  constants as fsConstants,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);
// test file lives at packages/dispatch-cli/test/cairn-atomic-commit/ — 4 levels up to repo root.
const REPO_ROOT = resolve(__dirname_local, '../../../../');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'cairn-atomic-commit.sh');

interface TempRepoEnv {
  workdir: string;
  bareRemote: string;
  cleanup: () => void;
}

function initTempRepoWithBareRemote(): TempRepoEnv {
  const tmp = mkdtempSync(join(tmpdir(), 'cairn-atomic-'));
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

describe('probe-mbf-pcacc-01 — cairn-atomic-commit.sh contract', () => {
  it('P1 — script exists and is executable', () => {
    const st = statSync(SCRIPT_PATH);
    expect(st.isFile()).toBe(true);
    accessSync(SCRIPT_PATH, fsConstants.X_OK);
  });

  describe('with temp repo + bare origin', () => {
    let env: TempRepoEnv;
    beforeEach(() => {
      env = initTempRepoWithBareRemote();
    });
    afterEach(() => {
      env.cleanup();
    });

    it('P2 — happy path: pathspec + -- + message → exit 0, commit lands, push lands', () => {
      writeFileSync(join(env.workdir, 'hello.txt'), 'hello world\n');
      const result = spawnSync(
        '/bin/bash',
        [SCRIPT_PATH, 'hello.txt', '--', 'add hello.txt'],
        { cwd: env.workdir, encoding: 'utf8' },
      );
      expect(
        result.status,
        `exit=${result.status} stderr=${result.stderr} stdout=${result.stdout}`,
      ).toBe(0);
      const localLog = execFileSync(
        'git',
        ['-C', env.workdir, 'log', '-1', '--pretty=%s'],
        { encoding: 'utf8' },
      ).trim();
      expect(localLog).toBe('add hello.txt');
      const remoteLog = execFileSync(
        'git',
        ['-C', env.bareRemote, 'log', '-1', '--pretty=%s'],
        { encoding: 'utf8' },
      ).trim();
      expect(remoteLog).toBe('add hello.txt');
    });

    it('P3 — missing pathspec → non-zero exit + usage on stderr', () => {
      const result = spawnSync('/bin/bash', [SCRIPT_PATH, '--', 'no paths'], {
        cwd: env.workdir,
        encoding: 'utf8',
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/at least one pathspec is required/i);
    });

    it('P4 — missing message (no -- block) → non-zero exit', () => {
      writeFileSync(join(env.workdir, 'foo.txt'), 'foo\n');
      const result = spawnSync('/bin/bash', [SCRIPT_PATH, 'foo.txt'], {
        cwd: env.workdir,
        encoding: 'utf8',
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/commit message/i);
    });
  });
});
