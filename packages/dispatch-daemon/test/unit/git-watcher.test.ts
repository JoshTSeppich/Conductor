/**
 * DAEMON-T14 — production createGitWatcher unit test.
 *
 * The mock factory used by integration tests doesn't exercise
 * the production fs.watch + git-log shell-out path. This unit
 * test covers the one production-only behavior that integration
 * tests can't reach: arbitration 1B's "missing .git → warn-log
 * + no crash" semantic.
 *
 * Probes (1 total):
 *   P4 createGitWatcher on a cwd whose `.git/refs/heads` does
 *      not exist returns a valid handle (close-able), does not
 *      throw, and never invokes onCommit. Daemon continues for
 *      that session with no commit_landed coverage; logged warn
 *      surfaces the limitation to the operator.
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGitWatcher } from '../../src/watchers/git.js';

describe('DAEMON-T14 — createGitWatcher unit', () => {
  it('P4 missing .git/refs/heads → no throw, returns close-able handle, never invokes onCommit', async () => {
    // Make a tempdir with NO .git/ subtree
    const cwd = await mkdtemp(join(tmpdir(), 'fd-t14-nogit-'));

    let invocations = 0;
    let handle: { close: () => void } | null = null;
    expect(() => {
      handle = createGitWatcher({
        cwd,
        onCommit: () => {
          invocations += 1;
        },
      });
    }).not.toThrow();

    expect(handle).not.toBeNull();
    // Handle is close-able without error even though the watcher
    // never bound to a real fs path.
    expect(() => handle!.close()).not.toThrow();

    // Wait briefly to confirm no onCommit fires (no spurious
    // events). 100ms is generous; FSEvents wouldn't surface
    // anything here regardless because there's nothing to watch.
    await new Promise((r) => setTimeout(r, 100));
    expect(invocations).toBe(0);
  });
});
