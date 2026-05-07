// MB-T11 WB6 probe-05 — 100 startIntent calls produce 100 unique intent_ids.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AutopilotLoop, uuidv7 } from '../../../src/main/autopilot-loop.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb6-unique-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('autopilot-loop — probe 05: intent_id uniqueness', () => {
  it('100 startIntent calls produce 100 unique intent_ids', () => {
    const loop = new AutopilotLoop(); // production uuidv7
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const r = loop.startIntent({
        sessionName: `sess-${i}`,
        intent_summary: `plan ${i}`,
      });
      ids.add(r.intent_id);
    }
    expect(ids.size).toBe(100);
  });

  it('1000 raw uuidv7() calls are all unique', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(uuidv7());
    }
    expect(ids.size).toBe(1000);
  });

  it('startIntent calls within the same session also yield unique intent_ids', () => {
    const loop = new AutopilotLoop();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const r = loop.startIntent({
        sessionName: 'sess-x',
        intent_summary: `plan ${i}`,
      });
      ids.add(r.intent_id);
    }
    expect(ids.size).toBe(50);
    expect(loop.getPendingIntents('sess-x').length).toBe(50);
  });
});
