// MB-T11 WB6 probe-03 — multi-session isolation: state changes on session A
// do not affect session B (and vice versa).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AutopilotLoop } from '../../../src/main/autopilot-loop.js';
import {
  defaultAutopilotState,
  readAutopilotState,
} from '../../../src/main/autopilot-state-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb6-isolation-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('autopilot-loop — probe 03: multi-session isolation', () => {
  it('setEnabled on A does not affect B', () => {
    const loop = new AutopilotLoop();
    loop.setEnabled('sess-a', true);
    expect(loop.isEnabled('sess-a')).toBe(true);
    expect(loop.isEnabled('sess-b')).toBe(false);
  });

  it('startIntent on A does not affect B', () => {
    let n = 0;
    const loop = new AutopilotLoop({ uuidGen: () => `intent-${++n}` });
    loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'a-plan',
      expected_steps: 3,
    });
    expect(readAutopilotState('sess-a').pendingIntents.length).toBe(1);
    expect(readAutopilotState('sess-b')).toEqual(defaultAutopilotState());
  });

  it('two sessions can have independent intents simultaneously', () => {
    let n = 0;
    const loop = new AutopilotLoop({ uuidGen: () => `intent-${++n}` });
    loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'a-plan',
      expected_steps: 2,
    });
    loop.startIntent({
      sessionName: 'sess-b',
      intent_summary: 'b-plan',
      expected_steps: 5,
    });
    const a = readAutopilotState('sess-a');
    const b = readAutopilotState('sess-b');
    expect(a.currentIntentId).toBe('intent-1');
    expect(a.totalSteps).toBe(2);
    expect(a.pendingIntents[0]!.intent_summary).toBe('a-plan');
    expect(b.currentIntentId).toBe('intent-2');
    expect(b.totalSteps).toBe(5);
    expect(b.pendingIntents[0]!.intent_summary).toBe('b-plan');
  });

  it('clearIntent on A does not affect B', () => {
    let n = 0;
    const loop = new AutopilotLoop({ uuidGen: () => `intent-${++n}` });
    loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'a',
    });
    loop.startIntent({
      sessionName: 'sess-b',
      intent_summary: 'b',
    });
    loop.clearIntent('sess-a', 'intent-1');
    expect(readAutopilotState('sess-a').pendingIntents.length).toBe(0);
    expect(readAutopilotState('sess-b').pendingIntents.length).toBe(1);
  });

  it('recordAction on A does not advance B intents', () => {
    let n = 0;
    const loop = new AutopilotLoop({ uuidGen: () => `intent-${++n}` });
    loop.startIntent({
      sessionName: 'sess-a',
      intent_summary: 'a',
      expected_steps: 3,
    });
    loop.startIntent({
      sessionName: 'sess-b',
      intent_summary: 'b',
      expected_steps: 3,
    });
    loop.recordAction('sess-a', 'send', {
      prompt: 'step 2',
      envelope: {
        envelope_version: 1,
        intent_id: 'intent-1',
        step: 2,
        total_steps: 3,
        intent_summary: 'a',
      },
    });
    expect(readAutopilotState('sess-a').pendingIntents[0]!.step).toBe(2);
    expect(readAutopilotState('sess-b').pendingIntents[0]!.step).toBe(1);
  });
});
