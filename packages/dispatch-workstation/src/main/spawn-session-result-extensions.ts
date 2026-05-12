/**
 * MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB3 GREEN —
 * Pure-fn populator for SpawnSessionResult extension fields.
 *
 * Round 11 §3.9 Wave 3 — operator-arbitrated (β)-style scope narrowing
 * (build-doc §1.5 at `2d938dc`).
 *
 * (β) option (b) NEW MODULE — this module ships independently of
 * `spawn-handler.ts` to preserve disjointness from sibling
 * `commit-plan-doc-1334` (mid-WB3 GREEN concurrent edits at authoring
 * time). Sibling consumer-wiring session integrates by importing
 * `populateSpawnSessionResultExtensions` and spreading the returned
 * fields into the SpawnSessionResult envelope at request-handler entry.
 *
 * Contract per `dispatch-core/src/v3/spawn-result-fields.ts`
 * (`SpawnResultExtensionFields`); imported via dist artifact per
 * CLAUDE.md §3.4 dispatch-core build discipline.
 *
 * Pure-fn design:
 *   - No I/O outside `Date.now()` fallback.
 *   - Caller can inject `now` for testability (probe at
 *     `test/unit/main/probe-mbtphase4-spawn-result-01-shape.spec.ts`
 *     condition (4) injects deterministic timestamps).
 *   - Environment fallback for `model` is OPTIONAL via `defaultModel`
 *     input field; caller supplies env-derived default (e.g.,
 *     `process.env.CLAUDE_DEFAULT_MODEL`) at the integration site
 *     rather than this module reading env directly — keeps the
 *     populator deterministic + side-effect-free.
 */

import type { SpawnResultExtensionFields } from 'dispatch-core/dist/v3/spawn-result-fields.js';

export interface PopulateSpawnSessionResultExtensionsInput {
  /**
   * Explicit model identifier from caller (e.g., 'claude-opus-4-7').
   * Takes precedence over `defaultModel` when both are provided.
   * If absent, populator falls back to `defaultModel`; if both absent,
   * output `model` is undefined.
   */
  readonly model?: string;
  /**
   * Fallback model used when `model` is undefined. Caller-supplied;
   * typical integration: `process.env.CLAUDE_DEFAULT_MODEL`.
   */
  readonly defaultModel?: string;
  /**
   * Spawn timestamp injection point (ms-since-epoch). Tests inject
   * deterministic value; production omits → `Date.now()`.
   */
  readonly now?: number;
}

export function populateSpawnSessionResultExtensions(
  input: PopulateSpawnSessionResultExtensionsInput,
): SpawnResultExtensionFields {
  const model = input.model ?? input.defaultModel;
  const spawnedAtMs = input.now ?? Date.now();
  return { model, spawnedAtMs };
}
