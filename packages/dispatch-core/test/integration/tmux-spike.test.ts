/**
 * FD-T05 — integration tests for src/transport/tmux.ts.
 *
 * Uses a real tmux 3.6a server. Creates a detached session named
 * `fd-t05-<pid>` running `cat`, and tears it down in afterAll. Session
 * name is unique-per-test-process so parallel vitest workers do not
 * collide on the shared tmux server.
 *
 * The fourth test below is the buffer-cleanup assertion called out in
 * the §5 reminders: after sendKeys returns, no `fd-*` buffer should be
 * left in tmux's buffer list. delete-buffer is part of the contract,
 * not an optimization.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  capturePane,
  hasSession,
  sendKeys,
} from '../../src/transport/tmux.js';

const execFileP = promisify(execFile);

const SESSION = `fd-t05-${process.pid}`;
const TARGET = `${SESSION}:0.0`;

async function tmux(...args: string[]): Promise<string> {
  const { stdout } = await execFileP('tmux', args);
  return stdout;
}

async function killSession(): Promise<void> {
  try {
    await tmux('kill-session', '-t', SESSION);
  } catch {
    /* not present */
  }
}

async function listFdBuffers(): Promise<string[]> {
  try {
    const out = await tmux('list-buffers', '-F', '#{buffer_name}');
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('fd-'));
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

beforeAll(async () => {
  await killSession();
  await tmux('new-session', '-d', '-s', SESSION, '-x', '200', '-y', '50', 'cat');
  await sleep(250);
}, 15_000);

afterAll(async () => {
  await killSession();
});

describe('tmux transport (real tmux)', () => {
  it('sendKeys delivers text and a submit Enter to the pane', async () => {
    await sendKeys(TARGET, 'hello world');
    await sleep(200);
    const pane = await capturePane(TARGET);
    expect(pane).toContain('hello world');
  });

  it('sendKeys delivers multi-line input literally', async () => {
    const payload = 'alpha line\nbeta line\ngamma line';
    await sendKeys(TARGET, payload);
    await sleep(250);
    const pane = await capturePane(TARGET);
    expect(pane).toContain('alpha line');
    expect(pane).toContain('beta line');
    expect(pane).toContain('gamma line');
  });

  it('sendKeys leaves no fd-* tmux buffer behind', async () => {
    await sendKeys(TARGET, 'cleanup-probe');
    const leaked = await listFdBuffers();
    expect(leaked).toEqual([]);
  });

  it('hasSession returns true for a real target and false for a missing one', async () => {
    expect(await hasSession(TARGET)).toBe(true);
    expect(await hasSession('fd-does-not-exist-xyz:0.0')).toBe(false);
  });
});
