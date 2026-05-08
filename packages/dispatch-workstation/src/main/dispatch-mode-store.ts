// MB-T24 WB1 RED — Dispatch-mode persistence store (scaffold).
//
// Operator-confirmed Q-MBT24-1=a (mirror splitter-state.ts pattern) +
// Q-MBT24-2=a (default 'ask' on first install) +
// Q-MBT24-7=a (DispatchMode = 'auto' | 'ask') 2026-05-08.
//
// Persists a single global toggle to a JSON file in app.getPath('userData').
// Mirrors splitter-state.ts (CLAUDE.md §3.5) — single-key JSON, env-override
// MB_DISPATCH_MODE_STATE_DIR for test isolation. No keying by session.
//
// File path:
//   <userData>/dispatch-mode-state.json
//
// File contents (single object, single field):
//   { "mode": "auto" | "ask" }
//
// WB1 RED: signatures present + types defined; bodies throw 'not yet
// implemented'. probe-01-persistence asserts the eventual GREEN behavior;
// tests fail at WB1.
// WB2 GREEN: bodies implement read/write per splitter-state.ts pattern.

/**
 * Workstation-wide dispatch mode (Q-MBT24-7=a).
 *
 *   - 'auto': orchestrator-fired actions + operator-driven spawn fire
 *             without per-action confirmation (still respects per-session
 *             BUILD.md `Approval policy`).
 *   - 'ask':  operator-driven spawn surfaces a confirmation modal/quick-pick
 *             before invoking spawn-handler.ts (per Q-MBT24-5=c hard gate
 *             at spawn-ipc.ts).
 *
 * NOTE: distinct from `SpawnPermissionMode` ('auto' | 'ask') in
 * spawn-handler.ts:91 which controls the spawned `claude` binary's
 * --dangerously-skip-permissions flag (cairn finding #94). Same vocab,
 * different domain — Q-MBT24-7=a accepts the nominal collision as
 * type-safe (different alias, scoped under DispatchMode).
 */
export type DispatchMode = 'auto' | 'ask';

/**
 * Read the persisted dispatch mode. Returns 'ask' (Q-MBT24-2=a default)
 * when the file is absent or unparsable. Best-effort observability per
 * splitter-state.ts pattern; never throws.
 *
 * WB1 RED stub — throws 'not yet implemented'. WB2 GREEN fills in.
 */
export function readDispatchMode(): DispatchMode {
  throw new Error('readDispatchMode: not yet implemented (WB2 GREEN)');
}

/**
 * Write the dispatch mode to the JSON file. Best-effort; on write failure
 * the in-memory state is unchanged but the next read will not see this
 * update (acceptable per v3.0 single-user single-workstation model).
 *
 * WB1 RED stub — throws 'not yet implemented'. WB2 GREEN fills in.
 */
export function writeDispatchMode(_mode: DispatchMode): void {
  throw new Error('writeDispatchMode: not yet implemented (WB2 GREEN)');
}
