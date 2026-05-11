// MB-T-HSO-WIRE WB10 (red) — OrchestratorPoolManager auto-spawn at
// app.whenReady contract probe.
//
// Asserts (per ticket §4 WB10 line 264-270 + Sub-Q-A=b operator arbitration
// 2026-05-11):
//   (1) main.ts MB-T-HSO-WIRE sentinel zone contains
//       `new OrchestratorPoolManager(...)` construction.
//   (2) Pool construction follows `registerActionMarkerRouter(...)` (WB7+WB9
//       observer + policy) in source order within the zone — preserves the
//       plan §1.3 Obs-3 chain: writer → harvester → observer → policy → pool.
//   (3) Pool's `.start()` is invoked somewhere after its construction. The
//       `.start()` is the call that triggers `_spawnAndRegister(RESERVED_ACTIVE)`
//       (hso-pool.ts:121-122), which in turn calls `_spawnAndRegister(__orchestrator_active)`
//       via the RESERVED_ACTIVE constant at hso-pool.ts:69.
//   (4) hso-pool.ts `_spawnAndRegister` sets `process.env.CLAUDE_APPEND_SYSTEM_PROMPT`
//       before invoking `spawnController.handleSpawnRequest(...)`. This is the
//       Sub-Q-A=b env-var injection mechanism — confines argv-shape coupling to
//       spawn-handler.ts without modifying SpawnSessionRequest (schema.ts §1-§13
//       frozen contract).
//   (5) spawn-handler.ts reads `process.env.CLAUDE_APPEND_SYSTEM_PROMPT` in its
//       tmux argv assembly and, when set, appends `--append-system-prompt <path>`
//       to the claude invocation. This makes the spawned CC session load the
//       MB-T41 orchestrator system prompt (hso-system-prompts/orchestrator.md).
//
// WB10 RED today (HEAD `31b1397`):
//   - main.ts MB-T-HSO-WIRE zone (line 509-633) ends at `void
//     actionMarkerRouterDispose`; no pool construction.
//   - hso-pool.ts has no `process.env.CLAUDE_APPEND_SYSTEM_PROMPT` write.
//   - spawn-handler.ts has no `process.env.CLAUDE_APPEND_SYSTEM_PROMPT` read and
//     no `--append-system-prompt` argv token.
// All 6 assertions fail RED at assertion-level (not import-resolution).
//
// WB11 GREEN: pool wiring lands in main.ts; env-var write lands in hso-pool.ts
// `_spawnAndRegister`; env-var read + argv append lands in spawn-handler.ts
// `buildTmuxArgs`. 6 assertions flip RED → GREEN.
//
// Sub-Q-A=b binding rationale (recorded for future readers): env-var injection
// is the operator-arbitrated mechanism among the three Sub-Q-A options:
//   (a) extend SpawnSessionRequest — touches schema.ts §1-§13 frozen surface
//       and requires a `contract(MB-T-HSO-WIRE-argv): ...` cairn-grammar commit
//       per CLAUDE.md §2.4 before WB11 GREEN. Rejected.
//   (b) env-var injection — pool writes process.env before spawn; handler reads
//       process.env in argv assembly. No frozen-surface touch. SELECTED.
//   (c) pool-owned spawn-controller — pool bypasses SpawnIpcController and
//       calls spawnSession() directly with extended args. Splits responsibility
//       between two spawn paths (operator-driven IPC vs pool-driven direct).
//       Rejected.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname_local = dirname(fileURLToPath(import.meta.url));
const MAIN_TS_PATH = join(__dirname_local, '../../../src/main/main.ts');
const HSO_POOL_PATH = join(__dirname_local, '../../../src/coarchitect/hso-pool.ts');
const SPAWN_HANDLER_PATH = join(__dirname_local, '../../../src/main/spawn-handler.ts');

const ZONE_BEGIN = '=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer ===';
const ZONE_END = '=== END: MB-T-HSO-WIRE shared-emitter-and-writer ===';

function extractZone(source: string): string | null {
  const beginIdx = source.indexOf(ZONE_BEGIN);
  const endIdx = source.indexOf(ZONE_END);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) return null;
  return source.slice(beginIdx + ZONE_BEGIN.length, endIdx);
}

describe('MB-T-HSO-WIRE WB10 — OrchestratorPoolManager auto-spawn contract', () => {
  let mainSource: string;
  let hsoPoolSource: string;
  let spawnHandlerSource: string;

  beforeAll(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf8');
    hsoPoolSource = readFileSync(HSO_POOL_PATH, 'utf8');
    spawnHandlerSource = readFileSync(SPAWN_HANDLER_PATH, 'utf8');
  });

  describe('(1) Pool instantiated in main.ts MB-T-HSO-WIRE sentinel zone', () => {
    it('main.ts zone contains `new OrchestratorPoolManager(...)`', () => {
      const zone = extractZone(mainSource);
      expect(
        zone,
        'MB-T-HSO-WIRE sentinel zone must exist in main.ts (shipped at 95f5ba7, relocated at 8c81188)',
      ).not.toBeNull();
      expect(
        zone!,
        'zone must contain `new OrchestratorPoolManager(...)` construction (WB11 GREEN extension)',
      ).toMatch(/new OrchestratorPoolManager\s*\(/);
    });
  });

  describe('(2) Construction order: pool follows actionMarkerRouter (WB7 + WB9 observer + policy)', () => {
    it('OrchestratorPoolManager construction comes AFTER registerActionMarkerRouter() in source order within the zone', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      const routerIdx = zone!.search(/registerActionMarkerRouter\s*\(/);
      const poolIdx = zone!.search(/new OrchestratorPoolManager\s*\(/);
      expect(
        routerIdx,
        'registerActionMarkerRouter must be present (WB7 GREEN d9b5722 + WB9 GREEN 31b1397)',
      ).toBeGreaterThan(-1);
      expect(
        poolIdx,
        'OrchestratorPoolManager construction must be present (WB11 GREEN extension)',
      ).toBeGreaterThan(-1);
      expect(
        routerIdx,
        'Per plan §1.3 Obs-3 construction order: writer → harvester → observer → policy → pool. Pool must follow router in source order so action-marker dispatch + approval-policy gate are wired before any auto-spawn fires.',
      ).toBeLessThan(poolIdx);
    });
  });

  describe('(3) Pool .start() invoked (triggers _spawnAndRegister(__orchestrator_active))', () => {
    it('zone calls `<poolId>.start()` somewhere after the pool construction', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      // Extract the identifier bound to the pool construction so the assertion
      // is robust to authorial naming choices (no hardcoded `orchestratorPool`).
      const poolMatch = zone!.match(
        /(?:const|let)\s+([a-zA-Z_$][\w$]*)\s*=\s*new OrchestratorPoolManager\s*\(/,
      );
      expect(
        poolMatch,
        'pool must be bound to a const/let identifier (e.g., `const orchestratorPool = new OrchestratorPoolManager({...})`)',
      ).not.toBeNull();
      const poolId = poolMatch![1];
      const startRe = new RegExp(`\\b${poolId}\\.start\\s*\\(\\s*\\)`);
      expect(
        zone!,
        `${poolId}.start() must be invoked to trigger _spawnAndRegister(__orchestrator_active) per hso-pool.ts:121`,
      ).toMatch(startRe);
    });
  });

  describe('(4) Sub-Q-A=b env-var injection: hso-pool sets CLAUDE_APPEND_SYSTEM_PROMPT', () => {
    it('hso-pool.ts contains an assignment to `process.env.CLAUDE_APPEND_SYSTEM_PROMPT`', () => {
      expect(
        hsoPoolSource,
        'hso-pool.ts `_spawnAndRegister` must set `process.env.CLAUDE_APPEND_SYSTEM_PROMPT = <orchestratorSystemPromptPath>` before invoking `spawnController.handleSpawnRequest(...)`. This is the Sub-Q-A=b env-var injection mechanism.',
      ).toMatch(/process\.env\.CLAUDE_APPEND_SYSTEM_PROMPT\s*=/);
    });
  });

  describe('(5) Sub-Q-A=b env-var read + argv: spawn-handler reads env, appends --append-system-prompt', () => {
    it('spawn-handler.ts reads `process.env.CLAUDE_APPEND_SYSTEM_PROMPT`', () => {
      expect(
        spawnHandlerSource,
        'spawn-handler.ts `buildTmuxArgs` must read `process.env.CLAUDE_APPEND_SYSTEM_PROMPT` to detect pool-driven spawns (vs operator-driven spawns where the env var is unset)',
      ).toMatch(/process\.env\.CLAUDE_APPEND_SYSTEM_PROMPT/);
    });

    it('spawn-handler.ts emits `--append-system-prompt` argv token when the env var is set', () => {
      expect(
        spawnHandlerSource,
        'spawn-handler.ts `buildTmuxArgs` must append `--append-system-prompt <path>` to claude argv when CLAUDE_APPEND_SYSTEM_PROMPT is set. Loads the MB-T41 orchestrator.md system prompt into the spawned CC session.',
      ).toMatch(/--append-system-prompt/);
    });
  });
});
