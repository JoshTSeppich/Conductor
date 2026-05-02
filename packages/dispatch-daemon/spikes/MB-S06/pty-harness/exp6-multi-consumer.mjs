// Experiment 6 — multi-consumer fan-out from a single tmux PTY reader.
//
// Validates §10.6 stream endpoint design: two simultaneous WebSocket
// clients subscribed to the same session's stream both receive
// identical bytes; the daemon-side PTY reader is shared (single
// pipe-pane, single fifo, single readline) — NOT duplicated; closing
// one client's WS does not affect the other.
//
// Method: same daemon scaffold as exp5, but two ws clients open
// simultaneously, both subscribe at last_seq=0 (full backfill from
// empty ring), receive lines, then we kill client A and verify
// client B keeps receiving.

import { writeFileSync, createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { WebSocketServer, WebSocket } from 'ws';
import {
  makeSocket, killServer, pipePane, sleep, tmux, makeTmpDir, rmTmp,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileP = promisify(execFile);

class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.entries = [];
    this.nextSeq = 1;
  }
  push(line) {
    const seq = this.nextSeq++;
    this.entries.push({ seq, line });
    if (this.entries.length > this.capacity) this.entries.splice(0, this.entries.length - this.capacity);
    return seq;
  }
  since(lastSeq) { return this.entries.filter((e) => e.seq > lastSeq); }
}

async function run() {
  const socket = makeSocket('exp6');
  const tmp = makeTmpDir('exp6');
  const fifoPath = join(tmp, 'pipe.fifo');
  const sessionName = 'exp6';
  const target = `${sessionName}:0.0`;
  const results = { socket, target };

  const ring = new RingBuffer(1000);
  const subscribers = new Set();
  let readerInvocations = 0;

  function broadcast(seq, line) {
    for (const sub of subscribers) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.send(JSON.stringify({ type: 'line', seq, line }));
      }
    }
  }

  try {
    await execFileP('mkfifo', [fifoPath]);
    await tmux(socket, ['new-session', '-d', '-s', sessionName,
      "bash -c 'stty -echo 2>/dev/null; sleep 0.6; for i in $(seq 1 200); do echo SHARED_$i; sleep 0.025; done; sleep 30'"]);
    await sleep(120);
    await pipePane(socket, target, `cat > ${fifoPath}`);

    // Single shared readline: this is the proof that the PTY reader is
    // not duplicated. Both consumers read from the broadcast, not from
    // independent pipe-panes.
    const rl = createInterface({ input: createReadStream(fifoPath, { encoding: 'utf8' }) });
    rl.on('line', (line) => {
      readerInvocations++;
      const seq = ring.push(line);
      broadcast(seq, line);
    });

    const wss = new WebSocketServer({ port: 0 });
    await new Promise((r) => wss.on('listening', r));
    const port = wss.address().port;
    wss.on('connection', (ws) => {
      const sub = { ws };
      subscribers.add(sub);
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString('utf8'));
        if (msg.type === 'subscribe') {
          for (const e of ring.since(msg.last_seq || 0)) {
            ws.send(JSON.stringify({ type: 'line', seq: e.seq, line: e.line }));
          }
        }
      });
      ws.on('close', () => subscribers.delete(sub));
    });

    // Open two clients simultaneously.
    const linesA = []; const linesB = [];
    const wsA = new WebSocket(`ws://127.0.0.1:${port}`);
    const wsB = new WebSocket(`ws://127.0.0.1:${port}`);
    await Promise.all([
      new Promise((r) => wsA.on('open', r)),
      new Promise((r) => wsB.on('open', r)),
    ]);
    wsA.on('message', (raw) => {
      const m = JSON.parse(raw.toString('utf8'));
      if (m.type === 'line') linesA.push(m);
    });
    wsB.on('message', (raw) => {
      const m = JSON.parse(raw.toString('utf8'));
      if (m.type === 'line') linesB.push(m);
    });
    wsA.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    wsB.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));

    // Both run for ~50 lines.
    const t0 = Date.now();
    while ((linesA.length < 60 || linesB.length < 60) && Date.now() - t0 < 6000) await sleep(20);

    // Snapshot both at the same point.
    const snapAtCloseA = [...linesA];
    const snapAtCloseB = [...linesB];

    // Close A, keep B going.
    wsA.close();
    await sleep(40); // allow close handshake

    const linesAAfterClose = linesA.length;

    // Wait for B to receive ~30 more lines.
    const waitForBMore = linesB.length + 30;
    const t1 = Date.now();
    while (linesB.length < waitForBMore && Date.now() - t1 < 5000) await sleep(20);
    wsB.close();

    // Compare A and B at close-of-A: identical seqs and lines for the
    // overlapping range.
    const seqsA = snapAtCloseA.map((l) => l.seq);
    const seqsB = snapAtCloseB.map((l) => l.seq);
    const overlapMaxSeq = Math.min(seqsA[seqsA.length - 1] || 0, seqsB[seqsB.length - 1] || 0);
    const aInRange = snapAtCloseA.filter((l) => l.seq <= overlapMaxSeq);
    const bInRange = snapAtCloseB.filter((l) => l.seq <= overlapMaxSeq);
    const identical = JSON.stringify(aInRange) === JSON.stringify(bInRange);

    results.measurements = {
      reader_invocations_total: readerInvocations,
      lines_a_at_close: snapAtCloseA.length,
      lines_b_at_close: snapAtCloseB.length,
      a_b_identical_in_overlap: identical,
      overlap_max_seq: overlapMaxSeq,
      lines_a_after_close_did_not_grow: linesA.length === linesAAfterClose,
      lines_b_kept_growing: linesB.length > snapAtCloseB.length,
      lines_b_final: linesB.length,
    };

    rl.close();
    wss.close();
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  const outPath = join(__dirname, 'results', 'exp6-multi-consumer.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp6 complete → ${outPath}`);
  console.log(`measurements: ${JSON.stringify(results.measurements)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
