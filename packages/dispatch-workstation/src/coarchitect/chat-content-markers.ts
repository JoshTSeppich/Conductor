// MB-T21 WB3 (green) — chat content sentinel-marker parsers.
// Operator-acked Q-MBT21-2=b (QUICK_PICK marker) + Q-MBT21-3=b (spawned: marker).
//
// Marker formats (a single trailing line each):
//   QUICK_PICK: ["opt1", "opt2", "opt3"]   2-4 string options
//   spawned: ["sess-a", "sess-b"]          1+ session names
//
// Both are matched as a complete line (after \n or at start-of-string).
// JSON-parsed value is bounds-checked; on any rejection we return
// { stripped: <input>, options/sessions: null } and the renderer treats the
// content as plain prose. Trailing whitespace is stripped from the output
// content per probe-05/06 contract.

export interface ParsedQuickPick {
  readonly stripped: string;
  readonly options: readonly string[] | null;
}

export interface ParsedSpawned {
  readonly stripped: string;
  readonly sessions: readonly string[] | null;
}

const QUICK_PICK_RE = /^[\t ]*QUICK_PICK:\s*(\[[^\n]*\])\s*$/m;
const SPAWNED_RE = /^[\t ]*spawned:\s*(\[[^\n]*\])\s*$/m;

function parseStringArray(raw: string): readonly string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (!parsed.every((x): x is string => typeof x === 'string' && x.length > 0)) {
    return null;
  }
  return parsed;
}

export function parseQuickPickMarker(content: string): ParsedQuickPick {
  const match = content.match(QUICK_PICK_RE);
  if (!match || match[1] === undefined) {
    return { stripped: content, options: null };
  }
  const arr = parseStringArray(match[1]);
  if (!arr || arr.length < 2 || arr.length > 4) {
    return { stripped: content, options: null };
  }
  const stripped = content.replace(QUICK_PICK_RE, '').replace(/\s+$/, '');
  return { stripped, options: arr };
}

export function parseSpawnedMarker(content: string): ParsedSpawned {
  const match = content.match(SPAWNED_RE);
  if (!match || match[1] === undefined) {
    return { stripped: content, sessions: null };
  }
  const arr = parseStringArray(match[1]);
  // Empty arrays return null sessions: no inline render warranted per
  // probe-06 "returns null sessions for empty array marker" contract.
  if (!arr || arr.length === 0) {
    return { stripped: content, sessions: null };
  }
  const stripped = content.replace(SPAWNED_RE, '').replace(/\s+$/, '');
  return { stripped, sessions: arr };
}

// ─────────────────────────────────────────────────────────────────────────────
// MB-T35-revised — [ACTION:type]...[/ACTION] block parser
// ─────────────────────────────────────────────────────────────────────────────
//
// Parses HSO orchestrator action variant markers emitted per MB-T41 §2.
// The parser is pure extraction: it does NOT validate action types or
// required fields. Validation + IPC dispatch live in action-variant-ipc.ts.
//
// Marker format (per orchestrator.md §2):
//   [ACTION:<type>]
//   key: value
//   key2: value2
//   [/ACTION]

/** Parsed [ACTION:type]...[/ACTION] block from orchestrator output. */
export interface ParsedActionMarker {
  readonly actionType: string;
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * Extract the first [ACTION:type]...[/ACTION] block from content.
 * Returns null if no complete block is found.
 * WB1 RED stub — returns null unconditionally until WB2 GREEN implementation.
 */
export function parseActionMarker(_content: string): ParsedActionMarker | null {
  return null;
}
