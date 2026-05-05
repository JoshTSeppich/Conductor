// Fix-82 / Probe 3 — WS-event-driven refetch debounce collapse.
//
// Cairn finding #82 / Fix-C resolution refinement (b): a burst of WS
// events on /v2/events/stream collapses into a single debounced
// refetch (default 150ms quiet-window). Without debounce, every event
// would fire its own GET /v2/sessions, hammering the daemon when bursts
// arrive (state_changed / prompt_sent / etc batched together).
//
// This probe stands up:
//   - Local HTTP stub on port A. Records GET /v2/sessions hits.
//   - Local minimal-WS stub on port B. On client connect, sends 5 text
//     frames within 100ms (well under the 150ms debounce window).
// Asserts: total GET /v2/sessions hits over a 1500ms observation
// window is ≤ 2 (1 bootstrap + 1 debounced refetch). Without debounce,
// a 5-event burst would produce 6 hits (1 bootstrap + 5 per-event
// refetches).
//
// KNOWN: text-frame-only WS server. console-mount.ts WS adapter only
// listens for 'open' / 'message' / 'close' / 'error'; it does not send
// data, so the stub does not need to parse client frames. Standard WS
// handshake (RFC 6455) + minimal frame writer suffice.
//
// MODELED: timing — 1500ms observation window is comfortably longer
// than the 150ms debounce + bootstrap roundtrip + WS connect. The
// probe-92 forensic data (122-465ms) suggests bootstrap timing is well
// under 500ms on this machine class; debounce trailing-edge fires
// 150ms after the last burst event (= 250ms wall-clock after burst
// start); we wait 1500ms to be safe.
//
// Pattern reference: probe-02 spawn shape + node:http stub server.
import { describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const FAKE_TOKEN = 'probe-82-03-fake-token-do-not-deploy';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

interface HttpStub {
  port: number;
  getSessionsHits: number;
  close(): Promise<void>;
}

function startHttpStub(): Promise<HttpStub> {
  return new Promise((resolveP, rejectP) => {
    let getSessionsHits = 0;
    const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === 'GET' && req.url === '/v2/sessions') {
        getSessionsHits += 1;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sessions: [] }));
    });
    server.on('error', rejectP);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolveP({
        port: addr.port,
        get getSessionsHits() {
          return getSessionsHits;
        },
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

interface WsStub {
  port: number;
  /** Resolves when first client connects + handshake completes. */
  ready: Promise<void>;
  sendText(payload: string): void;
  close(): Promise<void>;
}

/** Minimal WebSocket server (server-to-client text frames only).
 * Implements RFC 6455 handshake + unmasked text frame writer. The
 * console-mount.ts WS adapter only consumes events from the server
 * direction, so we never need to parse inbound frames from the
 * workstation client. */
function startWsStub(): Promise<WsStub> {
  return new Promise((resolveP, rejectP) => {
    let clientSocket: Socket | null = null;
    let readyResolve!: () => void;
    const ready = new Promise<void>((r) => {
      readyResolve = r;
    });
    const server = createHttpServer();
    server.on('upgrade', (req: IncomingMessage, socket: Socket /* , head */) => {
      const key = req.headers['sec-websocket-key'];
      if (typeof key !== 'string') {
        socket.destroy();
        return;
      }
      const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n` +
          '\r\n',
      );
      // Discard any inbound frames from client (we don't act on them).
      socket.on('data', () => {
        /* drop */
      });
      socket.on('error', () => {
        /* drop */
      });
      socket.on('close', () => {
        if (clientSocket === socket) clientSocket = null;
      });
      clientSocket = socket;
      readyResolve();
    });
    server.on('error', rejectP);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      resolveP({
        port: addr.port,
        ready,
        sendText(payload: string) {
          if (!clientSocket) return;
          const data = Buffer.from(payload, 'utf8');
          // FIN=1, opcode=0x1 (text), no mask, payload length single-byte form
          // (sufficient for our small JSON payloads; <126 bytes).
          if (data.length >= 126) {
            throw new Error('test stub only supports payloads <126 bytes');
          }
          const frame = Buffer.alloc(2 + data.length);
          frame[0] = 0x81;
          frame[1] = data.length; // no mask bit
          data.copy(frame, 2);
          clientSocket.write(frame);
        },
        close: () => new Promise<void>((r) => {
          if (clientSocket) clientSocket.destroy();
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
    child.once('exit', () => {
      clearInterval(timer);
      clearTimeout(deadline);
      rejectP(new Error('child exited before sentinel'));
    });
  });
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-82 / Probe 3 — WS-event-driven refetch debounce collapse', () => {
  itDarwin(
    'burst of 5 WS events within debounce window collapses to ≤ 2 GET /v2/sessions hits (1 bootstrap + 1 debounced)',
    async () => {
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);

      const httpStub = await startHttpStub();
      const wsStub = await startWsStub();

      const onbDir = mkdtempSync(join(tmpdir(), 'fix-82-probe-03-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-82-probe-03-userdata-'));
      const fakeHome = mkdtempSync(join(tmpdir(), 'fix-82-probe-03-home-'));
      mkdirSync(join(fakeHome, '.foxworks-dispatch'), { recursive: true });
      writeFileSync(join(fakeHome, '.foxworks-dispatch', 'token'), FAKE_TOKEN, 'utf8');

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
          FOXWORKS_DAEMON_URL: `http://127.0.0.1:${httpStub.port}`,
          FOXWORKS_DAEMON_WS_URL: `ws://127.0.0.1:${wsStub.port}`,
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
        // Wait for WS handshake from the workstation client.
        await Promise.race([
          wsStub.ready,
          new Promise<void>((_r, rej) =>
            setTimeout(() => rej(new Error('WS client never connected within 5s')), 5000),
          ),
        ]);
        // Let the bootstrap fetch land first (refinement (a) must apply
        // even when WS is up). Without this gap, a WS-driven debounced
        // refetch could land in parallel with the bootstrap and inflate
        // the count for a non-defect reason.
        await new Promise<void>((r) => setTimeout(r, 250));
        const bootstrapOnlyHits = httpStub.getSessionsHits;

        // Burst: 5 events in ~50ms (well inside the 150ms debounce
        // quiet-window). Per refinement (b), these collapse into a
        // single trailing-edge refetch.
        for (let i = 0; i < 5; i += 1) {
          wsStub.sendText(JSON.stringify({ type: 'state_changed', i }));
          await new Promise<void>((r) => setTimeout(r, 10));
        }
        // Wait > debounceMs (default 150ms) plus HTTP roundtrip headroom.
        await new Promise<void>((r) => setTimeout(r, 800));
        const totalHits = httpStub.getSessionsHits;

        const diag =
          `bootstrapOnlyHits=${bootstrapOnlyHits}; totalHits=${totalHits}; ` +
          `stdout=${JSON.stringify(stdout.slice(-800))}; ` +
          `stderr=${JSON.stringify(stderr.slice(-800))}`;

        // KNOWN: bootstrap should have produced exactly 1 hit. If 0,
        // probe-02 already failed; if >1 either WS reconnect storm or
        // polling regression.
        expect(bootstrapOnlyHits, diag).toBe(1);

        // KNOWN: total hits after burst ≤ 2. The trailing-edge debounce
        // fires once. >2 indicates debounce broken (per-event refetch).
        // ==1 indicates WS-event path entirely broken (no refetch on
        // burst). The acceptable window is exactly 2.
        expect(totalHits, diag).toBe(2);

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
        await httpStub.close();
        await wsStub.close();
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
