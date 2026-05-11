// MB-T-HSO-WIRE WB2 RED — shared dispatch-event EventEmitter + SwarmStateWriter
// subscriber contract probe.
//
// Asserts the 4 conditions enumerated in ticket §4 WB2:
//   (1) A shared dispatch-event EventEmitter is constructed in main.ts at
//       app.whenReady(), placed inside (or after) the whenReady handler.
//   (2) A SwarmStateWriter is instantiated and subscribed to that emitter.
//       Ticket says "subscribe(emitter) method (or equivalent)"; the actual
//       contract is constructor-time subscription per swarm-state-writer.ts:144-212
//       (constructor takes the emitter and wires 7 `emitter.on(...)` calls).
//   (3) Emitting `action-variant:fired` on the shared emitter triggers the
//       writer's writeSwarmState (verified end-to-end: a swarm-state.md file
//       is atomically written to the configured swarmStatePath).
//   (4) The writer subscription is attached BEFORE any pool spawn (construction
//       order). Pool spawn lands at WB11; today, this assertion verifies the
//       sentinel zone exists and (when WB11 lands an OrchestratorPoolManager
//       construction site) that the zone precedes it in source order.
//
// RED today: main.ts has no MB-T-HSO-WIRE sentinel zone (T1 finding +
// session-start sentinel-zone inventory). WB3 GREEN adds the zone and the
// structural assertions flip to PASS. Assertion (3) is a behavioral
// contract-sanity check using a fresh emitter+writer — passes today and after
// WB3; it documents the contract that WB3's wiring relies on.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { SwarmStateWriter } from '../../../src/coarchitect/swarm-state-writer.js';

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const MAIN_TS_PATH = join(__dirname_local, '../../../src/main/main.ts');
const ZONE_BEGIN = '=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===';
const ZONE_END = '=== END: MB-T-HSO-WIRE shared-emitter-and-writer ===';

function extractZone(source: string): string | null {
  const beginIdx = source.indexOf(ZONE_BEGIN);
  const endIdx = source.indexOf(ZONE_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null;
  return source.slice(beginIdx + ZONE_BEGIN.length, endIdx);
}

describe('MB-T-HSO-WIRE WB2 — shared dispatch-event EventEmitter + SwarmStateWriter subscriber', () => {
  let mainSource: string;

  beforeAll(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf8');
  });

  describe('(1) shared dispatch-event EventEmitter constructed at app.whenReady()', () => {
    it('main.ts contains the MB-T-HSO-WIRE shared-emitter-and-writer sentinel zone', () => {
      const zone = extractZone(mainSource);
      expect(
        zone,
        'main.ts must contain `=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===` ... `=== END: ... ===` sentinel zone',
      ).not.toBeNull();
    });

    it('sentinel zone constructs a new EventEmitter()', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      expect(zone!, 'zone must contain `new EventEmitter()`').toMatch(/new EventEmitter\s*\(\s*\)/);
    });

    it('sentinel zone is placed inside (or after) app.whenReady() per ticket §4 WB2 condition 1', () => {
      const zoneIdx = mainSource.indexOf(ZONE_BEGIN);
      const whenReadyIdx = mainSource.search(/app\.whenReady\s*\(\s*\)/);
      expect(zoneIdx, 'MB-T-HSO-WIRE sentinel zone must exist in main.ts').toBeGreaterThan(-1);
      expect(whenReadyIdx, 'app.whenReady() must exist in main.ts').toBeGreaterThan(-1);
      expect(
        zoneIdx,
        'sentinel zone must be placed inside or after the app.whenReady() handler',
      ).toBeGreaterThan(whenReadyIdx);
    });
  });

  describe('(2) SwarmStateWriter instantiated + subscribed via constructor', () => {
    it('sentinel zone constructs a new SwarmStateWriter', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      expect(zone!, 'zone must contain `new SwarmStateWriter(...)`').toMatch(/new SwarmStateWriter\s*\(/);
    });

    it('EventEmitter is constructed BEFORE SwarmStateWriter in source order (so writer constructor can subscribe to it)', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      const emitterIdx = zone!.search(/new EventEmitter\s*\(\s*\)/);
      const writerIdx = zone!.search(/new SwarmStateWriter\s*\(/);
      expect(emitterIdx, 'EventEmitter construction must be present').toBeGreaterThan(-1);
      expect(writerIdx, 'SwarmStateWriter construction must be present').toBeGreaterThan(-1);
      expect(
        emitterIdx,
        'EventEmitter must be constructed before SwarmStateWriter so the writer constructor can subscribe (per swarm-state-writer.ts:205-211)',
      ).toBeLessThan(writerIdx);
    });

    it('SwarmStateWriter is configured with swarmStatePath pointing to docs/swarm-state.md per plan §5.1 Q-V35-2', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      expect(zone!, 'zone must reference `swarmStatePath`').toMatch(/swarmStatePath/);
      expect(
        zone!,
        'swarmStatePath must include `docs/swarm-state.md` per plan §5.1 Q-V35-2',
      ).toMatch(/docs\/swarm-state\.md/);
    });
  });

  describe('(3) emitting action-variant:fired on the shared emitter triggers writer.writeSwarmState', () => {
    // Contract-sanity check: validates the SwarmStateWriter ↔ EventEmitter
    // binding that WB3's wiring relies on. Uses a fresh emitter+writer pair
    // (not main.ts's instances) to keep this assertion pure-unit and
    // independent of Electron runtime. After WB3 GREEN, the same contract
    // holds for main.ts's wired instances.
    let tmpDir: string | undefined;

    afterEach(() => {
      if (tmpDir !== undefined) {
        rmSync(tmpDir, { recursive: true, force: true });
        tmpDir = undefined;
      }
    });

    it('emitting action-variant:fired causes the writer to atomically write swarm-state.md', () => {
      tmpDir = mkdtempSync(join(tmpdir(), 'mbthsowire-wb2-'));
      const emitter = new EventEmitter();
      const writer = new SwarmStateWriter(emitter, {
        swarmStatePath: join(tmpDir, 'swarm-state.md'),
        handoffDir: join(tmpDir, 'coordination'),
      });

      emitter.emit('action-variant:fired', {
        actionType: 'send-prompt-to-session',
        payload: { sessionName: 'peer-1', prompt: 'test', rationale: 'wb2 probe' },
        sessionName: 'peer-1',
        firedAt: '2026-05-11T00:00:00.000Z',
      });

      const written = readFileSync(join(tmpDir, 'swarm-state.md'), 'utf8');
      expect(written, 'swarm-state.md must be written when action-variant:fired emits').toContain(
        'Conductor v3.5 Swarm State',
      );
      expect(written, 'fired action type must appear in the Actions section').toContain(
        'send-prompt-to-session',
      );
      expect(written, 'session name from payload must appear in the Actions section').toContain(
        'peer-1',
      );

      writer.dispose();
    });
  });

  describe('(4) writer subscription attached BEFORE any pool spawn (construction order)', () => {
    // Pool spawn (OrchestratorPoolManager instantiation) lands at WB11. Today,
    // this assertion verifies the MB-T-HSO-WIRE sentinel zone exists at all
    // (so the construction-order constraint is meaningful) and — if WB11 has
    // already landed an `new OrchestratorPoolManager(...)` site in main.ts —
    // that the writer zone precedes it. The pool-precedes-zone check is
    // forward-looking and trivially-satisfied until WB11.
    it('sentinel zone exists and (if OrchestratorPoolManager is constructed in main.ts) precedes it in source order', () => {
      const zoneIdx = mainSource.indexOf(ZONE_BEGIN);
      expect(
        zoneIdx,
        'MB-T-HSO-WIRE sentinel zone must exist for the construction-order constraint to be meaningful',
      ).toBeGreaterThan(-1);
      const poolIdx = mainSource.search(/new OrchestratorPoolManager\s*\(/);
      if (poolIdx > -1) {
        expect(
          zoneIdx,
          'writer subscription must be constructed before OrchestratorPoolManager (pool) spawn',
        ).toBeLessThan(poolIdx);
      }
      // poolIdx === -1 today (WB11 not yet shipped) → constraint trivially holds
      // once the MB-T-HSO-WIRE zone exists.
    });
  });
});
