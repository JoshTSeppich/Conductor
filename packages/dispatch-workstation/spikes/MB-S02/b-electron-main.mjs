#!/usr/bin/env node
// MB-S02 step B — Electron main process env/PTY/registration probes.
//
// Run from packages/dispatch-menubar:
//   npx electron spikes/MB-S02/b-electron-main.mjs
//
// Two spawn contexts tested:
//   B1 — inherited env (process.env as-is, simulates npx electron from terminal)
//   B2 — minimal launchd env (simulates .app opened from Finder/Spotlight)
//
// Writes to spikes/MB-S02/results/:
//   env-electron-process.txt   process.env at Electron main-process startup
//   env-electron-b1.txt        env vars seen by tmux pane (B1 inherited)
//   pty-electron-b1.txt        PTY state seen by tmux pane (B1 inherited)
//   env-electron-b2.txt        env vars seen by tmux pane (B2 minimal launchd)
//   pty-electron-b2.txt        PTY state seen by tmux pane (B2 minimal launchd)
//   session-electron.json      POST /v2/sessions response (B1 env)

import { app } from 'electron';
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SPIKE_DIR, 'results');
const TOKEN_PATH = join(process.env.HOME ?? '/tmp', '.foxworks-dispatch', 'token');
const DAEMON_URL = 'http://127.0.0.1:7878';
const TMUX_BIN = process.env.TMUX_BIN ?? '/opt/homebrew/bin/tmux';

// Minimal launchd environment — simulates macOS .app launch context (DAEMON-Z-2).
// PATH is the default macOS launchd PATH; excludes Homebrew, nvm, pyenv, etc.
const LAUNCHD_MIN_ENV = {
  HOME: process.env.HOME ?? '/tmp',
  USER: process.env.USER ?? 'unknown',
  LOGNAME: process.env.LOGNAME ?? process.env.USER ?? 'unknown',
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  TMPDIR: process.env.TMPDIR ?? '/tmp',
};

function log(msg) {
  process.stdout.write(`[MB-S02/B] ${msg}\n`);
}

function log2(msg) {
  process.stdout.write(`[MB-S02/B]   ${msg}\n`);
}

mkdirSync(RESULTS_DIR, { recursive: true });

// ── Step 1: capture process.env at Electron startup ─────────────────────────
function captureProcessEnv() {
  const lines = Object.entries(process.env)
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const outPath = join(RESULTS_DIR, 'env-electron-process.txt');
  writeFileSync(outPath, lines.join('\n') + '\n');
  log(`process.env captured → env-electron-process.txt (${lines.length} vars)`);
  return outPath;
}

// ── Step 2: tmux probe helper ────────────────────────────────────────────────
// Spawns an isolated tmux server (-L <socket> -f /dev/null) with the given
// environment. Runs the probe script, polls for completion, kills the server.
async function runTmuxProbe({ label, socket, script, outPath, env }) {
  log(`Spawning ${label} probe (socket: ${socket})…`);

  // new-session -d (detached) -s <name> -x 220 -y 50 -- bash <script> <out>
  const sessionName = `${socket}-probe`;
  await execFileAsync(TMUX_BIN, [
    '-L', socket,
    '-f', '/dev/null',
    'new-session', '-d',
    '-s', sessionName,
    '-x', '220', '-y', '50',
    '--',
    'bash', script, outPath,
  ], { env });

  // Poll until session exits (probe script exits → tmux session destroyed)
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      await execFileAsync(TMUX_BIN, ['-L', socket, 'has-session', '-t', sessionName]);
      await new Promise(r => setTimeout(r, 300));
    } catch {
      // has-session returns non-zero when session no longer exists → done
      break;
    }
  }

  if (Date.now() >= deadline) {
    log(`ERROR: ${label} probe did not exit within 30s`);
    await execFileAsync(TMUX_BIN, ['-L', socket, 'kill-server']).catch(() => {});
    throw new Error(`${label} probe timeout`);
  }

  await execFileAsync(TMUX_BIN, ['-L', socket, 'kill-server']).catch(() => {});

  const lineCount = readFileSync(outPath, 'utf8').split('\n').filter(Boolean).length;
  log(`${label} probe complete → ${outPath.replace(SPIKE_DIR + '/', '')} (${lineCount} lines)`);
}

// ── Step 3: session registration probe ──────────────────────────────────────
async function runRegistrationProbe() {
  const outPath = join(RESULTS_DIR, 'session-electron.json');

  if (!existsSync(TOKEN_PATH)) {
    log(`WARNING: token not found at ${TOKEN_PATH} — skipping registration probe`);
    writeFileSync(outPath, JSON.stringify({ skipped: true, reason: 'token not found' }, null, 2) + '\n');
    return;
  }

  const token = readFileSync(TOKEN_PATH, 'utf8').trim();
  const probeName = `mb-s02-electron-reg-${process.pid}`;
  const probeCwd = RESULTS_DIR;
  const probeHandoff = join(probeCwd, 'HANDOFF.md');

  log(`Registering probe session: ${probeName}`);

  let httpCode = 0;
  let body = null;

  try {
    const resp = await fetch(`${DAEMON_URL}/v2/sessions`, {
      method: 'POST',
      headers: {
        'X-Conductor-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: probeName,
        cwd: probeCwd,
        tmux_target: 'mb-s02-electron:0.0',
        handoff_path: probeHandoff,
      }),
    });
    httpCode = resp.status;
    body = await resp.json().catch(() => null);
  } catch (err) {
    log(`Registration request failed: ${err.message}`);
    writeFileSync(outPath, JSON.stringify({ error: err.message, http_code: 0, body: null }, null, 2) + '\n');
    return;
  }

  writeFileSync(outPath, JSON.stringify({ http_code: httpCode, body }, null, 2) + '\n');
  log(`Registration HTTP ${httpCode}`);

  if (httpCode === 201) {
    try {
      await fetch(`${DAEMON_URL}/v2/sessions/${probeName}/state`, {
        method: 'PATCH',
        headers: {
          'X-Conductor-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'killed' }),
      });
      log(`Probe session killed (registry cleaned up)`);
    } catch (err) {
      log(`WARNING: cleanup PATCH failed: ${err.message}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
app.dock?.hide();

app.whenReady().then(async () => {
  log('Electron main process probe starting');
  log2(`Electron version: ${process.versions.electron}`);
  log2(`Node version:     ${process.versions.node}`);
  log2(`Platform:         ${process.platform} ${process.arch}`);
  log2(`tmux binary:      ${TMUX_BIN}`);
  log2(`process.env PATH entries: ${(process.env.PATH ?? '').split(':').filter(Boolean).length}`);

  try {
    // Step 1 — capture process.env
    captureProcessEnv();

    const probeEnvSh = join(SPIKE_DIR, 'probe-env.sh');
    const probePtySh = join(SPIKE_DIR, 'probe-pty.sh');

    // Step 2a — B1: inherited env (process.env as-is)
    await runTmuxProbe({
      label: 'B1-env',
      socket: `mb-s02-b1-env-${process.pid}`,
      script: probeEnvSh,
      outPath: join(RESULTS_DIR, 'env-electron-b1.txt'),
      env: { ...process.env },
    });

    await runTmuxProbe({
      label: 'B1-pty',
      socket: `mb-s02-b1-pty-${process.pid}`,
      script: probePtySh,
      outPath: join(RESULTS_DIR, 'pty-electron-b1.txt'),
      env: { ...process.env },
    });

    // Step 2b — B2: minimal launchd env
    await runTmuxProbe({
      label: 'B2-env',
      socket: `mb-s02-b2-env-${process.pid}`,
      script: probeEnvSh,
      outPath: join(RESULTS_DIR, 'env-electron-b2.txt'),
      env: { ...LAUNCHD_MIN_ENV },
    });

    await runTmuxProbe({
      label: 'B2-pty',
      socket: `mb-s02-b2-pty-${process.pid}`,
      script: probePtySh,
      outPath: join(RESULTS_DIR, 'pty-electron-b2.txt'),
      env: { ...LAUNCHD_MIN_ENV },
    });

    // Step 3 — session registration
    await runRegistrationProbe();

    log('');
    log('Electron probes complete.');
    log2('env-electron-process.txt  written');
    log2('env-electron-b1.txt       written');
    log2('pty-electron-b1.txt       written');
    log2('env-electron-b2.txt       written');
    log2('pty-electron-b2.txt       written');
    log2('session-electron.json     written');
    log('');
    log('Next: node spikes/MB-S02/compare-envs.mjs');
  } catch (err) {
    log(`FATAL: ${err.message}`);
    log(err.stack ?? '');
    app.exit(1);
    return;
  }

  app.exit(0);
});
