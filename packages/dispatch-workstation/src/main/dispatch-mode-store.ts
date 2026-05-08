// MB-T24 WB2 GREEN — Dispatch-mode persistence store.
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

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

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

const DEFAULT_MODE: DispatchMode = 'ask'; // Q-MBT24-2=a — operator opts INTO 'auto'.
const STATE_FILENAME = 'dispatch-mode-state.json';

// MB_DISPATCH_MODE_STATE_DIR env var overrides userData path for test
// isolation (mirrors MB_SPLITTER_STATE_DIR / MB_AUTOPILOT_STATE_DIR
// patterns).
function stateDir(): string {
  const override = process.env['MB_DISPATCH_MODE_STATE_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function isDispatchMode(v: unknown): v is DispatchMode {
  return v === 'auto' || v === 'ask';
}

/**
 * Read the persisted dispatch mode. Returns 'ask' (Q-MBT24-2=a default)
 * when the file is absent, malformed, has wrong shape, or carries an
 * invalid mode value. Best-effort observability per splitter-state.ts
 * pattern; never throws.
 */
export function readDispatchMode(): DispatchMode {
  try {
    const raw = readFileSync(join(stateDir(), STATE_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_MODE;
    }
    const mode = (parsed as Record<string, unknown>)['mode'];
    if (isDispatchMode(mode)) return mode;
  } catch {
    // No saved state, parse error, or read failure — fall through to default.
  }
  return DEFAULT_MODE;
}

/**
 * Write the dispatch mode to the JSON file. Best-effort; on write failure
 * the in-memory state is unchanged but the next read will not see this
 * update (acceptable per v3.0 single-user single-workstation model).
 */
export function writeDispatchMode(mode: DispatchMode): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify({ mode }), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence.
  }
}
