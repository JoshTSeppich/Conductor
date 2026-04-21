/**
 * FD-T08 — integration tests for `fd send`.
 *
 * Uses a real tmux session `fd-t08-<pid>` so parallel vitest workers do
 * not collide. Each test gets its own temp workDir, registryPath, and
 * archiveRoot, so per-test state is isolated. The tmux session is
 * shared across tests (cheap, idempotent — `cat` just keeps reading).
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runSend } from '../../src/commands/send.js';
import { readRegistry } from '../../src/registry/read.js';
import { writeRegistry } from '../../src/registry/write.js';
import { capturePane } from '../../src/transport/tmux.js';
import { HANDOFF_FOOTER } from '../../src/prompt/footer.js';
import type { Registry } from '../../src/registry/schema.js';

const execFileP = promisify(execFile);
const SESSION = `fd-t08-${process.pid}`;
const TARGET = `${SESSION}:0.0`;

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileP('tmux', args);
  return stdout;
}
async function killSession(): Promise<void> {
  try { await tmux('kill-session', '-t', SESSION); } catch {}
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeRegistry(target: string, workDir: string): Registry {
  return {
    version: 1,
    sessions: {
      testname: {
        cwd: workDir,
        tmux_target: target,
        handoff_path: join(workDir, 'HANDOFF.md'),
        last_prompt_sent_at: null,
        last_handoff_pulled_at: null,
      },
    },
  };
}

describe('runSend (integration, real tmux)', () => {
  let workDir: string;
  let registryPath: string;
  let archiveTmp: string;
  let promptFile: string;

  beforeAll(async () => {
    await killSession();
    await tmux('new-session', '-d', '-s', SESSION, '-x', '200', '-y', '50', 'cat');
    await sleep(250);
  }, 15_000);

  afterAll(async () => {
    await killSession();
  });

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'fd-t08-'));
    registryPath = join(workDir, 'sessions.json');
    archiveTmp = join(workDir, 'archive');
    promptFile = join(workDir, 'prompt.md');
    await writeFile(promptFile, 'my prompt body', 'utf8');
    await writeRegistry(registryPath, makeRegistry(TARGET, workDir));
  });

  afterEach(async () => {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('delivers the prompt (with footer appended) to the pane', async () => {
    await runSend({ name: 'testname', promptFile, registryPath, archiveRoot: archiveTmp });
    await sleep(300);
    const pane = await capturePane(TARGET);
    expect(pane).toContain('my prompt body');
    // HANDOFF_FOOTER is multi-line; assert a stable substring.
    expect(pane).toContain('At phase end, write your hand-off note');
  });

  it('does not duplicate the footer when the prompt already contains it', async () => {
    const preFooted = `main instruction\n\n${HANDOFF_FOOTER}`;
    await writeFile(promptFile, preFooted, 'utf8');
    await runSend({ name: 'testname', promptFile, registryPath, archiveRoot: archiveTmp });

    const sessionArchive = join(archiveTmp, 'testname');
    const files = await readdir(sessionArchive);
    expect(files).toHaveLength(1);
    const archived = await readFile(join(sessionArchive, files[0]), 'utf8');
    // The archived file should contain the footer exactly once.
    const occurrences = archived.split(HANDOFF_FOOTER).length - 1;
    expect(occurrences).toBe(1);
  });

  it('errors cleanly when the name is not in the registry', async () => {
    await expect(
      runSend({ name: 'nonexistent', promptFile, registryPath, archiveRoot: archiveTmp }),
    ).rejects.toThrow(/no session registered as "nonexistent"/);
  });

  it('errors cleanly when the tmux target is not running (no silent success)', async () => {
    // Overwrite the registry with a target that points at a nonexistent session.
    await writeRegistry(
      registryPath,
      makeRegistry('fd-does-not-exist-xyz:0.0', workDir),
    );
    await expect(
      runSend({ name: 'testname', promptFile, registryPath, archiveRoot: archiveTmp }),
    ).rejects.toThrow(/not currently running|not running/i);
    // Ensure the error message names the specific missing target.
    await expect(
      runSend({ name: 'testname', promptFile, registryPath, archiveRoot: archiveTmp }),
    ).rejects.toThrow(/fd-does-not-exist-xyz:0\.0/);
  });

  it('updates last_prompt_sent_at after a successful send', async () => {
    const fixedNow = new Date('2026-04-21T13:00:00.000Z');
    await runSend({
      name: 'testname',
      promptFile,
      registryPath,
      archiveRoot: archiveTmp,
      now: fixedNow,
    });
    const registry = await readRegistry(registryPath);
    expect(registry.sessions.testname.last_prompt_sent_at).toBe(fixedNow.toISOString());
  });

  it('archives the assembled prompt under <archiveRoot>/<name>/<ts>.prompt.md', async () => {
    const fixedNow = new Date('2026-04-21T13:00:00.000Z');
    await runSend({
      name: 'testname',
      promptFile,
      registryPath,
      archiveRoot: archiveTmp,
      now: fixedNow,
    });
    const sessionArchive = join(archiveTmp, 'testname');
    const files = await readdir(sessionArchive);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/\.prompt\.md$/);
    // ISO-8601 with colons replaced by dashes so the filename is safe.
    expect(files[0]).toContain('2026-04-21T13-00-00');
    const archived = await readFile(join(sessionArchive, files[0]), 'utf8');
    expect(archived).toContain('my prompt body');
    expect(archived).toContain(HANDOFF_FOOTER);
  });
});
