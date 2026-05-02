// MB-S06 PTY harness — common helpers.
//
// Spawn isolated tmux servers per experiment via `-L <socket>` so a
// running production tmux server cannot pollute or be polluted by the
// harness. Each experiment owns its socket and tears it down in finally.
//
// All tmux invocations go through execFile (no shell, no interpolation).

import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const execFileP = promisify(execFile);

export const TMUX = process.env.TMUX_BIN || '/opt/homebrew/bin/tmux';

export function makeSocket(tag) {
  return `mb-s06-${tag}-${process.pid}-${Math.floor(Math.random() * 1e6)}`;
}

export function tmuxArgs(socket, args) {
  return ['-L', socket, '-f', '/dev/null', ...args];
}

export async function tmux(socket, args) {
  return await execFileP(TMUX, tmuxArgs(socket, args));
}

// load-buffer accepts content from stdin; we wrap to send raw bytes.
// Returns nothing; throws on failure.
export async function loadBuffer(socket, name, bytes) {
  await new Promise((resolve, reject) => {
    const child = execFile(
      TMUX,
      tmuxArgs(socket, ['load-buffer', '-b', name, '-']),
      (err) => (err ? reject(err) : resolve()),
    );
    child.stdin.end(bytes);
  });
}

// Paste-buffer is literal-by-design: the bytes loaded via load-buffer
// are inserted into the target pane's PTY stdin as raw bytes, NOT
// interpreted as tmux key names.
//
// IMPORTANT (KNOWN harness finding, exp1): without -r, tmux replaces
// every LF (0x0A) in the buffer with CR (0x0D) at paste time (default
// separator behavior, per `paste-buffer [-r] [-s separator]`). Pass
// noReplace=true to use -r and preserve LF bytes verbatim.
export async function pasteBuffer(socket, name, target, opts = {}) {
  const flags = opts.noReplace ? ['paste-buffer', '-r', '-b', name, '-t', target]
                                : ['paste-buffer', '-b', name, '-t', target];
  await tmux(socket, flags);
}

export async function deleteBuffer(socket, name) {
  try { await tmux(socket, ['delete-buffer', '-b', name]); } catch {}
}

// Convenience: load+paste+delete a single payload of raw bytes to the
// target pane's PTY stdin. NO Enter is appended — caller controls.
// Pass noReplace=true to disable tmux's default LF→CR translation.
export async function pasteRaw(socket, target, bytes, opts = {}) {
  const name = `fd-${randomUUID()}`;
  try {
    await loadBuffer(socket, name, bytes);
    await pasteBuffer(socket, name, target, opts);
  } finally {
    await deleteBuffer(socket, name);
  }
}

// Send a tmux key-name (e.g., "Enter", "C-c") to the target pane.
export async function sendKey(socket, target, key) {
  await tmux(socket, ['send-keys', '-t', target, key]);
}

export async function newSession(socket, name, command) {
  // -d detached, -s session name. Command is bash-shell ran by tmux.
  await tmux(socket, ['new-session', '-d', '-s', name, command]);
}

export async function killServer(socket) {
  try { await tmux(socket, ['kill-server']); } catch {}
}

// Start `tmux pipe-pane -O -t <target> '<shellCmd>'` to begin streaming
// pane output. -O = open a new pipe even if one is already open.
// The shellCmd runs via /bin/sh -c.
export async function pipePane(socket, target, shellCmd) {
  await tmux(socket, ['pipe-pane', '-O', '-t', target, shellCmd]);
}

// Stop piping by calling pipe-pane with no command.
export async function pipePaneStop(socket, target) {
  await tmux(socket, ['pipe-pane', '-t', target]);
}

// Read N bytes from a path that grows over time. Polls on size up to
// timeoutMs. Returns the buffer contents.
export async function waitForFileBytes(path, minBytes, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(path)) {
      const sz = statSync(path).size;
      if (sz >= minBytes) return readFileSync(path);
    }
    await sleep(20);
  }
  if (existsSync(path)) return readFileSync(path);
  return Buffer.alloc(0);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function makeTmpDir(tag) {
  return mkdtempSync(join(tmpdir(), `mb-s06-${tag}-`));
}

export function rmTmp(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

// Find PID of the leader of a tmux pane. Returns number or null.
export async function panePid(socket, target) {
  try {
    const { stdout } = await tmux(socket, ['display-message', '-p', '-t', target, '#{pane_pid}']);
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// Test if a process is alive by sending signal 0.
export function processAlive(pid) {
  if (pid == null) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

// Capture pane snapshot via tmux capture-pane -p. Returns string.
export async function capturePane(socket, target, lines = 200) {
  const { stdout } = await tmux(socket, [
    'capture-pane', '-t', target, '-p', '-S', `-${lines}`,
  ]);
  return stdout;
}
