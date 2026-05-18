// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB7 — orchestrator
// narration store (Q1=(c) append-only JSON ring).
//
// Per Q1=(c) operator pre-authorization 2026-05-18: orchestrator
// narration is a fresh workstation-local persisted JSON file. Each
// orchestrator action — spawn / dispatch-tick / terminal-spawn-result
// / attach / detach — appends a typed OrchestratorMessage entry.
// Aggregator reads + replays on startup; appends fan out via in-
// process onState subscribers.
//
// Retention policy STUB only per dispatch §3 WB7 framing — no cap
// implemented in this commit. Filed as Tier-3 followup at WB-final
// (MB-F-MVP-W4-ORCHESTRATOR-NARRATION-RETENTION-POLICY).
//
// File path:
//   <userData>/orchestrator-narration.json
//
// File contents:
//   { "messages": OrchestratorMessage[] }
//   (object-wrap rather than top-level array to preserve forward-
//   compat with future retention metadata; mirrors autopilot-state-
//   store.ts top-level object shape.)
//
// Env-override:
//   MB_ORCHESTRATOR_NARRATION_DIR — mirrors splitter-state +
//   autopilot-state-store + pause-state + attached-build-md MB_*_DIR
//   pattern.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app as appSingleton } from 'electron';
import type { OrchestratorMessage } from './orchestrator-state-types.js';

interface PersistedNarration {
  messages: OrchestratorMessage[];
}

function defaultPersistedNarration(): PersistedNarration {
  return { messages: [] };
}

const STATE_FILENAME = 'orchestrator-narration.json';

function stateDir(): string {
  const override = process.env['MB_ORCHESTRATOR_NARRATION_DIR'];
  if (override && override.length > 0) {
    return override;
  }
  return appSingleton.getPath('userData');
}

function statePath(): string {
  return join(stateDir(), STATE_FILENAME);
}

function isOrchestratorMessage(v: unknown): v is OrchestratorMessage {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const m = v as Record<string, unknown>;
  const role = m['role'];
  if (
    role !== 'user' &&
    role !== 'assistant' &&
    role !== 'dispatch' &&
    role !== 'system' &&
    role !== 'typing'
  ) {
    return false;
  }
  if (m['text'] !== undefined && typeof m['text'] !== 'string') return false;
  if (m['running'] !== undefined && typeof m['running'] !== 'number') {
    return false;
  }
  if (m['id'] !== undefined && typeof m['id'] !== 'string') return false;
  return true;
}

function isPersistedNarration(v: unknown): v is PersistedNarration {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  if (!Array.isArray(s['messages'])) return false;
  return s['messages'].every(isOrchestratorMessage);
}

/**
 * Read the persisted narration log. Returns an empty array on
 * file-absent / parse-error / shape-mismatch. Drops any malformed
 * entries via shape-validator filtering — best-effort observability
 * per autopilot-state-store.ts pattern.
 */
export function readOrchestratorNarration(): ReadonlyArray<OrchestratorMessage> {
  try {
    const raw = readFileSync(statePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (isPersistedNarration(parsed)) return parsed.messages;
    // Salvage path: if top-level shape mismatches but `messages` is
    // an array, filter to well-formed entries. Otherwise return [].
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as Record<string, unknown>)['messages'])
    ) {
      const arr = (parsed as Record<string, unknown>)['messages'] as unknown[];
      return arr.filter(isOrchestratorMessage);
    }
    return defaultPersistedNarration().messages;
  } catch {
    return defaultPersistedNarration().messages;
  }
}

/**
 * Overwrite the narration log on disk. Best-effort write per v3.0
 * §8.4 single-user model.
 */
export function writeOrchestratorNarration(
  messages: ReadonlyArray<OrchestratorMessage>,
): void {
  try {
    const dir = stateDir();
    mkdirSync(dir, { recursive: true });
    const payload: PersistedNarration = { messages: [...messages] };
    writeFileSync(statePath(), JSON.stringify(payload, null, 2), 'utf8');
  } catch {
    // Non-fatal — best-effort persistence per v3.0 §8.4.
  }
}

/**
 * Append a single message to the persisted narration log. Composes
 * read + push + write atomically from the caller's perspective
 * (read-then-write race-conditions are acceptable per v3.0 single-
 * user model). Returns the post-append array.
 *
 * Retention-policy STUB: no message-cap applied here. Filed as
 * Tier-3 followup MB-F-MVP-W4-ORCHESTRATOR-NARRATION-RETENTION-
 * POLICY at WB-final.
 */
export function appendOrchestratorNarration(
  message: OrchestratorMessage,
): ReadonlyArray<OrchestratorMessage> {
  const current = readOrchestratorNarration();
  const next = [...current, message];
  writeOrchestratorNarration(next);
  return next;
}
