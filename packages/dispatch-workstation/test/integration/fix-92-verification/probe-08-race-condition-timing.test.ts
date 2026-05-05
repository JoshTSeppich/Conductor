// Probe-92 / Probe 8 — cold-launch race condition timing.
//
// The theoretical race the task brief flagged: card-bridge-preload's
// Fix-92 IPC roundtrip is fire-and-forget async (the void IIFE in
// card-bridge-preload.mts:39-52). If the roundtrip resolves AFTER
// dispatch-web has mounted and useAuthBootstrap has called readToken,
// readToken finds null → setPhase('prompt') → TokenPrompt mounts.
// The bootstrap then completes silently (setItem + sentinel fire),
// but TokenPrompt remains because nothing re-runs useAuthBootstrap.
//
// Reframed from the original brief's "BOOTSTRAP_TOKEN_WRITTEN appears
// before any dispatch-web phase:prompt sentinel" — no such dispatch-
// web sentinel exists today (cross-package, out-of-scope edit).
//
// Observable signal of the race: TokenPrompt rendered AT the moment
// BOOTSTRAP_TOKEN_WRITTEN fires AND persisting in DOM 2.5s later.
//   - No race fired: TokenPrompt absent at BOOTSTRAP_TOKEN_WRITTEN time.
//   - Race fired, no recovery: TokenPrompt present at BTW, present at +2.5s.
//   - Race fired, ambient recovery (none in current dispatch-web —
//     authRetryNonce only bumps on user interaction): TokenPrompt
//     present at BTW, absent at +2.5s. Untriggered today.
//
// Plus side-channel observability: capture wall-clock timestamps of
// SHELL_READY (host shell), BOOTSTRAP_TOKEN_WRITTEN (preload bootstrap
// complete), and report deltas for forensics. These don't pin
// assertions — they're forensic evidence preserved in the REPORT.md
// aggregation step (Probe 10) so any future race surfacing can be
// traced.
//
// KNOWN: TokenPrompt presence detection (heading text lookup) is the
// same primitive Probe 6 uses.
// MODELED: 2.5s settling after BTW is enough to rule out late
// recovery — Probe 6 verified it's enough for steady-state connect.
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
  // Observation hook: invoked synchronously when stdout receives a
  // chunk that contains <sentinel>; the offset within that chunk's
  // accumulated buffer is captured so wall-clock arrival is precise.
  registerSentinelTimestamp: (sentinel: string) => Promise<number>;
}

function spawnWorkstation(envOverrides: Record<string, string>): SpawnHandle {
  let stdout = '';
  let stderr = '';
  const sentinelTimestamps: Record<string, number> = {};
  const sentinelWaiters: Record<string, ((t: number) => void)[]> = {};

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
    const chunk = d.toString();
    const arrivalTs = Date.now();
    stdout += chunk;
    // Per-line scan: any line in this chunk whose payload starts with
    // a watched sentinel name records the chunk's arrival timestamp.
    for (const line of chunk.split('\n')) {
      for (const sentinel of Object.keys(sentinelWaiters)) {
        if (
          (line === sentinel || line.startsWith(sentinel + ' ')) &&
          sentinelTimestamps[sentinel] === undefined
        ) {
          sentinelTimestamps[sentinel] = arrivalTs;
          for (const w of sentinelWaiters[sentinel]) w(arrivalTs);
          sentinelWaiters[sentinel] = [];
        }
      }
    }
  });
  child.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString();
  });

  return {
    child,
    stdoutBuffer: () => stdout,
    stderrBuffer: () => stderr,
    registerSentinelTimestamp: (sentinel: string) =>
      new Promise<number>((resolveP) => {
        if (sentinelTimestamps[sentinel] !== undefined) {
          resolveP(sentinelTimestamps[sentinel]);
          return;
        }
        if (!sentinelWaiters[sentinel]) sentinelWaiters[sentinel] = [];
        sentinelWaiters[sentinel].push(resolveP);
      }),
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
          new Error(`child exited code=${code} before ${pattern}; ` +
            `stdout=${JSON.stringify(buf().slice(-1500))}`),
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

const TOKENPROMPT_PROBE_CODE =
  `(() => { ` +
  `const headings = Array.from(document.querySelectorAll('h1')); ` +
  `return { hasTokenPromptHeading: headings.some(h => /Conductor authentication/.test(h.textContent || '')) }; ` +
  `})()`;

describe('Probe-92 / Probe 8 — cold-launch race condition timing', () => {
  it(
    'TokenPrompt absent at BOOTSTRAP_TOKEN_WRITTEN time AND 2.5s later (no race fired)',
    async () => {
      expect(existsSync(MAIN_JS)).toBe(true);

      const onbDir = mkdtempSync(join(tmpdir(), 'probe-92-08-onb-'));
      writeFileSync(
        join(onbDir, 'workstation-config.json'),
        JSON.stringify({ onboardingCompleted: true }),
        'utf8',
      );
      const userDataDir = mkdtempSync(join(tmpdir(), 'probe-92-08-userdata-'));

      const handle = spawnWorkstation({
        MB_ONBOARDING_STATE_DIR: onbDir,
        MB_USER_DATA_DIR: userDataDir,
      });

      try {
        const shellReadyTsP = handle.registerSentinelTimestamp('SHELL_READY');
        const bootstrapTsP = handle.registerSentinelTimestamp(
          'BOOTSTRAP_TOKEN_WRITTEN',
        );

        // Wait for the bootstrap sentinel — primary timing event.
        await awaitSentinel(
          handle.stdoutBuffer,
          /^BOOTSTRAP_TOKEN_WRITTEN \d+$/m,
          30_000,
          handle.child,
          handle.stderrBuffer,
        );

        const shellReadyTs = await shellReadyTsP;
        const bootstrapTs = await bootstrapTsP;

        // Probe 1 — DOM at BOOTSTRAP_TOKEN_WRITTEN time.
        const id1 = 'p8a';
        handle.child.stdin?.write(
          `KANBAN_EVAL ${id1}|${TOKENPROMPT_PROBE_CODE}\n`,
        );
        const m1 = await awaitSentinel(
          handle.stdoutBuffer,
          new RegExp(`^KANBAN_EVAL_RESULT ${id1} (.+)$`, 'm'),
          15_000,
          handle.child,
          handle.stderrBuffer,
        );
        const r1 = JSON.parse(m1[1]) as
          | { ok: true; result: { hasTokenPromptHeading: boolean } }
          | { ok: false; error: string };
        if (!r1.ok) throw new Error(`KANBAN_EVAL p8a error: ${r1.error}`);

        // Settle 2.5s — same window as Probe 6.
        await new Promise((r) => setTimeout(r, 2500));

        // Probe 2 — DOM at +2.5s.
        const id2 = 'p8b';
        handle.child.stdin?.write(
          `KANBAN_EVAL ${id2}|${TOKENPROMPT_PROBE_CODE}\n`,
        );
        const m2 = await awaitSentinel(
          handle.stdoutBuffer,
          new RegExp(`^KANBAN_EVAL_RESULT ${id2} (.+)$`, 'm'),
          15_000,
          handle.child,
          handle.stderrBuffer,
        );
        const r2 = JSON.parse(m2[1]) as
          | { ok: true; result: { hasTokenPromptHeading: boolean } }
          | { ok: false; error: string };
        if (!r2.ok) throw new Error(`KANBAN_EVAL p8b error: ${r2.error}`);

        // Forensic timestamps (KNOWN, surfaced in failure messages
        // for any future race surfacing). Stored under TIMING tag for
        // future REPORT.md aggregation.
        const deltaShellToBootstrap = bootstrapTs - shellReadyTs;
        const timingNote =
          `[TIMING] SHELL_READY→BOOTSTRAP_TOKEN_WRITTEN delta = ` +
          `${deltaShellToBootstrap}ms. SHELL_READY at ${shellReadyTs}, ` +
          `BOOTSTRAP_TOKEN_WRITTEN at ${bootstrapTs}.`;

        // KNOWN: at BTW time, TokenPrompt absent → race did not fire
        // before bootstrap completed.
        expect(
          r1.result.hasTokenPromptHeading,
          `TokenPrompt rendered AT BOOTSTRAP_TOKEN_WRITTEN time — RACE ` +
            `FIRED. preload IPC roundtrip resolved AFTER dispatch-web ` +
            `mounted and useAuthBootstrap read null. ${timingNote}`,
        ).toBe(false);

        // KNOWN: at +2.5s, TokenPrompt absent → no late mount.
        expect(
          r2.result.hasTokenPromptHeading,
          `TokenPrompt appeared post-bootstrap. ${timingNote}`,
        ).toBe(false);

        // Forensic note for stdout (visible in vitest --reporter=verbose
        // and in CI logs). Doesn't fail the assertion; preserves the
        // delta for trend-tracking across machines/CI runs.
        // eslint-disable-next-line no-console
        console.log(timingNote);
      } finally {
        await quitChild(handle.child).catch(() => {});
        rmSync(onbDir, { recursive: true, force: true });
        rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
