#!/usr/bin/env tsx
/**
 * DAEMON-Z-2 — cross-session end-to-end MVP composition smoke test.
 *
 * Verifies the THREE-component composition (daemon + CLI + web)
 * end-to-end. Z-1 + Z-3 + Z-4 cover their own boundaries
 * exhaustively; Z-2 covers the composition only — does NOT
 * re-verify any single component.
 *
 * Run via: pnpm --filter dispatch-cli smoke-test-z2
 *   --skip-manual : skip operator-manual browser checkpoint S8
 *
 * Per arbitration this cycle (operator pre-reg ack):
 *   - Decision 1 = 1a: src/index.ts default staticRoot under §3.4
 *     mechanical-translation carve-out (third Round 2 exercise).
 *   - Decision 2: programmatic WS subscriber for automated
 *     verification + optional operator-manual browser checkpoint
 *     (matches Z-1's S6 operator-manual precedent).
 *
 * Authority sources held OPEN at authoring (finding #37 verbatim
 * discipline):
 *   - Z-1 commit 8c4c5e0 — installer flow + Path B plist runtime
 *   - Z-3 commit 711db61 — @fastify/static + SPA fall-through
 *   - Z-4 commit c8c9ec2 — CLI ↔ daemon binding + v1 fallback
 *   - Z-3 pre-reg Decision 2 verbatim — default staticRoot
 *     resolution from import.meta.dirname
 *   - Contract §7.1 — fd CLI ↔ HTTP route mapping
 *   - Contract §7.2 — daemon-dead fallback warn text
 *   - §3.1.1 amendment c1bb7fe — Path B plist (tsx runtime)
 *   - §7.3 amendment a502c4c — v1-reads-v2 transparency
 *
 * Cleanup discipline (per Z-4 prefix-cleanup precedent + Z-1
 * try/finally pattern): smoke ends with full uninstall + state-
 * reset. ONLY z2-smoke-* prefix entries removed; operator's
 * pre-existing sessions preserved. try/finally ensures uninstall
 * runs even on mid-test failure.
 */

import { spawn, execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { WebSocket } from 'ws';

const execFileP = promisify(execFile);

const SMOKE_PREFIX = `z2-smoke-${process.pid}-${Date.now()}`;
const SESSION_NAME = SMOKE_PREFIX;
// tmux session name must be the same so target = SESSION_NAME:0.0 maps
// to a real pane; daemon's prompts route validates pane liveness via
// tmuxOps.hasSession before sendKeys.
const TMUX_TARGET = `${SESSION_NAME}:0.0`;
const SESSIONS_PATH = join(homedir(), '.foxworks-dispatch', 'sessions.json');
const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');
const HEALTH_URL = 'http://127.0.0.1:7878/v2/health';
const STATE_URL = (name: string) =>
  `http://127.0.0.1:7878/v2/sessions/${encodeURIComponent(name)}`;
const WS_URL = (token: string) =>
  `ws://127.0.0.1:7878/v2/events/stream?token=${encodeURIComponent(token)}`;

const HEALTH_TIMEOUT_MS = 10000;
const HEALTH_POLL_INTERVAL_MS = 200;
const WS_OPEN_TIMEOUT_MS = 2000;
const PROMPT_EVENT_TIMEOUT_MS = 3000;
const HANDOFF_EVENT_TIMEOUT_MS = 4000;

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

const skipManual = process.argv.includes('--skip-manual');
const results: StepResult[] = [];

function step(result: StepResult): void {
  results.push(result);
  const symbol = result.ok ? '✓' : '✗';
  console.log(`${symbol} ${result.name}: ${result.detail}`);
}

async function pollHealthUntilUp(): Promise<{
  status: string;
  notifications_available?: boolean;
}> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(HEALTH_URL);
      if (r.ok) {
        return (await r.json()) as {
          status: string;
          notifications_available?: boolean;
        };
      }
    } catch {
      // ECONNREFUSED while daemon is starting — retry
    }
    await new Promise((res) => setTimeout(res, HEALTH_POLL_INTERVAL_MS));
  }
  throw new Error(`/v2/health did not respond within ${HEALTH_TIMEOUT_MS}ms`);
}

async function pollHealthUntilDown(): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(HEALTH_URL);
      if (!r.ok) return;
    } catch {
      return; // ECONNREFUSED → daemon is down, success
    }
    await new Promise((res) => setTimeout(res, HEALTH_POLL_INTERVAL_MS));
  }
  throw new Error(`daemon still responding after ${HEALTH_TIMEOUT_MS}ms`);
}

function spawnFd(args: string[], opts: { cwd?: string } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const repoRoot = join(import.meta.dirname, '..', '..', '..');
    const fdBin = join(
      repoRoot,
      'packages',
      'dispatch-cli',
      'src',
      'bin',
      'fd.ts',
    );
    const child = spawn(
      'node',
      ['--import', 'tsx', fdBin, ...args],
      { cwd: opts.cwd ?? repoRoot },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });
  });
}

interface CollectedEvent {
  type: string;
  session: string;
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

async function waitForEvent(
  ws: WebSocket,
  predicate: (e: CollectedEvent) => boolean,
  timeoutMs: number,
): Promise<CollectedEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`event predicate not satisfied within ${timeoutMs}ms`));
    }, timeoutMs);
    function handler(raw: Buffer | string): void {
      try {
        const e = JSON.parse(String(raw)) as CollectedEvent;
        if (predicate(e)) {
          clearTimeout(timeout);
          ws.off('message', handler);
          resolve(e);
        }
      } catch {
        // malformed; skip
      }
    }
    ws.on('message', handler);
  });
}

async function pruneSmokeSessions(): Promise<void> {
  if (!existsSync(SESSIONS_PATH)) return;
  try {
    const raw = readFileSync(SESSIONS_PATH, 'utf8');
    const reg = JSON.parse(raw) as {
      version: number;
      sessions: Record<string, unknown>;
    };
    let mutated = false;
    for (const name of Object.keys(reg.sessions)) {
      if (name.startsWith('z2-smoke-')) {
        delete reg.sessions[name];
        mutated = true;
      }
    }
    if (mutated) {
      writeFileSync(SESSIONS_PATH, JSON.stringify(reg, null, 2), 'utf8');
    }
  } catch {
    // best-effort cleanup
  }
}

async function operatorManualCheckpoint(): Promise<boolean> {
  if (skipManual) {
    console.log('');
    console.log('S8 (operator-manual browser checkpoint): SKIPPED via --skip-manual');
    return true;
  }
  console.log('');
  console.log('────────────────────────────────────────────────────────');
  console.log('S8 — operator-manual browser checkpoint');
  console.log('────────────────────────────────────────────────────────');
  console.log('1. Open http://127.0.0.1:7878/ in your browser.');
  console.log(`2. Paste token from ${TOKEN_PATH} into the prompt.`);
  console.log(`3. Observe session card "${SESSION_NAME}" in dashboard.`);
  console.log(
    '4. Observe handoff banner renders ("Handoff written for ' +
      SESSION_NAME +
      '").',
  );
  console.log('');
  process.stdout.write('Press [y]+Enter to acknowledge, [n]+Enter to fail: ');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => {
    rl.once('line', (line: string) => {
      rl.close();
      resolve(line.trim().toLowerCase());
    });
  });
  return answer === 'y' || answer === 'yes';
}

async function main(): Promise<void> {
  console.log('Foxworks Dispatch — Z-2 cross-session composition smoke');
  console.log(`  smoke prefix: ${SMOKE_PREFIX}`);
  console.log('');

  const tempCwd = join(tmpdir(), `${SMOKE_PREFIX}-cwd`);
  let installed = false;

  try {
    // S1 — daemon install + health
    await execFileP(
      'pnpm',
      ['--filter', 'dispatch-daemon', 'install:daemon'],
      {
        cwd: join(import.meta.dirname, '..', '..', '..'),
      },
    );
    installed = true;
    const health = await pollHealthUntilUp();
    if (health.status !== 'ok') {
      throw new Error(`/v2/health returned status=${health.status}`);
    }
    if (typeof health.notifications_available !== 'boolean') {
      throw new Error(
        '/v2/health response missing notifications_available field (post-T18 schema regression)',
      );
    }
    step({
      name: 'S1 daemon install + health',
      ok: true,
      detail: `daemon up; notifications_available=${health.notifications_available}`,
    });

    // Read token now that daemon has written it
    const token = readFileSync(TOKEN_PATH, 'utf8').trim();

    // S2 — WS subscribe
    const ws = new WebSocket(WS_URL(token));
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`WS open timeout (${WS_OPEN_TIMEOUT_MS}ms)`)),
        WS_OPEN_TIMEOUT_MS,
      );
      ws.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    step({
      name: 'S2 WS subscribe',
      ok: true,
      detail: `connected to ${WS_URL('***')}`,
    });

    // S3 — fd init via daemon
    mkdirSync(tempCwd, { recursive: true });
    // Create real tmux session — daemon's prompts route validates
    // pane liveness via tmuxOps.hasSession(target) before sendKeys.
    // Detached session (-d), 80x24 dimensions; killed in finally.
    await execFileP('tmux', [
      'new-session',
      '-d',
      '-s',
      SESSION_NAME,
      '-x',
      '80',
      '-y',
      '24',
    ]);
    const initResult = await spawnFd([
      'init',
      SESSION_NAME,
      '--cwd',
      tempCwd,
      '--target',
      TMUX_TARGET,
    ]);
    if (initResult.exitCode !== 0) {
      throw new Error(
        `fd init exit ${initResult.exitCode}: ${initResult.stderr}`,
      );
    }
    // Post-S3 assertion (operator pre-reg refinement): GET
    // /v2/sessions/:name returns expected armed state.
    // Confirms session registered + watcher attached.
    const stateRes = await fetch(STATE_URL(SESSION_NAME), {
      headers: { 'x-conductor-token': token },
    });
    if (!stateRes.ok) {
      throw new Error(
        `GET /v2/sessions/${SESSION_NAME} returned ${stateRes.status}`,
      );
    }
    const sessionData = (await stateRes.json()) as { state: string };
    if (sessionData.state !== 'armed') {
      throw new Error(
        `expected state=armed; got state=${sessionData.state}`,
      );
    }
    step({
      name: 'S3 fd init via daemon (+ state=armed assertion)',
      ok: true,
      detail: `${SESSION_NAME} created; daemon confirms armed`,
    });

    // S4 — fd send → prompt_sent on WS
    const promptFile = join(tempCwd, 'smoke-prompt.txt');
    writeFileSync(promptFile, 'Z-2 smoke prompt body\n', 'utf8');
    const sendPromise = waitForEvent(
      ws,
      (e) => e.type === 'prompt_sent' && e.session === SESSION_NAME,
      PROMPT_EVENT_TIMEOUT_MS,
    );
    const sendResult = await spawnFd(['send', SESSION_NAME, promptFile]);
    if (sendResult.exitCode !== 0) {
      throw new Error(
        `fd send exit ${sendResult.exitCode}: ${sendResult.stderr}`,
      );
    }
    const promptEvent = await sendPromise;
    step({
      name: 'S4 fd send → prompt_sent on WS',
      ok: true,
      detail: `event arrived (size_chars=${promptEvent.data.size_chars})`,
    });

    // S5 — HANDOFF.md → handoff_written on WS
    const handoffPromise = waitForEvent(
      ws,
      (e) => e.type === 'handoff_written' && e.session === SESSION_NAME,
      HANDOFF_EVENT_TIMEOUT_MS,
    );
    writeFileSync(
      join(tempCwd, 'HANDOFF.md'),
      '# Z-2 smoke handoff\n\nfrom session ' + SESSION_NAME + '\n',
      'utf8',
    );
    const handoffEvent = await handoffPromise;
    step({
      name: 'S5 HANDOFF.md → handoff_written on WS',
      ok: true,
      detail: `event arrived (size_bytes=${handoffEvent.data.size_bytes})`,
    });

    // Operator-manual browser checkpoint (S8 happens before
    // uninstall so daemon is still running for browser observation)
    let manualOk = true;
    if (!skipManual) {
      manualOk = await operatorManualCheckpoint();
      step({
        name: 'S8 operator-manual browser checkpoint',
        ok: manualOk,
        detail: manualOk ? 'operator confirmed' : 'operator REJECTED',
      });
    }

    ws.close();

    // S6 — daemon uninstall
    await execFileP(
      'pnpm',
      ['--filter', 'dispatch-daemon', 'uninstall:daemon'],
      {
        cwd: join(import.meta.dirname, '..', '..', '..'),
      },
    );
    installed = false;
    await pollHealthUntilDown();
    step({
      name: 'S6 daemon uninstall',
      ok: true,
      detail: 'launchctl bootout + plist removed; /v2/health unreachable',
    });

    // S7 — cleanup verification (only z2-smoke-* removed)
    await pruneSmokeSessions();
    let remainingSmoke = 0;
    if (existsSync(SESSIONS_PATH)) {
      const raw = readFileSync(SESSIONS_PATH, 'utf8');
      const reg = JSON.parse(raw) as { sessions: Record<string, unknown> };
      remainingSmoke = Object.keys(reg.sessions).filter((n) =>
        n.startsWith('z2-smoke-'),
      ).length;
    }
    if (remainingSmoke !== 0) {
      throw new Error(`${remainingSmoke} z2-smoke-* sessions remain`);
    }
    step({
      name: 'S7 cleanup verification',
      ok: true,
      detail: 'no z2-smoke-* entries remain; operator pre-existing state preserved',
    });

    if (!skipManual && !manualOk) {
      throw new Error('operator-manual browser checkpoint REJECTED');
    }
  } finally {
    // Try/finally cleanup per Z-1 precedent: even on mid-test
    // failure, uninstall daemon + prune smoke sessions so
    // operator state is reset.
    if (installed) {
      try {
        await execFileP(
          'pnpm',
          ['--filter', 'dispatch-daemon', 'uninstall:daemon'],
          { cwd: join(import.meta.dirname, '..', '..', '..') },
        );
      } catch {
        console.error('  ⚠ uninstall failed during cleanup; manual remediation may be needed');
      }
    }
    try {
      await pruneSmokeSessions();
    } catch {
      /* best-effort */
    }
    try {
      rmSync(tempCwd, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
    try {
      await execFileP('tmux', ['kill-session', '-t', SESSION_NAME]);
    } catch {
      /* best-effort — tmux session may not exist (early-failure path) */
    }
  }

  console.log('');
  console.log('────────────────────────────────────────────────────────');
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`Z-2 smoke: ${passed}/${total} steps passed`);
  console.log('────────────────────────────────────────────────────────');
  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(
    '\nZ-2 smoke FAILED:',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
