/**
 * §C0 / §1.3 — the "e2e loop test gates v1 exit".
 *
 * Chains the one-sentence test in §2.1 end-to-end against a real tmux
 * pane: init -> send -> operator writes HANDOFF.md -> pull -> status.
 *
 * Everything runs against real code: real registry writes to a temp
 * dir, real tmux session with `cat` as the pane process, real
 * capture-pane to prove the prompt landed, real fs archive writes.
 *
 * Only pbcopy is swapped (via runPull's `clipboard` option) so the
 * suite doesn't clobber the developer's real clipboard on every run.
 * The clipboard contract is already covered under mocks in FD-T09
 * test 6; here we only need to confirm the payload is what we'd send.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { runInit } from '../../src/commands/init.js';
import { runSend } from '../../src/commands/send.js';
import { runPull } from '../../src/commands/pull.js';
import { readRegistry } from 'dispatch-core/src/registry/read.js';
import { capturePane } from 'dispatch-core/src/transport/tmux.js';
import { loadRows } from '../../src/commands/status.js';

const execFileP = promisify(execFile);
const SESSION = `fd-e2e-${process.pid}`;
const TARGET = `${SESSION}:0.0`;

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileP('tmux', args);
  return stdout;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function sink(): { stream: Writable; chunks: string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  return { stream, chunks };
}

describe('e2e full loop: init -> send -> pull -> status (real tmux)', () => {
  let workDir: string;
  let registryPath: string;
  let archiveRoot: string;
  let promptFile: string;
  let handoffPath: string;

  beforeAll(async () => {
    try {
      await tmux('kill-session', '-t', SESSION);
    } catch {
      /* session wasn't there, fine */
    }
    await tmux('new-session', '-d', '-s', SESSION, '-x', '200', '-y', '50', 'cat');
    await sleep(250);

    workDir = await mkdtemp(join(tmpdir(), 'fd-e2e-'));
    registryPath = join(workDir, 'sessions.json');
    archiveRoot = join(workDir, 'archive');
    promptFile = join(workDir, 'prompt.md');
    handoffPath = join(workDir, 'HANDOFF.md');
  }, 15_000);

  afterAll(async () => {
    try {
      await tmux('kill-session', '-t', SESSION);
    } catch {
      /* already gone */
    }
    if (workDir) await rm(workDir, { recursive: true, force: true });
  });

  it('walks the §2.1 one-sentence loop and keeps registry + archive + state coherent', async () => {
    // ---- 1. init: register a brand-new session --------------------------
    await runInit({ name: 'e2e', cwd: workDir, target: TARGET, registryPath });

    let reg = await readRegistry(registryPath);
    expect(reg.sessions.e2e).toBeDefined();
    expect(reg.sessions.e2e.tmux_target).toBe(TARGET);
    expect(reg.sessions.e2e.handoff_path).toBe(handoffPath);
    expect(reg.sessions.e2e.last_prompt_sent_at).toBeNull();
    expect(reg.sessions.e2e.last_handoff_pulled_at).toBeNull();

    // Status derivation before any send: last_prompt_sent_at is null -> idle.
    const rowsAfterInit = await loadRows(registryPath);
    const rowInit = rowsAfterInit.find((r) => r.name === 'e2e');
    expect(rowInit).toBeDefined();
    expect(rowInit!.state).toBe('idle');
    expect(rowInit!.target).toBe(TARGET);

    // ---- 2. send: prompt lands in the pane ------------------------------
    const promptBody = 'e2e task: ship v1 end-to-end';
    await writeFile(promptFile, promptBody, 'utf8');
    const sendAt = new Date('2026-04-21T13:00:00.000Z');
    await runSend({ name: 'e2e', promptFile, registryPath, archiveRoot, now: sendAt });
    await sleep(300);

    const pane = await capturePane(TARGET);
    expect(pane).toContain(promptBody);
    expect(pane).toContain('At phase end, write your hand-off note');

    const sessionArchive = join(archiveRoot, 'e2e');
    const postSendArchive = await readdir(sessionArchive);
    expect(postSendArchive.some((f) => f.endsWith('.prompt.md'))).toBe(true);

    reg = await readRegistry(registryPath);
    expect(reg.sessions.e2e.last_prompt_sent_at).toBe(sendAt.toISOString());
    expect(reg.sessions.e2e.last_handoff_pulled_at).toBeNull();

    // ---- 3. operator writes HANDOFF.md in the session's cwd -------------
    const handoffContent = 'v1 shipped; tests green; see archive/ for prompt history.';
    await writeFile(handoffPath, handoffContent, 'utf8');

    // ---- 4. pull: stdout + clipboard + archive + registry ---------------
    const pullAt = new Date('2026-04-21T13:05:00.000Z');
    const clipboardPayloads: string[] = [];
    const { stream: stdout, chunks: stdoutChunks } = sink();
    const { stream: stderr, chunks: stderrChunks } = sink();

    await runPull({
      name: 'e2e',
      registryPath,
      archiveRoot,
      now: pullAt,
      stdout,
      stderr,
      clipboard: async (c) => {
        clipboardPayloads.push(c);
      },
    });

    expect(stdoutChunks.join('')).toBe(handoffContent);
    expect(clipboardPayloads).toEqual([handoffContent]);
    // handoff was written after the prompt was sent, so no stale warning.
    expect(stderrChunks.join('')).toBe('');

    const postPullArchive = await readdir(sessionArchive);
    expect(postPullArchive.some((f) => f.endsWith('.handoff.md'))).toBe(true);

    reg = await readRegistry(registryPath);
    expect(reg.sessions.e2e.last_prompt_sent_at).toBe(sendAt.toISOString());
    expect(reg.sessions.e2e.last_handoff_pulled_at).toBe(pullAt.toISOString());

    // ---- 5. status: derives idle because pull landed after send ---------
    const rowsAfterPull = await loadRows(registryPath);
    const rowFinal = rowsAfterPull.find((r) => r.name === 'e2e');
    expect(rowFinal).toBeDefined();
    expect(rowFinal!.state).toBe('idle');
  });
});
