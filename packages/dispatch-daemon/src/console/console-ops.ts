/**
 * CONSOLE-T01 — ConsoleOps interface for tmux PTY side effects of the
 * §4.7 CC-console surface.
 *
 * Mirrors the established TmuxOps injection pattern (state/transitions.ts
 * line 41) so tests can inject recording stubs / failure-mode stubs
 * without spawning real tmux. Production startup wires the default impl
 * which delegates to `tmux paste-buffer -r` (and, in subsequent
 * clusters, `tmux pipe-pane`, `kill(2)`, `tmux send-keys C-c`).
 *
 * Cluster 2 surface: pasteRawBytes only (consumed by POST /console/stdin).
 * Cluster 3 will extend with attachPipePane + signal helpers; cluster 4
 * with sendSignal. Each cluster grows the interface additively.
 */

export interface ConsoleStreamHandle {
  /** Stop the stream; idempotent. */
  close(): void;
}

export interface ConsoleOps {
  /**
   * Write `bytes` to the tmux pane at `target` via `tmux paste-buffer
   * -r`. The `-r` flag is CRITICAL per CONDUCTOR_API_CONTRACT.md §4.7.2
   * implementation note + MB-S06 ADR §3 KNOWN finding: without `-r`,
   * tmux replaces every LF (0x0A) in the buffer with CR (0x0D), which
   * silently corrupts operator-typed multi-line input. The existing
   * `sendKeys` helper (dispatch-core/src/transport/tmux.ts) intentionally
   * uses default paste-buffer for prompt-submit semantics; this method
   * MUST NOT delegate to it.
   *
   * Errors propagate as Node child_process exceptions (e.g. ENOENT if
   * tmux binary missing); the route handler catches and surfaces as
   * `BackpressureRejected` per the §4.7 error envelope.
   */
  pasteRawBytes(target: string, bytes: Buffer): Promise<void>;

  /**
   * Open a STDOUT byte stream from the tmux pane at `target` and call
   * `onLine` for each newline-terminated line as it arrives. Returns
   * a handle whose `close()` stops the stream.
   *
   * Per CONDUCTOR_API_CONTRACT.md §4.7.1 PTY-reader-sharing invariant:
   * the route handler maintains AT MOST ONE active stream per
   * tmux target across N WS subscribers. Subscribers consume the
   * daemon-side broadcast; they do NOT each spawn their own stream.
   * Validated KNOWN at MB-S06 §6 (single shared pipe-pane reader
   * fans out to multiple consumers, no double-read).
   *
   * Production impl wraps `tmux pipe-pane -O -t <target> 'cat > <fifo>'`
   * with a Node readline over the fifo (KNOWN pattern from MB-S06
   * harness exp4/5/6). Tests inject a recording stub whose attachStream
   * registers a callback that the test can fire synthetically via
   * the spawnTestServer.triggerConsoleLine helper.
   */
  attachStream(target: string, onLine: (line: Buffer) => void): ConsoleStreamHandle;

  /**
   * Send `signal` to the process running in the tmux pane at `target`.
   * Returns the dispatch_method used per the §4.7.1 signal dispatch
   * table.
   *
   * Per §4.7.1 + MB-S06 §3 KNOWN findings:
   *   SIGINT  → tmux send-keys C-c (PTY byte 0x03 via tmux key-name);
   *             returns 'send_keys'.
   *   SIGTERM → process.kill(panePid, SIGTERM); returns 'kill_2'.
   *   SIGHUP  → process.kill(panePid, SIGHUP);  returns 'kill_2'.
   *
   * SIGUSR1/2 + SIGKILL etc. are NOT supported in v3.0 (vision §10.11
   * Q2); the route handler rejects with SignalNotSupported BEFORE
   * calling this method.
   */
  sendSignal(target: string, signal: 'SIGINT' | 'SIGTERM' | 'SIGHUP'): Promise<DispatchMethod>;
}

export type DispatchMethod = 'pty_byte' | 'send_keys' | 'kill_2' | 'tmux_kill_session';
