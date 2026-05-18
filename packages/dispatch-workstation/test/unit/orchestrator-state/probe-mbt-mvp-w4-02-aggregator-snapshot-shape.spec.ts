// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB2 (RED) — probe-02:
// aggregator-snapshot-shape.
//
// Two-surface RED probe per dispatch §3 WB2 ladder framing:
//   (A) types-present  — orchestrator-state-types.ts exists with all
//                        four interfaces verbatim from §6.6
//                        (PASS at WB2; remains PASS forward).
//   (B) factory-present — orchestrator-state-aggregator.ts exists with
//                        OrchestratorStateAggregator interface +
//                        createOrchestratorStateAggregator factory
//                        function returning the methods declared in
//                        §6.6 Channel #9 (FAIL at WB2 → PASS at WB3
//                        GREEN).
//
// Type-level shape assertions use the `satisfies` operator to compile-
// check that constructed instances conform to the §6.6-frozen
// interface shapes. Runtime assertions verify field-presence on the
// constructed instances. Source-text-assert on the aggregator file
// uses the established pattern (FOLLOWUPS row 402 source-text-assert
// precedent) so a missing file produces a deterministic FAIL rather
// than vitest startup crash.
//
// WB2 RED expected outcome: (A) assertions PASS; (B) assertions FAIL.
// WB3 GREEN flip: aggregator file authored; (B) flips PASS.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  OrchestratorSessionLite,
  OrchestratorMessage,
  AttachedBuildMdState,
  OrchestratorStateSnapshot,
} from '../../../src/main/orchestrator-state-types.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const TYPES_PATH = resolve(
  REPO_ROOT,
  'packages/dispatch-workstation/src/main/orchestrator-state-types.ts',
);
const AGGREGATOR_PATH = resolve(
  REPO_ROOT,
  'packages/dispatch-workstation/src/main/orchestrator-state-aggregator.ts',
);

describe('MB-T-MVP-W4 probe-02 — aggregator snapshot shape', () => {
  describe('(A) types-present — orchestrator-state-types.ts', () => {
    it('exports OrchestratorSessionLite with §6.6 frozen fields', () => {
      const sample = {
        name: 's1',
        state: 'armed' as const,
        computed_status: 'running' as const,
      } satisfies OrchestratorSessionLite;
      expect(sample.name).toBe('s1');
      expect(sample.state).toBe('armed');
      expect(sample.computed_status).toBe('running');
    });

    it('exports OrchestratorMessage with 5-variant role union', () => {
      const roles: Array<OrchestratorMessage['role']> = [
        'user',
        'assistant',
        'dispatch',
        'system',
        'typing',
      ];
      // Type-check + runtime sample for each role.
      for (const role of roles) {
        const msg = {
          role,
          text: 'sample',
          id: 'msg-1',
        } satisfies OrchestratorMessage;
        expect(msg.role).toBe(role);
      }
      // typing variant carries optional `running` count.
      const typing = {
        role: 'typing' as const,
        running: 3,
      } satisfies OrchestratorMessage;
      expect(typing.running).toBe(3);
    });

    it('exports AttachedBuildMdState with build-md derived counts', () => {
      const sample = {
        name: 'BUILD.md',
        path: '/repo/BUILD.md',
        steps: 10,
        queue: 3,
        done: 4,
        running: 2,
        errored: 1,
      } satisfies AttachedBuildMdState;
      expect(sample.steps).toBe(10);
      expect(sample.queue + sample.done + sample.running + sample.errored).toBe(
        10,
      );
    });

    it('exports OrchestratorStateSnapshot with 7-field aggregate shape', () => {
      const sample = {
        seq: 1,
        polledAt: '2026-05-18T17:00:00.000Z',
        sessions: [],
        attached: null,
        messages: [],
        paused: false,
        daemonReachable: true,
      } satisfies OrchestratorStateSnapshot;
      // Field-presence asserts (matches §6.6 OrchestratorStateSnapshot text).
      expect(Object.keys(sample).sort()).toEqual(
        [
          'attached',
          'daemonReachable',
          'messages',
          'paused',
          'polledAt',
          'seq',
          'sessions',
        ].sort(),
      );
    });

    it('OrchestratorStateSnapshot supports polledAt: null sentinel (boot state)', () => {
      const boot = {
        seq: 0,
        polledAt: null,
        sessions: [],
        attached: null,
        messages: [],
        paused: false,
        daemonReachable: false,
      } satisfies OrchestratorStateSnapshot;
      expect(boot.polledAt).toBeNull();
      expect(boot.daemonReachable).toBe(false);
    });

    it('OrchestratorStateSnapshot supports attached: null + non-null variants', () => {
      const detached = {
        seq: 1,
        polledAt: '2026-05-18T17:00:00.000Z',
        sessions: [],
        attached: null,
        messages: [],
        paused: false,
        daemonReachable: true,
      } satisfies OrchestratorStateSnapshot;
      const attached = {
        seq: 2,
        polledAt: '2026-05-18T17:00:03.000Z',
        sessions: [],
        attached: {
          name: 'BUILD.md',
          path: '/repo/BUILD.md',
          steps: 5,
          queue: 2,
          done: 1,
          running: 1,
          errored: 0,
        },
        messages: [],
        paused: false,
        daemonReachable: true,
      } satisfies OrchestratorStateSnapshot;
      expect(detached.attached).toBeNull();
      expect(attached.attached?.name).toBe('BUILD.md');
    });

    it('types file source-text matches §6.6 frozen contract', () => {
      const src = readFileSync(TYPES_PATH, 'utf8');
      expect(src).toContain('export interface OrchestratorSessionLite');
      expect(src).toContain('export interface OrchestratorMessage');
      expect(src).toContain('export interface AttachedBuildMdState');
      expect(src).toContain('export interface OrchestratorStateSnapshot');
      // ReadonlyArray<> enforcement on sessions + messages per §6.6.
      expect(src).toContain('ReadonlyArray<OrchestratorSessionLite>');
      expect(src).toContain('ReadonlyArray<OrchestratorMessage>');
      // polledAt: string | null sentinel per §6.6.
      expect(src).toMatch(/readonly polledAt: string \| null;/);
    });
  });

  describe('(B) factory-present — orchestrator-state-aggregator.ts (RED until WB3 GREEN)', () => {
    it('orchestrator-state-aggregator.ts file exists at src/main/', () => {
      expect(existsSync(AGGREGATOR_PATH)).toBe(true);
    });

    it('exports OrchestratorStateAggregator interface with getSnapshot + onUpdate methods', () => {
      // Source-text-assert pattern — at WB2 the file does not exist
      // so readFileSync would throw; gate behind existsSync to give
      // a deterministic FAIL message rather than crash.
      if (!existsSync(AGGREGATOR_PATH)) {
        expect.fail(
          `aggregator file not yet authored at ${AGGREGATOR_PATH} (RED until WB3 GREEN)`,
        );
      }
      const src = readFileSync(AGGREGATOR_PATH, 'utf8');
      expect(src).toMatch(/export interface OrchestratorStateAggregator/);
      // getSnapshot method on the aggregator interface (cached read).
      expect(src).toMatch(/getSnapshot\(\)\s*:\s*OrchestratorStateSnapshot/);
      // onUpdate subscription returning dispose function.
      expect(src).toMatch(
        /onUpdate\(\s*(cb|callback)\s*:\s*\(snapshot:\s*OrchestratorStateSnapshot\)\s*=>\s*void\s*\)\s*:\s*\(\)\s*=>\s*void/,
      );
    });

    it('exports createOrchestratorStateAggregator factory function (pluggable-source DI)', () => {
      if (!existsSync(AGGREGATOR_PATH)) {
        expect.fail(
          `aggregator file not yet authored at ${AGGREGATOR_PATH} (RED until WB3 GREEN)`,
        );
      }
      const src = readFileSync(AGGREGATOR_PATH, 'utf8');
      expect(src).toMatch(
        /export function createOrchestratorStateAggregator/,
      );
      // The factory takes dependency-injected sources (sessions / attach /
      // pause / narration) per dispatch §0 pluggable-source pattern
      // (mirrors rate-limit-aggregator.ts CreateRateLimitAggregatorDeps).
      expect(src).toMatch(
        /export interface CreateOrchestratorStateAggregatorDeps/,
      );
    });

    it('factory deps surface includes session / build-md / pause / narration source seams', () => {
      if (!existsSync(AGGREGATOR_PATH)) {
        expect.fail(
          `aggregator file not yet authored at ${AGGREGATOR_PATH} (RED until WB3 GREEN)`,
        );
      }
      const src = readFileSync(AGGREGATOR_PATH, 'utf8');
      // The four source seams the aggregator composes per §0 Q1/Q2/Q3/Q4
      // arbitration. Source-text-assert tolerates either field-name or
      // interface-name conventions (will be tightened at WB3 against
      // the actual authored shape).
      expect(src).toMatch(/sessions/i);
      expect(src).toMatch(/attached|buildMd/i);
      expect(src).toMatch(/pause/i);
      expect(src).toMatch(/narration|messages/i);
    });
  });
});
