/**
 * DAEMON-T15 — production createStatusWatcher unit test.
 *
 * Mock factory used by integration tests can't exercise the
 * production fs.watch + JSON.parse + Zod-validate path. This
 * unit test covers the production-only behavior the mock
 * skips: missing-cwd graceful no-op (parallel to T13's P5
 * for handoff and T14's P4 for git).
 *
 * Probes (1 total):
 *   P5 createStatusWatcher on a cwd that does not exist →
 *      no throw, returns valid close-able handle, never
 *      invokes onUpdate. Daemon continues for that session
 *      with no test_status_updated coverage; warn-log
 *      surfaces the limitation.
 */

import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStatusWatcher } from '../../src/watchers/status-json.js';

describe('DAEMON-T15 — createStatusWatcher unit', () => {
  it('P5 missing cwd → no throw, close-able handle, no onUpdate fires', async () => {
    // Create a tempdir, then remove it so the path doesn't exist
    // when we hand it to createStatusWatcher.
    const cwd = await mkdtemp(join(tmpdir(), 'fd-t15-removed-'));
    await rm(cwd, { recursive: true, force: true });

    let invocations = 0;
    let handle: { close: () => void } | null = null;
    expect(() => {
      handle = createStatusWatcher({
        cwd,
        onUpdate: () => {
          invocations += 1;
        },
      });
    }).not.toThrow();

    expect(handle).not.toBeNull();
    expect(() => handle!.close()).not.toThrow();

    await new Promise((r) => setTimeout(r, 100));
    expect(invocations).toBe(0);
  });
});
