/**
 * CONSOLE-T01 — production attachStream implementation.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.1 PTY-reader-sharing invariant +
 * §4.7.3 stream endpoint, mirrored from the MB-S06 harness pattern
 * (packages/dispatch-daemon/spikes/MB-S06/pty-harness/exp{4,5,6}.mjs):
 *
 *   1. Create a fifo (per-attach mkfifo in a tmpdir).
 *   2. `tmux pipe-pane -O -t <target> 'cat > <fifo>'` — tmux opens the
 *      write end and starts streaming the pane's STDOUT bytes.
 *   3. Open the fifo's read end via fs.createReadStream + readline.
 *   4. For each line readline emits, invoke `onLine(Buffer)`.
 *   5. close() stops pipe-pane (`tmux pipe-pane -t <target>`), closes
 *      the readline interface, and unlinks the fifo.
 *
 * Backpressure (KNOWN per MB-S06 §4): pipe-pane back-pressures the
 * pane process at the OS-pipe layer; if the readline consumer falls
 * behind, the producer is naturally paced down. No additional
 * consumer-side rate limiting is needed at this layer.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface, type Interface as ReadlineInterface } from 'node:readline';
import type { ConsoleStreamHandle } from './console-ops.js';

const execFileP = promisify(execFile);
const TMUX_BIN = 'tmux';

export function defaultAttachStream(
  target: string,
  onLine: (line: Buffer) => void,
): ConsoleStreamHandle {
  const dir = mkdtempSync(join(tmpdir(), 'fd-console-stream-'));
  const fifoPath = join(dir, 'pipe.fifo');

  // Setup is async but the interface is sync (for symmetric ergonomics
  // with the test stub). We kick off setup and stash the cleanup state.
  let rl: ReadlineInterface | null = null;
  let pipeOpened = false;
  let closed = false;

  void (async () => {
    try {
      await execFileP('mkfifo', [fifoPath]);
      await execFileP(TMUX_BIN, ['pipe-pane', '-O', '-t', target, `cat > ${fifoPath}`]);
      pipeOpened = true;
      if (closed) {
        await stopPipeAndCleanup();
        return;
      }
      rl = createInterface({ input: createReadStream(fifoPath, { encoding: 'utf8' }) });
      rl.on('line', (line) => {
        // readline strips the trailing \n; preserve it so the WS
        // line message carries the byte-faithful payload.
        onLine(Buffer.from(`${line}\n`, 'utf8'));
      });
    } catch (err) {
      // Setup failure — clean up best-effort. Errors logged by caller.
      await stopPipeAndCleanup().catch(() => {});
      throw err;
    }
  })();

  async function stopPipeAndCleanup(): Promise<void> {
    if (pipeOpened) {
      try {
        await execFileP(TMUX_BIN, ['pipe-pane', '-t', target]);
      } catch {
        /* tmux pane gone, nothing to detach */
      }
      pipeOpened = false;
    }
    if (rl) {
      try { rl.close(); } catch {}
      rl = null;
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }

  return {
    close: () => {
      if (closed) return;
      closed = true;
      void stopPipeAndCleanup();
    },
  };
}
