// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB6 (green) — pure-fn
// parser for Claude Code tool-invocation indicators from PTY chunk
// stream.
//
// Per ticket body 30ab109 §4 WB6 + Sub-Q-MBTWFT2-B=(i) regex-on-PTY-
// lines (operator-acked 2026-05-12 default).
//
// Strategy: line-by-line scan over the rolling chunk buffer. Each line
// is matched against the indicator regex set; matched events are
// appended in encounter order to a ring-buffer (cap = 20). Cooking
// state is overwritten on each match (latest wins — most recent
// "Cooking …" line reflects current state). nextTool placeholder
// returns null until a real CC fixture surfaces a verifiable pattern
// (Tier 3 followup MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING).
//
// `[SPECULATIVE]` per ticket §3.2 — the regex set is hypothesis-based,
// modeled from the wireframe text fragments (`Cooking 12m 04s · 4
// tools queued`, `Bash: pnpm tsc --noEmit`, `Read: packages/.../
// session.ts`, `Edit packages/.../spawn-pool.ts (+142 -8)`). Tier 2
// followup MB-F-T2-TOOL-PARSE-REGEX-BRITTLE-CC-FORMAT-DRIFT tracks
// migration to structured-event sources when CC offers one.

export type ToolEvent =
  | { readonly kind: 'bash'; readonly cmd: string }
  | { readonly kind: 'read'; readonly path: string }
  | {
      readonly kind: 'edit';
      readonly path: string;
      readonly added: number;
      readonly deleted: number;
    }
  | { readonly kind: 'write'; readonly path: string };

export interface CookingState {
  readonly elapsedMs: number;
  readonly queued: number;
}

export interface ToolIndicatorState {
  readonly cooking: CookingState | null;
  readonly recent: readonly ToolEvent[];
  readonly nextTool: string | null;
}

/** Max events retained in `recent`. Older events are dropped first. */
const RECENT_CAP = 20;

const COOKING_RE = /^Cooking (\d+)m (\d+)s · (\d+) tools queued/;
const BASH_RE = /^Bash: (.+)$/;
const READ_RE = /^Read: (.+)$/;
const EDIT_RE = /^Edit (.+) \(\+(\d+) -(\d+)\)$/;
const WRITE_RE = /^Write (.+)$/;

/**
 * Parse the rolling PTY chunk buffer for tool-invocation indicators.
 *
 * Returns a snapshot of the current state. Caller is responsible for
 * accumulating the chunk buffer (TerminalStream + WB8 ToolIndicatorStrip
 * subscriber). This function is pure — same input always yields same
 * output; no I/O, no globals beyond the regex constants.
 */
export function parseToolIndicators(buf: string): ToolIndicatorState {
  if (buf.length === 0) {
    return { cooking: null, recent: [], nextTool: null };
  }

  let cooking: CookingState | null = null;
  const events: ToolEvent[] = [];

  for (const line of buf.split('\n')) {
    const trimmed = line.length > 0 ? line : line;
    const cookingMatch = COOKING_RE.exec(trimmed);
    if (cookingMatch !== null) {
      const minutes = Number.parseInt(cookingMatch[1], 10);
      const seconds = Number.parseInt(cookingMatch[2], 10);
      const queued = Number.parseInt(cookingMatch[3], 10);
      cooking = {
        elapsedMs: minutes * 60_000 + seconds * 1_000,
        queued,
      };
      continue;
    }

    const bashMatch = BASH_RE.exec(trimmed);
    if (bashMatch !== null) {
      events.push({ kind: 'bash', cmd: bashMatch[1] });
      continue;
    }

    const readMatch = READ_RE.exec(trimmed);
    if (readMatch !== null) {
      events.push({ kind: 'read', path: readMatch[1] });
      continue;
    }

    const editMatch = EDIT_RE.exec(trimmed);
    if (editMatch !== null) {
      events.push({
        kind: 'edit',
        path: editMatch[1],
        added: Number.parseInt(editMatch[2], 10),
        deleted: Number.parseInt(editMatch[3], 10),
      });
      continue;
    }

    const writeMatch = WRITE_RE.exec(trimmed);
    if (writeMatch !== null) {
      events.push({ kind: 'write', path: writeMatch[1] });
      continue;
    }
  }

  // Ring-buffer cap: keep latest RECENT_CAP events (slice from tail).
  const recent = events.length > RECENT_CAP ? events.slice(-RECENT_CAP) : events;

  return {
    cooking,
    recent,
    nextTool: null,
  };
}
