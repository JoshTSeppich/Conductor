// MB-S05 harness: spawns Electron, asserts E2/E3/E4 sentinels, exits 0 on pass.
// Pattern mirrors MB-S04 spawn-and-observe (KNOWN K1-K3).
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Spike-local Electron binary (installed by npm install in spike dir).
const ELECTRON_BIN = resolve(__dirname, 'node_modules/.bin/electron');
const MAIN_JS = resolve(__dirname, 'dist/main/main.js');
const TIMEOUT_MS = 15_000;

// Shared output accumulator + waiter queue for ordered sentinel detection.
let accumulated = '';
const waiters = [];

function onData(chunk) {
  accumulated += chunk.toString();
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (accumulated.includes(waiters[i].sentinel)) {
      waiters[i].resolve();
      waiters.splice(i, 1);
    }
  }
}

function waitForSentinel(sentinel) {
  if (accumulated.includes(sentinel)) return Promise.resolve();
  return new Promise((resolve) => waiters.push({ sentinel, resolve }));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`timeout (${ms}ms) waiting for: ${label}`)), ms),
    ),
  ]);
}

function waitForExit(child) {
  return new Promise((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal })),
  );
}

console.log(`MB-S05 harness: spawning ${ELECTRON_BIN}`);

const child = spawn(ELECTRON_BIN, [MAIN_JS], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
});

child.stdout.on('data', (chunk) => {
  process.stdout.write(`[e-stdout] ${chunk}`);
  onData(chunk);
});

child.stderr.on('data', (chunk) => {
  // Electron emits diagnostic noise on stderr; log but don't fail on it.
  process.stderr.write(`[e-stderr] ${chunk}`);
});

child.on('error', (err) => {
  console.error('HARNESS_FAIL: spawn error:', err.message);
  process.exit(1);
});

const t0 = Date.now();

try {
  // E2: file:// HTML loaded → did-finish-load → WINDOW_READY on stdout.
  await withTimeout(waitForSentinel('WINDOW_READY'), TIMEOUT_MS, 'WINDOW_READY');
  const t1 = Date.now();
  console.log(`✓ E2: WINDOW_READY (${t1 - t0}ms) — file:// HTML loaded in BrowserWindow`);

  // E3: React mounted → useEffect → console.log('RENDER_OK') → console-message → stdout.
  await withTimeout(waitForSentinel('RENDER_OK'), TIMEOUT_MS, 'RENDER_OK');
  const t2 = Date.now();
  console.log(`✓ E3: RENDER_OK (${t2 - t1}ms after WINDOW_READY) — React mounted in sandboxed renderer`);

  // E4: stdin QUIT → app.quit() → exit 0 (MB-S04 K3 pattern).
  child.stdin.write('QUIT\n');
  const { code, signal } = await withTimeout(waitForExit(child), TIMEOUT_MS, 'process exit');
  const t3 = Date.now();

  if (code !== 0) {
    throw new Error(`Expected exit 0, got code=${code} signal=${signal}`);
  }
  console.log(`✓ E4: Exit code ${code} (${t3 - t2}ms after QUIT) — deterministic clean exit`);
  console.log(`✓ E4: Full cycle: spawn→WINDOW_READY=${t1 - t0}ms, →RENDER_OK=${t2 - t0}ms, →exit=${t3 - t0}ms`);
  console.log('HARNESS_PASS');
  process.exit(0);
} catch (err) {
  console.error('HARNESS_FAIL:', err.message);
  try {
    child.kill('SIGKILL');
  } catch (_) {}
  process.exit(1);
}
