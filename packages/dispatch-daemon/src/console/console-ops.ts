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
}
