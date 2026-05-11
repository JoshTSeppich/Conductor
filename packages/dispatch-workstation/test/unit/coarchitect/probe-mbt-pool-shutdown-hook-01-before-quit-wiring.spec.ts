// MB-T-POOL-SHUTDOWN-HOOK-FIX WB1 (red) — main.ts wires pool.stop() to
// electron 'before-quit' handler with race-safe Sub-Q-B=b 5s timeout.
//
// Probe location: cairn-grammar adjustment from ticket body §4 WB1
// (originally proposed `test/unit/main-process/`). Placed here under
// `test/unit/coarchitect/` to match the established probe-mbthsowire-NN
// convention: probes that assert main.ts MB-T-HSO-WIRE-zone wiring live
// in coarchitect/ next to swarm-state-writer + peer-summary-harvester +
// hso-pool source. The probe-mbthsowire-02/04 source-text-assertion
// pattern is mirrored directly.
//
// Asserts (per ticket body §4 WB1):
//   (1) main.ts contains an `app.on('before-quit', ...)` handler registration.
//   (2) The handler invokes `orchestratorPool.stop()`.
//   (3) The handler is race-safe per Sub-Q-B=b operator-acked: uses
//       `Promise.race(...)` with a 5000ms timeout (5_000 literal) so
//       daemon hang does not block app exit.
//   (4) Handler registration follows `new OrchestratorPoolManager(...)`
//       in source order so the orchestratorPool reference is in scope.
//
// RED state at HEAD `3be4c6b`:
//   - `grep -n "before-quit" main.ts` returns ∅ — condition (1) fails.
//   - `grep -n "orchestratorPool.stop" main.ts` returns ∅ — condition (2) fails.
//   - No race-safe Promise.race pattern present — condition (3) fails.
//   - Conditions (1)-(3) fail at assertion; (4) reports `beforeQuitIdx
//     === -1` (handler absent) so the order assertion fails too.
//
// WB2 GREEN flips all 4 conditions to GREEN per Sub-Q-B=b implementation
// pattern documented in ticket body §4 WB2 illustrative skeleton.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const MAIN_TS_PATH = join(__dirname_local, '../../../src/main/main.ts');

describe('MB-T-POOL-SHUTDOWN-HOOK-FIX WB1 — main.ts wires pool.stop() to electron before-quit', () => {
  let mainSource: string;

  beforeAll(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf8');
  });

  describe('Condition (1): app.on("before-quit", ...) handler registered', () => {
    it('main.ts contains an app.on("before-quit", ...) registration', () => {
      // Closes MB-F-POOL-SHUTDOWN-HOOK-DAEMON-RECONCILIATION (Tier 3 at
      // FOLLOWUPS.md:286): pool.stop() is shipped at hso-pool.ts:266-286
      // (deca210 path-E) but never invoked from main.ts; without this
      // handler, clean SIGTERM leaves 2 daemon-registry rows at
      // state='armed' instead of state='held'.
      expect(
        mainSource,
        'main.ts must register an electron before-quit handler so pool.stop() fires before app exits',
      ).toMatch(/app\.on\s*\(\s*['"]before-quit['"]\s*,/);
    });
  });

  describe('Condition (2): handler invokes orchestratorPool.stop()', () => {
    it('main.ts invokes orchestratorPool.stop() (within the before-quit handler)', () => {
      // pool.stop() per hso-pool.ts:266-286 disposes observers + clears
      // poll timer, then iterates [RESERVED_ACTIVE, RESERVED_STANDBY] and
      // PATCHes each to state='held' best-effort via daemonSessionsClient.
      // This is the path-E shipped logic (deca210); the WB2 wiring just
      // invokes it from the right lifecycle hook.
      expect(
        mainSource,
        'main.ts must invoke orchestratorPool.stop() so reserved-name rows get PATCHed to state="held" before app exits',
      ).toMatch(/orchestratorPool\.stop\s*\(\s*\)/);
    });
  });

  describe('Condition (3): handler is race-safe with Sub-Q-B=b 5s bounded timeout', () => {
    it('main.ts uses Promise.race(...) to bound pool.stop() under daemon hang', () => {
      // Sub-Q-B=b operator-acked default: bounded timeout 5s. The
      // handler must wrap pool.stop() in Promise.race so a hung daemon
      // (PATCH never returns) does not block app exit indefinitely.
      // Recommended skeleton per ticket body §4 WB2:
      //   await Promise.race([
      //     orchestratorPool.stop(),
      //     new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      //   ]);
      expect(
        mainSource,
        'handler must wrap pool.stop() in Promise.race(...) so daemon hang does not block app exit',
      ).toMatch(/Promise\.race\s*\(/);
    });

    it('main.ts contains a 5000ms (5_000 literal) timeout for the before-quit race', () => {
      // 5000 or 5_000 numeric literal — both forms acceptable per JS
      // numeric-separator grammar. Sub-Q-B=a (no timeout) and Sub-Q-B=c
      // (1000ms tighter) would each fail this assertion; only =b satisfies.
      expect(
        mainSource,
        'Sub-Q-B=b operator-acked: timeout must be 5000ms (5_000 literal)',
      ).toMatch(/5_?000/);
    });
  });

  describe('Condition (4): handler registration follows pool construction in source order', () => {
    it('app.on("before-quit", ...) appears AFTER new OrchestratorPoolManager(...) in main.ts source order', () => {
      // Source order matters: the `orchestratorPool` const must be in
      // scope at the handler-registration site so the closure can call
      // `orchestratorPool.stop()`. WB11 a02ddae constructed the pool
      // inside `app.whenReady()` (currently around main.ts:692); WB2
      // must register the before-quit handler EITHER inside the same
      // app.whenReady callback (Z-1 extension of MB-T-HSO-WIRE zone) OR
      // in a sibling sentinel zone immediately after pool construction
      // (Z-2 placement). Either Z-1 or Z-2 satisfies source-order.
      const poolCtorIdx = mainSource.search(/new OrchestratorPoolManager\s*\(/);
      const beforeQuitIdx = mainSource.search(
        /app\.on\s*\(\s*['"]before-quit['"]\s*,/,
      );
      expect(
        poolCtorIdx,
        'new OrchestratorPoolManager(...) must be present (shipped at MB-T-HSO-WIRE WB11 a02ddae)',
      ).toBeGreaterThan(-1);
      expect(
        beforeQuitIdx,
        'app.on("before-quit", ...) handler must be present (this WB)',
      ).toBeGreaterThan(-1);
      expect(
        poolCtorIdx,
        'Handler must follow pool construction so the orchestratorPool reference is in scope',
      ).toBeLessThan(beforeQuitIdx);
    });
  });
});
