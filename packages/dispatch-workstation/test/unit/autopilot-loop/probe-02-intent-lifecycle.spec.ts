// MB-T11 WB6 probe-02 — intent lifecycle: startIntent → recordAction(s) →
// clearIntent. State transitions correct at each step.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AutopilotLoop } from '../../../src/main/autopilot-loop.js';
import {
  readAutopilotState,
} from '../../../src/main/autopilot-state-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb6-lifecycle-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('autopilot-loop — probe 02: intent lifecycle', () => {
  it('startIntent registers a new PendingIntent and advances state', () => {
    const loop = new AutopilotLoop({
      now: () => '2026-05-06T12:00:00.000Z',
      uuidGen: () => 'fixture-intent-1',
    });
    const result = loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'rebuild auth',
      expected_steps: 4,
    });
    expect(result.intent_id).toBe('fixture-intent-1');

    const state = readAutopilotState('sess-x');
    expect(state.currentIntentId).toBe('fixture-intent-1');
    expect(state.currentStep).toBe(1);
    expect(state.totalSteps).toBe(4);
    expect(state.lastActionFiredAt).toBe('2026-05-06T12:00:00.000Z');
    expect(state.pendingIntents).toEqual([
      {
        intent_id: 'fixture-intent-1',
        step: 1,
        total_steps: 4,
        intent_summary: 'rebuild auth',
      },
    ]);
  });

  it('startIntent without expected_steps defaults total_steps=1', () => {
    const loop = new AutopilotLoop({ uuidGen: () => 'fixture-2' });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'one-shot',
    });
    const state = readAutopilotState('sess-x');
    expect(state.totalSteps).toBe(1);
    expect(state.pendingIntents[0]!.total_steps).toBe(1);
  });

  it('recordAction with send + envelope advances the matching intent step', () => {
    const loop = new AutopilotLoop({
      now: vi
        .fn()
        .mockReturnValueOnce('2026-05-06T12:00:00.000Z')
        .mockReturnValueOnce('2026-05-06T12:00:01.000Z'),
      uuidGen: () => 'fixture-3',
    });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
      expected_steps: 3,
    });
    loop.recordAction('sess-x', 'send', {
      prompt: 'step 2',
      envelope: {
        envelope_version: 1,
        intent_id: 'fixture-3',
        step: 2,
        total_steps: 3,
        intent_summary: 'plan',
      },
    });
    const state = readAutopilotState('sess-x');
    expect(state.currentStep).toBe(2);
    expect(state.pendingIntents[0]!.step).toBe(2);
    expect(state.lastActionFiredAt).toBe('2026-05-06T12:00:01.000Z');
  });

  it('recordAction with send but unknown envelope intent_id leaves intents untouched', () => {
    const loop = new AutopilotLoop({ uuidGen: () => 'real-intent' });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
      expected_steps: 3,
    });
    loop.recordAction('sess-x', 'send', {
      prompt: 'rogue',
      envelope: {
        envelope_version: 1,
        intent_id: 'phantom-intent',
        step: 99,
        total_steps: 99,
        intent_summary: 'phantom',
      },
    });
    const state = readAutopilotState('sess-x');
    expect(state.pendingIntents[0]!.step).toBe(1); // unchanged
    expect(state.lastActionFiredAt).not.toBeNull();
  });

  it('recordAction without envelope updates lastActionFiredAt only', () => {
    const loop = new AutopilotLoop({
      now: () => '2026-05-06T12:00:05.000Z',
      uuidGen: () => 'fixture-4',
    });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
    });
    loop.recordAction('sess-x', 'pull', { sessionName: 'sess-x' });
    const state = readAutopilotState('sess-x');
    expect(state.pendingIntents[0]!.step).toBe(1); // unchanged
    expect(state.lastActionFiredAt).toBe('2026-05-06T12:00:05.000Z');
  });

  it('clearIntent removes the intent and resets current* when it was active', () => {
    const loop = new AutopilotLoop({ uuidGen: () => 'fixture-5' });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
      expected_steps: 2,
    });
    loop.clearIntent('sess-x', 'fixture-5');
    const state = readAutopilotState('sess-x');
    expect(state.pendingIntents).toEqual([]);
    expect(state.currentIntentId).toBeNull();
    expect(state.currentStep).toBeNull();
    expect(state.totalSteps).toBeNull();
  });

  it('clearIntent on unknown intent_id is a no-op (no disk write, current* unchanged)', () => {
    const loop = new AutopilotLoop({ uuidGen: () => 'real-intent' });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
      expected_steps: 2,
    });
    loop.clearIntent('sess-x', 'phantom-intent');
    const state = readAutopilotState('sess-x');
    expect(state.pendingIntents.length).toBe(1);
    expect(state.currentIntentId).toBe('real-intent');
  });

  it('setEnabled / isEnabled round-trip', () => {
    const loop = new AutopilotLoop();
    expect(loop.isEnabled('sess-x')).toBe(false);
    loop.setEnabled('sess-x', true);
    expect(loop.isEnabled('sess-x')).toBe(true);
    loop.setEnabled('sess-x', false);
    expect(loop.isEnabled('sess-x')).toBe(false);
  });

  it('getLastActionFiredAt returns null until first recordAction or startIntent', () => {
    const loop = new AutopilotLoop({
      now: () => '2026-05-06T12:00:00.000Z',
      uuidGen: () => 'f',
    });
    expect(loop.getLastActionFiredAt('sess-x')).toBeNull();
    loop.startIntent({ sessionName: 'sess-x', intent_summary: 'plan' });
    expect(loop.getLastActionFiredAt('sess-x')).toBe('2026-05-06T12:00:00.000Z');
  });
});
