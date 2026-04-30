// COARCH-T02 Red criterion (V3_TICKETS.md L165): "test_chat_input_emits_event.spec.ts"
// Verifies: submitting text in ChatPanel calls postMessage on the injected
// DaemonClient, and the component emits a MESSAGE_SENT sentinel.
//
// RED state: dist/coarchitect/chat-panel.html absent → existsSync fails → FAIL.
// GREEN state: fixture spawns Electron with chat-panel.html; test awaits RENDER_OK;
// test sends TYPE_AND_SEND stdin command; fixture fills input + clicks send via
// webContents.executeJavaScript; component's handleSubmit calls
// daemonClient.postMessage (stub); component emits MESSAGE_SENT <content> via
// console.log; fixture forwards via console-message event (K6 form); stdout written;
// test asserts content matches → PASS.
//
// Testing mechanism: Electron-spawned renderer (option b, §5.8). MB-S04 + MB-S05
// ADR primitives. DaemonClient stub is bundled directly into renderer (no bridge);
// Zipper-2 wires the real contextBridge adapter (RESOLUTION-3, Pattern B).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const FIXTURE_MJS = resolve(__dirname, 'coarch-t02-fixture.mjs');
const CHAT_HTML = resolve(PACKAGE_ROOT, 'dist/coarchitect/chat-panel.html');

const SENTINEL_RENDER_OK = 'RENDER_OK';
const SENTINEL_MESSAGE_SENT = 'MESSAGE_SENT ';

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface SpawnHandle {
  child: ChildProcess;
  waitForSentinel(prefix: string, timeoutMs: number): Promise<string>;
  waitForExit(timeoutMs: number): Promise<ExitInfo>;
  getStderr(): string;
}

function spawnFixture(): SpawnHandle {
  const child = spawn(ELECTRON_BIN, [FIXTURE_MJS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  const waitForSentinel = (prefix: string, timeoutMs: number): Promise<string> =>
    new Promise((res, rej) => {
      const check = () => stdout.split('\n').find((l) => l.startsWith(prefix)) ?? null;
      const found = check();
      if (found) {
        res(found);
        return;
      }

      const onData = () => {
        const line = check();
        if (line) {
          clearTimeout(timer);
          res(line);
        }
      };
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(
          new Error(
            `child exited before "${prefix}": code=${code}, signal=${signal}, ` +
              `stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      };
      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(
          new Error(
            `timeout waiting for "${prefix}" after ${timeoutMs}ms; ` +
              `stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      }, timeoutMs);
      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });

  const waitForExit = (timeoutMs: number): Promise<ExitInfo> =>
    new Promise((res, rej) => {
      const timer = setTimeout(() => {
        rej(new Error(`timeout waiting for exit after ${timeoutMs}ms; stderr="${stderr}"`));
      }, timeoutMs);
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        res({ code, signal });
      });
    });

  return { child, waitForSentinel, waitForExit, getStderr: () => stderr };
}

describe('COARCH-T02: chat input emits event', () => {
  it(
    'submitting text in ChatPanel calls postMessage on DaemonClient and emits MESSAGE_SENT sentinel',
    async () => {
      expect(
        existsSync(CHAT_HTML),
        `dist/coarchitect/chat-panel.html not found — run \`node scripts/build-coarchitect.mjs\` first. ` +
          `If source files do not exist yet, this is the expected RED state.`,
      ).toBe(true);

      const h = spawnFixture();

      try {
        await h.waitForSentinel(SENTINEL_RENDER_OK, 15_000);

        const testMsg = 'hello from coarch-t02 test';
        h.child.stdin?.write(`TYPE_AND_SEND ${testMsg}\n`);

        const sentLine = await h.waitForSentinel(SENTINEL_MESSAGE_SENT, 10_000);
        const sentContent = sentLine.slice(SENTINEL_MESSAGE_SENT.length).trim();
        expect(
          sentContent,
          `expected MESSAGE_SENT content="${testMsg}", got="${sentContent}"`,
        ).toBe(testMsg);

        h.child.stdin?.write('QUIT\n');
        const exitInfo = await h.waitForExit(10_000);
        expect(
          exitInfo.code,
          `expected exit code 0; code=${exitInfo.code}, signal=${exitInfo.signal}, stderr="${h.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h.child.killed) h.child.kill('SIGKILL');
        throw e;
      }
    },
    40_000,
  );
});
