// MB-T-HSO-WIRE WB8 RED — MB-T13 approval-policy interception probe.
//
// Asserts the 4 conditions per ticket §4 WB8:
//   (1) dispatchActionVariant invocation routes through MB-T13 per-session
//       approval-policy resolver BEFORE the action handler executes — i.e.,
//       main.ts MB-T-HSO-WIRE zone's dispatchDeps.resolveApproval references
//       the real resolveApprovalShim, not the WB7 'wb7-placeholder' stub.
//   (2) auto-approved policy (deps.resolveApproval → approvalRequired:false)
//       fires the action immediately (deps.fire* called, result kind:fired).
//   (3) approval-required policy (deps.resolveApproval → approvalRequired:true)
//       returns kind:pending-approval and does NOT call any fire-* dep
//       (operator-visible pending-approval state surfaces via the result).
//   (4) rejection (approvalRequired:true) clears the action without firing
//       across ALL 5 action variants — verified by zero fire-dep invocation
//       on each variant when approval is required.
//
// RED today (commit d9b5722 WB7): main.ts MB-T-HSO-WIRE zone constructs
// dispatchDeps.resolveApproval as `async () => ({ approvalRequired: false,
// reason: 'wb7-placeholder' })` — a STUB that always auto-approves. The
// gate logic in action-variant-ipc.ts:264-266 (and analogous in each
// variant branch) already calls deps.resolveApproval BEFORE each fire
// step, so behavioral conditions (2)(3)(4) pass today against MOCKED deps;
// the RED-failing assertion is (1) — the STRUCTURAL check that main.ts
// imports + references the real `resolveApprovalShim`, NOT the WB7
// placeholder string. WB9 GREEN swaps the stub for `resolveApprovalShim`
// import + invocation; the structural assertions then flip to GREEN.
//
// Per CLAUDE.md §3.3 sentinel-zone discipline: the WB9 GREEN change lands
// inside the existing `=== BEGIN: MB-T-HSO-WIRE shared-emitter-and-writer
// ===` zone (extends WB3+WB5+WB7 zone contents), not a new zone.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dispatchActionVariant,
  type ActionVariantDispatchDeps,
} from '../../../src/main/action-variant-ipc.js';

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

// Build a full ActionVariantDispatchDeps shape with vi.fn() spies on each
// member. Overrides apply per-test for the resolveApproval contract being
// exercised. fire-* deps remain stub-shaped (the WB7 placeholders are
// behaviorally adequate — fire-side wiring is downstream-ticket scope per
// ticket §1.4 "Sub-Y-1" + main.ts:574-582).
function makeMockDeps(
  overrides: Partial<ActionVariantDispatchDeps> = {},
): ActionVariantDispatchDeps {
  return {
    resolveApproval: vi.fn(async () => ({
      approvalRequired: false,
      reason: 'mock-auto-approve',
    })),
    fireSendPrompt: vi.fn(async () => undefined),
    fireSpawn: vi.fn(async (sessionName: string) => ({ sessionName })),
    fireKill: vi.fn(async () => undefined),
    firePullHandoff: vi.fn(async () => ({
      content: '',
      written_at: new Date().toISOString(),
      archived_to: '',
    })),
    fireAssignTask: vi.fn(async () => ({ intent_id: 'mock-intent' })),
    ...overrides,
  };
}

describe('MB-T-HSO-WIRE WB8 — MB-T13 approval-policy interception', () => {
  let mainSource: string;

  beforeAll(() => {
    mainSource = readFileSync(MAIN_TS_PATH, 'utf8');
  });

  describe('(1) dispatchActionVariant routes through MB-T13 resolver BEFORE the action handler', () => {
    it('main.ts imports resolveApprovalShim from ./approval-policy-resolver-shim.js', () => {
      // Tolerant regex: matches single- or multi-line import; matches when
      // resolveApprovalShim is one of several symbols imported in the same
      // brace group.
      expect(
        mainSource,
        'main.ts must import resolveApprovalShim from ./approval-policy-resolver-shim.js for WB9 GREEN',
      ).toMatch(
        /import\s*\{[^}]*\bresolveApprovalShim\b[^}]*\}\s*from\s*['"]\.\/approval-policy-resolver-shim\.js['"]/,
      );
    });

    it('MB-T-HSO-WIRE sentinel zone references resolveApprovalShim in dispatchDeps construction', () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      expect(
        zone!,
        'zone must reference resolveApprovalShim (or invoke it inside the dispatchDeps.resolveApproval closure)',
      ).toMatch(/resolveApprovalShim/);
    });

    it("MB-T-HSO-WIRE sentinel zone no longer contains the WB7 'wb7-placeholder' stub string", () => {
      const zone = extractZone(mainSource);
      expect(zone).not.toBeNull();
      expect(
        zone!,
        "WB7 placeholder string 'wb7-placeholder' must be removed by WB9 GREEN",
      ).not.toMatch(/['"]wb7-placeholder['"]/);
    });
  });

  describe('(2) auto-approved policy fires action immediately', () => {
    it('when resolveApproval returns approvalRequired:false, dispatchActionVariant fires the action and returns kind:fired', async () => {
      const deps = makeMockDeps({
        resolveApproval: vi.fn(async () => ({
          approvalRequired: false,
          reason: 'policy=loose; auto-approved',
        })),
      });
      const result = await dispatchActionVariant(
        {
          actionType: 'send-prompt-to-session',
          fields: { sessionName: 'peer-1', prompt: 'hello' },
        },
        deps,
      );
      expect(result.kind, 'auto-approved policy must produce kind:fired').toBe(
        'fired',
      );
      expect(deps.resolveApproval).toHaveBeenCalledTimes(1);
      expect(deps.resolveApproval).toHaveBeenCalledWith({
        actionType: 'send-prompt-to-session',
        sessionName: 'peer-1',
      });
      expect(deps.fireSendPrompt).toHaveBeenCalledTimes(1);
      expect(deps.fireSendPrompt).toHaveBeenCalledWith(
        'peer-1',
        'hello',
        undefined,
      );
    });
  });

  describe('(3) approval-required policy returns pending-approval WITHOUT firing', () => {
    it('when resolveApproval returns approvalRequired:true, dispatchActionVariant returns kind:pending-approval and does NOT call fireSendPrompt', async () => {
      const deps = makeMockDeps({
        resolveApproval: vi.fn(async () => ({
          approvalRequired: true,
          reason: 'policy=tight; manual approval required',
        })),
      });
      const result = await dispatchActionVariant(
        {
          actionType: 'send-prompt-to-session',
          fields: { sessionName: 'peer-1', prompt: 'hello' },
        },
        deps,
      );
      expect(
        result.kind,
        'approval-required policy must produce kind:pending-approval',
      ).toBe('pending-approval');
      if (result.kind === 'pending-approval') {
        expect(
          result.reason,
          'pending-approval result must surface the resolver reason for operator visibility',
        ).toBe('policy=tight; manual approval required');
        expect(result.sessionName).toBe('peer-1');
        expect(result.actionType).toBe('send-prompt-to-session');
      }
      expect(deps.resolveApproval).toHaveBeenCalledTimes(1);
      expect(
        deps.fireSendPrompt,
        'fireSendPrompt MUST NOT be called when approval is required',
      ).not.toHaveBeenCalled();
    });

    it('resolveApproval is consulted BEFORE fireSendPrompt (call-order invariant)', async () => {
      const callOrder: string[] = [];
      const deps = makeMockDeps({
        resolveApproval: vi.fn(async () => {
          callOrder.push('resolveApproval');
          return { approvalRequired: false, reason: 'auto-approved' };
        }),
        fireSendPrompt: vi.fn(async () => {
          callOrder.push('fireSendPrompt');
        }),
      });
      await dispatchActionVariant(
        {
          actionType: 'send-prompt-to-session',
          fields: { sessionName: 'peer-1', prompt: 'hello' },
        },
        deps,
      );
      expect(callOrder).toEqual(['resolveApproval', 'fireSendPrompt']);
    });
  });

  describe('(4) rejection clears the action without firing across all 5 action variants', () => {
    const variants: ReadonlyArray<{
      readonly actionType: string;
      readonly fields: Readonly<Record<string, string>>;
      readonly fireKey: keyof Pick<
        ActionVariantDispatchDeps,
        | 'fireSendPrompt'
        | 'fireSpawn'
        | 'fireKill'
        | 'firePullHandoff'
        | 'fireAssignTask'
      >;
    }> = [
      {
        actionType: 'send-prompt-to-session',
        fields: { sessionName: 's', prompt: 'p' },
        fireKey: 'fireSendPrompt',
      },
      {
        actionType: 'spawn-session',
        fields: { sessionName: 's', initialPrompt: 'p' },
        fireKey: 'fireSpawn',
      },
      {
        actionType: 'kill-session',
        fields: { sessionName: 's' },
        fireKey: 'fireKill',
      },
      {
        actionType: 'pull-handoff-from-session',
        fields: { sessionName: 's' },
        fireKey: 'firePullHandoff',
      },
      {
        actionType: 'assign-task',
        fields: { sessionName: 's', ticketScope: 't' },
        fireKey: 'fireAssignTask',
      },
    ];

    it.each(variants)(
      'rejection on $actionType: kind:pending-approval; $fireKey NOT invoked',
      async ({ actionType, fields, fireKey }) => {
        const deps = makeMockDeps({
          resolveApproval: vi.fn(async () => ({
            approvalRequired: true,
            reason: 'rejected by policy=tight',
          })),
        });
        const result = await dispatchActionVariant(
          { actionType, fields: { ...fields } },
          deps,
        );
        expect(
          result.kind,
          `${actionType}: must return pending-approval, got ${JSON.stringify(result)}`,
        ).toBe('pending-approval');
        expect(
          deps[fireKey],
          `${actionType}: ${fireKey} must NOT be called on rejection`,
        ).not.toHaveBeenCalled();
      },
    );
  });
});
