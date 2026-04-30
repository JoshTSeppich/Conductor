#!/usr/bin/env node
// MB-S02 step E — failure mode coverage.
//
// Tests five failure modes for Electron-spawned tmux sessions:
//
//   FM-1  tmux binary not found (ENOENT from execFile)
//   FM-2  claude binary not found inside tmux pane (session spawns, process exits 127)
//   FM-3  daemon unreachable (connection refused on POST /v2/sessions)
//   FM-4  name collision — killed record (409 "Session name in use (killed record exists)")
//   FM-5  max-sessions cap (NOT ENFORCED in v2.0.1; v3 must add)
//
// NOTE: FM-1 and FM-2 are tested with synthetic inputs — we do NOT kill the
// real tmux binary or unlink claude. FM-2 is tested by asking tmux to spawn
// a command that exits 127 (simulating "command not found").
//
// FM-4 requires the daemon to be reachable and a valid token. If the token
// is missing or the daemon is down, FM-4 is skipped.
//
// Writes:
//   results/failure-modes.json
//
// Run from packages/dispatch-menubar:
//   node spikes/MB-S02/failure-modes.mjs

import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const SPIKE_DIR   = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SPIKE_DIR, 'results');
const TOKEN_PATH  = join(process.env.HOME ?? '/tmp', '.foxworks-dispatch', 'token');
const DAEMON_URL  = 'http://127.0.0.1:7878';
const TMUX_BIN    = process.env.TMUX_BIN ?? '/opt/homebrew/bin/tmux';

function log(msg)  { process.stdout.write(`[MB-S02/E] ${msg}\n`); }
function log2(msg) { process.stdout.write(`[MB-S02/E]   ${msg}\n`); }

// ── FM-1: tmux not found ─────────────────────────────────────────────────────
async function testFM1() {
  log('FM-1: tmux binary not found (ENOENT)');
  const fakeTmux = '/nonexistent/bin/tmux-does-not-exist';
  const socket = `mb-s02-fm1-${process.pid}`;
  let result;
  try {
    await execFileAsync(fakeTmux, [
      '-L', socket, '-f', '/dev/null',
      'new-session', '-d', '-s', `${socket}-probe`,
      '-x', '80', '-y', '24', '--', 'true',
    ]);
    result = { status: 'UNEXPECTED_SUCCESS', error: null };
  } catch (err) {
    if (err.code === 'ENOENT') {
      result = { status: 'PASS', error_code: 'ENOENT', message: err.message };
    } else {
      result = { status: 'UNEXPECTED_ERROR', error_code: err.code, message: err.message };
    }
  }
  log2(`verdict: ${result.status}${result.error_code ? ` (${result.error_code})` : ''}`);
  return { id: 'FM-1', description: 'tmux binary not found', ...result };
}

// ── FM-2: claude not found in pane ──────────────────────────────────────────
// Simulates the case where tmux spawns successfully but the command inside
// the pane exits 127 (shell "command not found"). We spawn:
//   bash -c 'exit 127'
// Then verify the pane was created and exited promptly.
async function testFM2() {
  log('FM-2: command inside pane exits 127 (simulates claude not found)');
  const socket = `mb-s02-fm2-${process.pid}`;
  const sessionName = `${socket}-probe`;
  let spawnError = null;

  try {
    await execFileAsync(TMUX_BIN, [
      '-L', socket, '-f', '/dev/null',
      'new-session', '-d', '-s', sessionName,
      '-x', '80', '-y', '24', '--',
      'bash', '-c', 'exit 127',
    ], { env: { HOME: process.env.HOME, PATH: process.env.PATH } });
  } catch (err) {
    spawnError = { code: err.code, message: err.message };
  }

  // If spawn succeeded, poll for session exit (the pane exits immediately)
  let exitedPromptly = false;
  if (!spawnError) {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      try {
        await execFileAsync(TMUX_BIN, ['-L', socket, 'has-session', '-t', sessionName]);
        await new Promise(r => setTimeout(r, 200));
      } catch {
        exitedPromptly = true;
        break;
      }
    }
    await execFileAsync(TMUX_BIN, ['-L', socket, 'kill-server']).catch(() => {});
  }

  // FM-2 pass criteria:
  // - tmux spawn itself succeeds (no ENOENT — tmux IS found)
  // - the pane exits promptly (exit 127 is not retried by tmux)
  // The Workstation must detect this and surface it to the user (v3 concern).
  const status = spawnError
    ? (spawnError.code === 'ENOENT' ? 'SKIP_TMUX_NOT_FOUND' : 'SPAWN_ERROR')
    : (exitedPromptly ? 'PASS' : 'TIMEOUT');

  const result = {
    id: 'FM-2',
    description: 'claude binary not found inside pane (exit 127 simulation)',
    status,
    spawn_error: spawnError,
    pane_exited_promptly: exitedPromptly,
    note: 'tmux does not retry on non-zero exit; pane is destroyed immediately. Workstation v3 must detect short-lived sessions and surface error to user.',
  };
  log2(`verdict: ${status}`);
  return result;
}

// ── FM-3: daemon unreachable ─────────────────────────────────────────────────
async function testFM3() {
  log('FM-3: daemon unreachable (connection refused)');
  const fakeUrl = 'http://127.0.0.1:19999'; // nothing listening here
  const token = existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf8').trim() : 'probe-token';

  let result;
  try {
    await fetch(`${fakeUrl}/v2/sessions`, {
      method: 'POST',
      headers: { 'X-Conductor-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'fm3-probe', cwd: '/tmp', tmux_target: 'x:0.0', handoff_path: '/tmp/h.md' }),
      signal: AbortSignal.timeout(3000),
    });
    result = { status: 'UNEXPECTED_SUCCESS' };
  } catch (err) {
    const isConnRefused = err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed');
    result = {
      status: isConnRefused ? 'PASS' : 'UNEXPECTED_ERROR',
      error_type: err.constructor.name,
      error_message: err.message,
    };
  }
  log2(`verdict: ${result.status}`);
  return { id: 'FM-3', description: 'daemon unreachable (connection refused)', ...result };
}

// ── FM-4: name collision — killed record ─────────────────────────────────────
async function testFM4(token) {
  log('FM-4: name collision — killed record');
  if (!token) {
    log2('SKIP: no token');
    return { id: 'FM-4', description: 'name collision — killed record (409)', status: 'SKIP', reason: 'token not found' };
  }

  const probeName = `mb-s02-fm4-${process.pid}`;
  const probeCwd  = RESULTS_DIR;
  const probeHandoff = join(probeCwd, 'HANDOFF.md');

  // Register once
  let firstHttp, secondHttp, secondBody;
  try {
    const r1 = await fetch(`${DAEMON_URL}/v2/sessions`, {
      method: 'POST',
      headers: { 'X-Conductor-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: probeName, cwd: probeCwd, tmux_target: 'mb-s02-fm4:0.0', handoff_path: probeHandoff }),
      signal: AbortSignal.timeout(5000),
    });
    firstHttp = r1.status;
  } catch (err) {
    log2(`SKIP: first registration failed: ${err.message}`);
    return { id: 'FM-4', description: 'name collision — killed record (409)', status: 'SKIP', reason: err.message };
  }

  if (firstHttp !== 201) {
    log2(`SKIP: first registration HTTP ${firstHttp} (expected 201)`);
    return { id: 'FM-4', description: 'name collision — killed record (409)', status: 'SKIP', reason: `first HTTP ${firstHttp}` };
  }

  // Kill the session
  await fetch(`${DAEMON_URL}/v2/sessions/${probeName}/state`, {
    method: 'PATCH',
    headers: { 'X-Conductor-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'killed' }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {});

  // Try to register again with same name (should 409 — killed record)
  try {
    const r2 = await fetch(`${DAEMON_URL}/v2/sessions`, {
      method: 'POST',
      headers: { 'X-Conductor-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: probeName, cwd: probeCwd, tmux_target: 'mb-s02-fm4:0.0', handoff_path: probeHandoff }),
      signal: AbortSignal.timeout(5000),
    });
    secondHttp = r2.status;
    secondBody = await r2.json().catch(() => null);
  } catch (err) {
    return { id: 'FM-4', description: 'name collision — killed record (409)', status: 'ERROR', reason: err.message };
  }

  // Per §4.3 contract: killed-record collision → 409 with specific message
  const expectedMsg = 'Session name in use (killed record exists). Pick a new name.';
  const gotExpectedMsg = secondBody?.error === expectedMsg || secondBody?.message === expectedMsg || JSON.stringify(secondBody ?? '').includes('killed record');
  const status = secondHttp === 409 ? (gotExpectedMsg ? 'PASS' : 'PASS_MSG_DIFFERS') : 'DIVERGENCE';

  log2(`verdict: ${status} (HTTP ${secondHttp})`);
  return {
    id: 'FM-4',
    description: 'name collision — killed record (409)',
    status,
    first_http: firstHttp,
    second_http: secondHttp,
    second_body: secondBody,
    expected_http: 409,
    expected_message_fragment: 'killed record exists',
  };
}

// ── FM-5: max-sessions cap ───────────────────────────────────────────────────
async function testFM5() {
  log('FM-5: max-sessions cap');
  // Per code review of packages/dispatch-daemon/src/routes/sessions.ts:
  // POST /v2/sessions does NOT enforce a max-sessions cap in v2.0.1.
  // Cap must be added in v3. This is a KNOWN gap, not a runtime test.
  const result = {
    id: 'FM-5',
    description: 'max-sessions cap',
    status: 'NOT_ENFORCED',
    note: 'v2.0.1 POST /v2/sessions has no max-sessions cap. Cap is a v3 requirement. Cannot test failure mode that does not exist. Workstation v3 must add cap enforcement before FM-5 can be PASS.',
    v3_action: 'Add max_sessions cap check in POST /v2/sessions handler; return 429 or 503 with descriptive error.',
  };
  log2(`verdict: ${result.status} (v3 gap)`);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
log('Failure mode coverage starting');

const token = existsSync(TOKEN_PATH) ? readFileSync(TOKEN_PATH, 'utf8').trim() : null;
if (!token) log('WARNING: token not found — FM-4 will be skipped');

const results = await Promise.all([
  testFM1(),
  testFM2(),
  testFM3(),
  testFM4(token),
  testFM5(),
]);

const verdicts = results.map(r => ({ id: r.id, status: r.status }));
const passCount = results.filter(r => r.status === 'PASS' || r.status === 'PASS_MSG_DIFFERS').length;

const report = {
  generated_at: new Date().toISOString(),
  summary: { total: 5, pass: passCount, skip: results.filter(r => r.status === 'SKIP').length, not_enforced: results.filter(r => r.status === 'NOT_ENFORCED').length },
  verdicts,
  details: results,
};

const outPath = join(RESULTS_DIR, 'failure-modes.json');
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

log('failure-modes.json written');
for (const v of verdicts) {
  log2(`${v.id}: ${v.status}`);
}
