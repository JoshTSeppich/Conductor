// Fix-82 / Probe 2 — bootstrap GET /v2/sessions fires at app-ready.
//
// Cairn finding #82 / Fix-C resolution: subscribeConsoleMenuToDaemon's
// hybrid pattern uses a bootstrap GET /v2/sessions to populate the
// menu's initial session list (operator refinement (a): no timer-based
// polling fallback; bootstrap is the only seed for the menu state at
// app-ready). If the bootstrap fetch never fires, the menu stays in
// the initial empty state — same operator-visible symptom as the
// pre-fix-82 defect.
//
// This probe stands up a local HTTP test server that records each
// GET /v2/sessions request, points FOXWORKS_DAEMON_URL at it, boots
// Electron, waits for ONBOARDING_READY + a settle window, and asserts
// exactly one bootstrap fetch landed during boot.
//
// KNOWN: HOME is redirected to a tmpdir so Fix-C's direct fs read of
// `~/.foxworks-dispatch/token` lands on a probe-controlled file (not
// the operator's real token). Defense-in-depth: the test server
// asserts the inbound x-conductor-token header *length* matches the
// fake-token byte length, never echoes the value.
//
// MODELED: WS factory in main.ts:wsFactory connects to
// FOXWORKS_DAEMON_WS_URL. We point WS at an unreachable port so WS
// connect fails immediately; per console-mount.ts:Refinement (a),
// bootstrap-only fallback applies — bootstrap fetch already ran.
//
// Pattern reference: probe-89 spawn shape (Electron child + stdin/
// stdout sentinel awaits + onboarding/userdata isolation).
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const FAKE_TOKEN = 'probe-82-02-fake-token-do-not-deploy';

interface RecordedRequest {
  method: string;
  url: string;
  hasTokenHeader: boolean;
  tokenLength: number;
  tokenSha256Prefix: string;
}

interface StubServer {
  port: number;
  requests: RecordedRequest[];
  close(): Promise<void>;
}

function startStubDaemon(): Promise<StubServer> {
  return new Promise((resolveP, rejectP) => {
    const requests: RecordedRequest[] = [];
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const tokenHeader = req.headers['x-conductor-token'];
      const tokenStr = typeof tokenHeader === 'string' ? tokenHeader : '';
      requests.push({
        method: req.method ?? '',
        url: req.url ?? '',
        hasTokenHeader: tokenStr !== '',
        tokenLength: tokenStr.length,
        tokenSha256Prefix:
          tokenStr === ''
            ? ''
            : createHash('sha256').update(tokenStr).digest('hex').slice(0, 8),
      });
      // Always respond 200 with empty sessions list. The probe doesn't
      // need to assert anything about the response body — the question
      // is "did the bootstrap fetch land?", not "what did it return?".
      // Empty list mirrors a fresh-daemon / no-active-session state.
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sessions: [] }));
    });
    server.on('error', rejectP);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolveP({
        port: addr.port,
        requests,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
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
      if (m) {
        clearInterval(timer);
        clearTimeout(deadline);
        resolveP(m);
        return;
      }
      clearInterval(timer);
      clearTimeout(deadline);
      rejectP(
        new Error(
          `child exited (code=${code}, signal=${signal}) before sentinel ` +
            `${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-82 / Probe 2 — bootstrap GET /v2/sessions fires at app-ready', () => {
  itDarwin(
    'subscribeConsoleMenuToDaemon performs exactly one bootstrap fetch within app-ready settle window',
    async () => {
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);
      expect(
        existsSync(ELECTRON_BIN),
        `expected ${ELECTRON_BIN}; run pnpm install`,
      ).toBe(true);

      const stub = await startStubDaemon();
      // WS unreachable: pick a port that is almost certainly closed
      // (port 1 reserved tcpmux). console-mount.ts WS factory will
      // throw on connect; refinement (a) bootstrap-only fallback
      // applies; bootstrap fetch we are asserting is unaffected.
      const wsUnreachableUrl = 'ws://127.0.0.1:1';

      const onbDir = mkdtempSync(join(tmpdir(), 'fix-82-probe-02-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-82-probe-02-userdata-'));
      // Redirect HOME so Fix-C's direct fs read of ~/.foxworks-dispatch/
      // token lands on the probe's fake token, not the operator's real
      // one. KNOWN: fixCHomedir() === os.homedir() which honors $HOME
      // on macOS/Linux.
      const fakeHome = mkdtempSync(join(tmpdir(), 'fix-82-probe-02-home-'));
      const tokenDir = join(fakeHome, '.foxworks-dispatch');
      mkdirSync(tokenDir, { recursive: true });
      writeFileSync(join(tokenDir, 'token'), FAKE_TOKEN, 'utf8');

      let stdout = '';
      let stderr = '';
      const child = spawn(ELECTRON_BIN, [MAIN_JS], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOME: fakeHome,
          ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
          MB_TEST_HOOKS: '1',
          MB_USER_DATA_DIR: userDataDir,
          MB_ONBOARDING_STATE_DIR: onbDir,
          FOXWORKS_DAEMON_URL: `http://127.0.0.1:${stub.port}`,
          FOXWORKS_DAEMON_WS_URL: wsUnreachableUrl,
        },
      });
      child.stdout?.on('data', (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d: Buffer) => {
        stderr += d.toString();
      });

      try {
        await awaitSentinel(
          () => stdout,
          /^ONBOARDING_READY$/m,
          30_000,
          child,
          () => stderr,
        );
        // Bootstrap fetch is fire-and-forget; ONBOARDING_READY may arrive
        // before the in-flight fetch lands on the stub server. Wait a
        // settle window — 500ms is generous for an HTTP roundtrip on
        // localhost (probe-92 forensic data: 122-465ms shell-ready→BTW).
        await new Promise<void>((r) => setTimeout(r, 500));

        // KNOWN: exactly one GET /v2/sessions during boot. The hybrid
        // pattern's bootstrap is a single fire — not a poll. Two or more
        // hits in this window indicates either polling crept back in or
        // a WS event raced to the front (we used unreachable WS to
        // eliminate the latter).
        const getSessionsHits = stub.requests.filter(
          (r) => r.method === 'GET' && r.url === '/v2/sessions',
        );
        const diag =
          `requests=${JSON.stringify(stub.requests)}; ` +
          `stdout=${JSON.stringify(stdout.slice(-800))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-800))}`;
        expect(getSessionsHits.length, diag).toBe(1);

        // KNOWN-defense-in-depth: bootstrap fetch carried the
        // x-conductor-token header sourced from the fake token. Length
        // and sha256-prefix proof is byte-equivalence-without-echoing.
        const hit = getSessionsHits[0];
        expect(hit.hasTokenHeader, diag).toBe(true);
        expect(hit.tokenLength, diag).toBe(FAKE_TOKEN.length);
        expect(hit.tokenSha256Prefix, diag).toBe(
          createHash('sha256').update(FAKE_TOKEN).digest('hex').slice(0, 8),
        );

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
        await stub.close();
        for (const dir of [onbDir, userDataDir, fakeHome]) {
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
