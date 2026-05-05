// Fix-84 / Probe 2 — Defect A bootstrap reachable + idempotent when env set.
//
// Cairn finding #84 Defect A / Fix-A resolution invariant: when
// `process.env.ANTHROPIC_API_KEY` is already populated (developer
// shell parity), `bootstrapApiKey` is a no-op — shell value wins.
// The unit test at `test/unit/fix-orchestrator-flow/test_api_key
// _bootstrap.spec.ts` covers this deterministically at the seam
// level (`env-precedence` case per Fix-A resolution doc).
//
// This probe complements the unit test by asserting two things the
// unit test cannot:
//   (a) The runtime path runs at all — `bootstrapApiKey` is reached
//       inside `app.whenReady()` (no exception, no boot stall).
//   (b) When env is pre-set + no ciphertext is on disk, the boot
//       does not surface a STREAM_ERROR auth_error or any other
//       boot-time renderer error related to api-key load (a
//       regression that broke env-precedence would propagate to
//       boot-time UX in production).
//
// Note: directly reading `process.env.ANTHROPIC_API_KEY` from the
// running Electron child would require a stdin SHELL_EVAL hook
// (>50 LOC observability infrastructure; halt-condition territory).
// The unit test already covers value-preservation deterministically;
// probe runtime adds the "actually reachable in production lifecycle"
// signal that the unit test cannot.
//
// MODELED: ANTHROPIC_API_KEY=fake bytes won't pass an Anthropic
// auth roundtrip if a chat send fires. The probe avoids triggering
// chat — the boot lifecycle alone is the assertion surface.
//
// Pattern reference: probe-82-02 (Electron boot + stdin sentinel
// awaits + tmpdir userData isolation).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

function awaitSentinel(
  buf: () => string,
  pattern: RegExp,
  timeoutMs: number,
  child: ChildProcess,
  errBuf: () => string,
): Promise<RegExpMatchArray> {
  return new Promise((resolveP, rejectP) => {
    const timer = setInterval(() => {
      const m = buf().match(pattern);
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
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
    child.once('exit', () => {
      clearInterval(timer);
      clearTimeout(deadline);
      rejectP(new Error('child exited before sentinel'));
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-84 / Probe 2 — Defect A bootstrap reachable + idempotent', () => {
  itDarwin(
    'app boots cleanly with ANTHROPIC_API_KEY pre-set + empty userData (no ciphertext); no auth_error during boot',
    async () => {
      expect(existsSync(MAIN_JS), `expected ${MAIN_JS}`).toBe(true);

      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-02-userdata-'));
      const onbDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-02-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      // KNOWN-precondition: userDataDir contains no anthropic-api-key.enc.
      // bootstrapApiKey will read process.env value first (precedence
      // guard), find it set, and return immediately without touching
      // safeStorage. We assert the userDataDir is empty before boot to
      // pin this premise.
      const preBootContents = readdirSync(userDataDir);
      expect(
        preBootContents.includes('anthropic-api-key.enc'),
        'precondition: empty userData (no encrypted api key)',
      ).toBe(false);

      const PRESET_KEY =
        'probe-84-02-fake-precedence-key-not-real-do-not-use';

      let stdout = '';
      let stderr = '';
      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
          MB_TEST_HOOKS: '1',
          MB_USER_DATA_DIR: userDataDir,
          MB_ONBOARDING_STATE_DIR: onbDir,
          // Pre-set: shell-env precedence path. bootstrapApiKey must
          // see this and short-circuit without throwing.
          ANTHROPIC_API_KEY: PRESET_KEY,
          // No daemon needed for this probe; if Fix-C tries to fetch
          // sessions, point at unreachable so it fails silently.
          FOXWORKS_DAEMON_URL: 'http://127.0.0.1:1',
          FOXWORKS_DAEMON_WS_URL: 'ws://127.0.0.1:1',
        },
      });
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        // KNOWN: ONBOARDING_READY fires at the END of app.whenReady()
        // .then(...) — AFTER bootstrapApiKey runs. Observation of this
        // sentinel proves bootstrapApiKey returned without throwing
        // even when env is pre-set + no ciphertext on disk.
        await awaitSentinel(
          () => stdout,
          /^ONBOARDING_READY$/m,
          30_000,
          child,
          () => stderr,
        );
        // Boot-settle window so any deferred boot-time renderer error
        // has a chance to fire. STREAM_ERROR / auth_error during boot
        // would indicate either bootstrap clobbered env or a chat
        // request fired without our drive (regression class).
        await new Promise<void>((r) => setTimeout(r, 1500));
        const diag =
          `stdout=${JSON.stringify(stdout.slice(-1500))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-1500))}`;
        expect(stdout, diag).not.toMatch(/STREAM_ERROR auth_error/);
        // KNOWN-negative: no chat-related sentinels at all should have
        // fired during boot. Probe doesn't drive TYPE_AND_SEND.
        expect(stdout, diag).not.toMatch(/^STREAM_START$/m);
        expect(stdout, diag).not.toMatch(/^STREAM_DONE /m);

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
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      } finally {
        for (const dir of [onbDir, userDataDir]) {
          try {
            rmSync(dir, { recursive: true, force: true });
          } catch {
            /* best-effort */
          }
        }
      }
    },
    90_000,
  );
});
