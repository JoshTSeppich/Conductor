// MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING closure (a) — WB1 RED.
//
// Contract spec: TileGridSessionEntry (packages/dispatch-workstation/src/
// tile-grid/tile-grid.tsx :29-52) accepts an optional `spawnMode` field
// of literal-union type `'auto' | 'ask'`. The vocabulary mirrors
// SpawnPermissionMode in spawn-handler.ts:91 — there is exactly one
// per-spawn permission concept; the entry field is the renderer-side
// projection of that concept, named `spawnMode` per the T3 contract
// (action-bar.tsx ActionBarProps.spawnMode at T3 commit `e713cbd`
// and detail-pane.tsx DetailPaneProps.spawnMode at line 144).
//
// RED state: at HEAD pre-WB1-GREEN, TileGridSessionEntry has 9 fields
// (name, status, collapsed, branchName, repoName, model, tokensUsed,
// tokenBudget, cwd) — no spawnMode. Construction of an entry literal
// with `spawnMode: 'auto'` therefore violates excess-property check on
// the declared-type annotation. The `@ts-expect-error WB1 RED:`
// suppressions below are valid at HEAD. At WB1 GREEN (after adding
// `spawnMode?: 'auto' | 'ask'` to the interface) the suppressions
// become unused → typecheck fails until they are removed. Removing
// them with the field present yields a valid assignment and a clean
// typecheck — this transition is the GREEN flip.
//
// Closure anchor: FOLLOWUPS.md:332 (MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-
// MISSING Tier 2); T3 findings doc §I; phase-4-tier-1-roadmap-draft.md
// :111-121. Closure path (a) selected per dispatch-queue row
// `commit-plan-doc-1334`.

import { describe, it, expect } from 'vitest';
import type { TileGridSessionEntry } from '../../../src/tile-grid/tile-grid.js';

describe('MB-F-TILEGRIDSESSIONENTRY-SPAWNMODE-MISSING (a) — WB1 entry type-shape', () => {
  it('TileGridSessionEntry accepts spawnMode: "auto"', () => {
    const entry: TileGridSessionEntry = {
      name: 'session-a',
      // @ts-expect-error WB1 RED: spawnMode absent on TileGridSessionEntry until WB1 GREEN
      spawnMode: 'auto',
    };
    // Object literals preserve unknown-to-TS keys at runtime; the
    // value is what we actually care about behaviorally.
    expect((entry as Record<string, unknown>)['spawnMode']).toBe('auto');
  });

  it('TileGridSessionEntry accepts spawnMode: "ask"', () => {
    const entry: TileGridSessionEntry = {
      name: 'session-b',
      // @ts-expect-error WB1 RED: spawnMode absent on TileGridSessionEntry until WB1 GREEN
      spawnMode: 'ask',
    };
    expect((entry as Record<string, unknown>)['spawnMode']).toBe('ask');
  });

  it('spawnMode is optional — entries without it remain valid', () => {
    // No suppression here: omission must already be legal (the field
    // is optional both at RED and GREEN), so this assertion exercises
    // the "?" modifier rather than the field's presence.
    const entry: TileGridSessionEntry = { name: 'session-c' };
    expect((entry as Record<string, unknown>)['spawnMode']).toBeUndefined();
  });
});
