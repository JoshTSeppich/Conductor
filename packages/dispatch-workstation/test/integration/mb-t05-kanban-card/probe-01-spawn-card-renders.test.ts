// MB-T05 kanban-card / Probe 1 — kanban renders a session card after
// successful spawn (replacement for P5 per operator arbitration B1).
//
// Closes gap §4.2 #6 from docs/probe-coverage-gap-analysis-2026-05-05.md:
// "MB-T05 — kanban shows new spawn card (GAP). KNOWN: no probe drives
// kanban refresh after spawn and asserts new card mounts. SPECULATIVE
// that this is reachable via KANBAN_EVAL after fix-83 probe-04's success."
//
// Operator arbitration B1: defer P5 (cap UI) due to data-testid="session-
// count" not existing yet (HALT-WORTHY territory conflict — Phase 1
// diagnose §7-Q1). Replace with this Tier-2 P6 which uses the existing
// KANBAN_EVAL seam, no new source change, and the kanban-side surface
// already exists at packages/dispatch-web/src/components/SessionCard.tsx.
//
// Probe shape (per Phase 1 diagnose §7-Q1 (A) recommendation):
//
// Single spawn:
//   1. checkPreconditions — daemon up at :7878 + token + tmux + claude.
//      Auto-skip-with-loud-reason per fix-94/fix-92 pattern.
//   2. Cold-launch envelope (clean tmpdirs, onboardingCompleted seeded,
//      REAL daemon — no FOXWORKS_DAEMON_URL override; we need the
//      kanban's preflight to reach the operator's running daemon).
//   3. Wait WINDOW_READY → SHELL_READY → BOOTSTRAP_TOKEN_WRITTEN.
//   4. Settle 2.5s for useAuthBootstrap → connected → kanban renders
//      pre-existing session list.
//   5. Drive CLICK_SPAWN_BUTTON stdin → SPAWN_MODAL_OPENED sentinel
//      (existing seam at main.ts:460-473 + workstation-shell.html).
//   6. Drive FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName> stdin →
//      SPAWN_RESULT_OK <sessionName> sentinel (existing seam at
//      main.ts:481-504; fix-83 probe-04 path).
//   7. Settle ~3s for daemon-side WS event → console-mount debounced
//      refetch on the operator's daemon → kanban re-render with new
//      session in /v2/sessions list.
//   8. KANBAN_EVAL polls kanban DOM (up to 10s) for the session-card:
//      `document.querySelector('[role="button"][aria-label="<name>"]')`
//      (SessionCard.tsx:80-82 — role=button + aria-label=name; no
//      data-testid on the card itself, but aria-label is stable).
//   9. Cleanup: PATCH /v2/sessions/<name>/state → killed; tmux
//      kill-session -t <name>. Both best-effort in finally.
//   10. QUIT cleanly with exit 0.
//
// KNOWN: SessionCard at packages/dispatch-web/src/components/SessionCard.tsx
// renders <div role="button" aria-label={name}> ... <span>{name}</span>.
// KNOWN: KanbanColumn at line 35 has data-testid="kanban-column-<status>";
// the card lives inside the appropriate column based on
// session.computed_status. New spawns typically appear in 'idle' or
// 'running' computed_status; the probe asserts on aria-label only,
// without prejudice to which column.
// KNOWN: spawn-handler's checkSpawnCapacity queries daemon /v2/sessions;
// failure path emits SPAWN_RESULT_ERROR DaemonUnreachable instead of
// SPAWN_RESULT_OK (fix-83 probe-03 covers this). So any precondition-
// passing daemon will allow the spawn.
//
// MODELED: 3s settle is enough for the daemon's WS session_created
// event (fix-c subscribeConsoleMenuToDaemon uses 150ms debounce) to
// trigger a kanban-side refetch + re-render. SPECULATIVE: dispatch-
// web's kanban refetch path may not directly subscribe to
// /v2/events/stream; if not, the probe relies on the kanban's
// existing useSessionsList polling/refresh shape.
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
  token?: string;
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
  try {
    execSync('which tmux', { stdio: 'pipe' });
  } catch {
    return { ok: false, reason: 'tmux not on PATH; install tmux for KNOWN evidence' };
  }
  try {
    const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
    if (claudePath.length === 0) {
      return { ok: false, reason: '`which claude` returned empty path' };
    }
  } catch {
    return { ok: false, reason: '`which claude` failed; install claude CLI for KNOWN evidence' };
  }
  return { ok: true, reason: 'preconditions met', token };
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

const itDarwin = process.platform === 'darwin' ? it : it.skip;

describe('MB-T05 kanban-card / Probe 1 — kanban renders a session card after successful spawn', () => {
  itDarwin(
    'spawn → SPAWN_RESULT_OK → kanban DOM contains [role=button][aria-label=<name>] for the new session',
    async (ctx) => {
      const pre = await checkPreconditions();
      if (!pre.ok) {
        ctx.skip(`SKIPPED: ${pre.reason}`);
        return;
      }

      const onbDir = mkdtempSync(join(tmpdir(), 'mb-t05-kanban-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'mb-t05-kanban-userdata-'));

      const sessionName = `probe-mb-t05-card-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const repoPath = PACKAGE_ROOT;

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Sentinel chain.
        await awaitSentinel(
          stdoutBuffer,
          /^WINDOW_READY$/m,
          30_000,
          child,
          stderrBuffer,
        );
        await awaitSentinel(
          stdoutBuffer,
          /^SHELL_READY$/m,
          15_000,
          child,
          stderrBuffer,
        );
        await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m,
          15_000,
          child,
          stderrBuffer,
        );

        // Settle for useAuthBootstrap → connected → kanban renders the
        // pre-existing session list (whatever sessions operator already
        // has, if any).
        await new Promise((r) => setTimeout(r, 2500));

        // Drive CLICK_SPAWN_BUTTON → SPAWN_MODAL_OPENED.
        child.stdin?.write('CLICK_SPAWN_BUTTON\n');
        await awaitSentinel(
          stdoutBuffer,
          /^SPAWN_MODAL_OPENED$/m,
          10_000,
          child,
          stderrBuffer,
        );

        // Drive FILL_AND_SUBMIT_SPAWN → SPAWN_RESULT_OK <sessionName>
        // (fix-83 probe-04 path; relies on cap-check passing against
        // operator's healthy daemon).
        child.stdin?.write(`FILL_AND_SUBMIT_SPAWN ${repoPath}|${sessionName}\n`);
        const okMatch = await awaitSentinel(
          stdoutBuffer,
          new RegExp(`^SPAWN_RESULT_OK ${sessionName}$`, 'm'),
          60_000,
          child,
          stderrBuffer,
        );
        expect(okMatch[0]).toBe(`SPAWN_RESULT_OK ${sessionName}`);

        // Settle ~3s for daemon-side state propagation + kanban re-render.
        // dispatch-web's session list refresh shape (poll vs WS) is
        // implementation-detail to dispatch-web; 3s is a generous window.
        await new Promise((r) => setTimeout(r, 3000));

        // KANBAN_EVAL polls the kanban DOM for the new session-card.
        // Selector: SessionCard renders <div role="button"
        // aria-label={name}> at SessionCard.tsx:79-82. No data-testid on
        // the card itself; aria-label is the stable anchor.
        const id = 'p6';
        const sessionNameJSON = JSON.stringify(sessionName);
        const evalCode =
          `(async () => { ` +
          `const deadline = Date.now() + 10000; ` +
          `let card = null; ` +
          `while (Date.now() < deadline) { ` +
          `  card = document.querySelector('[role=\\"button\\"][aria-label=' + ${JSON.stringify(`"${sessionName}"`)} + ']'); ` +
          `  if (card) break; ` +
          `  await new Promise(r => setTimeout(r, 100)); ` +
          `} ` +
          `const allCards = Array.from(document.querySelectorAll('[role=\\"button\\"]')); ` +
          `const allAriaLabels = allCards.map(c => c.getAttribute('aria-label')).filter(Boolean); ` +
          `const containingColumn = card ? card.closest('[data-testid^=\\"kanban-column-\\"]') : null; ` +
          `return { ` +
          `  hasCard: !!card, ` +
          `  cardSessionName: ${sessionNameJSON}, ` +
          `  cardTextContent: card ? (card.textContent || '').slice(0, 200) : null, ` +
          `  containingColumnTestId: containingColumn ? containingColumn.getAttribute('data-testid') : null, ` +
          `  allAriaLabelsCount: allAriaLabels.length, ` +
          `  bodyLength: (document.body.textContent || '').length ` +
          `}; ` +
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
                hasCard: boolean;
                cardSessionName: string;
                cardTextContent: string | null;
                containingColumnTestId: string | null;
                allAriaLabelsCount: number;
                bodyLength: number;
              };
            }
          | { ok: false; error: string };

        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        // KNOWN-positive: kanban renders a session-card with the new
        // session's aria-label. Catches: kanban refresh path doesn't
        // observe new sessions; SessionCard render condition skips
        // operator's spawn; daemon registers but kanban uses stale
        // cache.
        expect(
          payload.result.hasCard,
          `kanban DOM did not surface a [role="button"][aria-label="${sessionName}"] ` +
            `card within 10s of SPAWN_RESULT_OK; ` +
            `total cards in kanban=${payload.result.allAriaLabelsCount}; ` +
            `bodyLength=${payload.result.bodyLength}; ` +
            `result=${JSON.stringify(payload.result)}`,
        ).toBe(true);

        // KNOWN-positive: the card appears under SOME kanban column. The
        // computed_status routing decides which one (idle/running/
        // awaiting_review/stale); we assert presence-in-a-column without
        // prejudice to which column. A card outside any column is a
        // routing or layout regression.
        expect(
          payload.result.containingColumnTestId,
          `card present but outside any [data-testid^="kanban-column-"] ` +
            `column; routing or column-layout regression. ` +
            `result=${JSON.stringify(payload.result)}`,
        ).toMatch(/^kanban-column-/);

        // KNOWN: card text contains the session name (defense-in-depth
        // against an aria-label match on the wrong card; SessionCard's
        // <span>{name}</span> at line 88 is the visible name).
        expect(
          payload.result.cardTextContent,
          `card text did not contain session name "${sessionName}"; ` +
            `cardTextContent=${JSON.stringify(payload.result.cardTextContent)}`,
        ).toContain(sessionName);

        const exit = await quitChild(child);
        expect(
          exit.code,
          `mb-t05-kanban-probe exit code; code=${exit.code}, signal=${exit.signal}, ` +
            `stderr=${JSON.stringify(stderrBuffer().slice(-500))}`,
        ).toBe(0);
      } catch (e) {
        if (!child.killed) child.kill('SIGKILL');
        throw e;
      } finally {
        // Daemon-side cleanup first (drops cap count back below limit).
        try {
          await fetch(
            `${DAEMON_URL}/v2/sessions/${encodeURIComponent(sessionName)}/state`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Conductor-Token': pre.token!,
              },
              body: JSON.stringify({ state: 'killed' }),
            },
          );
        } catch (cleanupErr) {
          process.stderr.write(
            `[mb-t05-kanban-probe-01] daemon-side state→killed cleanup failed: ` +
              `${(cleanupErr as Error).message}\n`,
          );
        }
        // tmux-side cleanup.
        try {
          execSync(`tmux kill-session -t ${sessionName}`, { stdio: 'pipe' });
        } catch {
          /* tmux may already have killed the session */
        }
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
    180_000,
  );
});
