// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB6 — attached
// build.md state store (Q3=(a) workstation-side persistence).
//
// Per Q3=(a) operator pre-authorization 2026-05-18: attached-build-md
// is an explicit operator gesture (paperclip in composer + filename
// pill in header). The persisted field is just the path — the rest of
// the AttachedBuildMdState struct (steps/queue/done/running/errored)
// is derived at aggregator-tick time by calling loadBuildMd(path) +
// computeBuildMdStatus(dag, completedTaskIds).
//
// File path:
//   <userData>/attached-build-md-state.json
//
// File contents (single-key object):
//   { "path": string | null }
//
// Env-override (test isolation):
//   MB_ATTACHED_BUILD_MD_STATE_DIR — mirrors splitter-state.ts MB_*_DIR
//   pattern.
//
// Persistence semantics (best-effort, v3.0 single-user model per
// WORKSTATION_CONTRACT.md §8.4):
//   - readAttachedBuildMdState() returns { path: null } on file-absent /
//     parse-error / shape-mismatch (default: nothing attached).
//   - writeAttachedBuildMdState({ path }) overwrites the file.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';

export interface AttachedBuildMdPersistedState {
  path: string | null;
}

export function defaultAttachedBuildMdPersistedState(): AttachedBuildMdPersistedState {
  return { path: null };
}

const STATE_FILENAME = 'attached-build-md-state.json';

function stateDir(): string {
  const override = process.env['MB_ATTACHED_BUILD_MD_STATE_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function statePath(): string {
  return join(stateDir(), STATE_FILENAME);
}

function isAttachedBuildMdPersistedState(
  v: unknown,
): v is AttachedBuildMdPersistedState {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return s['path'] === null || typeof s['path'] === 'string';
}

export function readAttachedBuildMdState(): AttachedBuildMdPersistedState {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (isAttachedBuildMdPersistedState(parsed)) return parsed;
    return defaultAttachedBuildMdPersistedState();
  } catch {
    return defaultAttachedBuildMdPersistedState();
  }
}

export function writeAttachedBuildMdState(
  state: AttachedBuildMdPersistedState,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence per v3.0 §8.4.
  }
}
