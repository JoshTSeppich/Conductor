// COARCH-T03 Red criterion — Test 2: SDK streaming response renders in chat-panel.
// Verifies: submitting a message triggers streaming, STREAM_START fires on first chunk,
// STREAM_DONE fires when complete with accumulated content.
//
// RED state: dist/main/anthropic-client.js absent (not built yet) → existsSync fails → FAIL.
// GREEN state: AnthropicChatClient built, IPC streaming wired, MB_MOCK_ANTHROPIC=1 uses
//   mock stream → renderer receives chunks → STREAM_START + STREAM_DONE sentinels fire → PASS.
//
// Testing mechanism: spawn full Electron app (dist/main/main.js) with MB_TEST_HOOKS=1 +
//   MB_MOCK_ANTHROPIC=1 so the mock streaming client returns a canned response without
//   hitting the real Anthropic API. Pattern per MB-S04 ADR spawn-and-sentinel.
//
// Build-before-test: run `pnpm --filter dispatch-workstation build` first.
// Requires: dist/main/main.js + dist/main/anthropic-client.js + dist/coarchitect/renderer.js
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const ANTHROPIC_CLIENT_JS = resolve(PACKAGE_ROOT, 'dist/main/anthropic-client.js');

interface ExitInfo { code: number | null; signal: NodeJS.Signals | null }

function spawnMockApp(): {
  child: ChildProcess;
  waitForSentinel(prefix: string, ms: number): Promise<string>;
  waitForExit(ms: number): Promise<ExitInfo>;
  getStderr(): string;
} {
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      MB_MOCK_ANTHROPIC: '1',
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
  child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

  const waitForSentinel = (prefix: string, timeoutMs: number): Promise<string> =>
    new Promise((res, rej) => {
      const check = () => stdout.split('\n').find((l) => l.startsWith(prefix)) ?? null;
      const found = check();
      if (found) { res(found); return; }
      const onData = () => { const l = check(); if (l) { clearTimeout(t); res(l); } };
      const onExit = (code: number | null, sig: NodeJS.Signals | null) => {
        clearTimeout(t);
        rej(new Error(`child exited before "${prefix}": code=${code}, sig=${sig}, stdout="${stdout}", stderr="${stderr}"`));
      };
      const t = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(new Error(`timeout(${timeoutMs}ms) for "${prefix}"; stdout="${stdout}", stderr="${stderr.slice(0, 300)}"`));
      }, timeoutMs);
      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });

  const waitForExit = (ms: number): Promise<ExitInfo> =>
    new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`exit timeout ${ms}ms`)), ms);
      child.once('exit', (code, signal) => { clearTimeout(t); res({ code, signal }); });
    });

  return { child, waitForSentinel, waitForExit, getStderr: () => stderr };
}

describe('COARCH-T03: streaming response renders in chat-panel', () => {
  it(
    'mock Anthropic stream fires STREAM_START then STREAM_DONE after TYPE_AND_SEND',
    async () => {
      expect(
        existsSync(ANTHROPIC_CLIENT_JS),
        `dist/main/anthropic-client.js not found — run \`pnpm --filter dispatch-workstation build\` first. ` +
          `This is the expected RED state before COARCH-T03 GREEN implementation.`,
      ).toBe(true);

      const h = spawnMockApp();

      try {
        await h.waitForSentinel('WINDOW_READY', 15_000);
        await h.waitForSentinel('SHELL_READY', 10_000);
        await h.waitForSentinel('RENDER_OK', 10_000);

        const testMsg = 'hello from coarch-t03 streaming test';
        h.child.stdin?.write(`TYPE_AND_SEND ${testMsg}\n`);

        await h.waitForSentinel('STREAM_START', 10_000);
        const doneLine = await h.waitForSentinel('STREAM_DONE ', 15_000);
        expect(
          doneLine.length,
          `STREAM_DONE should contain content preview; got: "${doneLine}"`,
        ).toBeGreaterThan('STREAM_DONE '.length);

        h.child.stdin?.write('QUIT\n');
        const exit = await h.waitForExit(10_000);
        expect(
          exit.code,
          `expected exit 0; code=${exit.code}, signal=${exit.signal}, stderr="${h.getStderr().slice(0, 300)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h.child.killed) h.child.kill('SIGKILL');
        throw e;
      }
    },
    60_000,
  );
});
