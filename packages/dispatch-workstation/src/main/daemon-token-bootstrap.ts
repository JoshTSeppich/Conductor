// MB-F-#92 GREEN — daemon token disk-read for the webview-side bootstrap.
//
// Cairn finding #92 (retriaged 2026-05-04 at 5180d0d): the kanban webview's
// dispatch-web bundle reads localStorage['x-conductor-token'] via
// useAuthBootstrap. On cold launch with cleared per-origin storage the
// value is absent, so TokenPrompt mounts and the operator must `cat
// ~/.foxworks-dispatch/token` and paste. The fix is a webview preload-
// side bootstrap: the preload IPC-invokes a main-process channel that
// returns the disk-read token, then writes it into localStorage before
// the dispatch-web bundle runs.
//
// This module is the disk-read source of truth for that channel. It does
// NOT touch process.env (#92 is structurally not the same as #84A — there
// is no env-var consumer for the daemon token in this codebase). It also
// does NOT touch the five existing module-private readDaemonToken()
// helpers in http-daemon-client.ts / spawn-ipc.ts / console-ipc.ts /
// session-cap.ts / main.ts (Fix-C inline) — that consolidation is
// finding #93's deferred refactor scope.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface DaemonTokenBootstrapOpts {
  /**
   * Override the token file path. Default: `~/.foxworks-dispatch/token`.
   * Test code passes a tmp-file path for isolation.
   */
  tokenPath?: string;
}

/**
 * Read the daemon token from disk for the webview-side bootstrap.
 *
 * Returns the trimmed file contents on success, or `null` if the file
 * does not exist, is unreadable, or any other I/O failure occurs. The
 * silent-on-error semantics match the existing five module-private
 * readDaemonToken() helpers (see finding #93) — callers handle absence
 * by falling through to TokenPrompt.
 */
export function readDaemonTokenForBootstrap(
  opts: DaemonTokenBootstrapOpts = {},
): string | null {
  const path = opts.tokenPath ?? join(homedir(), '.foxworks-dispatch', 'token');
  try {
    return readFileSync(path, 'utf8').trim();
  } catch {
    return null;
  }
}
