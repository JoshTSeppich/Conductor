// MB-T11 WB6 probe-01 — store persistence: writes survive a "restart"
// (fresh module-state read against the same MB_AUTOPILOT_STATE_DIR).
//
// Uses MB_AUTOPILOT_STATE_DIR override for test isolation (mirrors
// MB_SPLITTER_STATE_DIR pattern from splitter-state.test).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultAutopilotState,
  readAllAutopilotStates,
  readAutopilotState,
  writeAllAutopilotStates,
  writeAutopilotState,
  type AutopilotState,
} from '../../../src/main/autopilot-state-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb6-store-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('autopilot-state-store — probe 01: persistence', () => {
  it('readAutopilotState returns default state when no file exists', () => {
    const state = readAutopilotState('sess-x');
    expect(state).toEqual(defaultAutopilotState());
  });

  it('writeAutopilotState then readAutopilotState round-trips', () => {
    const state: AutopilotState = {
      enabled: true,
      currentIntentId: '01963a35-0000-7000-8000-000000000001',
      currentStep: 2,
      totalSteps: 3,
      lastActionFiredAt: '2026-05-06T12:00:00.000Z',
      pendingIntents: [
        {
          intent_id: '01963a35-0000-7000-8000-000000000001',
          step: 2,
          total_steps: 3,
          intent_summary: 'fixture',
        },
      ],
    };
    writeAutopilotState('sess-x', state);
    expect(readAutopilotState('sess-x')).toEqual(state);
  });

  it('persists to autopilot-state.json on disk', () => {
    writeAutopilotState('sess-x', defaultAutopilotState());
    expect(existsSync(join(dir, 'autopilot-state.json'))).toBe(true);
  });

  it('readAllAutopilotStates returns the full sessionName-keyed map', () => {
    writeAutopilotState('sess-a', { ...defaultAutopilotState(), enabled: true });
    writeAutopilotState('sess-b', { ...defaultAutopilotState(), enabled: false });
    const all = readAllAutopilotStates();
    expect(Object.keys(all).sort()).toEqual(['sess-a', 'sess-b']);
    expect(all['sess-a']!.enabled).toBe(true);
    expect(all['sess-b']!.enabled).toBe(false);
  });

  it('survives a "restart" — fresh read of the same dir sees the persisted state', () => {
    const state: AutopilotState = {
      enabled: true,
      currentIntentId: 'fixture-intent',
      currentStep: 1,
      totalSteps: 1,
      lastActionFiredAt: '2026-05-06T12:00:00.000Z',
      pendingIntents: [],
    };
    writeAutopilotState('sess-x', state);
    // Simulate "restart": clear the env then set it back to the same dir.
    delete process.env['MB_AUTOPILOT_STATE_DIR'];
    process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
    const reread = readAutopilotState('sess-x');
    expect(reread).toEqual(state);
  });

  it('writeAllAutopilotStates writes the full map atomically', () => {
    const all: Record<string, AutopilotState> = {
      'sess-a': { ...defaultAutopilotState(), enabled: true },
      'sess-b': { ...defaultAutopilotState(), enabled: false },
    };
    writeAllAutopilotStates(all);
    expect(readAllAutopilotStates()).toEqual(all);
  });

  it('readAllAutopilotStates returns empty object when file is missing', () => {
    expect(readAllAutopilotStates()).toEqual({});
  });
});
