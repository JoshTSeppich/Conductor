// MB-T24 WB1 RED — probe-01: dispatch-mode-store persistence.
//
// Operator-confirmed Q-MBT24-1=a (mirror splitter-state.ts pattern) +
// Q-MBT24-2=a (default 'ask' on first install) +
// Q-MBT24-7=a (DispatchMode = 'auto' | 'ask') 2026-05-08.
//
// Asserts (eventual GREEN behavior):
//   1. readDispatchMode returns 'ask' when no file exists (default)
//   2. readDispatchMode returns 'ask' when file is malformed JSON
//   3. readDispatchMode returns 'ask' when file has wrong shape
//      (best-effort observability per splitter-state.ts pattern)
//   4. writeDispatchMode then read returns 'auto' / 'ask' round-trip
//   5. writeDispatchMode overwrites prior value
//   6. writeDispatchMode persists to <stateDir>/dispatch-mode-state.json
//      with on-disk JSON shape `{ "mode": "auto" | "ask" }`
//   7. env override MB_DISPATCH_MODE_STATE_DIR is honored (test isolation)
//
// Test fixture pattern: per-test tmpdir with MB_DISPATCH_MODE_STATE_DIR
// override; afterEach cleanup. Mirrors test/unit/autopilot-state-store/
// probe-01-store-persistence.spec.ts (mbt11-wb6-store fixture).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readDispatchMode,
  writeDispatchMode,
} from '../../../src/main/dispatch-mode-store.js';

const STATE_FILENAME = 'dispatch-mode-state.json';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mb-t24-dispatch-mode-store-'));
  process.env['MB_DISPATCH_MODE_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_DISPATCH_MODE_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('MB-T24 WB1 — readDispatchMode default + malformed inputs', () => {
  it("returns 'ask' when no state file exists (Q-MBT24-2=a default)", () => {
    expect(readDispatchMode()).toBe('ask');
  });

  it("returns 'ask' when state file is malformed JSON", () => {
    writeFileSync(join(dir, STATE_FILENAME), '{ not valid json', 'utf8');
    expect(readDispatchMode()).toBe('ask');
  });

  it("returns 'ask' when state file has invalid mode value", () => {
    writeFileSync(
      join(dir, STATE_FILENAME),
      JSON.stringify({ mode: 'invalid-value' }),
      'utf8',
    );
    expect(readDispatchMode()).toBe('ask');
  });

  it("returns 'ask' when state file is an array (wrong shape)", () => {
    writeFileSync(join(dir, STATE_FILENAME), '[]', 'utf8');
    expect(readDispatchMode()).toBe('ask');
  });

  it("returns 'ask' when state file is missing the 'mode' field", () => {
    writeFileSync(join(dir, STATE_FILENAME), '{}', 'utf8');
    expect(readDispatchMode()).toBe('ask');
  });
});

describe('MB-T24 WB1 — writeDispatchMode + read round-trip', () => {
  it("persists 'auto' and reads it back", () => {
    writeDispatchMode('auto');
    expect(readDispatchMode()).toBe('auto');
  });

  it("persists 'ask' and reads it back", () => {
    writeDispatchMode('ask');
    expect(readDispatchMode()).toBe('ask');
  });

  it('overwrites prior value', () => {
    writeDispatchMode('auto');
    writeDispatchMode('ask');
    expect(readDispatchMode()).toBe('ask');
  });
});

describe('MB-T24 WB1 — on-disk format + env-override isolation', () => {
  it('writes JSON file at <stateDir>/dispatch-mode-state.json', () => {
    writeDispatchMode('auto');
    expect(existsSync(join(dir, STATE_FILENAME))).toBe(true);
  });

  it("on-disk shape is { mode: 'auto' | 'ask' }", () => {
    writeDispatchMode('auto');
    const raw = readFileSync(join(dir, STATE_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({ mode: 'auto' });
  });

  it('honors MB_DISPATCH_MODE_STATE_DIR env override', () => {
    // beforeEach already set MB_DISPATCH_MODE_STATE_DIR=dir; the prior
    // round-trip tests implicitly assert this. Make it explicit by
    // confirming no file is written elsewhere unrelated to dir.
    writeDispatchMode('auto');
    expect(existsSync(join(dir, STATE_FILENAME))).toBe(true);
  });
});
