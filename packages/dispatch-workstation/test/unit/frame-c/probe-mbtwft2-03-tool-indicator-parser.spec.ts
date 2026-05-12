// MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB5 (red) — probe-mbtwft2-03
// tool-indicator-parser pure-function contract per ticket body 30ab109 §4
// WB5 + Sub-Q-MBTWFT2-B=(i) regex on PTY lines (operator-acked 2026-05-12
// T2 TICKET-BODY ACK message default).
//
// Asserts `parseToolIndicators(buf: string): ToolIndicatorState`:
//   ToolIndicatorState shape:
//     {
//       cooking: { elapsedMs: number; queued: number } | null,
//       recent: ReadonlyArray<ToolEvent>,
//       nextTool: string | null,
//     }
//   ToolEvent variants:
//     { kind: 'bash', cmd: string }
//     { kind: 'read', path: string }
//     { kind: 'edit', path: string, added: number, deleted: number }
//     { kind: 'write', path: string }
//
// Probe conditions (6 fixtures per ticket §4 WB5):
//   (a) `"Cooking 12m 04s · 4 tools queued\n"` →
//       cooking.elapsedMs === 724000 (12m04s = 12*60000 + 4*1000),
//       cooking.queued === 4.
//   (b) `"Bash: pnpm tsc --noEmit\n"` → recent includes a 'bash'
//       event with cmd 'pnpm tsc --noEmit'.
//   (c) `"Read: packages/dispatch-daemon/src/session/session.ts\n"`
//       → recent includes a 'read' event with path matching.
//   (d) `"Edit packages/.../spawn-pool.ts (+142 -8)\n"` → recent
//       includes 'edit' event with path, added=142, deleted=8.
//   (e) Empty buffer → { cooking: null, recent: [], nextTool: null }
//       (honest no-data).
//   (f) Buffer with mixed lines preserves order in `recent` ring
//       buffer (latest-last).
//
// RED state at HEAD `fc6737f` (post-WB4 GREEN commit):
//   - `frame-c/tool-indicator-parser.ts` does NOT exist. Verified
//     via `ls packages/dispatch-workstation/src/frame-c/` at WB5
//     authoring time: {action-bar, detail-pane, frame-c-root,
//     index, mount, session-list, terminal-header-bar, terminal-
//     stream} (no tool-indicator-parser).
//   - Dynamic import in beforeAll captures the resolve-failure;
//     all 6 fixture-describe blocks fail at the import-guard.
//
// WB6 GREEN target: create `frame-c/tool-indicator-parser.ts`
// exporting `parseToolIndicators` + ToolEvent + ToolIndicatorState
// types. Regex patterns per Sub-Q-B=(i):
//   - /^Cooking (\d+)m (\d+)s · (\d+) tools queued/m → cooking
//   - /^Bash: (.+)$/gm → bash events
//   - /^Read: (.+)$/gm → read events
//   - /^Edit (.+) \(\+(\d+) -(\d+)\)$/gm → edit events
//   - /^Write (.+)$/gm → write events
// Ring-buffer recent events to cap (recent.slice(-20)).
// nextTool placeholder returns null until operator-verifiable CC
// fixture available (Tier 3 followup
// MB-F-T2-NEXT-TOOL-PREVIEW-FIXTURE-MISSING).

import { describe, it, expect, beforeAll } from 'vitest';

interface ToolEventBashShape { kind: 'bash'; cmd: string }
interface ToolEventReadShape { kind: 'read'; path: string }
interface ToolEventEditShape {
  kind: 'edit';
  path: string;
  added: number;
  deleted: number;
}
interface ToolEventWriteShape { kind: 'write'; path: string }
type ToolEventShape =
  | ToolEventBashShape
  | ToolEventReadShape
  | ToolEventEditShape
  | ToolEventWriteShape;

interface ToolIndicatorStateShape {
  cooking: { elapsedMs: number; queued: number } | null;
  recent: readonly ToolEventShape[];
  nextTool: string | null;
}

type ParseToolIndicatorsFn = (buf: string) => ToolIndicatorStateShape;

let parseToolIndicators: ParseToolIndicatorsFn | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/frame-c/tool-indicator-parser.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    parseToolIndicators = (
      mod as { parseToolIndicators?: ParseToolIndicatorsFn }
    ).parseToolIndicators;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T2-TERMINAL-STREAM-RIGHT-PANE WB5 — parseToolIndicators pure-fn contract (Sub-Q-B=i regex)', () => {
  describe('Condition (a): Cooking line extracts elapsedMs + queued', () => {
    it('"Cooking 12m 04s · 4 tools queued" → elapsedMs=724000, queued=4', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      expect(parseToolIndicators).toBeDefined();
      const state = parseToolIndicators!('Cooking 12m 04s · 4 tools queued\n');
      expect(state.cooking, 'cooking must not be null').not.toBeNull();
      expect(
        state.cooking?.elapsedMs,
        'elapsedMs must be 12m04s = 12*60000 + 4*1000 = 724000',
      ).toBe(724000);
      expect(state.cooking?.queued, 'queued must be 4').toBe(4);
    });

    it('"Cooking 0m 30s · 1 tools queued" → elapsedMs=30000, queued=1', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const state = parseToolIndicators!('Cooking 0m 30s · 1 tools queued\n');
      expect(state.cooking?.elapsedMs).toBe(30000);
      expect(state.cooking?.queued).toBe(1);
    });
  });

  describe('Condition (b): Bash: <cmd> lines parsed as bash events', () => {
    it('"Bash: pnpm tsc --noEmit" → recent includes bash event with cmd', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const state = parseToolIndicators!('Bash: pnpm tsc --noEmit\n');
      const bashEvents = state.recent.filter(
        (e): e is ToolEventBashShape => e.kind === 'bash',
      );
      expect(bashEvents.length, 'one bash event').toBe(1);
      expect(bashEvents[0].cmd, 'cmd captured verbatim').toBe(
        'pnpm tsc --noEmit',
      );
    });
  });

  describe('Condition (c): Read: <path> lines parsed as read events', () => {
    it('"Read: packages/dispatch-daemon/src/session/session.ts" → recent includes read event with path', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const state = parseToolIndicators!(
        'Read: packages/dispatch-daemon/src/session/session.ts\n',
      );
      const readEvents = state.recent.filter(
        (e): e is ToolEventReadShape => e.kind === 'read',
      );
      expect(readEvents.length, 'one read event').toBe(1);
      expect(readEvents[0].path).toBe(
        'packages/dispatch-daemon/src/session/session.ts',
      );
    });
  });

  describe('Condition (d): Edit <path> (+added -deleted) lines parsed', () => {
    it('"Edit packages/dispatch-daemon/src/spawn-pool.ts (+142 -8)" → recent includes edit event with path + added + deleted', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const state = parseToolIndicators!(
        'Edit packages/dispatch-daemon/src/spawn-pool.ts (+142 -8)\n',
      );
      const editEvents = state.recent.filter(
        (e): e is ToolEventEditShape => e.kind === 'edit',
      );
      expect(editEvents.length, 'one edit event').toBe(1);
      expect(editEvents[0].path).toBe(
        'packages/dispatch-daemon/src/spawn-pool.ts',
      );
      expect(editEvents[0].added).toBe(142);
      expect(editEvents[0].deleted).toBe(8);
    });
  });

  describe('Condition (e): empty buffer → honest no-data state', () => {
    it('empty string → { cooking: null, recent: [], nextTool: null }', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const state = parseToolIndicators!('');
      expect(state.cooking, 'cooking must be null').toBeNull();
      expect(state.recent.length, 'recent must be empty').toBe(0);
      expect(state.nextTool, 'nextTool must be null').toBeNull();
    });
  });

  describe('Condition (f): mixed-line buffer preserves recent order (latest-last)', () => {
    it('"Bash: a\\nRead: b\\nEdit c (+1 -1)" → recent length=3 in source order', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const buf =
        'Bash: a\nRead: b\nEdit c (+1 -1)\n';
      const state = parseToolIndicators!(buf);
      expect(state.recent.length, 'three events').toBe(3);
      expect(state.recent[0].kind, 'first event is bash').toBe('bash');
      expect(state.recent[1].kind, 'second event is read').toBe('read');
      expect(state.recent[2].kind, 'third event is edit').toBe('edit');
    });

    it('Cooking line + tool events both populate state', () => {
      if (importError) throw new Error(`import failed: ${importError.message}`);
      const buf =
        'Cooking 2m 10s · 3 tools queued\nBash: echo hi\nRead: foo.ts\n';
      const state = parseToolIndicators!(buf);
      expect(state.cooking?.elapsedMs).toBe(130000);
      expect(state.cooking?.queued).toBe(3);
      expect(state.recent.length).toBe(2);
    });
  });
});
