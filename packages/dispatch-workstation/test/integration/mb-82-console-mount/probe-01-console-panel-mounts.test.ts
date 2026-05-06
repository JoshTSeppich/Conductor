// MB-#82 ConsolePanel mount / Probe 1 — ConsolePanel mounts in shell
// after consoleBridge.openPanel IPC fires.
//
// Closes gap §4.1 #1 from docs/probe-coverage-gap-analysis-2026-05-05.md:
// "#82 — ConsolePanel actually mounts in webview after IPC (GAP). fix-82
// probes stop at the IPC channel; the renderer-side React mount is
// unverified. Operator-blocking if the renderer wiring breaks."
//
// Probe shape (per Phase 1 diagnose §3.1 + operator arbitration B2:
// SHELL_EVAL-driven, no separate OPEN_CONSOLE_PANEL handler):
//
// Single spawn:
//   1. Cold-launch envelope (clean MB_USER_DATA_DIR, MB_ONBOARDING_STATE_DIR
//      seeded with onboardingCompleted: true). FOXWORKS_DAEMON_URL =
//      invalid:// to neutralize daemon-side races (subscribeConsoleMenuToDaemon
//      bootstrap fetch fails immediately; menu stays empty; no race
//      with our test).
//   2. Wait WINDOW_READY + SHELL_READY (so console-panel renderer.js
//      auto-mounts into #console-root).
//   3. SHELL_EVAL drives `window.consoleBridge.openPanel(<synthetic>)`
//      via a fire-and-forget call (.catch(() => {}) — the openPanel
//      Promise may reject when connectSocket later fails to reach the
//      invalid daemon, but we only care about the synchronous
//      `emitToWebview('console:open', ...)` side-effect at console-ipc.ts:155
//      which fires BEFORE the WS connection is attempted).
//   4. Settle ~700ms — shell HTML's inline onConsoleOpen handler flips
//      console-tile-region.style.display to 'block'; console-panel
//      renderer's onConsoleOpen handler updates session binding.
//   5. SHELL_EVAL polls the shell DOM:
//      - [data-testid="console-tile-region"] style.display === 'block'.
//      - [data-testid="console-panel-root"] exists (auto-mount baseline
//        — present even pre-bind from the empty branch).
//      - [data-testid="console-panel-header"] exists (post-bind branch
//        — empty branch renders only console-panel-empty).
//      - Session name appears in console-panel-header span text.
//   6. QUIT cleanly with exit 0.
//
// KNOWN: console-panel.tsx:122,129 — both empty and bound branches render
// [data-testid="console-panel-root"]. The bound branch additionally
// renders [data-testid="console-panel-header"] (line 130) which contains
// a <span> with the session name (verified by reading console-panel.tsx
// at sess-3 HEAD).
// KNOWN: shell HTML's inline script subscribes to consoleBridge.onConsoleOpen
// at workstation-shell.html:548-550 and flips console-tile-region
// style.display to 'block'. Verified by reading the shell HTML at sess-3
// HEAD.
// KNOWN: console-ipc.ts:155 emits console:open BEFORE connectSocket
// (line 157). WS connect failure is AFTER the IPC emit; the renderer
// mounts before the WS error.
// MODELED: 700ms settle is sufficient for the renderer to observe
// console:open and update DOM. fix-92 probe-06 uses 2.5s for kanban-
// side full mount; this probe targets a smaller subset (just the
// tile-region toggle + panel header bind) so 700ms should suffice.
// Fallback: poll inside SHELL_EVAL until tile-region display is 'block'
// or timeout, returning the final state regardless.
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
      // Neutralize daemon-side races (Fix-C subscribeConsoleMenuToDaemon
      // bootstrap fetch fails immediately on invalid URL; no daemon
      // round-trip; menu stays empty in the background, doesn't pollute
      // the probe window). Same envelope as fix-89-menu-rebuild/probe-01.
      FOXWORKS_DAEMON_URL: 'invalid://daemon-disabled.mb-82-probe-01',
      FOXWORKS_DAEMON_WS_URL: 'invalid://daemon-disabled.mb-82-probe-01',
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
              `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}`,
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

describe('MB-#82 ConsolePanel mount / Probe 1 — ConsolePanel mounts in shell after openPanel IPC', () => {
  itDarwin(
    'consoleBridge.openPanel(name) → tile-region display:block + console-panel-root + console-panel-header bound to session name',
    async () => {
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);
      expect(
        existsSync(ELECTRON_BIN),
        `expected ${ELECTRON_BIN}; run pnpm install`,
      ).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'mb-82-probe-01-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'mb-82-probe-01-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Step 1: WINDOW_READY (shell loadFile complete).
        await awaitSentinel(
          stdoutBuffer,
          /^WINDOW_READY$/m,
          30_000,
          child,
          stderrBuffer,
        );
        // Step 2: SHELL_READY (shell HTML inline script ran; consoleBridge
        // subscriptions wired; console-panel renderer.js loaded and
        // mount.ts auto-mount fired).
        await awaitSentinel(
          stdoutBuffer,
          /^SHELL_READY$/m,
          15_000,
          child,
          stderrBuffer,
        );

        // Synthetic session name. Same shape used elsewhere in the
        // probe-suite for unique-session-name discipline.
        const sessionName = `probe-mb-82-${Date.now().toString(36)}`;

        // Step 3 + 4 + 5: drive openPanel and poll DOM in a single SHELL_EVAL
        // round-trip. The eval body:
        //   - calls window.consoleBridge.openPanel(sessionName) (fire-and-
        //     forget; the Promise may reject later when connectSocket
        //     fails to reach the invalid daemon, but emitToWebview fires
        //     synchronously before that — see console-ipc.ts:155-157).
        //   - polls every 50ms for up to 5s for tile-region display='block'.
        //   - returns the final DOM snapshot regardless of poll outcome
        //     so failure assertions surface the actual state.
        const id = 'p82';
        const sessionNameJSON = JSON.stringify(sessionName);
        const evalCode =
          `(async () => { ` +
          `if (!window.consoleBridge) return { error: 'no-consoleBridge', has_window_consoleBridge: false }; ` +
          `window.consoleBridge.openPanel(${sessionNameJSON}).catch(() => {}); ` +
          `const deadline = Date.now() + 5000; ` +
          `while (Date.now() < deadline) { ` +
          `  const tr = document.querySelector('[data-testid=\\"console-tile-region\\"]'); ` +
          `  if (tr && tr.style.display === 'block') break; ` +
          `  await new Promise(r => setTimeout(r, 50)); ` +
          `} ` +
          `const tr = document.querySelector('[data-testid=\\"console-tile-region\\"]'); ` +
          `const root = document.querySelector('[data-testid=\\"console-panel-root\\"]'); ` +
          `const header = document.querySelector('[data-testid=\\"console-panel-header\\"]'); ` +
          `const headerSpan = header ? header.querySelector('span') : null; ` +
          `const empty = document.querySelector('[data-testid=\\"console-panel-empty\\"]'); ` +
          `return { ` +
          `  has_window_consoleBridge: !!window.consoleBridge, ` +
          `  tileRegionDisplay: tr ? (tr.style.display || '') : '<missing>', ` +
          `  hasConsolePanelRoot: !!root, ` +
          `  hasConsolePanelHeader: !!header, ` +
          `  hasConsolePanelEmpty: !!empty, ` +
          `  headerSpanText: headerSpan ? (headerSpan.textContent || '') : '<missing>', ` +
          `}; ` +
          `})()`;

        child.stdin?.write(`SHELL_EVAL ${id}|${evalCode}\n`);

        const m = await awaitSentinel(
          stdoutBuffer,
          new RegExp(`^SHELL_EVAL_RESULT ${id} (.+)$`, 'm'),
          15_000,
          child,
          stderrBuffer,
        );
        const payload = JSON.parse(m[1]) as
          | {
              ok: true;
              result: {
                has_window_consoleBridge: boolean;
                tileRegionDisplay: string;
                hasConsolePanelRoot: boolean;
                hasConsolePanelHeader: boolean;
                hasConsolePanelEmpty: boolean;
                headerSpanText: string;
              } | { error: string; has_window_consoleBridge: boolean };
            }
          | { ok: false; error: string };

        if (!payload.ok) {
          throw new Error(`SHELL_EVAL returned error: ${payload.error}`);
        }
        const r = payload.result as {
          has_window_consoleBridge?: boolean;
          tileRegionDisplay?: string;
          hasConsolePanelRoot?: boolean;
          hasConsolePanelHeader?: boolean;
          hasConsolePanelEmpty?: boolean;
          headerSpanText?: string;
          error?: string;
        };

        // KNOWN-prereq: window.consoleBridge must be exposed by preload.
        // If false, the contextBridge wiring at preload.mts is broken
        // and no #82-class probe can run — distinct failure mode from
        // the IPC mount path.
        expect(
          r.has_window_consoleBridge,
          `window.consoleBridge missing in shell webview — preload contextBridge broken; ` +
            `result=${JSON.stringify(r)}`,
        ).toBe(true);

        // KNOWN: tile-region must have toggled to display:block. If still
        // 'none' or empty, the shell HTML's onConsoleOpen handler did
        // not receive the IPC — Fix-C/finding #82's mount-side wiring
        // regressed.
        expect(
          r.tileRegionDisplay,
          `expected console-tile-region display='block' after openPanel; ` +
            `got display=${JSON.stringify(r.tileRegionDisplay)}; ` +
            `result=${JSON.stringify(r)}`,
        ).toBe('block');

        // KNOWN: console-panel-root must exist. The auto-mount path at
        // console-panel/mount.ts:87 mounts on shell-load regardless of
        // bridge state. Absence here means renderer.js bundle didn't
        // load OR the bundle's auto-mount path errored.
        expect(
          r.hasConsolePanelRoot,
          `[data-testid=console-panel-root] missing — console-panel renderer ` +
            `bundle did not auto-mount. result=${JSON.stringify(r)}`,
        ).toBe(true);

        // KNOWN: post-bind, the bound branch (console-panel.tsx:129) must
        // render. console-panel-header is the bound-branch-only testid;
        // its presence proves the panel observed console:open AND
        // updated session binding.
        expect(
          r.hasConsolePanelHeader,
          `[data-testid=console-panel-header] missing — ConsolePanel did not ` +
            `transition from empty to bound branch after openPanel. ` +
            `(empty present? ${r.hasConsolePanelEmpty}) result=${JSON.stringify(r)}`,
        ).toBe(true);

        // KNOWN: the bound header's <span> contains the session name. If
        // the header is bound but to a DIFFERENT name, the IPC payload
        // routing or React state binding is broken.
        expect(
          r.headerSpanText,
          `expected console-panel-header span to contain session name ` +
            `${JSON.stringify(sessionName)}; got ${JSON.stringify(r.headerSpanText)}`,
        ).toContain(sessionName);

        const exit = await quitChild(child);
        expect(
          exit.code,
          `mb-82-probe-01 exit code; code=${exit.code}, signal=${exit.signal}, ` +
            `stderr=${JSON.stringify(stderrBuffer().slice(-500))}`,
        ).toBe(0);
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
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
    90_000,
  );
});
