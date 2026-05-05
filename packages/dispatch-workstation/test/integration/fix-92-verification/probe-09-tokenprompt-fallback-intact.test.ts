// Probe-92 / Probe 9 — TokenPrompt fallback intact for no-token case.
//
// NEGATIVE-EVIDENCE PROBE. Without this, Fix-92 could appear to "work"
// (probes 4-7 all green) while having broken the genuine TokenPrompt
// fallback for the actual no-token scenario (operator without daemon
// installed). The probe asserts the fallback path is preserved:
//   - IPC handler called with absent token-file path → returns null
//   - preload's typeof+length>0 branch skipped → setItem not called
//   - BOOTSTRAP_TOKEN_WRITTEN does NOT fire
//   - dispatch-web mounts → useAuthBootstrap reads localStorage null
//     (clean userData) → setPhase('prompt') → TokenPrompt MOUNTS
//
// Operator-arbitrated 2026-05-05 (scout-phase Q3, option B): used the
// MB_TEST_HOOKS_DAEMON_TOKEN_PATH env override pointed at a non-
// existent path — no destructive mutation of the operator's real
// ~/.foxworks-dispatch/token. Defense-in-depth: gating helper requires
// MB_TEST_HOOKS=1 AND a non-empty override; verified by 12 unit tests
// in test/unit/probe-92-test-hooks-env/.
//
// KNOWN: readDaemonTokenForBootstrap with a non-existent path returns
// null (test_daemon_token_bootstrap.spec.ts:64-69 pinned this). The
// IPC handler propagates null → preload's branch is skipped.
// KNOWN: TokenPrompt heading text "Conductor authentication" from
// TokenPrompt.tsx:30.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
  return { child, stdoutBuffer: () => stdout, stderrBuffer: () => stderr };
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
          `timeout waiting for ${pattern}; stdout=${JSON.stringify(buf().slice(-1500))}; stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    }, timeoutMs);
    child.once('exit', (code) => {
      const m = buf().match(pattern);
      clearInterval(timer);
      clearTimeout(deadline);
      if (m) resolveP(m);
      else
        rejectP(
          new Error(`child exited code=${code} before ${pattern}; stdout=${JSON.stringify(buf().slice(-1500))}`),
        );
    });
  });
}

async function quitChild(child: ChildProcess): Promise<void> {
  child.stdin?.write('QUIT\n');
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

describe('Probe-92 / Probe 9 — TokenPrompt fallback intact for no-token case', () => {
  it(
    'with no-token path, BOOTSTRAP_TOKEN_WRITTEN does NOT fire AND TokenPrompt IS rendered',
    async () => {
      expect(existsSync(MAIN_JS)).toBe(true);

      // KNOWN: a path that doesn't exist. mkdtempSync gives us a real
      // dir, but we point at a file inside it that we never create.
      // Simpler than constructing a guaranteed-absent absolute path
      // and avoids stomping on /tmp/anything that might exist.
      const fakeTokenDir = mkdtempSync(join(tmpdir(), 'probe-92-09-faketok-'));
      const fakeTokenPath = join(fakeTokenDir, 'absent-token');
      // Sanity: ensure the path really is absent.
      expect(existsSync(fakeTokenPath)).toBe(false);

      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-09-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-09-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
        MB_TEST_HOOKS_DAEMON_TOKEN_PATH: fakeTokenPath,
      });

      try {
        // Wait for SHELL_READY (host page loaded). Can't wait for
        // BOOTSTRAP_TOKEN_WRITTEN — it intentionally won't fire.
        await awaitSentinel(
          stdoutBuffer,
          /^SHELL_READY$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // Settle 2.5s — enough for dispatch-web to mount and
        // useAuthBootstrap to run + reach 'prompt' phase + render
        // TokenPrompt.
        await new Promise((r) => setTimeout(r, 2500));

        // KNOWN-NEGATIVE: BOOTSTRAP_TOKEN_WRITTEN must NOT appear in
        // stdout. If it does, the IPC handler somehow returned a
        // non-null value despite the override pointing at an absent
        // path → either the gating helper failed (defense-in-depth
        // breach) or readDaemonTokenForBootstrap silently fell back
        // to the real path.
        const hasBootstrapSentinel =
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m.test(stdoutBuffer());
        expect(
          hasBootstrapSentinel,
          `BOOTSTRAP_TOKEN_WRITTEN appeared despite override path being ` +
            `absent — gating or fallback broke. stdout=` +
            `${JSON.stringify(stdoutBuffer().slice(-1500))}`,
        ).toBe(false);

        // KNOWN-POSITIVE: TokenPrompt IS rendered. This is the
        // negative-evidence assertion that proves Fix-92 didn't
        // accidentally suppress TokenPrompt for the genuine no-token
        // case.
        const id = 'p9';
        const evalCode =
          `(() => { ` +
          `const headings = Array.from(document.querySelectorAll('h1')); ` +
          `return { hasTokenPromptHeading: headings.some(h => /Conductor authentication/.test(h.textContent || '')) }; ` +
          `})()`;
        child.stdin?.write(`KANBAN_EVAL ${id}|${evalCode}\n`);
        const m = await awaitSentinel(
          stdoutBuffer,
          new RegExp(`^KANBAN_EVAL_RESULT ${id} (.+)$`, 'm'),
          15_000,
          child,
          stderrBuffer,
        );
        const payload = JSON.parse(m[1]) as
          | { ok: true; result: { hasTokenPromptHeading: boolean } }
          | { ok: false; error: string };
        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        expect(
          payload.result.hasTokenPromptHeading,
          `TokenPrompt heading "Conductor authentication" NOT found in ` +
            `kanban DOM despite override pointing at absent token. The ` +
            `fallback UX (operator paste path) is broken.`,
        ).toBe(true);
      } finally {
        await quitChild(child).catch(() => {});
        rmSync(fakeTokenDir, { recursive: true, force: true });
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
