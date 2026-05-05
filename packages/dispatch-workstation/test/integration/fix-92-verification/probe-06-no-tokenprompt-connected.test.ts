// Probe-92 / Probe 6 — useAuthBootstrap connected, no TokenPrompt.
//
// THE VISUAL CHECK, AUTOMATED. This probe encodes what an operator
// would normally verify by eyeballing the kanban view: the cold-launch
// arrives at the connected state without TokenPrompt mounting.
//
// Cold-launch sequence after BOOTSTRAP_TOKEN_WRITTEN:
//   1. dispatch-web bundle loads in the kanban webview.
//   2. AuthBootstrap mounts → useAuthBootstrap runs.
//   3. readToken() finds the bootstrapped value in localStorage.
//   4. runPreflight against /v2/sessions with the token.
//   5. preflight returns connected → setPhase('connected') →
//      <DaemonEventsBridge>{children}</DaemonEventsBridge> renders.
//
// If Fix-92 had NOT shipped (or had silently regressed), step 3
// would find null → setPhase('prompt') → <TokenPrompt> renders.
//
// Assertions (queried via KANBAN_EVAL, single-line eval):
//   - hasTokenPromptHeading: false  (no "Conductor authentication" h1)
//   - hasBootstrappingStatus: false (no "Connecting to daemon…" hint —
//     should have transitioned away by now)
//   - hasKanbanColumns: true (the connected children rendered)
//
// KNOWN: TokenPrompt's heading text is "Conductor authentication"
// (TokenPrompt.tsx:30). KanbanColumn has data-testid="kanban-column-*"
// (KanbanColumn.tsx:35).
// MODELED: 2s settling is enough for runPreflight; the daemon is
// already verified responsive in Probe 2.
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
              `sentinel ${pattern}. stdout=${JSON.stringify(buf().slice(-1500))}`,
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

describe('Probe-92 / Probe 6 — useAuthBootstrap connected, no TokenPrompt', () => {
  it(
    'kanban DOM has no TokenPrompt and post-bootstrap kanban-column elements present',
    async () => {
      expect(existsSync(MAIN_JS)).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-06-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-06-userdata-'));

      const { child, stdoutBuffer, stderrBuffer } = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        // Bootstrap done → preload setItem succeeded.
        await awaitSentinel(
          stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m,
          30_000,
          child,
          stderrBuffer,
        );

        // Settling: dispatch-web mounts + useAuthBootstrap runs +
        // runPreflight roundtrip + setPhase('connected') → re-render
        // with kanban children. Empirically <500ms; 2.5s is generous.
        await new Promise((r) => setTimeout(r, 2500));

        // KANBAN_EVAL DOM probe (single-line). Returns 3 booleans:
        //   hasTokenPromptHeading: any h1 containing "Conductor authentication"
        //   hasBootstrappingStatus: role=status containing "Connecting to daemon"
        //   hasKanbanColumns: any [data-testid^="kanban-column-"]
        const id = 'p6';
        const evalCode =
          `(() => { ` +
          `const headings = Array.from(document.querySelectorAll('h1')); ` +
          `const hasTokenPromptHeading = headings.some(h => /Conductor authentication/.test(h.textContent || '')); ` +
          `const statuses = Array.from(document.querySelectorAll('[role="status"]')); ` +
          `const hasBootstrappingStatus = statuses.some(s => /Connecting to daemon/.test(s.textContent || '')); ` +
          `const hasKanbanColumns = document.querySelectorAll('[data-testid^="kanban-column-"]').length > 0; ` +
          `return { hasTokenPromptHeading, hasBootstrappingStatus, hasKanbanColumns, bodyLength: (document.body.textContent || '').length }; ` +
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
                hasTokenPromptHeading: boolean;
                hasBootstrappingStatus: boolean;
                hasKanbanColumns: boolean;
                bodyLength: number;
              };
            }
          | { ok: false; error: string };

        if (!payload.ok) {
          throw new Error(`KANBAN_EVAL returned error: ${payload.error}`);
        }

        // KNOWN: the headline assertion. If TokenPrompt rendered, Fix-92
        // didn't reach the webview's localStorage in time, OR the
        // useAuthBootstrap read returned null somehow. Either way, the
        // cold-launch UX regression is back.
        expect(
          payload.result.hasTokenPromptHeading,
          `TokenPrompt heading "Conductor authentication" found in ` +
            `kanban DOM — Fix-92 did not produce a connected state. ` +
            `bodyLength=${payload.result.bodyLength}`,
        ).toBe(false);

        // KNOWN: bootstrapping status should have transitioned away by
        // now (2.5s after BOOTSTRAP_TOKEN_WRITTEN; preflight is sub-
        // second). If still showing, useAuthBootstrap is stuck and the
        // operator sees "Connecting to daemon…" indefinitely — a real
        // UX bug.
        expect(
          payload.result.hasBootstrappingStatus,
          `"Connecting to daemon…" status still present after 2.5s ` +
            `settling — useAuthBootstrap stuck in bootstrapping phase`,
        ).toBe(false);

        // MODELED → KNOWN: post-bootstrap content rendered. Empty kanban
        // boards still render columns (the empty state is per-column, not
        // page-level). Absence of any kanban-column-* testid means
        // dispatch-web didn't reach the connected branch of AuthBootstrap.
        expect(
          payload.result.hasKanbanColumns,
          `no [data-testid^="kanban-column-"] elements found in kanban ` +
            `DOM — dispatch-web did not reach the connected render path. ` +
            `bodyLength=${payload.result.bodyLength}`,
        ).toBe(true);
      } finally {
        await quitChild(child).catch(() => {});
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
