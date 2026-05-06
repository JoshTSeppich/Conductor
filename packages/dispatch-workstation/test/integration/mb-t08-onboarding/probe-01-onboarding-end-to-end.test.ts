// MB-T08 / Probe 1 — onboarding flow end-to-end (two-spawn cycle).
//
// Closes gap §4.1 #3 from docs/probe-coverage-gap-analysis-2026-05-05.md:
// MB-T08 onboarding stdin handlers + sentinels are wired in main.ts but
// no probe drives the full path. T17 dogfood test was the operator's
// only safety net against cleared-userData regressions.
//
// Probe shape (per Phase 1 diagnose §3.2 + zipper-2/splitter-persists.test.ts
// two-spawn cycle pattern):
//
// Spawn 1 (clean userData + clean state-dir):
//   1. Wait ONBOARDING_REQUIRED sentinel (main.ts:311 — fires IFF
//      checkFirstLaunch returns true; under MB_TEST_HOOKS=1 the smoke
//      path is taken instead of the production runOnboardingIfNeeded
//      modal call).
//   2. Drive ONBOARDING_NEXT stdin → wait ONBOARDING_STEP_API_KEY echo
//      (main.ts:513-518; renderer-internal advance is a no-op echo
//      under the smoke path).
//   3. Drive ONBOARDING_API_KEY <synthetic-key> stdin → wait
//      ONBOARDING_API_KEY_SAVED (main.ts:520-531; saveApiKey writes
//      safeStorage-encrypted ciphertext to <configDir>/anthropic-api-
//      key.enc).
//   4. Drive ONBOARDING_DONE stdin → wait ONBOARDING_COMPLETE
//      (main.ts:532-536; markOnboardingComplete writes
//      {onboardingCompleted: true} to <configDir>/workstation-config.json).
//   5. Read workstation-config.json from disk and assert
//      onboardingCompleted === true.
//   6. Quit cleanly with exit code 0.
//
// Spawn 2 (same MB_ONBOARDING_STATE_DIR + MB_USER_DATA_DIR):
//   1. Wait ONBOARDING_READY sentinel (main.ts:432-433 — fires after
//      createWindow returns regardless of first-launch state).
//   2. Negative-evidence: ONBOARDING_REQUIRED must NOT appear in stdout
//      between spawn-start and ONBOARDING_READY arrival. If it does,
//      the first-launch detector did not honor the persisted
//      onboardingCompleted state — a regression in the gate logic.
//   3. Quit cleanly with exit code 0.
//
// KNOWN: the smoke-harness path (MB_TEST_HOOKS=1 short-circuit at
// main.ts:307-319) bypasses the BrowserWindow modal mount entirely;
// the stdin handlers invoke saveApiKey + markOnboardingComplete
// directly. Persistence behavior is identical from the on-disk
// standpoint; the renderer-side React mount is exercised separately
// by test/unit/mb-t08/ (19 specs).
//
// MODELED: safeStorage.encrypt on darwin under MB_TEST_HOOKS=1 + tmpdir
// userDataDir works without a keychain prompt — verified empirically
// by fix-84 probe-03 (safeStorage roundtrip) under the same envelope.
//
// SPECULATIVE: nothing — every link is direct.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

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
    child.once('exit', (code, signal) => {
      const m = buf().match(pattern);
      clearInterval(timer);
      clearTimeout(deadline);
      if (m) resolveP(m);
      else
        rejectP(
          new Error(
            `child exited (code=${code}, signal=${signal}) before ` +
              `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}; ` +
              `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
          ),
        );
    });
  });
}

async function quitChild(child: ChildProcess): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  child.stdin?.write('QUIT\n');
  return new Promise((resolveP) => {
    const t = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      resolveP({ code: null, signal: 'SIGKILL' });
    }, 10_000);
    child.once('exit', (code, signal) => {
      clearTimeout(t);
      resolveP({ code, signal });
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('MB-T08 / Probe 1 — onboarding flow end-to-end', () => {
  itDarwin(
    'two-spawn cycle: clean state → drive flow → workstation-config.json persists → second spawn skips gate',
    async () => {
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);
      expect(
        existsSync(ELECTRON_BIN),
        `expected ${ELECTRON_BIN}; run pnpm install`,
      ).toBe(true);

      // CLEAN tmpdirs — no onboardingCompleted state seeded; this is the
      // first-launch path. MB_USER_DATA_DIR isolates Electron's userData
      // away from operator's real install. MB_ONBOARDING_STATE_DIR
      // isolates the onboarding config away from ~/Library/Application
      // Support default per main.ts:233 configDir().
      const onbDir = mkdtempSync(join(tmpdir(), 'mb-t08-probe-01-onb-'));
      const userDataDir = mkdtempSync(join(tmpdir(), 'mb-t08-probe-01-userdata-'));

      try {
        // === SPAWN 1: clean state → drive onboarding ===
        const h1 = spawnWorkstation({
          MB_ONBOARDING_STATE_DIR: onbDir,
          MB_USER_DATA_DIR: userDataDir,
        });
        try {
          // Step 1: ONBOARDING_REQUIRED fires IFF checkFirstLaunch returns
          // true (config absent or onboardingCompleted !== true). Empty
          // tmpdir → no config → first-launch.
          await awaitSentinel(
            h1.stdoutBuffer,
            /^ONBOARDING_REQUIRED$/m,
            30_000,
            h1.child,
            h1.stderrBuffer,
          );

          // Step 2: ONBOARDING_NEXT → ONBOARDING_STEP_API_KEY echo. Under
          // smoke path the step-2 advance is a no-op echo so the harness
          // command sequence stays symmetric (main.ts:513-518 comment).
          h1.child.stdin?.write('ONBOARDING_NEXT\n');
          await awaitSentinel(
            h1.stdoutBuffer,
            /^ONBOARDING_STEP_API_KEY$/m,
            5_000,
            h1.child,
            h1.stderrBuffer,
          );

          // Step 3: ONBOARDING_API_KEY <synthetic> → ONBOARDING_API_KEY_SAVED.
          // saveApiKey calls safeStorage.encrypt and writes ciphertext to
          // <configDir>/anthropic-api-key.enc. Synthetic key — never a
          // real Anthropic key; no API call is made; no auth ever
          // succeeds with this value.
          const syntheticKey =
            'sk-ant-api03-PROBE-MB-T08-DO-NOT-USE-' + Date.now().toString(36);
          h1.child.stdin?.write(`ONBOARDING_API_KEY ${syntheticKey}\n`);
          await awaitSentinel(
            h1.stdoutBuffer,
            /^ONBOARDING_API_KEY_SAVED$/m,
            10_000,
            h1.child,
            h1.stderrBuffer,
          );

          // Step 4: ONBOARDING_DONE → ONBOARDING_COMPLETE. markOnboardingComplete
          // writes {onboardingCompleted: true} to workstation-config.json.
          h1.child.stdin?.write('ONBOARDING_DONE\n');
          await awaitSentinel(
            h1.stdoutBuffer,
            /^ONBOARDING_COMPLETE$/m,
            5_000,
            h1.child,
            h1.stderrBuffer,
          );

          // Step 5: assert config persisted on disk.
          const configPath = join(onbDir, 'workstation-config.json');
          expect(
            existsSync(configPath),
            `expected ${configPath} to be written by markOnboardingComplete; ` +
              `dir contents may surface why if missing`,
          ).toBe(true);
          const configRaw = readFileSync(configPath, 'utf8');
          const config = JSON.parse(configRaw) as { onboardingCompleted?: unknown };
          expect(
            config.onboardingCompleted,
            `expected onboardingCompleted: true in ${configPath}; got ${configRaw}`,
          ).toBe(true);

          // Defense-in-depth: api-key ciphertext written. Length-only
          // assertion (never echoes the key value).
          const apiKeyPath = join(onbDir, 'anthropic-api-key.enc');
          expect(
            existsSync(apiKeyPath),
            `expected ${apiKeyPath} to be written by saveApiKey`,
          ).toBe(true);

          // Step 6: clean quit.
          const exit1 = await quitChild(h1.child);
          expect(
            exit1.code,
            `spawn 1 exit code; code=${exit1.code}, signal=${exit1.signal}, ` +
              `stderr=${JSON.stringify(h1.stderrBuffer().slice(-500))}`,
          ).toBe(0);
        } catch (e) {
          if (!h1.child.killed) h1.child.kill('SIGKILL');
          throw e;
        }

        // === SPAWN 2: same dirs → assert ONBOARDING_READY without prior ONBOARDING_REQUIRED ===
        const h2 = spawnWorkstation({
          MB_ONBOARDING_STATE_DIR: onbDir,
          MB_USER_DATA_DIR: userDataDir,
        });
        try {
          // Step 1: wait for the post-createWindow sentinel which fires
          // regardless of first-launch state.
          await awaitSentinel(
            h2.stdoutBuffer,
            /^ONBOARDING_READY$/m,
            30_000,
            h2.child,
            h2.stderrBuffer,
          );

          // Step 2: negative-evidence — buffer up to ONBOARDING_READY must
          // NOT contain ONBOARDING_REQUIRED. Per main.ts:307-319 the
          // sentinel only fires when checkFirstLaunch returns true; with
          // workstation-config.json already carrying onboardingCompleted:
          // true, the gate must short-circuit silently.
          const stdoutAtReady = h2.stdoutBuffer();
          const hasOnboardingRequired =
            /^ONBOARDING_REQUIRED$/m.test(stdoutAtReady);
          expect(
            hasOnboardingRequired,
            `ONBOARDING_REQUIRED appeared in spawn-2 stdout despite ` +
              `workstation-config.json having onboardingCompleted: true. ` +
              `The first-launch detector did not honor the persisted ` +
              `state. stdout=${JSON.stringify(stdoutAtReady.slice(-1500))}`,
          ).toBe(false);

          // Step 3: clean quit.
          const exit2 = await quitChild(h2.child);
          expect(
            exit2.code,
            `spawn 2 exit code; code=${exit2.code}, signal=${exit2.signal}, ` +
              `stderr=${JSON.stringify(h2.stderrBuffer().slice(-500))}`,
          ).toBe(0);
        } catch (e) {
          if (!h2.child.killed) h2.child.kill('SIGKILL');
          throw e;
        }
      } finally {
        try {
          rmSync(onbDir, { recursive: true, force: true });
        } catch {
          /* best-effort */
        }
        try {
          rmSync(userDataDir, { recursive: true, force: true });
        } catch {
          /* best-effort */
        }
      }
    },
    120_000,
  );
});
