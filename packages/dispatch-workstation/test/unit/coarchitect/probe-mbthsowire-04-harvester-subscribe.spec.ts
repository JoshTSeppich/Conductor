// MB-T-HSO-WIRE WB4-revised (red) — PeerSummaryHarvester wiring contract probe.
//
// Q-WB3-GREEN-PATH=A reauthor 2026-05-11: original WB4 RED at `ab7e093`
// imported a speculative `wireHsoSubsystem` factory; ticket §4 WB3 actually
// placed the wiring inline in main.ts (T2 shipped `95f5ba7` with sentinel
// zone `=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===`). This probe
// supersedes ab7e093's import-shape with main.ts source-text assertions
// mirroring T2's probe-mbthsowire-02-emitter-writer-subscribe.spec.ts pattern.
//
// Asserts (per ticket §4 WB4 line 222-227):
//   probe-01: harvester is constructed in the MB-T-HSO-WIRE sentinel zone
//             AND `.start()` is called on it. `.start()` is the call that
//             registers the addStdoutObserver via the IConsoleBroadcaster
//             tap (peer-summary-harvester.ts:142 — `this.disposeObserver =
//             this.ptyBroadcaster.addStdoutObserver(...)`).
//   probe-02: harvester is wired to the SAME shared emitter that the writer
//             subscribes to. Asserted by extracting the identifier passed
//             positionally to `new SwarmStateWriter(...)` and asserting the
//             same identifier is passed as the `stateEmitter` field to
//             `new PeerSummaryHarvester({...})`.
//   probe-03: harvester construction follows writer construction in source
//             order within the sentinel zone. Per plan §1.3 Obs-3: shared
//             EventEmitter → writer → harvester. Writer subscribes to
//             `peer:turn-complete` at swarm-state-writer.ts:210 in its
//             constructor; that listener must be in place before harvester
//             starts emitting.
//
// WB4-revised RED today: T2's WB3 sentinel zone constructs the writer only;
//                        no PeerSummaryHarvester construction yet. Probes
//                        01/02/03 all fail at assertion (not import resolve).
// WB5 GREEN: extends the same sentinel zone with harvester construction
//            (deps wired from existing ConsoleIpcController + session-send-
//            prompt-ipc + sharedDispatchEmitter) + `.start()` call. All 3
//            probes flip RED → GREEN.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

describe('MB-T-HSO-WIRE WB4 — PeerSummaryHarvester wiring contract', () => {
  let mainSource: string;

  beforeAll(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf8');
  });

  describe('probe-01: harvester construction + .start() (addStdoutObserver subscription)', () => {
    it('sentinel zone constructs a new PeerSummaryHarvester(...)', () => {
      const zone = extractZone(mainSource);
      expect(
        zone,
        'MB-T-HSO-WIRE sentinel zone must exist (created by WB3 95f5ba7, extended by WB5)',
      ).not.toBeNull();
      expect(
        zone!,
        'zone must contain `new PeerSummaryHarvester(...)` construction (WB5 extension)',
      ).toMatch(/new PeerSummaryHarvester\s*\(/);
    });

    it('sentinel zone calls harvester.start() to register the addStdoutObserver tap', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      // .start() is the harvester method that calls ptyBroadcaster.addStdoutObserver
      // per peer-summary-harvester.ts:142 — verifies the IConsoleBroadcaster
      // subscription contract from ticket §4 WB4 condition (1).
      expect(
        zone!,
        'zone must call `.start()` on the harvester so it subscribes via IConsoleBroadcaster.addStdoutObserver',
      ).toMatch(/\.start\s*\(\s*\)/);
    });
  });

  describe('probe-02: harvester wired to the SAME shared emitter the writer subscribes to', () => {
    it('harvester construction passes the same emitter identifier the writer received', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();

      // Extract the identifier passed as the FIRST positional arg to SwarmStateWriter.
      // T2's WB3 GREEN at 95f5ba7 uses `sharedDispatchEmitter`; the probe extracts
      // dynamically so a future authorial rename does not break this assertion.
      const writerMatch = zone!.match(/new SwarmStateWriter\s*\(\s*([a-zA-Z_$][\w$]*)/);
      expect(
        writerMatch,
        'SwarmStateWriter must be constructed with an emitter identifier as first positional arg',
      ).not.toBeNull();
      const emitterId = writerMatch![1];

      // Assert the harvester construction references `stateEmitter: <same id>`
      // (PeerSummaryHarvester takes a single deps object per peer-summary-harvester.ts:55-69
      // with stateEmitter field). Multi-line tolerant via `s` flag; `[^}]*` is bounded
      // to a single object literal to avoid spilling into the next construction.
      const harvesterRe = new RegExp(
        `new PeerSummaryHarvester\\s*\\(\\s*\\{[^}]*stateEmitter\\s*:\\s*${emitterId}\\b`,
        's',
      );
      expect(
        zone!,
        `harvester must be constructed with stateEmitter: ${emitterId} — the same emitter passed to SwarmStateWriter, so writer's peer:turn-complete listener (swarm-state-writer.ts:210) fires on harvester's emits`,
      ).toMatch(harvesterRe);
    });
  });

  describe('probe-03: construction order — writer before harvester (plan §1.3 Obs-3)', () => {
    it('PeerSummaryHarvester construction follows SwarmStateWriter construction in source order', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      const writerIdx = zone!.search(/new SwarmStateWriter\s*\(/);
      const harvesterIdx = zone!.search(/new PeerSummaryHarvester\s*\(/);
      expect(
        writerIdx,
        'SwarmStateWriter construction must be present (shipped at WB3 GREEN 95f5ba7)',
      ).toBeGreaterThan(-1);
      expect(
        harvesterIdx,
        'PeerSummaryHarvester construction must be present (WB5 GREEN extension)',
      ).toBeGreaterThan(-1);
      expect(
        writerIdx,
        'Writer must precede harvester in source order: writer constructor subscribes to peer:turn-complete (swarm-state-writer.ts:210) and that listener must be in place before harvester.start() can begin emitting',
      ).toBeLessThan(harvesterIdx);
    });
  });
});
