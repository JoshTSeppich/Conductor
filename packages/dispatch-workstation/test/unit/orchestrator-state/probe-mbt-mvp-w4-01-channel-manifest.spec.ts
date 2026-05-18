// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB1 (RED) — probe-01:
// channel-manifest source-text-assert.
//
// Asserts the WORKSTATION_CONTRACT.md §6.6 amendment AND the
// preload.mts bridge surface are aligned for Channels B-1 + B-2
// (per dispatch §0 pre-authorization 2026-05-18 ~10:10 MDT):
//
//   Channel #8 — orchestrator-state:get-snapshot (invoke/handle)
//     bridge:  window.orchestratorStateBridge.getSnapshot()
//     payload: Promise<OrchestratorStateSnapshot>
//
//   Channel #9 — orchestrator-state:update (main→renderer broadcast)
//     bridge:  window.orchestratorStateBridge.onUpdate(callback)
//     payload: OrchestratorStateSnapshot
//
// Strategy: source-text-assert via fs.readFileSync against the two
// frozen-contract surfaces — WORKSTATION_CONTRACT.md (operator-
// arbitrated frozen authority per CLAUDE.md §1 + §2.10) and
// preload.mts (contextBridge expose surface; renderer-bound bridge
// implementation). Source-text-assert pattern matches the established
// MB-F-W3-FINAL-PRESERVED-METER-SLOT-PROBE-REAUTHORING-PENDING
// precedent (FOLLOWUPS row 402 source-text-assert probes brf-01,
// brf-02, wft9-01).
//
// RED expectations at WB1 commit (this commit):
//   - WORKSTATION_CONTRACT.md assertions PASS (amendment landed in
//     this commit).
//   - preload.mts assertions FAIL (orchestratorStateBridge contextBridge
//     block not yet authored; WB9 lands it).
//
// GREEN flip happens at WB9 when preload.mts is amended with the
// orchestratorStateBridge.exposeInMainWorld block exposing
// { getSnapshot, onUpdate } against the IPC channels above.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const WORKSTATION_CONTRACT_PATH = resolve(REPO_ROOT, 'WORKSTATION_CONTRACT.md');
const PRELOAD_PATH = resolve(
  REPO_ROOT,
  'packages/dispatch-workstation/src/main/preload.mts',
);

function readSource(p: string): string {
  return readFileSync(p, 'utf8');
}

describe('MB-T-MVP-W4 probe-01 — channel manifest', () => {
  describe('WORKSTATION_CONTRACT.md §6.6 amendment', () => {
    const contract = readSource(WORKSTATION_CONTRACT_PATH);

    it('contains Channel #8 header for orchestrator-state:get-snapshot', () => {
      expect(contract).toMatch(
        /#### Channel #8 — `orchestrator-state:get-snapshot`/,
      );
    });

    it('contains Channel #9 header for orchestrator-state:update', () => {
      expect(contract).toMatch(
        /#### Channel #9 — `orchestrator-state:update`/,
      );
    });

    it('declares Channel #8 bridge surface getSnapshot()', () => {
      expect(contract).toContain(
        'window.orchestratorStateBridge.getSnapshot(): Promise<OrchestratorStateSnapshot>',
      );
    });

    it('declares Channel #9 bridge surface onUpdate(callback)', () => {
      expect(contract).toContain(
        'window.orchestratorStateBridge.onUpdate(callback: (snapshot: OrchestratorStateSnapshot) => void): () => void',
      );
    });

    it('declares Channel #8 direction renderer → main (invoke/handle)', () => {
      // Look within the Channel #8 block specifically.
      const ch8Start = contract.indexOf(
        '#### Channel #8 — `orchestrator-state:get-snapshot`',
      );
      const ch9Start = contract.indexOf(
        '#### Channel #9 — `orchestrator-state:update`',
      );
      expect(ch8Start).toBeGreaterThan(-1);
      expect(ch9Start).toBeGreaterThan(ch8Start);
      const ch8Block = contract.slice(ch8Start, ch9Start);
      expect(ch8Block).toContain('renderer → main (invoke/handle)');
    });

    it('declares Channel #9 direction main → renderer (broadcast)', () => {
      const ch9Start = contract.indexOf(
        '#### Channel #9 — `orchestrator-state:update`',
      );
      const next = contract.indexOf('#### ', ch9Start + 1);
      expect(ch9Start).toBeGreaterThan(-1);
      expect(next).toBeGreaterThan(ch9Start);
      const ch9Block = contract.slice(ch9Start, next);
      expect(ch9Block).toContain('main → renderer (broadcast');
    });

    it('declares OrchestratorStateSnapshot type as workstation-local interface (Q4 arbitration)', () => {
      expect(contract).toContain(
        'packages/dispatch-workstation/src/main/orchestrator-state-types.ts',
      );
      expect(contract).toContain('export interface OrchestratorStateSnapshot');
      expect(contract).toMatch(/readonly seq: number;/);
      expect(contract).toMatch(/readonly polledAt: string \| null;/);
      expect(contract).toMatch(/readonly daemonReachable: boolean;/);
    });

    it('cites MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING as authoring ticket for both channels', () => {
      const ch8Start = contract.indexOf(
        '#### Channel #8 — `orchestrator-state:get-snapshot`',
      );
      const ch9Start = contract.indexOf(
        '#### Channel #9 — `orchestrator-state:update`',
      );
      const ch9End = contract.indexOf('#### Channel #', ch9Start + 1);
      const ch8Block = contract.slice(ch8Start, ch9Start);
      const ch9Block = contract.slice(
        ch9Start,
        ch9End > -1 ? ch9End : ch9Start + 5000,
      );
      expect(ch8Block).toContain('MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING');
      expect(ch9Block).toContain('MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING');
    });
  });

  describe('preload.mts orchestratorStateBridge expose surface (RED until WB9)', () => {
    const preload = readSource(PRELOAD_PATH);

    it('exposes orchestratorStateBridge via contextBridge.exposeInMainWorld', () => {
      // Matches the established pattern:
      //   contextBridge.exposeInMainWorld('orchestratorStateBridge', { ... })
      // Source-text-assert mirrors existing workstationBridge / frameCBridge
      // / coarchitectBridge precedents in preload.mts.
      expect(preload).toMatch(
        /contextBridge\.exposeInMainWorld\(\s*['"]orchestratorStateBridge['"]/,
      );
    });

    it('binds getSnapshot method on orchestratorStateBridge invoking orchestrator-state:get-snapshot', () => {
      // Find the orchestratorStateBridge block and look inside it.
      const blockStart = preload.indexOf("'orchestratorStateBridge'");
      expect(blockStart).toBeGreaterThan(-1);
      // The block typically extends 200-1500 chars; assert getSnapshot symbol
      // + channel-name literal within a 2KB window from the start.
      const block = preload.slice(blockStart, blockStart + 2000);
      expect(block).toMatch(/getSnapshot\s*:/);
      expect(block).toContain('orchestrator-state:get-snapshot');
    });

    it('binds onUpdate method on orchestratorStateBridge subscribing to orchestrator-state:update', () => {
      const blockStart = preload.indexOf("'orchestratorStateBridge'");
      expect(blockStart).toBeGreaterThan(-1);
      const block = preload.slice(blockStart, blockStart + 2000);
      expect(block).toMatch(/onUpdate\s*:/);
      expect(block).toContain('orchestrator-state:update');
    });

    it('onUpdate returns an unsubscribe function (mirrors Channel #7 onBypassPermsUpdate precedent)', () => {
      // Source-text-assert: the onUpdate binding registers via
      // ipcRenderer.on and returns a teardown via ipcRenderer.removeListener
      // (or equivalent). This pattern matches the coarchitectBridge
      // onBypassPermsUpdate / onRateLimitUpdate precedents.
      const blockStart = preload.indexOf("'orchestratorStateBridge'");
      expect(blockStart).toBeGreaterThan(-1);
      const block = preload.slice(blockStart, blockStart + 2000);
      // The unsubscribe pattern uses either removeListener or off.
      expect(block).toMatch(/removeListener|off\(/);
    });
  });
});
