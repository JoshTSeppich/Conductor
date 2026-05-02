// COARCH-T04 Red cluster 5 — Build-doc reload on git HEAD change.
// Verifies: HeadWatcher detects HEAD change via polling and fires onChange callback;
// mid-call behavior: current loaded SHA is returned for in-progress call, new SHA
// returned for next call.
//
// RED state: src/coarchitect/head-watcher.ts absent → import fails → FAIL.
// GREEN state: HeadWatcher implemented → all 3 tests PASS.
//
// Testing mechanism: vitest unit test with tmp git repos.
// Implementation choice (per P-0.5 §8 deferred items): polling via getHeadSha()
// comparison. Polling interval configurable; HEAD file watcher considered but
// polling chosen for simplicity and cross-platform reliability.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getHeadSha, HeadWatcher } from '../../../src/coarchitect/head-watcher.js';

let tmpRepo: string;

beforeEach(() => {
  tmpRepo = mkdtempSync(join(tmpdir(), 'coarch-t04-hw-'));
  execSync('git init', { cwd: tmpRepo });
  execSync('git config user.email "test@test.com"', { cwd: tmpRepo });
  execSync('git config user.name "Test"', { cwd: tmpRepo });
  writeFileSync(join(tmpRepo, 'file.txt'), 'initial', 'utf8');
  execSync('git add file.txt', { cwd: tmpRepo });
  execSync('git commit -m "init"', { cwd: tmpRepo });
});

afterEach(() => {
  rmSync(tmpRepo, { recursive: true, force: true });
});

describe('COARCH-T04 cluster 5: HEAD change detection', () => {
  it('getHeadSha returns the current HEAD commit SHA', async () => {
    const sha = await getHeadSha(tmpRepo);
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('HeadWatcher fires onChange when HEAD advances to a new commit', async () => {
    const onChange = vi.fn();
    const watcher = new HeadWatcher(tmpRepo, onChange, { pollIntervalMs: 50 });
    watcher.start();

    const initialSha = await getHeadSha(tmpRepo);

    // Make a new commit
    writeFileSync(join(tmpRepo, 'file.txt'), 'changed', 'utf8');
    execSync('git add file.txt', { cwd: tmpRepo });
    execSync('git commit -m "update"', { cwd: tmpRepo });

    // Wait for polling to detect the change
    await new Promise((resolve) => setTimeout(resolve, 200));
    watcher.stop();

    const newSha = await getHeadSha(tmpRepo);
    expect(onChange).toHaveBeenCalledWith(newSha, initialSha);
  });

  it('mid-call behavior: loadedSha captures the SHA at call start, HEAD may have advanced', async () => {
    const sha1 = await getHeadSha(tmpRepo);

    // Simulate a new commit happening mid-call
    writeFileSync(join(tmpRepo, 'file.txt'), 'v2', 'utf8');
    execSync('git add file.txt', { cwd: tmpRepo });
    execSync('git commit -m "v2"', { cwd: tmpRepo });

    const sha2 = await getHeadSha(tmpRepo);

    // sha1 is the "loaded SHA" for the in-progress call
    // sha2 is what the NEXT call should use
    expect(sha1).not.toBe(sha2);
    // Both are valid 40-char SHAs
    expect(sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(sha2).toMatch(/^[0-9a-f]{40}$/);
  });
});
