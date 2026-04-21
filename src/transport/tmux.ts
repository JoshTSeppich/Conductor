import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

const execFileP = promisify(execFile);

/**
 * Send `text` to the tmux pane at `target` and submit with Enter.
 *
 * Pattern (KNOWN from spike 01, SPIKES.md §Spike 01 / point 4):
 *   1. load-buffer  -b <unique> -     (content on stdin, no shell)
 *   2. paste-buffer -b <unique> -t <target>
 *   3. send-keys    -t <target> Enter
 *   4. delete-buffer -b <unique>
 *
 * Do NOT use `send-keys -t <target> <text> Enter`: spike probe A4 showed
 * that bare argv tokens matching tmux key names (Up, Down, Enter, Tab,
 * C-a, M-x, …) are interpreted as keystrokes and the text is lost.
 * paste-buffer is literal-by-design and preserves triple-backticks,
 * template literals, $-signs, nested quotes, and embedded newlines.
 *
 * The delete-buffer call lives in a `finally` so a failed paste still
 * cleans up the loaded buffer.
 */
export async function sendKeys(target: string, text: string): Promise<void> {
  const bufName = `fd-${randomUUID()}`;
  let loaded = false;
  try {
    await new Promise<void>((resolve, reject) => {
      const child = execFile('tmux', ['load-buffer', '-b', bufName, '-'], (err) => {
        if (err) reject(err);
        else resolve();
      });
      child.stdin!.end(text);
    });
    loaded = true;

    await execFileP('tmux', ['paste-buffer', '-b', bufName, '-t', target]);
    await execFileP('tmux', ['send-keys', '-t', target, 'Enter']);
  } finally {
    if (loaded) {
      try {
        await execFileP('tmux', ['delete-buffer', '-b', bufName]);
      } catch {
        /* buffer already gone, nothing to clean */
      }
    }
  }
}

/**
 * Read scrollback from the tmux pane at `target`. Returns up to `lines`
 * lines of history plus the currently visible pane, oldest first, with
 * trailing per-line whitespace stripped (tmux default).
 *
 * KNOWN from spike 02: -p is mandatory to print; -S -<N> reads N lines
 * of scrollback before the visible pane.
 */
export async function capturePane(target: string, lines: number = 500): Promise<string> {
  const { stdout } = await execFileP('tmux', [
    'capture-pane',
    '-t',
    target,
    '-p',
    '-S',
    `-${lines}`,
  ]);
  return stdout;
}

/**
 * True iff the fully-qualified tmux target (<session>:<window>.<pane>)
 * resolves to a live pane right now.
 *
 * KNOWN from spike 03 (D2, tmux 3.6a): has-session -t validates the full
 * target. A missing pane yields exit 1 with "can't find pane: N", a
 * missing session yields "can't find session: <name>". Exit code is
 * authoritative; we do not parse stderr.
 */
export async function hasSession(target: string): Promise<boolean> {
  try {
    await execFileP('tmux', ['has-session', '-t', target]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enumerate every pane across every session as fully-qualified targets
 * (`<session>:<window>.<pane>`), one per element. Sorted in tmux's own
 * order (session creation, then window and pane index).
 *
 * Not on the v1 hot path. Exported for future `fd init` completion.
 */
export async function listPanes(): Promise<string[]> {
  const { stdout } = await execFileP('tmux', [
    'list-panes',
    '-a',
    '-F',
    '#{session_name}:#{window_index}.#{pane_index}',
  ]);
  return stdout
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
