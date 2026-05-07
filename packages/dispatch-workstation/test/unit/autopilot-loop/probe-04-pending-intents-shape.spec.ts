// MB-T11 WB6 probe-04 — getPendingIntents return shape matches the
// dispatch-core PendingIntentSchema (§11) exactly. This is the contract
// the WB7 Tier4 fan-out merge depends on.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PendingIntentSchema } from 'dispatch-core/dist/v3/schema.js';
import { AutopilotLoop, uuidv7 } from '../../../src/main/autopilot-loop.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mbt11-wb6-shape-'));
  process.env['MB_AUTOPILOT_STATE_DIR'] = dir;
});

afterEach(() => {
  delete process.env['MB_AUTOPILOT_STATE_DIR'];
  rmSync(dir, { recursive: true, force: true });
});

describe('autopilot-loop — probe 04: pending-intents schema shape', () => {
  it('returns empty array for a session with no intents', () => {
    const loop = new AutopilotLoop();
    expect(loop.getPendingIntents('sess-x')).toEqual([]);
  });

  it('every PendingIntent passes PendingIntentSchema.safeParse', () => {
    const loop = new AutopilotLoop();
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
      expected_steps: 3,
    });
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'second plan',
      expected_steps: 1,
    });
    const intents = loop.getPendingIntents('sess-x');
    expect(intents.length).toBe(2);
    for (const intent of intents) {
      const result = PendingIntentSchema.safeParse(intent);
      expect(
        result.success,
        `intent failed schema: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });

  it('intent_id from the production uuidv7 generator passes PendingIntentSchema.intent_id (uuid format)', () => {
    const loop = new AutopilotLoop(); // uses production uuidv7 by default
    loop.startIntent({
      sessionName: 'sess-x',
      intent_summary: 'plan',
    });
    const intents = loop.getPendingIntents('sess-x');
    const result = PendingIntentSchema.safeParse(intents[0]);
    expect(result.success).toBe(true);
  });

  it('uuidv7 helper produces 36-char dashed hex matching the v7 layout', () => {
    const id = uuidv7();
    expect(id.length).toBe(36);
    // Format: 8-4-4-4-12 hex digits.
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Version 7 in the high nibble of byte 6 (position 14 in the dashed form).
    expect(id[14]).toBe('7');
    // Variant 10xx in top 2 bits of byte 8 (position 19 in the dashed form;
    // valid values are 8, 9, a, b).
    expect(id[19]).toMatch(/[89ab]/);
  });
});
