// Shared fixtures + helpers for orchestrator-action-handler probes.

import { vi } from 'vitest';
import type {
  ActionOutput,
  CardOutput,
  ActionType,
} from 'dispatch-core/dist/v3/schema.js';
import type {
  DispatchActionDeps,
  DispatchInput,
} from '../../../src/main/orchestrator-action-handler.js';

/**
 * Build a minimal ActionOutput. Operator-approved variant flips type to 'card'.
 */
export function actionOutput(
  action: ActionType,
  target: string,
  payload?: unknown,
): ActionOutput {
  return {
    type: 'action',
    action,
    target,
    payload,
    rationale: 'fixture rationale',
    build_doc_commit_sha: 'fixture-sha',
  };
}

export function cardOutput(
  action: ActionType,
  target: string,
  payload?: unknown,
): CardOutput {
  return {
    type: 'card',
    action,
    target,
    payload,
    rationale: 'fixture rationale',
    free_form_prompt: 'fixture free-form',
    superseded_card_ids: [],
    build_doc_commit_sha: 'fixture-sha',
  };
}

export function input(output: ActionOutput | CardOutput): DispatchInput {
  return {
    output,
    triggerEvent: 'fixture trigger',
    buildDocId: 'fixture-build-doc',
  };
}

/**
 * Build deps with vi.fn() stubs and `resolveApproval` defaulting to
 * "no approval required" so probes that exercise the firing path don't
 * have to override the resolver every time. Probes that exercise the
 * approval-required path override resolveApproval explicitly.
 */
export function buildDeps(
  overrides: Partial<DispatchActionDeps> = {},
): DispatchActionDeps {
  return {
    resolveApproval: vi.fn(() => ({ approvalRequired: false, reason: 'noop fixture' })),
    fireSendPrompt: vi.fn(async () => {}),
    fireSpawn: vi.fn(async (p) => ({ sessionName: p.sessionName })),
    fireKill: vi.fn(async () => {}),
    firePullHandoff: vi.fn(async () => ({
      content: 'fixture handoff',
      written_at: '2026-05-06T00:00:00.000Z',
      archived_to: '/tmp/fixture-archive.handoff.md',
    })),
    startIntent: vi.fn(async () => ({ intent_id: 'fixture-intent-id' })),
    ...overrides,
  };
}
