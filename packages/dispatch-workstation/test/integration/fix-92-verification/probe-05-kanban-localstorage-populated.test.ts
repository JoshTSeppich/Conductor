// Probe-92 / Probe 5 — kanban localStorage populated post-launch.
//
// Asserts that after a cold launch, the kanban webview's
// localStorage['x-conductor-token'] contains the token value (proven
// by length + sha256 prefix match against ~/.foxworks-dispatch/token).
//
// Reframed from the original task brief's "wipe leveldb / parse
// leveldb binary" approach (operator-acked 2026-05-05, scout-phase
// Q2). Substituted: webview-side localStorage.getItem via the
// Probe-92 obs-infra KANBAN_EVAL stdin handler. Same KNOWN-evidence
// quality, no binary parser dependency, no destructive leveldb
// mutation of operator state.
//
// Defense-in-depth: the value is NEVER echoed to stdout. The eval
// payload returns { length, sha256_prefix } where sha256_prefix is the
// first 8 hex chars of SHA-256(value). Test compares those two
// integers/strings against the same digest computed in node from the
// disk file. Pure non-leaky evidence.
//
// Cold-launch isolation: MB_USER_DATA_DIR=tmpdir → fresh Electron
// Local Storage (no contention with operator's running app).
//
// KNOWN: localStorage.setItem in card-bridge-preload (Fix-92 region)
// completed → BOOTSTRAP_TOKEN_WRITTEN sentinel fired → therefore
// localStorage.getItem will return the value the preload wrote.
// MODELED: that value matches the disk file (verified by hash).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');

interface SpawnHandle {
  child: ChildProcess;
  stdoutBuffer: () => string;
  stderrBuffer: () => string;
}

function spawnWorkstation(envOverrides: Record<string, string>): SpawnHandle {
  let stdout = '';
  let stderr = '';
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      ...envOverrides,
    },
  });
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });
  return {
    child,
    stdoutBuffer: () => stdout,
    stderrBuffer: () => stderr,
  };
}

function awaitSentinel(
  buf: () => string,
  pattern: RegExp,
  timeoutMs: number,
  child: ChildProcess,
  errBuf: () => string,
): Promise<RegExpMatchArray> {
  return new Promise((resolveP, rejectP) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
      } else if (Date.now() - start > timeoutMs) {
        // deadline handler fires
      }
    }, 50);
    const deadline = setTimeout(() => {
      clearInterval(timer);
      rejectP(
        new Error(
          `timeout waiting for ${pattern} after ${timeoutMs}ms; ` +
            `stdout=${JSON.stringify(buf().slice(-1500))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      const m = buf().match(pattern);
      clearInterval(timer);
      clearTimeout(deadline);
      if (m) {
        resolveP(m);
      } else {
        rejectP(
          new Error(
            `child exited (code=${code}, signal=${signal}) before ` +
              `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}; ` +
              `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
          ),
        );
      }
    });
  });
}

async function quitChild(child: ChildProcess): Promise<void> {
  child.stdin?.write('QUIT\n');
  await new Promise<void>((resolveP) => {
    const t = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      resolveP();
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(t);
      resolveP();
    });
  });
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

describe('Probe-92 / Probe 5 — kanban localStorage populated post-launch', () => {
  it(
    'webview localStorage[x-conductor-token] length + sha256 prefix match disk file',
    async () => {
      expect(existsSync(MAIN_JS)).toBe(true);

      // KNOWN: read the disk file and compute the comparison primitives.
      // Both length and the 8-hex-char SHA-256 prefix are non-secret
      // (length leaks ~6 bits; prefix leaks 32 bits but cannot be
      // inverted without knowing the token charset+structure, and
      // even then matching is exponentially hard). This is the same
      // hash-prefix pattern git commit hashes use for "is this the
      // same content?" identity checks.
      const diskValue = readFileSync(TOKEN_PATH, 'utf8').trim();
      const expectedLength = diskValue.length;
      const expectedHashPrefix = sha256Hex(diskValue).slice(0, 8);

      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-05-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-05-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Wait for the bootstrap to have run before issuing KANBAN_EVAL —
        // BOOTSTRAP_TOKEN_WRITTEN means the preload completed setItem,
        // AND the webview's webContents was captured by the obs-infra
        // forwarder (the same did-attach-webview hook captures the
        // handle for KANBAN_EVAL).
        await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // KANBAN_EVAL payload: read localStorage, hash the value,
        // return { length, sha256_prefix } — never the value itself.
        // Wrapped in async IIFE because crypto.subtle.digest is async;
        // executeJavaScript awaits the returned promise.
        //
        // SINGLE-LINE expression: main.ts's stdin handler is per-line
        // (process.stdin 'data' event + .trim() + regex w/o `s` flag),
        // so multi-line code breaks the protocol. The single-line form
        // is functionally identical.
        const id = 'p5';
        const evalCode =
          `(async () => { ` +
          `const v = localStorage.getItem('x-conductor-token') || ''; ` +
          `const buf = new TextEncoder().encode(v); ` +
          `const hashBuf = await crypto.subtle.digest('SHA-256', buf); ` +
          `const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join(''); ` +
          `return { length: v.length, sha256_prefix: hex.slice(0, 8) }; ` +
          `})()`;
        child.stdin?.write(`KANBAN_EVAL ${id}|${evalCode}\n`);

        const resultMatch = await awaitSentinel(
          stdoutBuffer,
          new RegExp(`^KANBAN_EVAL_RESULT ${id} (.+)$`, 'm'),
          15_000,
          child,
          stderrBuffer,
        );
        const payload = JSON.parse(resultMatch[1]) as
          | { ok: true; result: { length: number; sha256_prefix: string } }
          | { ok: false; error: string };

        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        // KNOWN: length match — proves localStorage contains a string
        // of the same length as the disk file.
        expect(
          payload.result.length,
          `kanban localStorage[x-conductor-token] length=${payload.result.length}, ` +
            `expected ${expectedLength}`,
        ).toBe(expectedLength);

        // MODELED → KNOWN via hash match: 8-hex-char SHA-256 prefix
        // collision is 2^-32 likely. Together with length match, this
        // is effectively certain proof that the localStorage value
        // matches the disk file byte-for-byte.
        expect(
          payload.result.sha256_prefix,
          `kanban localStorage value sha256 prefix mismatch — ` +
            `webview saw a different token than disk`,
        ).toBe(expectedHashPrefix);
      } finally {
        await quitChild(child).catch(() => {});
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
