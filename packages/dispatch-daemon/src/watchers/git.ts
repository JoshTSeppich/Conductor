/**
 * Git log watcher per DAEMON-T14.
 *
 * Watches <cwd>/.git/refs/heads/ for ref changes (S02 §3.4 +
 * tradeoff #4). On a non-`.lock` filename event, shells out
 * to `git -C <cwd> log -1 --format='%h %s' <branch>` to
 * acquire short SHA + commit subject (arbitrations 3a + 3b),
 * and forwards {sha, subject, branch} to onCommit.
 *
 * The S02 spike characterized the event burst per commit:
 * `main.lock` → `main` → `main.lock` (release) → `main`
 * (perms). The lock filter + manager debounce coalesce to
 * a single emit per logical commit.
 *
 * Failure handling (per arbitration 4):
 *   - fs.watch construction errors (missing .git/refs/heads,
 *     non-git cwd) → warn-log + no-op watcher (arbitration
 *     1B). close() is safe; onCommit never fires.
 *   - git log shell-out failure → warn-log + skip emit. Don't
 *     emit malformed events; §5.3 shape requires non-null
 *     fields. The next ref change will retry.
 *
 * Slash-bearing branch names (e.g., `feature/foo`) are out of
 * scope per arbitration 2A (flat branches only); recursive
 * watch was rejected by S02 tradeoff #1 as macOS-fragile.
 * File DAEMON-F-git-recursive-branches as Tier-2 followup if
 * non-cairn workflows surface real demand.
 */

import { execFile } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export interface GitWatcherOpts {
  /** Session cwd; the watcher binds to <cwd>/.git/refs/heads/. */
  cwd: string;
  /** Called per detected commit with §5.3 commit_landed data
   *  shape. Manager debounces; onCommit may fire multiple
   *  times per logical commit (S02 spike #4) — manager
   *  coalesces. */
  onCommit: (data: { sha: string; subject: string; branch: string }) => void;
  /** Optional logger for warn-log on construction or git-log
   *  failures. Production passes Fastify request.log; tests
   *  may pass a stub or omit. */
  logger?: { warn: (...args: unknown[]) => void };
}

export interface GitWatcherHandle {
  close: () => void;
}

export function createGitWatcher(opts: GitWatcherOpts): GitWatcherHandle {
  const refsDir = join(opts.cwd, '.git', 'refs', 'heads');
  let watcher: FSWatcher | null = null;
  try {
    watcher = watch(
      refsDir,
      { persistent: true, recursive: false },
      (_eventType, filename) => {
        if (!filename) return;
        // S02 #4: filter .lock files; they're git's atomic-write
        // intermediate state, not a settled ref change.
        if (filename.endsWith('.lock')) return;
        const branch = filename;
        void (async () => {
          try {
            const { stdout } = await execFileP(
              'git',
              ['-C', opts.cwd, 'log', '-1', '--format=%h %s', branch],
            );
            const trimmed = stdout.trim();
            if (!trimmed) return;
            const spaceIdx = trimmed.indexOf(' ');
            if (spaceIdx === -1) return;
            const sha = trimmed.slice(0, spaceIdx);
            const subject = trimmed.slice(spaceIdx + 1);
            opts.onCommit({ sha, subject, branch });
          } catch (err) {
            opts.logger?.warn?.(
              { err: (err as Error).message, branch },
              'git log shell-out failed; skipping commit_landed emit per T14 arb 4',
            );
          }
        })();
      },
    );
  } catch (err) {
    // Missing .git/refs/heads (non-git session, fresh init with
    // no commits) or fs.watch unsupported — arb 1B: warn-log +
    // continue. Daemon retains coverage of this session for
    // handoff_written; commit_landed never fires.
    opts.logger?.warn?.(
      { err: (err as Error).message, cwd: opts.cwd },
      'createGitWatcher could not bind .git/refs/heads; commit_landed will not fire for this session per T14 arb 1B',
    );
  }
  return {
    close: () => watcher?.close(),
  };
}
