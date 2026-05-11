// §C.5 WB2 GREEN — per-tile PTY token count scraper.
//
// Subscribes to the PTY broadcaster (ConsoleIpcController.addStdoutObserver),
// strips ANSI escape sequences from each raw chunk, extracts the token count
// from the CC CLI status-bar pattern "N tokens" (last match wins when multiple
// status-bar renders appear in a single chunk), and fires onTokenUpdate after
// a per-session debounce window (default 500ms, matching MB-T39 inner-quiescence).
//
// ANSI gap note (MB-F-SPIKE-C5-ANSI-GAP): spike at ef2dd3d verified the regex
// against tmux capture-pane decoded output. Raw PTY chunks include ANSI cursor-
// positioning / color codes that precede and follow the token number, making the
// original $-anchored regex unreliable. Strip first, then match without anchor.

// ─── ECMA-48 CSI strip ───────────────────────────────────────────────────────
// Covers: SGR (m), cursor position (H/f), erase (J/K), cursor motion (A-G),
// and common private sequences. Confirmed with operator Q1 HALT 0 §C.5.
const ANSI_CSI_RE = /\x1b\[[0-9;]*[mGKHFJA-Za-z]/g;

function stripAnsi(raw: string): string {
  return raw.replace(ANSI_CSI_RE, '');
}

// ─── Token extraction ────────────────────────────────────────────────────────
// Matches all occurrences of "N tokens" in the stripped text; returns the last
// (most recent status-bar render) or null if none found.
const TOKEN_RE = /([0-9]+) tokens/g;

function extractLastTokenCount(plain: string): number | null {
  let last: number | null = null;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(plain)) !== null) {
    last = parseInt(m[1], 10);
  }
  return last;
}

// ─── Dependency interfaces ────────────────────────────────────────────────────
// Structural — mirrors IConsoleBroadcaster in pty-stream-relay.ts; testable
// without Electron imports.

export interface IConsoleBroadcaster {
  addStdoutObserver(fn: (sessionName: string, chunk: string) => void): () => void;
}

export interface TileTokenScraperDeps {
  broadcaster: IConsoleBroadcaster;
  /** Called after debounce with the latest extracted token count. */
  onTokenUpdate: (sessionName: string, tokensUsed: number) => void;
  /** Debounce window in ms. Default 500 (MB-T39 inner-quiescence pattern). */
  debounceMs?: number;
}

// ─── registerTileTokenScraper ────────────────────────────────────────────────

export function registerTileTokenScraper(deps: TileTokenScraperDeps): () => void {
  const { broadcaster, onTokenUpdate, debounceMs = 500 } = deps;

  // Per-session debounce: each session has its own pending timer + latest count.
  const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; tokensUsed: number }>();

  const disposeObserver = broadcaster.addStdoutObserver((sessionName, chunk) => {
    const plain = stripAnsi(chunk);
    const count = extractLastTokenCount(plain);
    if (count === null) return;

    // Reset (or start) the per-session debounce timer.
    const existing = pending.get(sessionName);
    if (existing !== undefined) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      pending.delete(sessionName);
      onTokenUpdate(sessionName, count);
    }, debounceMs);

    pending.set(sessionName, { timer, tokensUsed: count });
  });

  return () => {
    disposeObserver();
    for (const { timer } of pending.values()) clearTimeout(timer);
    pending.clear();
  };
}
