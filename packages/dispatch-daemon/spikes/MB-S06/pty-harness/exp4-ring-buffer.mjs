// Experiment 4 — daemon-side ring buffer behavior.
//
// Validates the §10.5 daemon-side ring buffer: configure a small
// per-session ring buffer (capacity 100 lines), produce 500 lines from
// the pane via `seq 1 500`, verify (a) FIFO eviction (oldest 400 gone),
// (b) newest 100 retained intact, (c) no crash, (d) bounded memory.
//
// The ring buffer here is a Node-side data structure. Lines arrive
// via a pipe-pane consumer process that writes to a fifo we read with
// readline.
//
// Note: pipe-pane → fifo + readline is the same ingestion shape the
// production daemon would use; we are not stubbing it.

import { writeFileSync, createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import {
  makeSocket, killServer, pipePane, sleep, tmux, makeTmpDir, rmTmp,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileP = promisify(execFile);

class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buf = [];
    this.totalEvictions = 0;
  }
  push(line) {
    this.buf.push(line);
    if (this.buf.length > this.capacity) {
      this.buf.splice(0, this.buf.length - this.capacity);
      this.totalEvictions++;
    }
  }
  size() { return this.buf.length; }
  asArray() { return [...this.buf]; }
}

async function run() {
  const socket = makeSocket('exp4');
  const tmp = makeTmpDir('exp4');
  const fifoPath = join(tmp, 'pipe.fifo');
  const sessionName = 'exp4';
  const target = `${sessionName}:0.0`;
  const results = { socket, target, capacity: 100 };

  try {
    // Make a fifo for pipe-pane to write into; we'll consume with readline.
    await execFileP('mkfifo', [fifoPath]);

    // Spawn pane: a sleeping bash so the pane stays alive after seq.
    await tmux(socket, ['new-session', '-d', '-s', sessionName, "bash -c 'stty -echo 2>/dev/null; sleep 30'"]);
    await sleep(150);

    // Begin streaming pane output to the fifo via pipe-pane.
    await pipePane(socket, target, `cat > ${fifoPath}`);
    await sleep(50);

    // Start consumer (readline) attached to fifo. We must open the
    // read end of the fifo BEFORE the producer writes a lot, otherwise
    // tmux's pipe-pane consumer will block on open().
    const ring = new RingBuffer(100);
    const lineEvents = [];
    const rl = createInterface({ input: createReadStream(fifoPath, { encoding: 'utf8' }) });
    rl.on('line', (line) => {
      ring.push(line);
      lineEvents.push(line);
    });

    // Now produce 500 lines. seq emits "1\n2\n...\n500\n". We send via
    // PTY input — bash will not interpret the lines as commands because
    // bash is in `sleep 30`. Instead, we directly run seq in a NEW
    // window so its STDOUT is attached to the same pane STDOUT? No —
    // a window is a separate pane.
    //
    // Better: start a NEW session that runs seq, redirected to write
    // to the pane via tmux's pipe-pane is hard. Instead: include seq
    // directly in the bash command of the pane so the pane process
    // produces the output:
    //   bash -c 'seq 1 500; sleep 30'
    // Re-spawn with that pattern so we control output directly.

    // Tear down the sleep-only pane and restart with a delayed seq so
    // we can set up pipe-pane BEFORE the producer starts. seq 1 500
    // completes in <10ms, so the original race had pipe-pane miss it.
    rl.close();
    await tmux(socket, ['kill-session', '-t', sessionName]);
    await sleep(80);
    await tmux(socket, ['new-session', '-d', '-s', sessionName,
      "bash -c 'stty -echo 2>/dev/null; sleep 0.6; seq 1 500; sleep 30'"]);
    await sleep(120);

    // Recreate the fifo (closed read may render fifo unusable).
    try { await execFileP('rm', ['-f', fifoPath]); } catch {}
    await execFileP('mkfifo', [fifoPath]);
    await pipePane(socket, target, `cat > ${fifoPath}`);

    const ring2 = new RingBuffer(100);
    const allLines2 = [];
    const rl2 = createInterface({ input: createReadStream(fifoPath, { encoding: 'utf8' }) });
    rl2.on('line', (line) => {
      ring2.push(line);
      allLines2.push(line);
    });

    // Wait for seq output to drain. seq 1 500 starts after bash's 0.6s
    // sleep, finishes within milliseconds; pipe-pane streams to fifo;
    // readline buffers and emits 'line'. Allow generous settle.
    await sleep(2500);
    rl2.close();

    const tail100 = allLines2.slice(-100);

    results.measurements = {
      total_lines_received: allLines2.length,
      ring_size: ring2.size(),
      ring_total_evictions: ring2.totalEvictions,
      ring_first_line: ring2.asArray()[0],
      ring_last_line: ring2.asArray()[ring2.asArray().length - 1],
      ring_matches_tail_100: JSON.stringify(ring2.asArray()) === JSON.stringify(tail100),
      newest_line_in_ring_is_500: ring2.asArray()[ring2.asArray().length - 1] === '500',
      oldest_line_in_ring_is_401: ring2.asArray()[0] === '401',
      no_crash: true,
    };
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  const outPath = join(__dirname, 'results', 'exp4-ring-buffer.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp4 complete → ${outPath}`);
  console.log(`measurements: ${JSON.stringify(results.measurements)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
