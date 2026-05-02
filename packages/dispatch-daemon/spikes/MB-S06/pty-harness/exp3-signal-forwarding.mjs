// Experiment 3 — signal forwarding via tmux PTY.
//
// Two delivery mechanisms must be characterized:
//   (A) Bytes via PTY input — sending control-byte 0x03 (Ctrl-C),
//       0x1c (Ctrl-\, QUIT), 0x04 (Ctrl-D EOF) etc. through paste-buffer
//       or send-keys. The PTY's line discipline (when ISIG is enabled,
//       i.e. cooked mode) translates these bytes to signals delivered
//       to the foreground process group of the pty.
//   (B) Direct kill(2) on the pane process PID — used when no PTY byte
//       maps to the desired signal (TERM, HUP), or for full pgroup
//       targeting via kill(2) on a process-group leader.
//
// Per §10.6 the POST .../console/signal endpoint must support
// SIGINT/SIGTERM/SIGHUP. This experiment data-grounds which signals
// are deliverable via which mechanism and surfaces the gotchas.
//
// Target program: bash with traps installed for INT/TERM/HUP. Bash
// uses the `read` builtin (no fork) so bash IS the foreground process
// for kill(2) tests — avoids the non-interactive-bash deferred-trap
// gotcha (only INT/QUIT are deferred-until-foreground-returns; for a
// `read` builtin, bash itself is foreground).
//
// Bash also writes the trap fired into a SENTINEL FILE so we can
// inspect the result even if the pane is torn down.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeSocket, killServer, panePid, processAlive,
  pasteRaw, sendKey, sleep, tmux, makeTmpDir, rmTmp,
} from './lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileP = promisify(execFile);

async function ensureCleanServer(socket) {
  try { await tmux(socket, ['kill-server']); } catch {}
  await sleep(80);
}

function trapScript(sigfile) {
  // Bash writes "READY" then loops on read. Each trap fires on its
  // signal and appends to $SIGFILE before exiting. The use of `read`
  // (a bash builtin) keeps bash itself in the foreground, so kill(2)
  // on the pane PID hits the bash that owns the trap handlers.
  return `bash -c 'SIGFILE="${sigfile}";` +
    `trap "echo SIGINT_TRAPPED  >> \\"$SIGFILE\\"; exit 130" INT;` +
    `trap "echo SIGTERM_TRAPPED >> \\"$SIGFILE\\"; exit 143" TERM;` +
    `trap "echo SIGHUP_TRAPPED  >> \\"$SIGFILE\\"; exit 129" HUP;` +
    `echo READY >> "$SIGFILE"; while true; do read line || break; echo "GOT:$line" >> "$SIGFILE"; done'`;
}

async function trial(opts) {
  const { socket, target, sessionName, sigfile, deliver, lookFor, timeoutMs = 3000 } = opts;
  await ensureCleanServer(socket);
  try { await execFileP('rm', ['-f', sigfile]); } catch {}
  await tmux(socket, ['new-session', '-d', '-s', sessionName, trapScript(sigfile)]);
  await sleep(220);
  const pidBefore = await panePid(socket, target);
  const aliveBefore = processAlive(pidBefore);
  // Wait for READY in sigfile.
  const readyDeadline = Date.now() + 1500;
  while (Date.now() < readyDeadline) {
    if (existsSync(sigfile) && readFileSync(sigfile, 'utf8').includes('READY')) break;
    await sleep(40);
  }
  let deliverError = null;
  try { await deliver(pidBefore); } catch (e) { deliverError = e.message; }
  const start = Date.now();
  let aliveAfter = aliveBefore;
  let sentinelMatchAt = null;
  while (Date.now() - start < timeoutMs) {
    const sigContent = existsSync(sigfile) ? readFileSync(sigfile, 'utf8') : '';
    if (lookFor && sigContent.includes(lookFor) && sentinelMatchAt == null) {
      sentinelMatchAt = Date.now() - start;
    }
    aliveAfter = processAlive(pidBefore);
    if (sentinelMatchAt != null && !aliveAfter) break;
    await sleep(40);
  }
  const sigContent = existsSync(sigfile) ? readFileSync(sigfile, 'utf8') : '';
  return {
    pid_before: pidBefore,
    alive_before: aliveBefore,
    alive_after: aliveAfter,
    look_for: lookFor,
    sentinel_match_ms: sentinelMatchAt,
    sentinel_contains_look_for: lookFor ? sigContent.includes(lookFor) : null,
    sentinel_content: sigContent.slice(-300),
    deliver_error: deliverError,
  };
}

async function run() {
  const socket = makeSocket('exp3');
  const tmp = makeTmpDir('exp3');
  const sigfile = join(tmp, 'sig.txt');
  const sessionName = 'exp3';
  const target = `${sessionName}:0.0`;
  const results = { socket, target, trials: [] };

  try {
    results.trials.push({
      id: 'A1_SIGINT_via_PTY_byte_0x03',
      mechanism: 'paste-buffer with single byte 0x03 (Ctrl-C); PTY ISIG translates to SIGINT for foreground pgrp',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGINT_TRAPPED',
        deliver: async () => {
          await pasteRaw(socket, target, Buffer.from([0x03]), { noReplace: true });
        },
      })),
    });

    results.trials.push({
      id: 'A2_SIGINT_via_send_keys_C-c',
      mechanism: 'tmux send-keys -t target C-c (equivalent to byte 0x03)',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGINT_TRAPPED',
        deliver: async () => { await sendKey(socket, target, 'C-c'); },
      })),
    });

    results.trials.push({
      id: 'B1_SIGINT_via_kill_pane_pid',
      mechanism: 'process.kill(panePid, SIGINT) — bash is foreground (using read builtin)',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGINT_TRAPPED',
        deliver: async (pid) => { if (pid) process.kill(pid, 'SIGINT'); },
      })),
    });

    results.trials.push({
      id: 'A3_SIGTERM_via_PTY_bytes_NOT_DELIVERABLE',
      mechanism: 'no PTY byte translates to SIGTERM — sends arbitrary text instead; expects SIGTERM_TRAPPED to NOT appear',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGTERM_TRAPPED', timeoutMs: 1200,
        deliver: async () => {
          await pasteRaw(socket, target, Buffer.from('attempt-via-text\n', 'utf8'), { noReplace: true });
        },
      })),
    });

    results.trials.push({
      id: 'B2_SIGTERM_via_kill_pane_pid',
      mechanism: 'process.kill(panePid, SIGTERM)',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGTERM_TRAPPED',
        deliver: async (pid) => { if (pid) process.kill(pid, 'SIGTERM'); },
      })),
    });

    results.trials.push({
      id: 'B3_SIGHUP_via_kill_pane_pid',
      mechanism: 'process.kill(panePid, SIGHUP)',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGHUP_TRAPPED',
        deliver: async (pid) => { if (pid) process.kill(pid, 'SIGHUP'); },
      })),
    });

    results.trials.push({
      id: 'B4_SIGHUP_via_tmux_kill_session',
      mechanism: 'tmux kill-session — tears down PTY, kernel raises SIGHUP to controlling pgrp',
      ...(await trial({
        socket, target, sessionName, sigfile, lookFor: 'SIGHUP_TRAPPED',
        deliver: async () => {
          await tmux(socket, ['kill-session', '-t', sessionName]);
        },
      })),
    });
  } catch (err) {
    results.error = { message: err.message, stack: err.stack };
  } finally {
    await killServer(socket);
    rmTmp(tmp);
  }

  results.summary = {
    total_trials: results.trials.length,
    sigint_via_pty_byte: results.trials[0]?.sentinel_contains_look_for === true,
    sigint_via_send_keys_Cc: results.trials[1]?.sentinel_contains_look_for === true,
    sigint_via_kill: results.trials[2]?.sentinel_contains_look_for === true,
    sigterm_via_pty_byte: results.trials[3]?.sentinel_contains_look_for === false,
    sigterm_via_kill: results.trials[4]?.sentinel_contains_look_for === true,
    sighup_via_kill: results.trials[5]?.sentinel_contains_look_for === true,
    sighup_via_kill_session: results.trials[6]?.sentinel_contains_look_for === true,
  };

  const outPath = join(__dirname, 'results', 'exp3-signal-forwarding.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`exp3 complete → ${outPath}`);
  for (const t of results.trials) {
    console.log(`  ${t.id}: alive_after=${t.alive_after} matched=${t.sentinel_contains_look_for} sentinel="${t.sentinel_content.replace(/\n/g, '|').slice(0,80)}"`);
  }
  console.log(`summary: ${JSON.stringify(results.summary)}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
