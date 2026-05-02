/**
 * CONSOLE-T01 — pasteRawBytes default implementation.
 *
 * Per CONDUCTOR_API_CONTRACT.md §4.7.2 implementation note (frozen at
 * a7e8d4f): the §4.7 CC-console stdin endpoint MUST use `tmux
 * paste-buffer -r` — distinct from the existing sendKeys helper at
 * dispatch-core/src/transport/tmux.ts:25 which uses default
 * paste-buffer (no `-r`) and intentionally translates LF→CR for
 * prompt-submit semantics. Conflating would silently corrupt
 * operator-typed multi-line input per MB-S06 §3 KNOWN finding.
 *
 * The pattern matches the sendKeys helper's load-buffer + paste-buffer
 * sequence (KNOWN safe per SPIKES.md §Spike 01) but with two
 * differences:
 *   1. `-r` flag on paste-buffer (preserves LF verbatim; MB-S06 §3.2
 *      ADR #6's headline finding).
 *   2. NO trailing `send-keys Enter` — this is byte-pass-through, not
 *      prompt-submit. The operator's bytes are written as-is to the
 *      pane PTY's stdin; whether they include an Enter is up to the
 *      operator.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileP = promisify(execFile);

/**
 * Default tmux binary path. Resolves via PATH at execFile time; tests
 * that need to override (e.g., MB-S02 launchd-minimal-PATH scenarios)
 * inject a custom ConsoleOps with their own binary path.
 */
const TMUX_BIN = 'tmux';

export async function pasteRawBytes(target: string, bytes: Buffer): Promise<void> {
  const bufName = `fd-console-${randomUUID()}`;
  let loaded = false;
  try {
    // Step 1: load-buffer reads bytes from stdin (no shell, no
    // interpolation). Mirrors the sendKeys pattern in
    // dispatch-core/src/transport/tmux.ts:30.
    await new Promise<void>((resolve, reject) => {
      const child = execFile(
        TMUX_BIN,
        ['load-buffer', '-b', bufName, '-'],
        (err) => (err ? reject(err) : resolve()),
      );
      child.stdin!.end(bytes);
    });
    loaded = true;

    // Step 2: paste-buffer with -r — the LF-preserve flag. This is
    // the §4.7.2 + MB-S06 §3 KNOWN-critical distinction.
    await execFileP(TMUX_BIN, [
      'paste-buffer', '-r', '-b', bufName, '-t', target,
    ]);

    // No trailing `send-keys Enter` — see file header §2.
  } finally {
    if (loaded) {
      try {
        await execFileP(TMUX_BIN, ['delete-buffer', '-b', bufName]);
      } catch {
        /* buffer already gone, nothing to clean */
      }
    }
  }
}
