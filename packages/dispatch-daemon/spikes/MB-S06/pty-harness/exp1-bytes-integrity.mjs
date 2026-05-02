// Experiment 1 — bytes integrity round-trip.
//
// Hypothesis: bytes pasted via tmux load-buffer + paste-buffer arrive at
// the pane process's STDIN unmodified, and STDOUT bytes captured via
// `tmux pipe-pane -O` arrive at the daemon-side pipe unmodified.
//
// Method: spawn `bash -c 'stty raw -echo; cat'` in an isolated tmux
// session. cat runs in raw mode (no line discipline) and echo off (so
// only cat's STDOUT writes appear). Daemon-side: pipe-pane to a temp
// file (the file is the simulated daemon-side ring-buffer write target).
// Send each test payload; sleep briefly; read file; compare.
//
// Test payloads:
//   ASCII "hello\n"
//   Multi-byte UTF-8: CJK "こんにちは\n", emoji "🦊🚀\n"
//   Control chars: ESC + bracket sequence "\x1b[31mRED\x1b[0m\n"
//   Large input: 8KB random ASCII
//
// We deliberately do NOT use stty cooked mode here so signal bytes and
// line-discipline don't interfere with the byte-comparison.
//
// Output: results/exp1-bytes-integrity.json

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeSocket, newSession, killServer, pipePane, pasteRaw,
  waitForFileBytes, makeTmpDir, rmTmp, sleep,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const socket = makeSocket('exp1');
  const tmp = makeTmpDir('exp1');
  const captureFile = join(tmp, 'capture.bin');
  const sessionName = 'exp1';
  const target = `${sessionName}:0.0`;

  const cases = [
    { name: 'ascii_short',     payload: Buffer.from('hello, world\n', 'utf8') },
    { name: 'utf8_cjk',        payload: Buffer.from('こんにちは世界\n', 'utf8') },
    { name: 'utf8_emoji',      payload: Buffer.from('🦊🚀✨\n', 'utf8') },
    { name: 'esc_ansi',        payload: Buffer.from('\x1b[31mRED\x1b[0m\n', 'utf8') },
    { name: 'large_8kb',       payload: Buffer.concat([Buffer.from('A'.repeat(8190), 'ascii'), Buffer.from('\n', 'ascii')]) },
    { name: 'mixed_binary_ish', payload: Buffer.from([0x09, 0x20, 0x7e, 0xc3, 0xa9, 0xe2, 0x98, 0x83, 0x0a]) }, // tab, space, ~, é, ☃, \n
  ];

  const results = { socket, tmp, target, cases: [], modes: {} };

  // Run each case under both modes: default paste-buffer (LF→CR
  // translation ON) and -r (translation OFF). We need both for the
  // ADR. The cases array is replayed twice with separate captures.
  async function runMode(modeTag, noReplace) {
    const captureFileMode = `${captureFile}.${modeTag}`;
    await pipePane(socket, target, `cat >> ${captureFileMode}`);
    await sleep(50);
    let cumulativeExpected = Buffer.alloc(0);
    const modeCases = [];
    for (const c of cases) {
      const before = cumulativeExpected.length;
      await pasteRaw(socket, target, c.payload, { noReplace });
      cumulativeExpected = Buffer.concat([cumulativeExpected, c.payload]);
      const buf = await waitForFileBytes(captureFileMode, cumulativeExpected.length, 4000);
      const slice = buf.subarray(before, before + c.payload.length);
      const match = Buffer.compare(slice, c.payload) === 0;
      modeCases.push({
        name: c.name,
        expected_len: c.payload.length,
        captured_len: slice.length,
        captured_total_after: buf.length,
        match,
        expected_hex_first_64: c.payload.subarray(0, 64).toString('hex'),
        captured_hex_first_64: slice.subarray(0, 64).toString('hex'),
      });
    }
    return modeCases;
  }

  try {
    // Use stty raw -echo so the PTY does not transform our bytes and
    // does not double-echo. cat then writes our bytes back to STDOUT.
    await newSession(socket, sessionName, "bash -c 'stty raw -echo 2>/dev/null; exec cat'");
    await sleep(150);

    results.modes.default_lf_translation = await runMode('default', false);
    // Restart pipe between modes so files are separate.
    await sleep(50);
    results.modes.no_replace_dash_r     = await runMode('rflag',   true);

    // Keep top-level cases as the no_replace results (the byte-faithful
    // mode the daemon should use).
    results.cases = results.modes.no_replace_dash_r;
      // cat is unbuffered; output should appear quickly. Wait until
      // file has at least the expected cumulative size.
    results.summary = {
      mode_default: {
        passed: results.modes.default_lf_translation.filter((r) => r.match).length,
        failed: results.modes.default_lf_translation.filter((r) => !r.match).length,
      },
      mode_no_replace: {
        passed: results.modes.no_replace_dash_r.filter((r) => r.match).length,
        failed: results.modes.no_replace_dash_r.filter((r) => !r.match).length,
      },
    };
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  const outPath = join(__dirname, 'results', 'exp1-bytes-integrity.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp1 complete → ${outPath}`);
  console.log(`summary: ${JSON.stringify(results.summary)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
