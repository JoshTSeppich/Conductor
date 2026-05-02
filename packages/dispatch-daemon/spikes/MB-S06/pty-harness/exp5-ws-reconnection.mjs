// Experiment 5 — WebSocket reconnection mid-stream with backfill.
//
// Validates §10.5 daemon-side ring-buffer backfill on client reconnect:
//   1. Client connects, daemon streams N1 lines through.
//   2. Client disconnects. Daemon continues to receive pane output.
//   3. While client is gone, M lines arrive at daemon (lost from
//      client's POV but retained in daemon ring buffer).
//   4. Client reconnects. Backfill protocol: client sends last_seq it
//      received; daemon replays missed lines from ring buffer, then
//      resumes live stream.
//   5. Client compares: full sequence reconstructed without gap or
//      duplicate.
//
// We use the `ws` library (already a daemon dev-dep) so the protocol
// shape is realistic. The "daemon" here is a Node WebSocket server
// running in the same harness process; the "pane" is a tmux session
// that emits a numbered sequence at a controlled rate.

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
    this.entries = []; // { seq, line }
    this.nextSeq = 1;
  }
  push(line) {
    const seq = this.nextSeq++;
    this.entries.push({ seq, line });
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
    return seq;
  }
  since(lastSeq) {
    return this.entries.filter((e) => e.seq > lastSeq);
  }
  oldest() { return this.entries[0]?.seq ?? 0; }
  newest() { return this.entries[this.entries.length - 1]?.seq ?? 0; }
}

async function run() {
  const socket = makeSocket('exp5');
  const tmp = makeTmpDir('exp5');
  const fifoPath = join(tmp, 'pipe.fifo');
  const sessionName = 'exp5';
  const target = `${sessionName}:0.0`;
  const results = { socket, target };

  const ring = new RingBuffer(1000);
  // Track all events for the "current" subscriber (single connection
  // model: when client connects, server sends backfill since their
  // last_seq, then any new pushes).
  const subscribers = new Set(); // Set of { ws, lastSeqSent }

  // Daemon-side: when a new line is pushed, broadcast to all live ws.
  function broadcast(seq, line) {
    for (const sub of subscribers) {
      if (sub.ws.readyState === WebSocket.OPEN) {
        sub.ws.send(JSON.stringify({ type: 'line', seq, line }));
        sub.lastSeqSent = seq;
      }
    }
  }

  let wssPort;
  try {
    // 1) Start fifo + tmux pane producing one numbered line every 50ms
    //    via a bash loop. We want enough granularity to disconnect
    //    mid-stream and observe backfill.
    await execFileP('mkfifo', [fifoPath]);
    await tmux(socket, ['new-session', '-d', '-s', sessionName,
      "bash -c 'stty -echo 2>/dev/null; sleep 0.6; for i in $(seq 1 200); do echo LINE_$i; sleep 0.025; done; sleep 30'"]);
    await sleep(120);
    await pipePane(socket, target, `cat > ${fifoPath}`);

    // 2) Start ingest: read fifo, push to ring, broadcast.
    const rl = createInterface({ input: createReadStream(fifoPath, { encoding: 'utf8' }) });
    rl.on('line', (line) => {
      const seq = ring.push(line);
      broadcast(seq, line);
    });

    // 3) Start WS server.
    const wss = new WebSocketServer({ port: 0 });
    await new Promise((r) => wss.on('listening', r));
    wssPort = wss.address().port;
    wss.on('connection', (ws) => {
      const sub = { ws, lastSeqSent: 0 };
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString('utf8'));
        if (msg.type === 'subscribe') {
          // Backfill anything since msg.last_seq, sent oldest-first.
          const missed = ring.since(msg.last_seq || 0);
          ws.send(JSON.stringify({
            type: 'backfill_meta',
            ring_oldest: ring.oldest(),
            ring_newest: ring.newest(),
            missed_count: missed.length,
            requested_last_seq: msg.last_seq || 0,
            backfill_complete: (msg.last_seq || 0) + 1 >= ring.oldest(),
          }));
          for (const e of missed) {
            ws.send(JSON.stringify({ type: 'line', seq: e.seq, line: e.line }));
          }
          sub.lastSeqSent = ring.newest();
          subscribers.add(sub);
        }
      });
      ws.on('close', () => { subscribers.delete(sub); });
    });

    // 4) Client #1: receive 50 lines, then disconnect.
    const client1Lines = [];
    const client1Meta = [];
    const ws1 = new WebSocket(`ws://127.0.0.1:${wssPort}`);
    await new Promise((r) => ws1.on('open', r));
    ws1.on('message', (raw) => {
      const msg = JSON.parse(raw.toString('utf8'));
      if (msg.type === 'line') client1Lines.push(msg);
      else client1Meta.push(msg);
    });
    ws1.send(JSON.stringify({ type: 'subscribe', last_seq: 0 }));
    // Wait until client1 has received 50 lines.
    const t0 = Date.now();
    while (client1Lines.length < 50 && Date.now() - t0 < 5000) await sleep(20);
    const lastSeqClient1 = client1Lines[client1Lines.length - 1]?.seq ?? 0;
    ws1.close();
    await sleep(50);

    // 5) Daemon continues; let M=30 more lines accumulate while client gone.
    await sleep(30 * 30); // 30 lines * ~30ms each (25ms producer + jitter)

    // 6) Client #2 reconnects from lastSeqClient1.
    const client2Lines = [];
    const client2Meta = [];
    const ws2 = new WebSocket(`ws://127.0.0.1:${wssPort}`);
    await new Promise((r) => ws2.on('open', r));
    ws2.on('message', (raw) => {
      const msg = JSON.parse(raw.toString('utf8'));
      if (msg.type === 'line') client2Lines.push(msg);
      else client2Meta.push(msg);
    });
    ws2.send(JSON.stringify({ type: 'subscribe', last_seq: lastSeqClient1 }));
    // Receive enough live lines to declare "live again".
    const t1 = Date.now();
    while (client2Lines.length < 60 && Date.now() - t1 < 6000) await sleep(20);
    ws2.close();

    // 7) Reconstruct: client1 lines + client2 lines, dedupe by seq.
    const seen = new Map();
    for (const l of [...client1Lines, ...client2Lines]) {
      if (!seen.has(l.seq)) seen.set(l.seq, l.line);
    }
    const allSeqs = [...seen.keys()].sort((a, b) => a - b);
    const minSeq = allSeqs[0];
    const maxSeq = allSeqs[allSeqs.length - 1];
    const expectedLen = maxSeq - minSeq + 1;
    const noGap = allSeqs.length === expectedLen;

    // Check no duplicates between the two clients' explicit message
    // lists (before dedupe). If WS reconnect is correct, last_seq=N
    // means daemon backfills from N+1 — no overlap with client1.
    const c1Seqs = new Set(client1Lines.map((l) => l.seq));
    const overlap = client2Lines.filter((l) => c1Seqs.has(l.seq));

    results.measurements = {
      client1_lines_received: client1Lines.length,
      client1_last_seq: lastSeqClient1,
      client2_meta: client2Meta,
      client2_lines_received: client2Lines.length,
      reconstructed_min_seq: minSeq,
      reconstructed_max_seq: maxSeq,
      reconstructed_count: allSeqs.length,
      no_gap_after_dedupe: noGap,
      overlap_count_between_clients: overlap.length,
      ring_oldest_at_reconnect: client2Meta[0]?.ring_oldest,
      ring_newest_at_reconnect: client2Meta[0]?.ring_newest,
      missed_count_at_reconnect: client2Meta[0]?.missed_count,
    };

    rl.close();
    wss.close();
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  const outPath = join(__dirname, 'results', 'exp5-ws-reconnection.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp5 complete → ${outPath}`);
  console.log(`measurements: ${JSON.stringify(results.measurements)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
