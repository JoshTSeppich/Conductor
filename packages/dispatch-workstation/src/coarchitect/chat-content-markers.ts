// MB-T21 WB1 (red) — chat content sentinel-marker parsers (skeleton).
// Operator-acked Q-MBT21-2=b (QUICK_PICK marker) + Q-MBT21-3=b (spawned: marker).
//
// Marker formats:
//   - QUICK_PICK: ["opt1", "opt2", "opt3"]   → a JSON array of 2-4 strings
//   - spawned: ["sess-a", "sess-b"]          → a JSON array of session names
//
// Both markers appear at end of an assistant message on their own line.
// Renderer parses + strips before rendering bubble body; parsed values
// flow into QuickPickButtons.options + SpawnedList.sessions respectively.
//
// WB1 ships skeletons returning {stripped: content, options/sessions: null}
// so probe assertions about parse + strip fail RED. WB3/WB4 implement the
// regex + JSON.parse + bounds check (2-4 options, 1+ sessions).

export interface ParsedQuickPick {
  readonly stripped: string;
  readonly options: readonly string[] | null;
}

export interface ParsedSpawned {
  readonly stripped: string;
  readonly sessions: readonly string[] | null;
}

export function parseQuickPickMarker(content: string): ParsedQuickPick {
  // WB1 red: pass-through; no parse → probe assertions on parsed options fail.
  return { stripped: content, options: null };
}

export function parseSpawnedMarker(content: string): ParsedSpawned {
  // WB1 red: pass-through; no parse → probe assertions on parsed sessions fail.
  return { stripped: content, sessions: null };
}
