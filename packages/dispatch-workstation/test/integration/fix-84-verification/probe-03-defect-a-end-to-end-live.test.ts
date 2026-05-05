// Fix-84 / Probe 3 — Defect A end-to-end live (encrypted-key bootstrap).
//
// Cairn finding #84 Defect A / Fix-A resolution: with the
// safeStorage-persisted ANTHROPIC_API_KEY ciphertext on disk and
// process.env.ANTHROPIC_API_KEY UNSET, `bootstrapApiKey` decrypts
// and assigns to env at app-ready, before chat IPC handler
// registration. Chat sends now succeed (STREAM_DONE) where they
// previously failed (STREAM_ERROR auth_error).
//
// This probe encodes that resolution-section live verification as a
// permanent regression test using a TWO-BOOT pattern:
//
//   Boot 1 (seed): MB_USER_DATA_DIR=tmpdir, MB_TEST_HOOKS=1,
//     onboardingCompleted=false, ANTHROPIC_API_KEY UNSET. Drive
//     ONBOARDING_API_KEY <real key> via stdin → main.ts handler
//     calls saveApiKey() → encrypted ciphertext persists at
//     <tmpdir>/anthropic-api-key.enc. QUIT.
//
//   Boot 2 (verify): same MB_USER_DATA_DIR (so ciphertext is found),
//     onboardingCompleted=true (skip onboarding), ANTHROPIC_API_KEY
//     UNSET, CONDUCTOR_DOGFOOD_API_KEY UNSET (the real key MUST
//     come from safeStorage, not from env leakage). Drive
//     TYPE_AND_SEND <prompt>; await STREAM_DONE (NOT STREAM_ERROR
//     auth_error).
//
// Auto-skip-with-MANUAL pattern (per operator arbitration): probe
// requires a real Anthropic API key. Skip with loud reason if
// neither $CONDUCTOR_DOGFOOD_API_KEY nor $ANTHROPIC_API_KEY is set
// in the test runner's environment.
//
// DEFENSE-IN-DEPTH: the helper NEVER echoes the key value. Length
// + sha256-prefix only. The plaintext key is passed via stdin (not
// logged), and the saved ciphertext is asserted by length-only
// (not by content read-back). Hygiene mirrors probe-92 token
// handling.
//
// MODELED: real Anthropic network call. Probe authenticates against
// the live API; a transient network failure or rate-limit would
// produce STREAM_ERROR with code != 'auth_error' — diagnostic
// distinct from the regression class.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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
            // safe slice — stdin (which carries the key) is not in stdout/stderr
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

interface BootOpts {
  userDataDir: string;
  onbDir: string;
  envApiKey?: string;
  envDogfoodApiKey?: string;
}

function spawnElectron(opts: BootOpts): {
  child: ChildProcess;
  stdoutBuffer: () => string;
  stderrBuffer: () => string;
} {
  let stdout = '';
  let stderr = '';
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
    MB_TEST_HOOKS: '1',
    MB_USER_DATA_DIR: opts.userDataDir,
    MB_ONBOARDING_STATE_DIR: opts.onbDir,
    // Daemon unreachable — probe asserts the chat path; daemon-side
    // history fetch returns [] on failure (HttpDaemonClient is
    // graceful), and we don't need build-doc / orchestrator path here.
    FOXWORKS_DAEMON_URL: 'http://127.0.0.1:1',
    FOXWORKS_DAEMON_WS_URL: 'ws://127.0.0.1:1',
  };
  // Explicit env-set/unset (don't leak parent env's value).
  if (opts.envApiKey === undefined) delete env.ANTHROPIC_API_KEY;
  else env.ANTHROPIC_API_KEY = opts.envApiKey;
  if (opts.envDogfoodApiKey === undefined) delete env.CONDUCTOR_DOGFOOD_API_KEY;
  else env.CONDUCTOR_DOGFOOD_API_KEY = opts.envDogfoodApiKey;

  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
  });
  child.stdout?.on('data', (d: Buffer) => {
    stdout += d.toString();
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });
  return { child, stdoutBuffer: () => stdout, stderrBuffer: () => stderr };
}

async function quitChild(child: ChildProcess): Promise<void> {
  try {
    child.stdin?.write('QUIT\n');
  } catch {
    /* may already be closing */
  }
  await new Promise<void>((r) => {
    const t = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
      r();
    }, 10_000);
    child.once('exit', () => {
      clearTimeout(t);
      r();
    });
  });
}

function findRealApiKey(): { key?: string; reason: string } {
  // Prefer the dogfood-scoped key per finding #84 resolution doc.
  const dogfood = process.env.CONDUCTOR_DOGFOOD_API_KEY;
  if (dogfood && dogfood.length > 0) return { key: dogfood, reason: 'CONDUCTOR_DOGFOOD_API_KEY' };
  const anth = process.env.ANTHROPIC_API_KEY;
  if (anth && anth.length > 0) return { key: anth, reason: 'ANTHROPIC_API_KEY' };
  return {
    reason:
      'neither CONDUCTOR_DOGFOOD_API_KEY nor ANTHROPIC_API_KEY set in test runner env; re-run with one for KNOWN evidence',
  };
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-84 / Probe 3 — Defect A end-to-end live (safeStorage seed → bootstrap → chat)', () => {
  itDarwin(
    'two-boot pattern: seed ciphertext via ONBOARDING_API_KEY, then verify chat STREAM_DONE without env bypass',
    async (ctx) => {
      const keyLookup = findRealApiKey();
      if (!keyLookup.key) {
        ctx.skip(`SKIPPED: ${keyLookup.reason}`);
        return;
      }
      const realKey = keyLookup.key;
      // Hygiene compute (never echoed): record key length + sha256
      // prefix for diagnostic surface only. These primitives are
      // safe to log if the probe needs to surface them in failure
      // messages (length is the only thing the test asserts about).
      const keyLen = realKey.length;
      const keySha8 = createHash('sha256').update(realKey).digest('hex').slice(0, 8);
      // Defense-in-depth: ensure the constructed length / hash do not
      // accidentally embed the value. Trip if the probe is later
      // edited to log the key directly.
      expect(keyLen).toBeGreaterThan(20); // realistic Anthropic key length floor
      expect(keySha8).toMatch(/^[0-9a-f]{8}$/);

      expect(existsSync(MAIN_JS), `expected ${MAIN_JS}`).toBe(true);

      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-03-userdata-'));
      const onbDir = mkdtempSync(join(tmpdir(), 'fix-84-probe-03-onb-'));
      // Boot 1 onboarding-required state (drives ONBOARDING_API_KEY
      // stdin handler).
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: false }),
        'utf8',
      );

      try {
        // ─── Boot 1: seed safeStorage ciphertext ──────────────────────
        const seed = spawnElectron({
          userDataDir,
          onbDir,
          // Both env vars UNSET inside the seeding boot so the persisted
          // key MUST come from the stdin drive, not env leakage.
        });
        try {
          // ONBOARDING_REQUIRED fires under MB_TEST_HOOKS when
          // onboardingCompleted=false (per main.ts onboarding mount).
          await awaitSentinel(
            seed.stdoutBuffer,
            /^ONBOARDING_REQUIRED$/m,
            30_000,
            seed.child,
            seed.stderrBuffer,
          );
          // Drive saveApiKey via stdin. The plaintext is NEVER echoed
          // to test-output; child stdout/stderr capture does not
          // include stdin bytes by default.
          seed.child.stdin?.write(`ONBOARDING_API_KEY ${realKey}\n`);
          await awaitSentinel(
            seed.stdoutBuffer,
            /^ONBOARDING_API_KEY_SAVED$/m,
            10_000,
            seed.child,
            seed.stderrBuffer,
          );
          // Mark onboarding complete so Boot 2 skips re-onboarding.
          seed.child.stdin?.write('ONBOARDING_DONE\n');
          await awaitSentinel(
            seed.stdoutBuffer,
            /^ONBOARDING_COMPLETE$/m,
            10_000,
            seed.child,
            seed.stderrBuffer,
          );
        } finally {
          await quitChild(seed.child);
        }

        // ─── Verify ciphertext on disk (length-only; no value read) ───
        const cipherPath = join(userDataDir, 'anthropic-api-key.enc');
        expect(
          existsSync(cipherPath),
          `expected encrypted key at ${cipherPath} after Boot 1 seed`,
        ).toBe(true);
        const cipherBytes = statSync(cipherPath).size;
        // Defense-in-depth: cipher length floor proves an actual encrypt
        // happened (safeStorage adds prefix bytes; an empty file or
        // plain plaintext would suggest a regression). We do NOT read
        // ciphertext bytes — length only.
        expect(
          cipherBytes,
          `expected non-trivial cipher length; got ${cipherBytes} bytes`,
        ).toBeGreaterThan(20);
        // Also: cipher length must NOT equal plaintext length — that
        // would suggest plaintext escaped. safeStorage prepends a
        // platform-specific tag (e.g. 'v10'/'v11' on macOS keychain
        // path) so cipher ≠ plain by construction.
        expect(cipherBytes, 'cipher must not equal plaintext byte count').not.toBe(keyLen);

        // ─── Boot 2: verify bootstrap → chat → STREAM_DONE ────────────
        // Switch onboardingCompleted=true so Boot 2 skips ONBOARDING_
        // REQUIRED entirely.
        writeFileSync(
          join(onbDir, 'workstation-config.json'),
          JSON.stringify({ onboardingCompleted: true }),
          'utf8',
        );
        const verify = spawnElectron({
          userDataDir,
          onbDir,
          // Both env vars UNSET — bootstrap MUST decrypt safeStorage
          // for the chat path to authenticate. Any other source of
          // the key (env leakage, hard-coded fallback) would invalidate
          // the test premise.
        });
        try {
          await awaitSentinel(
            verify.stdoutBuffer,
            /^ONBOARDING_READY$/m,
            30_000,
            verify.child,
            verify.stderrBuffer,
          );
          await awaitSentinel(
            verify.stdoutBuffer,
            /^SHELL_READY$/m,
            30_000,
            verify.child,
            verify.stderrBuffer,
          );
          // Drive a minimal chat send. With Defect A fixed, bootstrap
          // populated process.env.ANTHROPIC_API_KEY → anthropic-client
          // creates a real client → STREAM_DONE arrives. Without the
          // fix, anthropic-client returns null → STREAM_ERROR auth_error.
          verify.child.stdin?.write('TYPE_AND_SEND say hi briefly\n');
          // Give the network roundtrip time. Anthropic responses are
          // typically 1-3s; allow 25s for cold-network hosts.
          const doneOrError = await Promise.race([
            awaitSentinel(
              verify.stdoutBuffer,
              /^STREAM_DONE /m,
              25_000,
              verify.child,
              verify.stderrBuffer,
            ).then((m) => ({ kind: 'done' as const, match: m })),
            awaitSentinel(
              verify.stdoutBuffer,
              /^STREAM_ERROR (\w+)$/m,
              25_000,
              verify.child,
              verify.stderrBuffer,
            ).then((m) => ({ kind: 'error' as const, match: m })),
          ]);

          const diag =
            `kind=${doneOrError.kind}; ` +
            `match=${JSON.stringify(doneOrError.match[0])}; ` +
            // safe: stdin (which carries the key) is not in stdout
            `stdout=${JSON.stringify(verify.stdoutBuffer().slice(-1500))}; ` +
            `stderr=${JSON.stringify(verify.stderrBuffer().slice(-1500))}; ` +
            `keyLen=${keyLen} keySha8=${keySha8}`;

          // KNOWN: STREAM_DONE means the entire chain (bootstrap →
          // env populated → anthropic-client → real network call)
          // succeeded. Auth would have failed BEFORE the network call
          // (anthropic-client.ts:91-98 short-circuits on null env).
          expect(doneOrError.kind, diag).toBe('done');

          // Insurance — if STREAM_ERROR somehow won the race AFTER
          // STREAM_DONE landed, surface it. This shouldn't fire under
          // normal circumstances because Promise.race resolves on the
          // first match.
          if (doneOrError.kind === 'error') {
            // KNOWN-negative: error code must NOT be 'auth_error'.
            // 'auth_error' specifically is the pre-fix-84 symptom.
            // Any other STREAM_ERROR (network, rate-limit) is a
            // distinct class — still a probe failure but with
            // diagnostic distinguishability.
            expect(doneOrError.match[1], `pre-fix-84 regression: ${diag}`).not.toBe('auth_error');
          }
        } finally {
          await quitChild(verify.child);
        }
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
    180_000,
  );
});
