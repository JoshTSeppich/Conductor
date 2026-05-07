// MB-T11 WB6 — autopilot state store (JSON-file persistence).
//
// Per Q-MBT11-2=a: per-session autopilot state persists across orchestrator
// chat turns AND across workstation restarts. Implementation follows the
// splitter-state.ts pattern: single JSON file in `app.getPath('userData')`
// (or test-override `MB_AUTOPILOT_STATE_DIR`), keyed by sessionName.
//
// File path:
//   <userData>/autopilot-state.json
//
// File contents (single object, sessionName-keyed):
//   {
//     "<sessionName>": AutopilotState,
//     ...
//   }
//
// Codebase note: prior workstation surfaces use direct fs.readFileSync /
// writeFileSync rather than the `electron-store` npm package; this module
// follows that established convention. The Phase 2 brief's mention of
// "electron-store" describes the persistence concept (per-key JSON in
// userData) rather than the specific dep — there is no electron-store
// dep in dispatch-workstation/package.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';
import type { PendingIntent } from 'dispatch-core/dist/v3/schema.js';

// ─────────────────────────────────────────────────────────────────────────────
// Persisted shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-session autopilot state. Field semantics:
 *
 *   - enabled:           operator toggled autopilot on for this session
 *   - currentIntentId:   the most-recently-started intent's id (null if no
 *                         active intent); points to one of pendingIntents[]
 *   - currentStep:       step counter for currentIntentId (null if no active intent)
 *   - totalSteps:        expected_steps on the assign-task that started
 *                         currentIntentId (null if not provided / no active intent)
 *   - lastActionFiredAt: ISO-8601 timestamp of the most-recent recordAction()
 *                         call (null if no action has fired yet)
 *   - pendingIntents:    intents that have been started but not yet cleared.
 *                         Shape matches dispatch-core PendingIntentSchema (§11)
 *                         exactly — same field set so this array can be
 *                         spliced into a Tier4Payload without re-shaping.
 */
export interface AutopilotState {
  enabled: boolean;
  currentIntentId: string | null;
  currentStep: number | null;
  totalSteps: number | null;
  lastActionFiredAt: string | null;
  pendingIntents: PendingIntent[];
}

/** Default state for a session that has never had its autopilot touched. */
export function defaultAutopilotState(): AutopilotState {
  return {
    enabled: false,
    currentIntentId: null,
    currentStep: null,
    totalSteps: null,
    lastActionFiredAt: null,
    pendingIntents: [],
  };
}

const STATE_FILENAME = 'autopilot-state.json';

/** Resolve the directory that holds autopilot-state.json. */
function stateDir(): string {
  // Test-override: MB_AUTOPILOT_STATE_DIR (mirrors splitter-state.ts pattern).
  // When set, the JSON file lives at that path instead of userData. Allows
  // unit tests to operate on tmpdir without touching the real userData.
  const override = process.env['MB_AUTOPILOT_STATE_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function statePath(): string {
  return join(stateDir(), STATE_FILENAME);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read / write the whole map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the entire autopilot state map. Returns an empty object when the
 * file is absent or unparsable. Best-effort observability per
 * splitter-state.ts pattern; never throws.
 */
export function readAllAutopilotStates(): Record<string, AutopilotState> {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    // Validate each entry has the expected shape; drop malformed entries.
    const out: Record<string, AutopilotState> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isAutopilotState(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Write the entire autopilot state map back to disk. Best-effort; on
 * write failure the in-memory state is unchanged but the next read will
 * not see this update (acceptable per v3.0 single-user single-workstation
 * model).
 */
export function writeAllAutopilotStates(
  all: Record<string, AutopilotState>,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(all, null, 2), 'utf8');
  } catch {
    // Best-effort. v3.0 single-user model tolerates persistence drop.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-session helpers
// ─────────────────────────────────────────────────────────────────────────────

export function readAutopilotState(sessionName: string): AutopilotState {
  const all = readAllAutopilotStates();
  return all[sessionName] ?? defaultAutopilotState();
}

export function writeAutopilotState(
  sessionName: string,
  state: AutopilotState,
): void {
  const all = readAllAutopilotStates();
  all[sessionName] = state;
  writeAllAutopilotStates(all);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shape validator (defensive; persisted JSON may be hand-edited or stale)
// ─────────────────────────────────────────────────────────────────────────────

function isAutopilotState(v: unknown): v is AutopilotState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (typeof s['enabled'] !== 'boolean') return false;
  if (s['currentIntentId'] !== null && typeof s['currentIntentId'] !== 'string')
    return false;
  if (s['currentStep'] !== null && typeof s['currentStep'] !== 'number')
    return false;
  if (s['totalSteps'] !== null && typeof s['totalSteps'] !== 'number')
    return false;
  if (
    s['lastActionFiredAt'] !== null &&
    typeof s['lastActionFiredAt'] !== 'string'
  )
    return false;
  if (!Array.isArray(s['pendingIntents'])) return false;
  return true;
}
