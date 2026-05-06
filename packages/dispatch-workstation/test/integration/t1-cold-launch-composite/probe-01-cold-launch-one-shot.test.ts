// T1 cold-launch composite / Probe 1 — single-spawn assertion of the
// full T1 dogfood path.
//
// Closes gap §4.1 #15 (P15 in §5) from docs/probe-coverage-gap-
// analysis-2026-05-05.md: "T1 — cold-launch one-shot composite probe
// (PARTIAL). Distributed across app-launches-clean (basic launch),
// fix-92 probes 06-09 (no TokenPrompt + kanban DOM), fix-82 probes
// 02-03 (menu populates). No single probe asserts T1's full path in
// one spawn. SPECULATIVE that recombining existing assertions in one
// probe would catch interaction bugs that distributed probes miss."
//
// Probe shape (per Phase 1 diagnose §3.5 + operator arbitration B4 —
// real daemon with precondition-skip):
//
// Single spawn:
//   1. Wait WINDOW_READY (main.ts:115).
//   2. Wait SHELL_READY (forwarded console-message, main.ts:122-141).
//   3. Wait BOOTSTRAP_TOKEN_WRITTEN <length> (kanban-webview console-
//      message, main.ts:159-160).
//   4. Settle 2.5s — dispatch-web mounts + useAuthBootstrap runs +
//      preflight + setPhase('connected') re-render with kanban
//      children. Empirically <500ms; 2.5s is generous (per fix-92
//      probe-06).
//   5. KANBAN_EVAL on kanban webview:
//      - hasTokenPromptHeading: false (fix-92 probe-06 assertion).
//      - hasKanbanColumns: count > 0 (per operator arbitration B3 —
//        keep at count granularity, not per-column-label).
//   6. AppleScript introspection of CC Console submenu (fix-89
//      probe-01 pattern). Tolerant assertion: source must NOT be
//      'ERROR'; items array may be empty OR contain 'No sessions
//      registered' OR contain real session names — all three ratify
//      "menu populated".
//   7. QUIT cleanly with exit 0.
//
// Operator arbitration B4: real daemon with precondition-skip per
// fix-94/fix-92 pattern. checkPreconditions verifies daemon up at
// :7878 + token present. Auto-skip-with-loud-reason on missing
// preconditions.
//
// KNOWN: every sentinel and seam used here is referenced in fix-82,
// fix-89, fix-92 probe sources — recombination, not new wiring.
// MODELED: dispatch-web's connected state takes ≤2.5s to render
// kanban-column elements after BOOTSTRAP_TOKEN_WRITTEN; verified
// empirically by fix-92 probe-06.
// SPECULATIVE: a composite assertion will catch interaction bugs that
// distributed probes miss; not directly proven, but is the operator's
// motivation per gap analysis.
import { describe, it, expect } from 'vitest';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');

const DAEMON_URL = 'http://localhost:7878';

interface PreconditionResult {
  ok: boolean;
  reason: string;
}

async function checkPreconditions(): Promise<PreconditionResult> {
  if (!existsSync(MAIN_JS)) {
    return {
      ok: false,
      reason: `dist artifact missing at ${MAIN_JS}; run \`pnpm --filter dispatch-workstation build\``,
    };
  }
  if (!existsSync(ELECTRON_BIN)) {
    return {
      ok: false,
      reason: `electron binary missing at ${ELECTRON_BIN}; run \`pnpm install\``,
    };
  }
  let token: string;
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    if (!existsSync(tokenPath)) {
      return {
        ok: false,
        reason: 'daemon token absent at ~/.foxworks-dispatch/token; install + run dispatch-daemon for KNOWN evidence',
      };
    }
    token = readFileSync(tokenPath, 'utf8').trim();
    if (token.length === 0) return { ok: false, reason: 'daemon token file empty' };
  } catch (err) {
    return { ok: false, reason: `daemon token unreadable: ${(err as Error).message}` };
  }
  try {
    const res = await fetch(`${DAEMON_URL}/v2/sessions`, {
      headers: { 'X-Conductor-Token': token },
    });
    if (res.status !== 200) {
      // Capture body so the skip reason surfaces real causes (e.g.,
      // operator's daemon registry corruption returning HTTP 500 with
      // a body explaining the JSON parse failure).
      let body = '';
      try {
        body = (await res.text()).slice(0, 240);
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        reason: `daemon at ${DAEMON_URL}/v2/sessions returned HTTP ${res.status}; body=${JSON.stringify(body)}; re-run with healthy daemon for KNOWN evidence`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      reason: `daemon at ${DAEMON_URL} unreachable: ${(err as Error).message}; re-run with daemon for KNOWN evidence`,
    };
  }
  return { ok: true, reason: 'preconditions met' };
}

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

// AppleScript helpers — adapted from fix-89-menu-rebuild/probe-01-menu-
// rebuild-propagates.test.ts (lines 156-302). Inlined rather than
// imported because test/integration has no shared-helper module
// convention yet; expanding scope to refactor that is out of bounds
// for Session 3 (test-only).

function findElectronGuiPid(rootPid: number): {
  pid: number | null;
  tree: string[];
} {
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
  source: 'AX' | 'CLICK' | 'ERROR';
  items: string[];
  raw: string;
  err: string;
}

function introspectCcConsoleSubmenu(electronPid: number): MenuIntrospection {
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
    `t1-cold-launch-${process.pid}-${Date.now()}.applescript`,
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

describe('T1 cold-launch composite / Probe 1 — single-spawn assertion of the full T1 dogfood path', () => {
  itDarwin(
    'spawn workstation → WINDOW_READY → SHELL_READY → BOOTSTRAP_TOKEN_WRITTEN → kanban renders connected → CC Console submenu populated',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      // Cold-launch envelope. Onboarding-completed seeded so the gate
      // short-circuits to ONBOARDING_READY without hitting the modal /
      // smoke-path stdin handlers (P3 covers that). userData isolated
      // to tmpdir so probe doesn't pollute operator's real Local
      // Storage / kanban state.
      const onbDir = mkdtempSync(join(tmpdir(), 't1-cold-launch-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 't1-cold-launch-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Step 1: WINDOW_READY (main.ts:115; did-finish-load on shell).
        await awaitSentinel(
          stdoutBuffer,
          /^WINDOW_READY$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // Step 2: SHELL_READY (shell HTML console.log forwarded by
        // main.ts:122-141).
        await awaitSentinel(
          stdoutBuffer,
          /^SHELL_READY$/m,
          15_000,
          child,
          stderrBuffer,
        );

        // Step 3: BOOTSTRAP_TOKEN_WRITTEN <length> (Fix-92 path: kanban
        // webview's preload reads token from disk via IPC, writes to
        // localStorage, emits sentinel via console.log).
        const btwMatch = await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN (\d+)$/m,
          15_000,
          child,
          stderrBuffer,
        );
        const btwLength = parseInt(btwMatch[1], 10);
        expect(btwLength, `expected positive token length, got ${btwLength}`).toBeGreaterThan(
          0,
        );

        // Step 4: settle 2.5s for useAuthBootstrap → runPreflight →
        // setPhase('connected') → kanban-column re-render.
        await new Promise((r) => setTimeout(r, 2500));

        // Step 5: KANBAN_EVAL on the embedded kanban webview. Single-line
        // eval per fix-92 probe-06 lesson (per-line stdin handler).
        const id = 't1';
        const evalCode =
          `(() => { ` +
          `const headings = Array.from(document.querySelectorAll('h1')); ` +
          `const hasTokenPromptHeading = headings.some(h => /Conductor authentication/.test(h.textContent || '')); ` +
          `const kanbanColumnCount = document.querySelectorAll('[data-testid^="kanban-column-"]').length; ` +
          `return { hasTokenPromptHeading, kanbanColumnCount, bodyLength: (document.body.textContent || '').length }; ` +
          `})()`;
        child.stdin?.write(`KANBAN_EVAL ${id}|${evalCode}\n`);

        const kanbanEvalMatch = await awaitSentinel(
          stdoutBuffer,
          new RegExp(`^KANBAN_EVAL_RESULT ${id} (.+)$`, 'm'),
          15_000,
          child,
          stderrBuffer,
        );
        const payload = JSON.parse(kanbanEvalMatch[1]) as
          | {
              ok: true;
              result: {
                hasTokenPromptHeading: boolean;
                kanbanColumnCount: number;
                bodyLength: number;
              };
            }
          | { ok: false; error: string };
        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        // KNOWN: TokenPrompt must NOT have surfaced (Fix-92 connected
        // path). If true, either Fix-92 broke or auth bootstrap silently
        // failed (likely also flagged by fix-92 probe-06 in isolation).
        expect(
          payload.result.hasTokenPromptHeading,
          `TokenPrompt heading found in kanban DOM during T1 cold-launch — ` +
            `Fix-92 connected state did not land. bodyLength=${payload.result.bodyLength}`,
        ).toBe(false);

        // KNOWN: at least one kanban-column rendered (per operator
        // arbitration B3 — keep at count > 0 granularity, not
        // per-column-label-strength).
        expect(
          payload.result.kanbanColumnCount,
          `expected kanban-column-* count > 0; got ${payload.result.kanbanColumnCount}; ` +
            `bodyLength=${payload.result.bodyLength}`,
        ).toBeGreaterThan(0);

        // Step 6: AppleScript introspection of CC Console submenu (fix-89
        // probe-01 pattern). Tolerant assertion: the menu must have
        // populated SOMEHOW — either with real session names (Fix-C
        // bootstrap fetch succeeded), with the empty-state label "No
        // sessions registered" (registerApplicationMenu's initial state),
        // or with zero items if the menu's behavior was changed to render
        // an empty submenu. The bug we're catching is "menu introspection
        // returns ERROR" — i.e., the menu wasn't built at all OR System
        // Events can't reach it.
        expect(child.pid).toBeDefined();
        const { pid: electronPid, tree } = findElectronGuiPid(child.pid!);
        expect(
          electronPid,
          `expected to find an Electron descendant of pid ${child.pid}; ` +
            `process tree:\n  ${tree.join('\n  ')}`,
        ).not.toBeNull();

        const menu = introspectCcConsoleSubmenu(electronPid!);
        const menuDiag =
          `osascript source=${menu.source} items=${JSON.stringify(menu.items)} ` +
          `raw=${JSON.stringify(menu.raw)} err=${JSON.stringify(menu.err)}; ` +
          `electronPid=${electronPid}`;

        // KNOWN: introspection must not have errored. If it did, the
        // CC Console submenu either didn't build or System Events
        // accessibility permissions are missing (test-mechanism
        // problem rather than the symptom under test — same caveat
        // as fix-89 probe-01).
        expect(menu.source, menuDiag).not.toBe('ERROR');

        // KNOWN: menu must surface SOMETHING. Items array can be:
        //   (a) ≥1 real session names (daemon's active sessions)
        //   (b) ['No sessions registered'] (registerApplicationMenu
        //       initial state when daemon returns 0 sessions)
        //   (c) [] if menu impl was changed to render an empty list
        // (a) and (b) prove "menu populated"; (c) is acceptable because
        // it still proves the menu was built. The failure mode this
        // catches is .source==='ERROR' which means the build chain
        // never reached System Events.
        // (No further item-content assertion — operator arbitration B3
        // keeps T1 at composite-coarse granularity.)

        // Step 7: clean QUIT.
        const exit = await quitChild(child);
        expect(
          exit.code,
          `T1 cold-launch exit code; code=${exit.code}, signal=${exit.signal}, ` +
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
    120_000,
  );
});
