// MB-T04 Red criterion (V3_TICKETS.md L132): "test_spawn_modal_emits_intent.spec.ts"
// Verifies: filling the spawn modal (repo path + session name) and clicking
// [Spawn] fires an IPC event 'workstation:spawn-requested' on the main process
// with payload shape {repoPath: string, sessionName: string}.
//
// The IPC roundtrip is observed via SPAWN_REQUESTED <json> sentinel emitted
// from the MAIN PROCESS handler (NOT the renderer), proving the IPC actually
// crossed the bridge. The handler echoes the received payload as JSON to
// stdout under MB_TEST_HOOKS=1.
//
// RED state: workstation-shell.html has no spawn modal markup; preload has
// no workstationBridge; main.ts registers no 'workstation:spawn-requested'
// listener. Stdin commands fail to find DOM elements / no handler emits the
// sentinel → waitForSentinel times out → FAIL.
//
// GREEN state: shell HTML modal markup wired to preload bridge, preload sends
// ipcRenderer.send('workstation:spawn-requested', payload), main process
// listener receives the payload and (under MB_TEST_HOOKS=1) writes
// `SPAWN_REQUESTED <json>\n` to stdout → test parses + asserts → PASS.
//
// Payload shape contract (MB-T04 minimum, per WORKSTATION_CONTRACT.md §3.3
// "spawn-new-session" target = repo path + session name; initial prompt is
// optional and out-of-scope for MB-T04):
//   { repoPath: string, sessionName: string }
//
// Stdin commands (MB_TEST_HOOKS=1):
//   CLICK_SPAWN_BUTTON — opens modal
//   FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName> — fills inputs + clicks Spawn
//   QUIT — deterministic exit
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const SHELL_HTML = resolve(PACKAGE_ROOT, 'dist/main/workstation-shell.html');
const PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');

const SENTINEL_SPAWN_REQUESTED = 'SPAWN_REQUESTED ';

interface ExitInfo {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface SpawnHandle {
  child: ChildProcess;
  waitForSentinel(s: string, ms: number): Promise<string>;
  waitForExit(ms: number): Promise<ExitInfo>;
  getStderr(): string;
}

function spawnApp(): SpawnHandle {
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
    },
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  function waitForSentinel(prefix: string, timeoutMs: number): Promise<string> {
    return new Promise((res, rej) => {
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
      const onExit = (code: number | null, sig: NodeJS.Signals | null) => {
        clearTimeout(timer);
        rej(
          new Error(
            `child exited before "${prefix}": code=${code}, sig=${sig}, stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      };
      const timer = setTimeout(() => {
        child.stdout?.off('data', onData);
        child.off('exit', onExit);
        rej(
          new Error(
            `timeout(${timeoutMs}ms) waiting for "${prefix}"; stdout="${stdout}", stderr="${stderr}"`,
          ),
        );
      }, timeoutMs);
      child.stdout?.on('data', onData);
      child.once('exit', onExit);
    });
  }

  function waitForExit(timeoutMs: number): Promise<ExitInfo> {
    return new Promise((res, rej) => {
      const timer = setTimeout(
        () => rej(new Error(`timeout waiting for exit after ${timeoutMs}ms`)),
        timeoutMs,
      );
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        res({ code, signal });
      });
    });
  }

  return { child, waitForSentinel, waitForExit, getStderr: () => stderr };
}

describe('MB-T04: spawn modal emits workstation:spawn-requested IPC intent', () => {
  it(
    'fills modal with repo + session name, clicks Spawn, IPC fires with correct payload',
    async () => {
      expect(
        existsSync(SHELL_HTML),
        `dist/main/workstation-shell.html not found — run \`pnpm --filter dispatch-workstation build\` first.`,
      ).toBe(true);
      expect(
        existsSync(PRELOAD_CJS),
        `dist/main/preload.cjs not found — run build first.`,
      ).toBe(true);

      const h = spawnApp();

      try {
        await h.waitForSentinel('WINDOW_READY', 15_000);
        await h.waitForSentinel('SHELL_READY', 10_000);

        h.child.stdin?.write('CLICK_SPAWN_BUTTON\n');
        await h.waitForSentinel('SPAWN_MODAL_OPENED', 10_000);

        const repoPath = '/tmp/mb-t04-test-repo';
        const sessionName = 'mb-t04-test-session';
        h.child.stdin?.write(`FILL_AND_SUBMIT_SPAWN ${repoPath}|${sessionName}\n`);

        const sentinelLine = await h.waitForSentinel(SENTINEL_SPAWN_REQUESTED, 10_000);
        const jsonStr = sentinelLine.slice(SENTINEL_SPAWN_REQUESTED.length).trim();

        let payload: unknown;
        try {
          payload = JSON.parse(jsonStr);
        } catch (e) {
          throw new Error(
            `SPAWN_REQUESTED payload not valid JSON: "${jsonStr}" — error: ${(e as Error).message}`,
          );
        }

        expect(
          payload,
          `payload should be an object: ${JSON.stringify(payload)}`,
        ).toBeTypeOf('object');
        expect(payload).not.toBeNull();
        const p = payload as Record<string, unknown>;
        expect(p.repoPath, 'payload.repoPath should match input').toBe(repoPath);
        expect(p.sessionName, 'payload.sessionName should match input').toBe(sessionName);

        h.child.stdin?.write('QUIT\n');
        const exit = await h.waitForExit(10_000);
        expect(
          exit.code,
          `expected exit code 0; code=${exit.code}, signal=${exit.signal}, stderr="${h.getStderr().slice(0, 500)}"`,
        ).toBe(0);
      } catch (e) {
        if (!h.child.killed) h.child.kill('SIGKILL');
        throw e;
      }
    },
    45_000,
  );
});
