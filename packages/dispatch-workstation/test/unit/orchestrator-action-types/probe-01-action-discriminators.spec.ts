// MB-T11 WB2 probe-01 — type-narrowing helpers.
//
// Each isXAction returns true exactly when the input's `action` field
// matches; returns false otherwise. Inputs use the minimal CardOutput shape
// the discriminator reads.

import { describe, expect, it } from 'vitest';
import type { CardOutput } from 'dispatch-core/dist/v3/schema.js';
import {
  isSendAction,
  isSpawnSessionAction,
  isKillAction,
  isPullAction,
  isAssignTaskAction,
} from '../../../src/main/orchestrator-action-types.js';

function fixture(action: CardOutput['action']): CardOutput {
  return {
    type: 'card',
    action,
    target: 'fixture-session',
    rationale: 'fixture',
    free_form_prompt: 'fixture',
    superseded_card_ids: [],
    build_doc_commit_sha: 'fixture-sha',
  };
}

describe('orchestrator-action-types — discriminators', () => {
  it('isSendAction returns true for send and false for others', () => {
    expect(isSendAction(fixture('send'))).toBe(true);
    expect(isSendAction(fixture('spawn-new-session'))).toBe(false);
    expect(isSendAction(fixture('kill'))).toBe(false);
    expect(isSendAction(fixture('pull'))).toBe(false);
    expect(isSendAction(fixture('assign-task'))).toBe(false);
  });

  it('isSpawnSessionAction returns true for spawn-new-session and false for others', () => {
    expect(isSpawnSessionAction(fixture('spawn-new-session'))).toBe(true);
    expect(isSpawnSessionAction(fixture('send'))).toBe(false);
    expect(isSpawnSessionAction(fixture('kill'))).toBe(false);
    expect(isSpawnSessionAction(fixture('pull'))).toBe(false);
    expect(isSpawnSessionAction(fixture('assign-task'))).toBe(false);
  });

  it('isKillAction returns true for kill and false for others', () => {
    expect(isKillAction(fixture('kill'))).toBe(true);
    expect(isKillAction(fixture('send'))).toBe(false);
    expect(isKillAction(fixture('spawn-new-session'))).toBe(false);
    expect(isKillAction(fixture('pull'))).toBe(false);
    expect(isKillAction(fixture('assign-task'))).toBe(false);
  });

  it('isPullAction returns true for pull and false for others', () => {
    expect(isPullAction(fixture('pull'))).toBe(true);
    expect(isPullAction(fixture('send'))).toBe(false);
    expect(isPullAction(fixture('spawn-new-session'))).toBe(false);
    expect(isPullAction(fixture('kill'))).toBe(false);
    expect(isPullAction(fixture('assign-task'))).toBe(false);
  });

  it('isAssignTaskAction returns true for assign-task and false for others', () => {
    expect(isAssignTaskAction(fixture('assign-task'))).toBe(true);
    expect(isAssignTaskAction(fixture('send'))).toBe(false);
    expect(isAssignTaskAction(fixture('spawn-new-session'))).toBe(false);
    expect(isAssignTaskAction(fixture('kill'))).toBe(false);
    expect(isAssignTaskAction(fixture('pull'))).toBe(false);
  });

  it('discriminators ignore non-MB-T11 ActionType members', () => {
    expect(isSendAction(fixture('pause'))).toBe(false);
    expect(isSpawnSessionAction(fixture('hold'))).toBe(false);
    expect(isKillAction(fixture('arm'))).toBe(false);
    expect(isPullAction(fixture('read-file'))).toBe(false);
    expect(isAssignTaskAction(fixture('pause'))).toBe(false);
  });
});
