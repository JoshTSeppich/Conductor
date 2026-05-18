// MB-T-MVP-W4-ORCHESTRATOR-STATE-PROD-WIRING WB7 — probe-06:
// orchestrator-narration-store.ts (Q1=(c)) append-only JSON ring.

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
  appendOrchestratorNarration,
  readOrchestratorNarration,
  writeOrchestratorNarration,
} from '../../../src/main/orchestrator-narration-store.js';
import type { OrchestratorMessage } from '../../../src/main/orchestrator-state-types.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mb-orch-narration-'));
  process.env['MB_ORCHESTRATOR_NARRATION_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_ORCHESTRATOR_NARRATION_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('MB-T-MVP-W4 probe-06 — orchestrator-narration-store', () => {
  it('read on absent file returns empty array', () => {
    expect(existsSync(join(dir, 'orchestrator-narration.json'))).toBe(false);
    expect(readOrchestratorNarration()).toEqual([]);
  });

  it('write persists JSON to env-override directory', () => {
    const msg: OrchestratorMessage = {
      role: 'system',
      text: 'boot complete',
      id: 'm1',
    };
    writeOrchestratorNarration([msg]);
    const filePath = join(dir, 'orchestrator-narration.json');
    expect(existsSync(filePath)).toBe(true);
    expect(JSON.parse(readFileSync(filePath, 'utf8'))).toEqual({
      messages: [msg],
    });
  });

  it('read after write roundtrips single message', () => {
    const msg: OrchestratorMessage = {
      role: 'dispatch',
      text: 'spawn s1',
      id: 'm1',
    };
    writeOrchestratorNarration([msg]);
    expect(readOrchestratorNarration()).toEqual([msg]);
  });

  it('read after write roundtrips multi-role message array', () => {
    const msgs: OrchestratorMessage[] = [
      { role: 'system', text: 'boot' },
      { role: 'user', text: 'attach BUILD.md' },
      { role: 'assistant', text: 'attached' },
      { role: 'dispatch', text: 'fired spawn s1' },
      { role: 'typing', running: 2 },
    ];
    writeOrchestratorNarration(msgs);
    expect(readOrchestratorNarration()).toEqual(msgs);
  });

  it('appendOrchestratorNarration adds to existing log', () => {
    writeOrchestratorNarration([
      { role: 'system', text: 'first' },
    ]);
    const updated = appendOrchestratorNarration({
      role: 'dispatch',
      text: 'second',
    });
    expect(updated).toEqual([
      { role: 'system', text: 'first' },
      { role: 'dispatch', text: 'second' },
    ]);
    expect(readOrchestratorNarration()).toEqual([
      { role: 'system', text: 'first' },
      { role: 'dispatch', text: 'second' },
    ]);
  });

  it('appendOrchestratorNarration on empty file initializes log', () => {
    const updated = appendOrchestratorNarration({
      role: 'system',
      text: 'first ever message',
    });
    expect(updated).toEqual([{ role: 'system', text: 'first ever message' }]);
    expect(readOrchestratorNarration()).toEqual([
      { role: 'system', text: 'first ever message' },
    ]);
  });

  it('read with malformed JSON returns empty array', () => {
    writeFileSync(
      join(dir, 'orchestrator-narration.json'),
      '{ broken',
      'utf8',
    );
    expect(readOrchestratorNarration()).toEqual([]);
  });

  it('read with shape-mismatched top-level returns empty array', () => {
    writeFileSync(
      join(dir, 'orchestrator-narration.json'),
      JSON.stringify({ messages: 'not-an-array' }),
      'utf8',
    );
    expect(readOrchestratorNarration()).toEqual([]);
  });

  it('read filters malformed entries inside messages array (shape-validator)', () => {
    writeFileSync(
      join(dir, 'orchestrator-narration.json'),
      JSON.stringify({
        messages: [
          { role: 'system', text: 'good' },
          { role: 'INVALID-ROLE', text: 'bad' },
          { role: 'dispatch', text: 'good2' },
          { role: 'typing', running: 'not-a-number' },
          { role: 'user' },
        ],
      }),
      'utf8',
    );
    expect(readOrchestratorNarration()).toEqual([
      { role: 'system', text: 'good' },
      { role: 'dispatch', text: 'good2' },
      { role: 'user' },
    ]);
  });

  it('read with array-typed top-level returns empty array', () => {
    writeFileSync(
      join(dir, 'orchestrator-narration.json'),
      JSON.stringify([{ role: 'system', text: 'm1' }]),
      'utf8',
    );
    expect(readOrchestratorNarration()).toEqual([]);
  });

  it('supports all 5 role variants via shape-validator', () => {
    const all5: OrchestratorMessage[] = [
      { role: 'user', text: 'u' },
      { role: 'assistant', text: 'a' },
      { role: 'dispatch', text: 'd' },
      { role: 'system', text: 's' },
      { role: 'typing', running: 1 },
    ];
    writeOrchestratorNarration(all5);
    expect(readOrchestratorNarration()).toEqual(all5);
  });
});
