// MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB1 (red) —
// probe-mbtphase5-status-derive-01-mapping.
//
// Contract spec for `deriveTileStatus(input: SessionStatusInput): TileStatus`
// per ticket body §4 WB1 (commit 832c03b §1.1 row 1 + §4 WB1). The
// pure-fn maps daemon GET /v2/sessions response fields + workstation-
// side daemon-reachability boolean to a TileStatus value consumable
// by frame-c/status-color.ts.
//
// 8 conditions one-per-branch + 1 fallback (defensive grey):
//   (1) !daemonReachable                            → 'error'
//   (2) state === 'killed'                           → 'killed'
//   (3) state === 'held'                             → 'error'
//   (4) computed_status === 'running'                → 'open'
//   (5) computed_status === 'idle'                   → 'idle'
//   (6) computed_status === 'stale'                  → 'warning'
//   (7) computed_status === 'awaiting_review'        → 'detached'
//   (8) hasSpawnResult && !computed_status (pre-poll) → 'idle'
//
// Vocabulary anchored at:
//   - StateEnum: dispatch-core/src/v2/schema.ts:32
//     ('armed' | 'paused' | 'held' | 'killed')
//   - ComputedStatusEnum: dispatch-core/src/v2/schema.ts:40-45
//     ('idle' | 'running' | 'awaiting_review' | 'stale')
//   - TileStatus: tile-grid/types.ts:39-45
//     ('idle' | 'open' | 'killed' | 'detached' | 'error' | 'warning')
//
// RED state at HEAD post-ticket-body 832c03b:
//   - session-status-source-derive.ts does NOT exist; dynamic import
//     fails; captured in `importError`; all 8 assertions fail because
//     `deriveTileStatus` resolves to undefined.
//
// GREEN transition: implement the module + export; remove the
// `@ts-expect-error WB1 RED:` on the type import; all 8 PASS.

import { describe, it, expect, beforeAll } from 'vitest';
import type { TileStatus } from '../../../src/tile-grid/types.js';

// Mirror of the SessionStatusInput shape declared at ticket body §1.1
// row 1. Probe uses a structural local type at RED so the test runs
// before the source module exists. GREEN imports the real type and
// removes this local declaration (or keeps it as a structural-parity
// guard — operator decision at WB1 GREEN).
interface SessionStatusInput {
  readonly state?: 'armed' | 'paused' | 'held' | 'killed';
  readonly computed_status?: 'idle' | 'running' | 'awaiting_review' | 'stale';
  readonly daemonReachable: boolean;
  readonly hasSpawnResult: boolean;
}

type DeriveFn = (input: SessionStatusInput) => TileStatus;

let deriveTileStatus: DeriveFn | undefined;
let importError: Error | undefined;

beforeAll(async () => {
  try {
    const modulePath = '../../../src/main/session-status-source-derive.js';
    const mod = await import(/* @vite-ignore */ modulePath);
    deriveTileStatus = (mod as { deriveTileStatus?: DeriveFn }).deriveTileStatus;
  } catch (e) {
    importError = e instanceof Error ? e : new Error(String(e));
  }
});

function callDerive(input: SessionStatusInput): TileStatus | undefined {
  if (importError) throw new Error(`module import failed: ${importError.message}`);
  if (!deriveTileStatus) return undefined;
  return deriveTileStatus(input);
}

describe('MB-T-PHASE-5-STATUS-INDICATOR-DATA-FLOW WB1 — deriveTileStatus mapping', () => {
  it('(1) !daemonReachable → "error" (daemon down trumps everything)', () => {
    expect(
      callDerive({
        daemonReachable: false,
        hasSpawnResult: true,
        state: 'armed',
        computed_status: 'running',
      }),
    ).toBe<TileStatus>('error');
  });

  it('(2) state === "killed" → "killed" (renderer hides via statusToColor null return)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'killed',
        computed_status: 'idle',
      }),
    ).toBe<TileStatus>('killed');
  });

  it('(3) state === "held" → "error" (cairn-violation halt surfaces red)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'held',
        computed_status: 'running',
      }),
    ).toBe<TileStatus>('error');
  });

  it('(4) computed_status === "running" → "open" (green; daemon-derived activity)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'armed',
        computed_status: 'running',
      }),
    ).toBe<TileStatus>('open');
  });

  it('(5) computed_status === "idle" → "idle" (grey)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'armed',
        computed_status: 'idle',
      }),
    ).toBe<TileStatus>('idle');
  });

  it('(6) computed_status === "stale" → "warning" (amber; daemon detected stale activity)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'armed',
        computed_status: 'stale',
      }),
    ).toBe<TileStatus>('warning');
  });

  it('(7) computed_status === "awaiting_review" → "detached" (amber; kanban-state surface)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        state: 'armed',
        computed_status: 'awaiting_review',
      }),
    ).toBe<TileStatus>('detached');
  });

  it('(8) hasSpawnResult && !computed_status (pre-poll window) → "idle" (grey)', () => {
    expect(
      callDerive({
        daemonReachable: true,
        hasSpawnResult: true,
        // computed_status omitted — pre-poll grey window
      }),
    ).toBe<TileStatus>('idle');
  });
});
