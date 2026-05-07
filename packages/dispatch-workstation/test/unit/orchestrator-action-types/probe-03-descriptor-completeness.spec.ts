// MB-T11 WB2 probe-03 — descriptor completeness.
//
// Guards against orphan enum values: every member of MB_T11_ACTION_TYPES
// (the operative MB-T11 subset) has a descriptor, every descriptor's
// actionType matches its key, and the §3.2 Medium-policy mapping is exact
// per CONDUCTOR_V3_RESCOPE.md lines 58-64.

import { describe, expect, it } from 'vitest';
import {
  ACTION_DESCRIPTORS,
  MB_T11_ACTION_TYPES,
  getActionDescriptor,
  isMBT11ActionType,
  type MBT11ActionType,
} from '../../../src/main/orchestrator-action-types.js';

describe('orchestrator-action-types — descriptor completeness', () => {
  it('every MB-T11 action type has a descriptor entry', () => {
    for (const t of MB_T11_ACTION_TYPES) {
      expect(ACTION_DESCRIPTORS[t]).toBeDefined();
    }
  });

  it('descriptor map keys exactly match MB_T11_ACTION_TYPES (no orphans, no extras)', () => {
    const keys = Object.keys(ACTION_DESCRIPTORS).sort();
    const expected = [...MB_T11_ACTION_TYPES].sort();
    expect(keys).toEqual(expected);
  });

  it('each descriptor.actionType matches its map key', () => {
    for (const t of MB_T11_ACTION_TYPES) {
      expect(ACTION_DESCRIPTORS[t].actionType).toBe(t);
    }
  });

  it('getActionDescriptor returns the same reference as the map', () => {
    for (const t of MB_T11_ACTION_TYPES) {
      expect(getActionDescriptor(t)).toBe(ACTION_DESCRIPTORS[t]);
    }
  });

  it('§3.2 Medium-policy mapping is encoded per CONDUCTOR_V3_RESCOPE.md lines 58-64', () => {
    // §3.2 line 60: spawn-session and kill-session always require approval
    expect(ACTION_DESCRIPTORS['spawn-new-session'].default_medium_approval).toBe('always');
    expect(ACTION_DESCRIPTORS['kill'].default_medium_approval).toBe('always');

    // §3.2 line 64: HANDOFF pulls fire without approval
    expect(ACTION_DESCRIPTORS['pull'].default_medium_approval).toBe('never');

    // §3.2 lines 58-62: send is on-predicate (commit / contract / multi-step)
    expect(ACTION_DESCRIPTORS['send'].default_medium_approval).toBe('on-predicate');
    expect(ACTION_DESCRIPTORS['send'].approval_predicate_keys).toEqual([
      'willCommit',
      'willTouchContract',
      'isMultiStep',
    ]);

    // §3.2 line 62: assign-task is on-predicate (multi-step)
    expect(ACTION_DESCRIPTORS['assign-task'].default_medium_approval).toBe('on-predicate');
    expect(ACTION_DESCRIPTORS['assign-task'].approval_predicate_keys).toEqual(['isMultiStep']);
  });

  it('read-only flag is set only on pull', () => {
    for (const t of MB_T11_ACTION_TYPES) {
      const isPull = t === 'pull';
      expect(ACTION_DESCRIPTORS[t].read_only).toBe(isPull);
    }
  });

  it('mutates_session_state is set on send/spawn/kill but not pull/assign-task', () => {
    expect(ACTION_DESCRIPTORS['send'].mutates_session_state).toBe(true);
    expect(ACTION_DESCRIPTORS['spawn-new-session'].mutates_session_state).toBe(true);
    expect(ACTION_DESCRIPTORS['kill'].mutates_session_state).toBe(true);
    expect(ACTION_DESCRIPTORS['pull'].mutates_session_state).toBe(false);
    expect(ACTION_DESCRIPTORS['assign-task'].mutates_session_state).toBe(false);
  });

  it('every descriptor requires_session_target = true (v3.0 invariant)', () => {
    for (const t of MB_T11_ACTION_TYPES) {
      expect(ACTION_DESCRIPTORS[t].requires_session_target).toBe(true);
    }
  });

  it('isMBT11ActionType narrows the MB-T11 subset (true) and excludes legacy (false)', () => {
    expect(isMBT11ActionType('send')).toBe(true);
    expect(isMBT11ActionType('spawn-new-session')).toBe(true);
    expect(isMBT11ActionType('kill')).toBe(true);
    expect(isMBT11ActionType('pull')).toBe(true);
    expect(isMBT11ActionType('assign-task')).toBe(true);

    expect(isMBT11ActionType('pause')).toBe(false);
    expect(isMBT11ActionType('hold')).toBe(false);
    expect(isMBT11ActionType('arm')).toBe(false);
    expect(isMBT11ActionType('read-file')).toBe(false);
  });

  it('MB_T11_ACTION_TYPES is the canonical 5-entry list', () => {
    expect(MB_T11_ACTION_TYPES.length).toBe(5);
    const expected: MBT11ActionType[] = [
      'send',
      'spawn-new-session',
      'kill',
      'pull',
      'assign-task',
    ];
    expect([...MB_T11_ACTION_TYPES].sort()).toEqual(expected.sort());
  });
});
