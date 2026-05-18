// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB5 — probe-04:
// orchestrator-pause-state-store.ts (Q2=(a)) persistence.
//
// Verifies the workstation-side pause-state-store mirroring
// autopilot-state-store.ts pattern:
//   - file at <userData or override>/orchestrator-pause-state.json
//   - read returns default unpaused on absent/unparsable/shape-mismatch
//   - write persists JSON; subsequent read roundtrips
//   - env-override MB_ORCHESTRATOR_PAUSE_STATE_DIR routes to tmpdir
//
// Uses os.tmpdir() + env-var override (mirrors splitter-state +
// autopilot-state-store probe pattern). No electron app singleton
// touched — the override path makes the store electron-agnostic for
// vitest.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  defaultOrchestratorPauseState,
  readOrchestratorPauseState,
  writeOrchestratorPauseState,
} from '../../../src/main/orchestrator-pause-state-store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mb-orch-pause-'));
  process.env['MB_ORCHESTRATOR_PAUSE_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_ORCHESTRATOR_PAUSE_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('MB-T-MVP-W4 probe-04 — orchestrator-pause-state-store', () => {
  it('defaultOrchestratorPauseState returns paused=false', () => {
    expect(defaultOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('read on absent file returns default unpaused', () => {
    expect(existsSync(join(dir, 'orchestrator-pause-state.json'))).toBe(false);
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('write persists JSON to env-override directory', () => {
    writeOrchestratorPauseState({ paused: true });
    const filePath = join(dir, 'orchestrator-pause-state.json');
    expect(existsSync(filePath)).toBe(true);
    const raw = readFileSync(filePath, 'utf8');
    expect(JSON.parse(raw)).toEqual({ paused: true });
  });

  it('read after write roundtrips paused=true', () => {
    writeOrchestratorPauseState({ paused: true });
    expect(readOrchestratorPauseState()).toEqual({ paused: true });
  });

  it('read after write roundtrips paused=false', () => {
    writeOrchestratorPauseState({ paused: true });
    writeOrchestratorPauseState({ paused: false });
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('read with malformed JSON returns default unpaused', () => {
    writeFileSync(
      join(dir, 'orchestrator-pause-state.json'),
      '{ this is not json',
      'utf8',
    );
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('read with shape-mismatched JSON returns default unpaused', () => {
    writeFileSync(
      join(dir, 'orchestrator-pause-state.json'),
      JSON.stringify({ paused: 'not-a-boolean' }),
      'utf8',
    );
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('read with array-typed JSON returns default unpaused', () => {
    writeFileSync(
      join(dir, 'orchestrator-pause-state.json'),
      JSON.stringify([true]),
      'utf8',
    );
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });

  it('read with null JSON returns default unpaused', () => {
    writeFileSync(
      join(dir, 'orchestrator-pause-state.json'),
      'null',
      'utf8',
    );
    expect(readOrchestratorPauseState()).toEqual({ paused: false });
  });
});
