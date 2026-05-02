// COARCH-T04 Red cluster 2 — Build-doc reader + git resolution.
// Verifies: readBuildDoc() returns content + SHA; throws BuildDocReadError on missing
// file or nonexistent repo; detects HEAD change on re-read.
//
// RED state: src/coarchitect/build-doc-reader.ts absent → import fails → FAIL.
// GREEN state: readBuildDoc implemented → all 4 tests PASS.
//
// Testing mechanism: vitest unit test with tmp git repos (no Electron).
// Per ratified P-0.5-Q8.1.c: Workstation main process performs git reads directly
// using `git -C <repo_root> rev-parse HEAD` + readFileSync.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readBuildDoc, BuildDocReadError } from '../../../src/coarchitect/build-doc-reader.js';

let tmpRepo: string;

beforeEach(() => {
  tmpRepo = mkdtempSync(join(tmpdir(), 'coarch-t04-'));
  execSync('git init', { cwd: tmpRepo });
  execSync('git config user.email "test@test.com"', { cwd: tmpRepo });
  execSync('git config user.name "Test"', { cwd: tmpRepo });
});

afterEach(() => {
  rmSync(tmpRepo, { recursive: true, force: true });
});

describe('COARCH-T04 cluster 2: build-doc reader', () => {
  it('reads HEAD content and current SHA for a tracked file', async () => {
    const content = '---\nschema_version: "1.0"\n---\n# My Build Doc';
    writeFileSync(join(tmpRepo, 'plan.build.md'), content, 'utf8');
    execSync('git add plan.build.md', { cwd: tmpRepo });
    execSync('git commit -m "add build doc"', { cwd: tmpRepo });

    const result = await readBuildDoc(tmpRepo, 'plan.build.md');
    expect(result.content).toBe(content);
    expect(result.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(result.repoRoot).toBe(tmpRepo);
    expect(result.relativePath).toBe('plan.build.md');
  });

  it('throws BuildDocReadError when relative_path does not exist in repo', async () => {
    // Need at least one commit so HEAD exists
    writeFileSync(join(tmpRepo, 'README.md'), 'hello', 'utf8');
    execSync('git add README.md', { cwd: tmpRepo });
    execSync('git commit -m "init"', { cwd: tmpRepo });

    await expect(readBuildDoc(tmpRepo, 'nonexistent.build.md')).rejects.toThrow(BuildDocReadError);
  });

  it('throws BuildDocReadError when repo_root does not exist', async () => {
    await expect(readBuildDoc('/nonexistent/repo/path', 'plan.build.md')).rejects.toThrow(
      BuildDocReadError,
    );
  });

  it('returns updated SHA after a new commit changes HEAD', async () => {
    writeFileSync(join(tmpRepo, 'plan.build.md'), 'v1 content', 'utf8');
    execSync('git add plan.build.md', { cwd: tmpRepo });
    execSync('git commit -m "v1"', { cwd: tmpRepo });

    const first = await readBuildDoc(tmpRepo, 'plan.build.md');

    writeFileSync(join(tmpRepo, 'plan.build.md'), 'v2 content', 'utf8');
    execSync('git add plan.build.md', { cwd: tmpRepo });
    execSync('git commit -m "v2"', { cwd: tmpRepo });

    const second = await readBuildDoc(tmpRepo, 'plan.build.md');
    expect(second.sha).not.toBe(first.sha);
    expect(second.content).toBe('v2 content');
  });
});
