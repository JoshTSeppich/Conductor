// Experiment 2 — backpressure when consumer is slower than producer.
//
// Hypothesis: when daemon-side reader (simulated WS) is slower than
// the producer's STDOUT rate, tmux's pipe-pane buffer (the OS pipe
// between tmux and the consumer command) provides natural backpressure
// — when the pipe buffer fills, tmux blocks on the write to it, which
// in turn blocks the pane process's STDOUT write. This means CC's
// output is paced by the consumer's read rate, not lost.
//
// We test: spawn `yes` in a pane (fastest sustained STDOUT producer
// available). pipe-pane to a slow consumer (sh that sleeps between
// reads). After 2 seconds, stop and measure (a) how many bytes the
// consumer received, (b) whether the producer was paced (STDOUT byte
// count modest, not e.g. gigabytes), (c) memory does not blow up in
// tmux.
//
// To check (c) we read RSS of the tmux server process via ps before
// and after the burst. If tmux were buffering everything in-memory,
// RSS would grow without bound.

import { writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync } from 'node:fs';
import {
  makeSocket, newSession, killServer, pipePane, pipePaneStop,
  makeTmpDir, rmTmp, sleep, tmux,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileP = promisify(execFile);

async function getServerPid(socket) {
  // tmux display-message can show server pid in newer versions, but
  // a portable way: use ps to find tmux server with our socket label.
  const { stdout } = await execFileP('pgrep', ['-f', `tmux.*-L ${socket}`]);
  return parseInt(stdout.trim().split('\n')[0], 10);
}

async function getRss(pid) {
  if (!Number.isFinite(pid)) return null;
  try {
    const { stdout } = await execFileP('ps', ['-o', 'rss=', '-p', String(pid)]);
    return parseInt(stdout.trim(), 10); // KB
  } catch { return null; }
}

async function run() {
  const socket = makeSocket('exp2');
  const tmp = makeTmpDir('exp2');
  const captureFile = join(tmp, 'capture.bin');
  const sessionName = 'exp2';
  const target = `${sessionName}:0.0`;
  const results = { socket, tmp, target, phases: [] };

  try {
    // Producer: `yes` writes "y\n" repeatedly as fast as possible.
    await newSession(socket, sessionName, 'yes');
    await sleep(150);

    const serverPid = await getServerPid(socket);
    const rssBefore = await getRss(serverPid);

    // Slow consumer: read 4096 bytes, sleep 100ms, read again.
    // This caps the consumer at ~40KB/s — far below `yes`'s native
    // rate (typically tens of MB/s on modern hardware).
    const slowConsumer = `dd of=${captureFile} bs=4096 oflag=append conv=notrunc 2>/dev/null & ` +
                         `sleep 0.1; while true; do dd if=/dev/stdin of=${captureFile} bs=4096 count=1 oflag=append conv=notrunc 2>/dev/null; sleep 0.1; done`;
    // Simpler: use `awk` with usleep style. Let's just use a while-read
    // loop with `head -c 4096` and sleep.
    const slowConsumerSimple = `bash -c 'while head -c 4096 >> ${captureFile}; do sleep 0.1; done'`;
    await pipePane(socket, target, slowConsumerSimple);

    const burstMs = 2000;
    await sleep(burstMs);
    const sizeAfterBurst = existsSync(captureFile) ? statSync(captureFile).size : 0;
    const rssDuring = await getRss(serverPid);

    // Stop pipe; measure final
    await pipePaneStop(socket, target);
    await sleep(200);
    const sizeAfterStop = existsSync(captureFile) ? statSync(captureFile).size : 0;
    const rssAfter = await getRss(serverPid);

    // Quick estimate: an unconstrained `yes` produces tens of MB/s on
    // M-series macs. If pipe-pane back-pressured properly, we expect
    // the file to contain ~ (consumer-rate * burst-window) bytes,
    // i.e. roughly 4096 * (burstMs / 100) = 81920 bytes (~80KB).
    const expectedConsumerRate = (4096 * (burstMs / 100));

    results.phases.push({
      stage: 'measured',
      burst_ms: burstMs,
      bytes_to_consumer_during: sizeAfterBurst,
      bytes_to_consumer_after_stop: sizeAfterStop,
      expected_consumer_capacity_bytes: expectedConsumerRate,
      // KNOWN sanity check: if back-pressure works, observed << what
      // unbounded yes would produce in the same window (>= 10MB).
      observed_lt_unbounded: sizeAfterStop < 10 * 1024 * 1024,
      tmux_server_pid: serverPid,
      tmux_rss_kb_before: rssBefore,
      tmux_rss_kb_during: rssDuring,
      tmux_rss_kb_after: rssAfter,
      // RSS growth bounded means tmux is NOT buffering unboundedly.
      rss_growth_kb_during: rssDuring != null && rssBefore != null ? rssDuring - rssBefore : null,
      rss_growth_bounded: (rssDuring != null && rssBefore != null) ? (rssDuring - rssBefore) < 50_000 : null, // <50MB
    });
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  const outPath = join(__dirname, 'results', 'exp2-backpressure.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp2 complete → ${outPath}`);
  console.log(`phases: ${JSON.stringify(results.phases)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
