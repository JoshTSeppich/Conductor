// MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 (red) —
// probe-mbtphase4-clustera-01-spawn-result-fields: source-text sentinel
// that SpawnSessionResult exposes the two field extensions owned by
// __orchestrator_active's Cluster A sub-path (model + spawnedAtMs).
//
// Per Round 11 §3.9 Wave 3 dispatch + manifest at
// docs/coordination/territorial-manifests/orch-active-cluster-a-exec.txt:
//   - 3-way Cluster A sub-path split per coord doc
//     docs/coordination/coord-cluster-a-orch-active-2026-05-12.md.
//   - Sub-Q resolutions per decisions doc
//     docs/coordination/mb-t-phase-4-spawn-result-field-extensions-decisions-2026-05-12.md.
//   - Body anchor: synthesis §2 at commit 52f3d04 (DRAFT in
//     docs/coordination/phase-4-synthesis-2026-05-12.md; formal
//     build-doc not yet authored).
//
// Downscope from synthesis §2.4 WB1 (3 conditions) → 2 conditions:
//   - spawnMode arm absorbed by sibling commit-plan-doc-1334 per
//     Sub-Q-C=(i) "absorb if landed first"; observed via working-tree
//     diff at HEAD 1402e15.
//   - TileGridSessionEntry sentinel deferred to phase4-t8-exec
//     sub-path; `tile-grid.tsx` FORBIDDEN by my manifest.
//
// Investigation finding [KNOWN, at HEAD 1402e15]:
//   spawn-handler.ts:190-228 SpawnSessionResult interface body
//   exposes: sessionId, panelMounted, cwd. Peer's uncommitted diff
//   adds spawnMode? at line 224. Neither `model?:` nor `spawnedAtMs`
//   present. Both RED at this commit; flip GREEN at future WB3
//   (model field add) + WB5 (spawnedAtMs field add) per synthesis
//   §2.4 WB ladder.
//
// Encoded contract (2 conditions, both RED at HEAD 1402e15):
//   (1) `spawn-handler.ts` source-text matches a SpawnSessionResult
//       interface body containing a `model?:` field declaration.
//       MUST be inside the SpawnSessionResult body (sentinel anchors
//       on the `export interface SpawnSessionResult {` opener).
//   (2) `spawn-handler.ts` source-text matches a SpawnSessionResult
//       interface body containing a `spawnedAtMs` field declaration.
//
// Per dispatch-turn-4 + CLAUDE.md §2.7 + §2.6:
//   - Per-path commit pathspec mandatory.
//   - Pre-commit `git status --short` check mandatory.
//   - Push after each cairn-grammar commit.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const SPAWN_HANDLER_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/spawn-handler.ts',
);

// Extract the SpawnSessionResult interface body from the source.
// Returns the body text (between the opening `{` and matching `}`).
// Returns null if the interface is not found OR the body is malformed.
function extractSpawnSessionResultBody(source: string): string | null {
  const openMatch = source.match(
    /export\s+interface\s+SpawnSessionResult\s*\{/,
  );
  if (!openMatch || openMatch.index === undefined) return null;
  const bodyStart = openMatch.index + openMatch[0].length;
  // Walk to matching close-brace with depth tracking.
  let depth = 1;
  let i = bodyStart;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) return source.slice(bodyStart, i);
    i++;
  }
  return null;
}

describe('MB-T-PHASE-4-SPAWN-RESULT-FIELD-EXTENSIONS WB1 — SpawnSessionResult field-extension stub state (__orchestrator_active-cluster-a sub-path)', () => {
  describe('Setup: spawn-handler.ts exists + SpawnSessionResult interface present', () => {
    it('spawn-handler.ts file exists at expected path', () => {
      expect(
        existsSync(SPAWN_HANDLER_PATH),
        `spawn-handler.ts must exist at ${SPAWN_HANDLER_PATH}`,
      ).toBe(true);
    });

    it('SpawnSessionResult interface body is extractable', () => {
      const source = readFileSync(SPAWN_HANDLER_PATH, 'utf8');
      const body = extractSpawnSessionResultBody(source);
      expect(
        body,
        'SpawnSessionResult interface body must be locatable via the `export interface SpawnSessionResult {` opener; if this fails, the interface has been renamed or removed and the probe contract needs revision',
      ).not.toBeNull();
    });
  });

  describe('Condition (1): SpawnSessionResult exposes `model?:` field', () => {
    it('SpawnSessionResult body contains a `model?:` field declaration', () => {
      const source = readFileSync(SPAWN_HANDLER_PATH, 'utf8');
      const body = extractSpawnSessionResultBody(source);
      expect(body, 'pre-condition: interface body extracted').not.toBeNull();
      // Match `model?:` (optional field) OR `model:` (required field —
      // permissive against future Sub-Q-A non-default resolutions).
      expect(
        body!,
        'SpawnSessionResult must declare a `model` field (closes Cluster A model arm per synthesis §2.1.1 item 1 + Sub-Q-A=(i) workstation spawn-handler extension); WB3 GREEN ships this',
      ).toMatch(/\bmodel\??\s*:/);
    });
  });

  describe('Condition (2): SpawnSessionResult exposes `spawnedAtMs` field', () => {
    it('SpawnSessionResult body contains a `spawnedAtMs` field declaration', () => {
      const source = readFileSync(SPAWN_HANDLER_PATH, 'utf8');
      const body = extractSpawnSessionResultBody(source);
      expect(body, 'pre-condition: interface body extracted').not.toBeNull();
      // Match `spawnedAtMs:` (required field) OR `spawnedAtMs?:` (optional).
      expect(
        body!,
        'SpawnSessionResult must declare a `spawnedAtMs` field (closes Cluster A spawnedAtMs arm per synthesis §2.1.1 item 2 + Sub-Q-B=(iii) workstation spawn-handler extension; also closes MB-F-FRAME-C-UPTIME-LOST-ON-FRAME-TOGGLE-2026-05-12 closure-path-(iii)); WB5 GREEN ships this',
      ).toMatch(/\bspawnedAtMs\??\s*:/);
    });
  });
});
