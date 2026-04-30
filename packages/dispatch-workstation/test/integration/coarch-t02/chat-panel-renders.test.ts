// COARCH-T02 Red criterion (V3_TICKETS.md L165): "test_chat_panel_renders.spec.ts"
// Verifies: React ChatPanel mounts in a sandboxed Electron renderer and emits
// the RENDER_OK sentinel within 15 s.
//
// RED state: dist/coarchitect/chat-panel.html absent (renderer not built yet) →
// existsSync pre-check fails → FAIL.
// GREEN state: esbuild bundle built, chat-panel.html copied → Electron loads HTML
// → React mounts → RENDER_OK emitted via console.log → fixture forwards to stdout
// → test asserts RENDER_OK → PASS.
//
// Testing mechanism: Electron-spawned renderer per MB-S04 ADR spawn-and-observe
// primitives (option b, §5.8). jsdom is not installed in this workspace (§8.8
// forbids pnpm install); Electron-spawned renderer is the only viable approach.
// Fixture: test/integration/coarch-t02/coarch-t02-fixture.mjs
// MB-S05 ADR K5/K6: console-message sentinel uses Event-object form (event.message).
// Build-before-test: run `node scripts/build-coarchitect.mjs &&
//   pnpm --filter dispatch-workstation build` first.
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

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function awaitStdoutSentinel(
  child: ChildProcess,
  sentinel: string,
  timeoutMs: number,
  stderrAcc: () => string,
): Promise<{ buffer: string }> {
  return new Promise((res, rej) => {
    let buffer = '';
    const onData = (d: Buffer) => {
      buffer += d.toString();
      if (buffer.includes(sentinel)) {
        child.stdout?.off('data', onData);
        clearTimeout(timer);
        res({ buffer });
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      child.stdout?.off('data', onData);
      clearTimeout(timer);
      rej(
        new Error(
          `child exited before "${sentinel}": code=${code}, signal=${signal}, ` +
            `stdout="${buffer}", stderr="${stderrAcc()}"`,
        ),
      );
    };
    const timer = setTimeout(() => {
      child.stdout?.off('data', onData);
      child.off('exit', onExit);
      rej(
        new Error(
          `timeout waiting for "${sentinel}" after ${timeoutMs}ms; ` +
            `stdout="${buffer}", stderr="${stderrAcc()}"`,
        ),
      );
    }, timeoutMs);
    child.stdout?.on('data', onData);
    child.once('exit', onExit);
  });
}

function awaitExit(child: ChildProcess, timeoutMs: number): Promise<ExitInfo> {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      rej(new Error(`timeout waiting for exit after ${timeoutMs}ms`));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      res({ code, signal });
    });
  });
}

describe('COARCH-T02: chat panel renders', () => {
  it(
    'React ChatPanel mounts in sandboxed Electron renderer and emits RENDER_OK sentinel',
    async () => {
      expect(
        existsSync(CHAT_HTML),
        `dist/coarchitect/chat-panel.html not found — run \`node scripts/build-coarchitect.mjs\` first. ` +
          `If source files do not exist yet, this is the expected RED state.`,
      ).toBe(true);

      const child = spawn(ELECTRON_BIN, [FIXTURE_MJS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
      });

      let stderr = '';
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitStdoutSentinel(child, SENTINEL_RENDER_OK, 15_000, () => stderr);
        child.stdin?.write('QUIT\n');
        const exitInfo = await awaitExit(child, 10_000);
        expect(
          exitInfo.code,
          `expected exit code 0; code=${exitInfo.code}, signal=${exitInfo.signal}, stderr="${stderr.slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      }
    },
    30_000,
  );
});
