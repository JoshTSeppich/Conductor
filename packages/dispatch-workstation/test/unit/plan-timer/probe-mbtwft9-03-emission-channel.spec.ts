// MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB5 (red) —
// probe-mbtwft9-03-emission-channel: source-text sentinel that
// coarchitect-ipc.ts wires the rate-limit aggregator's onUpdate
// emissions to the `coarchitect:rate-limit-update` broadcast channel
// mirroring the removed MB-T-HSO-WIRE WB14a `broadcastRateLimitUpdate`
// pattern.
//
// Per ticket body 5a27f2f §4 WB5 + decisions doc ADR-MBTWFT9-D
// (Sub-Q-T9-D=(i) reuse existing `coarchitect:rate-limit-update`
// channel — ZERO `WORKSTATION_CONTRACT.md` §6.6 touch; manifest
// FORBIDS that path anyway). Sentinel-style probe mirrors WB1's
// source-text approach (probe-mbtwft9-01) — same anti-fabrication
// discipline; deterministic match against the WB6 GREEN wire-up
// shape; no IPC mocking-infrastructure dependency.
//
// Investigation finding [KNOWN, at HEAD 3fef80d]:
//   - coarchitect-ipc.ts imports {ipcMain, webContents} from
//     'electron' (lines 47, 65) — broadcast infrastructure already
//     available; what's missing is the aggregator wiring.
//   - rate-limit-aggregator.ts ships at WB4 (3fef80d) with
//     {createRateLimitAggregator, createNullRateLimitSource}
//     exports — ready for import.
//   - The handler at coarchitect-ipc.ts:94 currently returns
//     hardcoded null; WB6 GREEN replaces with aggregator-driven
//     return + broadcast emit.
//
// Encoded contract (3 conditions, all RED at HEAD 3fef80d):
//   (1) coarchitect-ipc.ts imports createRateLimitAggregator AND
//       createNullRateLimitSource from './rate-limit-aggregator.js'.
//   (2) coarchitect-ipc.ts contains the aggregator onUpdate
//       wire-up — a call site that registers a callback firing
//       webContents.send('coarchitect:rate-limit-update', state).
//   (3) coarchitect-ipc.ts contains the getRateLimitState handler
//       rewire — handler body references aggregator.getLatestState()
//       instead of the `() => null` STUB literal (subsumes WB1
//       condition (1)).
//
// All three flip GREEN at WB6 (coarchitect-ipc.ts wire-up).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const COARCHITECT_IPC_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/coarchitect-ipc.ts',
);

describe('MB-T-WIREFRAME-T9-PLAN-TIMER-DATA-FLOW WB5 — emission channel wire-up', () => {
  describe('Condition (1): aggregator imports', () => {
    it('coarchitect-ipc.ts imports `createRateLimitAggregator` and `createNullRateLimitSource` from ./rate-limit-aggregator.js', () => {
      expect(existsSync(COARCHITECT_IPC_PATH)).toBe(true);
      const source = readFileSync(COARCHITECT_IPC_PATH, 'utf8');
      // Match either named-import shape (single line or wrapped):
      //   import { createRateLimitAggregator, createNullRateLimitSource } from './rate-limit-aggregator.js';
      //   import {
      //     createRateLimitAggregator,
      //     createNullRateLimitSource,
      //   } from './rate-limit-aggregator.js';
      expect(
        source,
        'coarchitect-ipc.ts must import createRateLimitAggregator + createNullRateLimitSource from ./rate-limit-aggregator.js',
      ).toMatch(/createRateLimitAggregator/);
      expect(source).toMatch(/createNullRateLimitSource/);
      expect(source).toMatch(/from\s+['"]\.\/rate-limit-aggregator\.js['"]/);
    });
  });

  describe('Condition (2): aggregator onUpdate → broadcast wire-up', () => {
    it('coarchitect-ipc.ts contains the aggregator.onUpdate(...) call site wiring a webContents.send(\'coarchitect:rate-limit-update\', state) broadcast', () => {
      const source = readFileSync(COARCHITECT_IPC_PATH, 'utf8');
      // Sentinel: aggregator-variable .onUpdate(...) AND the broadcast
      // channel literal AND the wc.send pattern must all be present.
      // Match each independently — robust to whitespace/formatting.
      expect(
        source,
        'coarchitect-ipc.ts must register aggregator.onUpdate callback at module init (WB6 GREEN)',
      ).toMatch(/\.onUpdate\s*\(/);
      expect(
        source,
        'coarchitect-ipc.ts must emit to coarchitect:rate-limit-update broadcast channel',
      ).toMatch(/['"]coarchitect:rate-limit-update['"]/);
      // wc.send(channel, state) pattern — mirror of removed
      // broadcastRateLimitUpdate from MB-T-HSO-WIRE WB14a.
      expect(source).toMatch(/\.send\s*\(\s*['"]coarchitect:rate-limit-update['"]/);
    });
  });

  describe('Condition (3): getRateLimitState handler rewire', () => {
    it('coarchitect-ipc.ts handler body references aggregator.getLatestState() instead of `() => null`', () => {
      const source = readFileSync(COARCHITECT_IPC_PATH, 'utf8');
      // Sentinel: getLatestState reference proves the handler body
      // pulls from the aggregator. STUB-removal already asserted by
      // WB1 probe condition (1); duplicated here for WB5
      // self-containment.
      expect(
        source,
        'coarchitect-ipc.ts getRateLimitState handler must reference aggregator.getLatestState()',
      ).toMatch(/getLatestState\s*\(\s*\)/);
      // STUB literal must NOT be present (WB1 condition (1) carbon
      // copy — WB5 is a stricter version that also requires the
      // aggregator wiring to be in place).
      expect(source).not.toMatch(
        /ipcMain\.handle\(\s*['"]coarchitect:getRateLimitState['"]\s*,\s*\(\s*\)\s*=>\s*null\s*\)/,
      );
    });
  });
});
