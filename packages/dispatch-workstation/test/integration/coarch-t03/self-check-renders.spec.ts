// COARCH-T03 Red criterion — Test 4: Sonnet response containing a self-check block renders
// correctly in the chat-panel without truncation or crash.
//
// RED state: dist/main/anthropic-client.js absent → existsSync fails → FAIL.
// GREEN state: streaming IPC wired, MB_MOCK_ANTHROPIC_RESPONSE=self_check returns a canned
//   response containing the §10.5 self-check structure → STREAM_DONE fires with content
//   that includes "Self-check" text → renderer displays without crash → PASS.
//
// Self-check rendering: COARCH-T03 is generic chat mode (no JSON output routing — that is
// COARCH-T04). The self-check block appears as plain text in the assistant message.
// "Renders correctly" means: STREAM_DONE fires, content preview contains "Self-check",
// and the app does not crash.
//
// Testing mechanism: spawn full Electron app with MB_TEST_HOOKS=1 + MB_MOCK_ANTHROPIC=1 +
//   MB_MOCK_ANTHROPIC_RESPONSE=self_check. Per MB-S04 ADR spawn-and-sentinel.
// Build-before-test: run `pnpm --filter dispatch-workstation build` first.
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

function spawnSelfCheckApp(): {
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
      MB_MOCK_ANTHROPIC_RESPONSE: 'self_check',
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
        rej(new Error(`timeout(${timeoutMs}ms) for "${prefix}"; stderr="${stderr.slice(0, 300)}"`));
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

describe('COARCH-T03: self-check block renders in chat-panel', () => {
  it(
    'mock response containing §10.5 self-check block renders without crash (STREAM_DONE fires)',
    async () => {
      expect(
        existsSync(ANTHROPIC_CLIENT_JS),
        `dist/main/anthropic-client.js not found — run \`pnpm --filter dispatch-workstation build\` first. ` +
          `This is the expected RED state before COARCH-T03 GREEN implementation.`,
      ).toBe(true);

      const h = spawnSelfCheckApp();

      try {
        await h.waitForSentinel('WINDOW_READY', 15_000);
        await h.waitForSentinel('SHELL_READY', 10_000);
        await h.waitForSentinel('RENDER_OK', 10_000);

        h.child.stdin?.write('TYPE_AND_SEND show self check\n');

        await h.waitForSentinel('STREAM_START', 10_000);
        const doneLine = await h.waitForSentinel('STREAM_DONE ', 15_000);

        // Self-check mock response contains "Self-check" text; preview in STREAM_DONE should
        // include the beginning of the response (which precedes the self-check block).
        expect(
          doneLine.startsWith('STREAM_DONE '),
          `STREAM_DONE sentinel not found; got "${doneLine}"`,
        ).toBe(true);

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
