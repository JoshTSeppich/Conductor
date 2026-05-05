// Fix-89 / Probe 1 — menu rebuild propagation to macOS native menu bar.
//
// Cairn finding #89 (MB-F-WORKSTATION-MENU-REBUILD-NO-OP). The Symptom
// (KNOWN at branch HEAD `b4a10d9`): `Menu.setApplicationMenu(menu)`
// invoked from inside `rebuildApplicationMenu` (menu.ts:108) post-
// `app.whenReady()` does NOT propagate to the macOS native menu bar.
// Subsequent rebuilds JS-side succeed but the OS menu server holds the
// initial-build cached submenu pointers, so the operator-visible "CC
// Console" submenu remains pinned to its initial empty-state regardless
// of later refresh calls.
//
// Hypothesis 1 (operator-arbitrated to test first, ~2 LOC):
//   `Menu.setApplicationMenu(null)` immediately before
//   `Menu.setApplicationMenu(newMenu)` forces OS-level re-attachment.
//
// This probe is the integration RED for hypothesis 1: drive a refresh
// via the MB_TEST_HOOKS=1 stdin handler, then introspect the native
// menu bar via AppleScript and assert the submenu reflects the rebuild.
// On current (unfixed) menu.ts the assertion fails; on the GREEN
// menu.ts fix it passes.
//
// KNOWN: AppleScript / System Events is the only mechanism that can
// observe the macOS-OS-level menu bar cache state. JS-side
// `Menu.getApplicationMenu()` returns the JS state (the new menu) on
// both broken and fixed code; the bug is that the OS doesn't pick up
// the JS state. CDP / KANBAN_EVAL are scoped to the renderer process
// and cannot see the native menu bar. The proven repro pattern from
// the finding (`tell process "Electron" / click menu bar item "CC
// Console" / enumerate menu items`) is what this probe automates.
//
// MODELED: The `process whose name is "Electron"` query may be
// ambiguous if the operator's daily workstation app is running and
// also identifies as "Electron" to AX. The packaged release shows up
// as "Foxworks Workstation" (CFBundleName), not "Electron"; the dev-
// spawned binary at node_modules/.bin/electron shows as "Electron".
// To disambiguate further, the probe walks descendants of the spawned
// child PID via `pgrep -P` to find the Electron.app subprocess (the
// node CLI shim spawns Electron.app as a child) and filters AppleScript
// by its unix id.
//
// SPECULATIVE: nothing — every link of the observation chain is direct.
//
// Cold-launch isolation mirrors probe-92's pattern: MB_USER_DATA_DIR
// tmpdir, MB_ONBOARDING_STATE_DIR with onboardingCompleted=true to skip
// modal, FOXWORKS_DAEMON_URL pointed at unreachable port so the Fix-C
// `subscribeConsoleMenuToDaemon` bootstrap fetch fails silently and
// does NOT race with our REFRESH_CONSOLE_MENU stdin trigger.
import { describe, it, expect } from 'vitest';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const PROBE_SESSION_NAME = 'probe-session-fix89';

interface SpawnResult {
  child: ChildProcess;
  stdoutBuffer: () => string;
  stderrBuffer: () => string;
}

function spawnWorkstation(envOverrides: Record<string, string>): SpawnResult {
  let stdout = '';
  let stderr = '';
  const child = spawn(ELECTRON_BIN, [MAIN_JS], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      MB_TEST_HOOKS: '1',
      // Point Fix-C subscribe path at an invalid URL so URL parsing fails
      // synchronously in fetch — eliminating any daemon race during the
      // probe window. Diagnostic note: an earlier port-1 ECONNREFUSED
      // approach failed isolation (operator daemon at localhost:7878
      // appeared in menu via daemon path), suggesting some Electron-side
      // cache or env-resolution path needs harder-fail input. Invalid
      // URL fails URL parsing immediately — fetch() throws TypeError
      // before any network attempt; the surrounding try/catch in
      // refetchAndRefresh swallows it, leaving the menu in [] state.
      FOXWORKS_DAEMON_URL: 'invalid://daemon-disabled.fix89-probe-01',
      FOXWORKS_DAEMON_WS_URL: 'invalid://daemon-disabled.fix89-probe-01',
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
        return;
      }
      if (Date.now() - start > timeoutMs) {
        // handled by deadline
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
          `child exited (code=${code}, signal=${signal}) before ` +
            `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}; ` +
            `stderr=${JSON.stringify(errBuf().slice(-1500))}`,
        ),
      );
    });
  });
}

/** Walk descendants of a PID to find the Electron.app GUI subprocess.
 * The node_modules/.bin/electron shim is a node script that spawns
 * Electron.app/Contents/MacOS/Electron as a child; AppleScript /
 * System Events sees the main Electron process (NOT the helpers like
 * "Electron Helper (Renderer)" / "Electron Helper (GPU)"), so we want
 * the shallowest descendant whose comm contains "Electron" but not
 * "Helper". Returns null if no match. */
function findElectronGuiPid(
  rootPid: number,
): { pid: number | null; tree: string[] } {
  function children(pid: number): number[] {
    try {
      const out = execSync(`pgrep -P ${pid}`, { encoding: 'utf8' });
      return out
        .trim()
        .split('\n')
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }
  function comm(pid: number): string {
    try {
      const out = execSync(`ps -o comm= -p ${pid}`, { encoding: 'utf8' });
      return out.trim();
    } catch {
      return '';
    }
  }
  const queue: number[] = [rootPid];
  const visited = new Set<number>();
  const tree: string[] = [];
  let firstMatch: number | null = null;
  while (queue.length > 0) {
    const pid = queue.shift()!;
    if (visited.has(pid)) continue;
    visited.add(pid);
    const c = comm(pid);
    tree.push(`pid=${pid} comm=${JSON.stringify(c)}`);
    if (firstMatch === null && c.includes('Electron') && !c.includes('Helper')) {
      firstMatch = pid;
    }
    for (const child of children(pid)) queue.push(child);
  }
  return { pid: firstMatch, tree };
}

interface MenuIntrospection {
  /** Either 'AX' (no-click traversal succeeded) or 'CLICK' (click+enumerate fallback) or 'ERROR'. */
  source: 'AX' | 'CLICK' | 'ERROR';
  /** Names of menu items in the "CC Console" submenu, or empty on error. */
  items: string[];
  /** Raw osascript stdout for diagnostic surface. */
  raw: string;
  /** Raw osascript stderr / error string. */
  err: string;
}

/** Introspect the macOS native menu bar's "CC Console" submenu of the
 * Electron process matching `electronPid`. Tries AX traversal first (no
 * click required); falls back to click + enumerate if AX raises (some
 * NSMenu impls only populate AXChildren after the menu is opened).
 *
 * Implementation note: the AppleScript is written to a temp file and
 * invoked via `osascript <path>` rather than `osascript -e <script>`.
 * The latter route's shell-escaping interacts poorly with multi-line
 * scripts (newlines + AppleScript's own escaping quirks) and produced
 * `0:1: syntax error: A unknown token can't go here. (-2740)` during
 * dev — switching to file invocation makes the script bytes survive
 * intact. */
function introspectCcConsoleSubmenu(electronPid: number): MenuIntrospection {
  // AppleScript filters by unix id to disambiguate from any other
  // "Electron" process on the operator's machine.
  const script = `on joinList(theList, sep)
  set AppleScript's text item delimiters to sep
  set txt to theList as string
  set AppleScript's text item delimiters to ""
  return txt
end joinList

tell application "System Events"
  set procs to (every process whose unix id is ${electronPid})
  if (count of procs) is 0 then return "ERROR:no-process-with-pid"
  set targetProc to first item of procs
  tell targetProc
    try
      set itemNames to name of every menu item of menu 1 of menu bar item "CC Console" of menu bar 1
      return "AX:" & (my joinList(itemNames, "|"))
    on error errMsg
      try
        set ccBar to menu bar item "CC Console" of menu bar 1
        click ccBar
        delay 0.3
        set itemNames to name of every menu item of menu 1 of ccBar
        key code 53
        return "CLICK:" & (my joinList(itemNames, "|"))
      on error errMsg2
        return "ERROR:" & errMsg2
      end try
    end try
  end tell
end tell
`;
  const scriptPath = join(
    tmpdir(),
    `fix-89-probe-01-${process.pid}-${Date.now()}.applescript`,
  );
  writeFileSync(scriptPath, script, 'utf8');
  let stdout = '';
  let stderr = '';
  try {
    stdout = execSync(`osascript ${JSON.stringify(scriptPath)}`, {
      encoding: 'utf8',
      timeout: 8000,
    }).trim();
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message: string };
    stdout = (e.stdout?.toString() ?? '').trim();
    stderr = (e.stderr?.toString() ?? '').trim() || e.message;
  } finally {
    try {
      rmSync(scriptPath, { force: true });
    } catch {
      /* best-effort */
    }
  }
  if (stdout.startsWith('AX:')) {
    const payload = stdout.slice(3);
    return {
      source: 'AX',
      items: payload === '' ? [] : payload.split('|'),
      raw: stdout,
      err: stderr,
    };
  }
  if (stdout.startsWith('CLICK:')) {
    const payload = stdout.slice(6);
    return {
      source: 'CLICK',
      items: payload === '' ? [] : payload.split('|'),
      raw: stdout,
      err: stderr,
    };
  }
  return { source: 'ERROR', items: [], raw: stdout, err: stderr };
}

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('Fix-89 / Probe 1 — menu rebuild propagation', () => {
  itDarwin(
    'CC Console submenu reflects refreshConsoleMenu([probe-session-fix89]) post-rebuild',
    async () => {
      // Precondition: built artifact present.
      expect(
        existsSync(MAIN_JS),
        `expected built ${MAIN_JS}; run pnpm --filter dispatch-workstation build`,
      ).toBe(true);
      expect(
        existsSync(ELECTRON_BIN),
        `expected ${ELECTRON_BIN}; run pnpm install`,
      ).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'fix-89-probe-01-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'fix-89-probe-01-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Wait for full app-ready chain. ONBOARDING_READY is emitted at
        // the end of app.whenReady() handler — after registerApplicationMenu,
        // refreshConsoleMenu([]), and subscribeConsoleMenuToDaemon are wired.
        await awaitSentinel(
          stdoutBuffer,
          /^ONBOARDING_READY$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // Daemon-bootstrap settle window. ONBOARDING_READY fires at the
        // end of app.whenReady().then(), but Fix-C's
        // subscribeConsoleMenuToDaemon(...) bootstrap fetch is fire-and-
        // forget (`void refetchAndRefresh()`); it MAY still be in flight
        // when ONBOARDING_READY arrives. If the daemon URL env override
        // somehow fails to take effect, the bootstrap fetch will land on
        // the operator's running daemon at localhost:7878 and call
        // refreshConsoleMenu(daemonSessions) — overwriting our test hook
        // unless we send it AFTER the bootstrap settles. 2.5s is comfortably
        // longer than typical localhost daemon round-trip + JSON parse.
        await new Promise<void>((r) => setTimeout(r, 2500));

        // Drive the rebuild via test hook. After this returns, the JS-side
        // application menu has been replaced with one containing
        // PROBE_SESSION_NAME under "CC Console". Whether that change
        // propagates to the OS menu bar is what this probe asserts.
        child.stdin?.write(`REFRESH_CONSOLE_MENU ${PROBE_SESSION_NAME}\n`);
        const doneMatch = await awaitSentinel(
          stdoutBuffer,
          /^REFRESH_CONSOLE_MENU_DONE (\d+)$/m,
          5_000,
          child,
          stderrBuffer,
        );
        expect(parseInt(doneMatch[1], 10)).toBe(1);

        // Insurance second send. If a daemon WS event landed during the
        // 2.5s settle and triggered a debounced refetch (debounce=150ms),
        // the daemon's refresh could fire AFTER our first send. Sending
        // twice with a gap longer than the debounce window guarantees
        // our test hook is the last refreshConsoleMenu call.
        await new Promise<void>((r) => setTimeout(r, 600));
        child.stdin?.write(`REFRESH_CONSOLE_MENU ${PROBE_SESSION_NAME}\n`);
        // Don't await DONE here — awaitSentinel matches the existing
        // first DONE in the buffer and returns immediately. Just wait
        // a fixed window for the second handler to complete + OS settle.
        await new Promise<void>((r) => setTimeout(r, 1000));

        // Find the actual GUI Electron process (descendant of the node
        // shim's child PID). On macOS the node_modules/.bin/electron
        // binary is a node CLI that spawns Electron.app/Contents/MacOS/
        // Electron as a child; AX queries see the latter.
        expect(child.pid).toBeDefined();
        const { pid: electronPid, tree } = findElectronGuiPid(child.pid!);
        expect(
          electronPid,
          `expected to find an Electron descendant of pid ${child.pid}; ` +
            `process tree:\n  ${tree.join('\n  ')}`,
        ).not.toBeNull();

        const menu = introspectCcConsoleSubmenu(electronPid!);

        // Diagnostic dump — surfaces full menu state on failure for the
        // RED commit's evidence trail and any future regression triage.
        const diag =
          `osascript source=${menu.source} items=${JSON.stringify(menu.items)} ` +
          `raw=${JSON.stringify(menu.raw)} err=${JSON.stringify(menu.err)}; ` +
          `electronPid=${electronPid}; tree:\n  ${tree.join('\n  ')}`;

        // KNOWN: introspection must not have errored. If it did, the test
        // mechanism itself is broken (accessibility permissions missing,
        // process not findable, etc.) — not the symptom under test.
        expect(menu.source, diag).not.toBe('ERROR');

        // KNOWN-claim under hypothesis 1: after refreshConsoleMenu(['probe-
        // session-fix89']), the OS-visible CC Console submenu must contain
        // 'probe-session-fix89'. On current (unfixed) menu.ts this fails
        // because the OS menu cache is pinned to the initial 'No sessions
        // registered' state set at main.ts:327's refreshConsoleMenu([]) call.
        expect(menu.items, diag).toContain(PROBE_SESSION_NAME);

        // KNOWN-claim corollary: the empty-state label must be GONE. The
        // initial build emitted `[{label: 'No sessions registered', ...}]`;
        // a successful rebuild replaces it entirely.
        expect(menu.items, diag).not.toContain('No sessions registered');

        // Clean shutdown.
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
        // Best-effort cleanup. Electron may still hold leveldb LOCK
        // file descriptors briefly after exit; rmSync can race with
        // close. Don't mask the actual assertion outcome behind
        // ENOTEMPTY noise.
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
