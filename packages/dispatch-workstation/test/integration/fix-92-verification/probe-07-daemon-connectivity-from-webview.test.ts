// Probe-92 / Probe 7 — daemon connectivity from inside webview.
//
// Verifies that the bootstrapped token in localStorage is FUNCTIONAL —
// not merely present. Issues a fetch GET /v2/sessions from inside the
// kanban webview (same-origin: the webview is loaded from
// http://localhost:7878 so the path-relative URL hits the daemon)
// using the token from localStorage as the x-conductor-token header.
//
// This is the strongest end-to-end claim Fix-92 can make: the operator
// is connected to a real daemon with real auth using the value Fix-92
// bootstrapped, not just that something looks right in the DOM.
//
// Probe 2 already verified the daemon accepts the operator's disk
// token via node-side fetch. Probe 5 verified the localStorage value
// matches the disk token byte-for-byte. Probe 7 closes the loop:
// webview-origin fetch with localStorage-sourced header succeeds.
// Together: KNOWN end-to-end functionality.
//
// KNOWN: same-origin fetch from the webview to /v2/sessions hits the
// daemon directly (the webview's window.location.origin is the daemon's
// HTTP server because dispatch-web is served by the daemon).
// KNOWN: the daemon response shape is { sessions: [...] } — verified
// against operator's live daemon at probe authoring time and pinned
// by the dispatch-daemon contract.
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
          `timeout waiting for ${pattern} after ${timeoutMs}ms; ` +
            `stdout=${JSON.stringify(buf().slice(-1500))}; stderr=${JSON.stringify(errBuf().slice(-1500))}`,
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
            `child exited (code=${code}, signal=${signal}) before ${pattern}. ` +
              `stdout=${JSON.stringify(buf().slice(-1500))}`,
          ),
        );
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

describe('Probe-92 / Probe 7 — daemon connectivity from inside webview', () => {
  it(
    'webview-side fetch GET /v2/sessions with localStorage token returns 200 + sessions array',
    async () => {
      expect(existsSync(MAIN_JS)).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-07-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-07-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // Single-line eval: same-origin fetch with the localStorage
        // token. Returns shape primitives — never echoes token, never
        // echoes session names (tokens AND session metadata both stay
        // private). Only booleans + status code + array length.
        const id = 'p7';
        const evalCode =
          `(async () => { ` +
          `const token = localStorage.getItem('x-conductor-token') || ''; ` +
          `const res = await fetch('/v2/sessions', { headers: { 'x-conductor-token': token } }); ` +
          `const text = await res.text(); ` +
          `let parsed = null; ` +
          `try { parsed = JSON.parse(text); } catch (e) { /* keep null */ } ` +
          `const sessionsArr = parsed && parsed.sessions; ` +
          `return { status: res.status, isJson: parsed !== null, hasSessionsArray: Array.isArray(sessionsArr), sessionsLength: Array.isArray(sessionsArr) ? sessionsArr.length : -1 }; ` +
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
          | {
              ok: true;
              result: {
                status: number;
                isJson: boolean;
                hasSessionsArray: boolean;
                sessionsLength: number;
              };
            }
          | { ok: false; error: string };

        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        // KNOWN: 200 = daemon accepted the localStorage-sourced token.
        // Anything else (401/403) = the bootstrapped value is rejected
        // by the daemon, which would mean Fix-92 wrote a wrong value.
        expect(
          payload.result.status,
          `webview /v2/sessions returned ${payload.result.status}; ` +
            `expected 200 from authed fetch. localStorage token did not authenticate.`,
        ).toBe(200);

        // KNOWN: response is JSON (not an HTML error page or empty).
        expect(payload.result.isJson, 'response was not valid JSON').toBe(true);

        // KNOWN: response shape is { sessions: [...] } — the dispatch-
        // daemon contract for /v2/sessions.
        expect(
          payload.result.hasSessionsArray,
          `response did not contain a sessions array; sessionsLength=${payload.result.sessionsLength}`,
        ).toBe(true);

        // KNOWN-via-implication: sessionsLength >= 0 (Array.isArray
        // implies length >= 0 per JS spec). Probe doesn't pin a
        // specific count — could be 0 (clean operator state) or N
        // (operator has live sessions). The shape contract is what
        // matters, not the population.
        expect(payload.result.sessionsLength).toBeGreaterThanOrEqual(0);
      } finally {
        await quitChild(child).catch(() => {});
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
