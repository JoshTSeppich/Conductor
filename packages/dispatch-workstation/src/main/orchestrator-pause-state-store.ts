// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB5 — orchestrator
// pause state store (Q2=(a) workstation-side persistence).
//
// Per Q2=(a) operator pre-authorization 2026-05-18 ~10:10 MDT:
// pause/resume gate is a new workstation-side JSON-file persisted
// single-key store mirroring autopilot-state-store.ts pattern.
// Aggregator reads on startup; togglePause IPC writes (Ticket C
// territory — Ticket B treats as read-only).
//
// File path:
//   <userData>/orchestrator-pause-state.json
//
// File contents (single-key object):
//   { "paused": boolean }
//
// Env-override (test isolation):
//   MB_ORCHESTRATOR_PAUSE_STATE_DIR — when set, the JSON file lives
//   at that path instead of userData. Mirrors splitter-state.ts +
//   autopilot-state-store.ts MB_*_DIR pattern.
//
// Persistence semantics (best-effort, v3.0 single-user model per
// WORKSTATION_CONTRACT.md §8.4):
//   - readOrchestratorPauseState() returns false on file-absent /
//     parse-error / shape-mismatch (default: unpaused on first run).
//   - writeOrchestratorPauseState(paused) overwrites the file; on
//     write-failure, in-memory state is unchanged but next read
//     won't see the update (acceptable per v3.0 single-user model).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

export interface OrchestratorPauseState {
  paused: boolean;
}

export function defaultOrchestratorPauseState(): OrchestratorPauseState {
  return { paused: false };
}

const STATE_FILENAME = 'orchestrator-pause-state.json';

function stateDir(): string {
  const override = process.env['MB_ORCHESTRATOR_PAUSE_STATE_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function statePath(): string {
  return join(stateDir(), STATE_FILENAME);
}

function isOrchestratorPauseState(v: unknown): v is OrchestratorPauseState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return typeof s['paused'] === 'boolean';
}

/**
 * Read the persisted pause state. Returns the default (unpaused)
 * when the file is absent, unparsable, or shape-mismatched. Never
 * throws — best-effort observability per autopilot-state-store.ts
 * pattern.
 */
export function readOrchestratorPauseState(): OrchestratorPauseState {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (isOrchestratorPauseState(parsed)) return parsed;
    return defaultOrchestratorPauseState();
  } catch {
    return defaultOrchestratorPauseState();
  }
}

/**
 * Persist the pause state. Best-effort write; on failure, state on
 * disk is unchanged but the in-memory caller's value still reflects
 * their intent.
 */
export function writeOrchestratorPauseState(
  state: OrchestratorPauseState,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence per v3.0 §8.4.
  }
}
