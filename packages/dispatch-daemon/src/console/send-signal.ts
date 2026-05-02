/**
 * CONSOLE-T01 — production sendSignal implementation.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 signal dispatch table (frozen at
 * a7e8d4f) + MB-S06 ADR §3 KNOWN findings:
 *
 *   SIGINT  → tmux send-keys C-c (sends PTY byte 0x03 via tmux's
 *             key-name lookup; matches the existing daemon pattern at
 *             state/transitions.ts:57 for armed→held). Returns 'send_keys'.
 *   SIGTERM → process.kill(panePid, SIGTERM). panePid resolved via
 *             `tmux display-message -p '#{pane_pid}'`. Returns 'kill_2'.
 *   SIGHUP  → process.kill(panePid, SIGHUP). Same panePid path.
 *             Returns 'kill_2'.
 *
 * Per MB-S06 §3 KNOWN gotcha: when the pane process is bash and bash
 * has forked a child, kill(2) on the bash pid may not propagate to the
 * child for SIGINT (deferred-trap behavior in non-interactive bash).
 * For Claude Code as the pane process leader, kill(2) is straightforward
 * because claude is foreground and is the actual recipient.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DispatchMethod } from './console-ops.js';

const execFileP = promisify(execFile);
const TMUX_BIN = 'tmux';

async function panePid(target: string): Promise<number> {
  const { stdout } = await execFileP(TMUX_BIN, [
    'display-message', '-p', '-t', target, '#{pane_pid}',
  ]);
  const pid = parseInt(stdout.trim(), 10);
  if (!Number.isFinite(pid)) {
    throw new Error(`failed to resolve pane PID for tmux target ${target}`);
  }
  return pid;
}

export async function defaultSendSignal(
  target: string,
  signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP',
): Promise<DispatchMethod> {
  if (signal === 'SIGINT') {
    await execFileP(TMUX_BIN, ['send-keys', '-t', target, 'C-c']);
    return 'send_keys';
  }
  // SIGTERM, SIGHUP: kill(2) on pane PID.
  const pid = await panePid(target);
  process.kill(pid, signal);
  return 'kill_2';
}
