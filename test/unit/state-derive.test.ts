/**
 * FD-T10 — state derivation.
 *
 * `deriveState` is a pure function. `now` and `handoff_mtime` are passed
 * in so the tests are table-driven and do not touch the filesystem or
 * the clock. No `new Date()` or `fs.stat` inside the function under test.
 */

import { describe, it, expect } from 'vitest';
import { deriveState, type SessionState } from '../../src/state/derive.js';

const NOW = new Date('2026-04-21T12:00:00.000Z');
const STALE_MS = 30 * 60 * 1000; // 30 minutes

type Case = {
  name: string;
  input: {
    last_prompt_sent_at: string | null;
    last_handoff_pulled_at: string | null;
    handoff_mtime: Date | null;
  };
  expected: SessionState;
};

const cases: Case[] = [
  {
    name: 'no prompt ever sent, no handoff file -> idle',
    input: {
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
      handoff_mtime: null,
    },
    expected: 'idle',
  },
  {
    name: 'prompt sent within threshold, no handoff file -> running',
    input: {
      last_prompt_sent_at: '2026-04-21T11:55:00.000Z',
      last_handoff_pulled_at: null,
      handoff_mtime: null,
    },
    expected: 'running',
  },
  {
    name: 'handoff mtime newer than last_prompt_sent_at, not pulled since -> awaiting_review',
    input: {
      last_prompt_sent_at: '2026-04-21T11:55:00.000Z',
      last_handoff_pulled_at: null,
      handoff_mtime: new Date('2026-04-21T11:56:00.000Z'),
    },
    expected: 'awaiting_review',
  },
  {
    name: 'handoff pulled more recently than last prompt sent -> idle',
    input: {
      last_prompt_sent_at: '2026-04-21T11:55:00.000Z',
      last_handoff_pulled_at: '2026-04-21T11:57:00.000Z',
      handoff_mtime: new Date('2026-04-21T11:56:00.000Z'),
    },
    expected: 'idle',
  },
  {
    name: 'prompt sent longer than stale threshold ago, no handoff -> stale',
    input: {
      last_prompt_sent_at: '2026-04-21T11:00:00.000Z',
      last_handoff_pulled_at: null,
      handoff_mtime: null,
    },
    expected: 'stale',
  },
  {
    name: 'old handoff mtime from a previous cycle, new prompt just sent -> running',
    input: {
      last_prompt_sent_at: '2026-04-21T11:55:00.000Z',
      last_handoff_pulled_at: '2026-04-21T11:50:00.000Z',
      handoff_mtime: new Date('2026-04-21T11:45:00.000Z'),
    },
    expected: 'running',
  },
];

describe('deriveState', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    const result = deriveState({
      ...input,
      now: NOW,
      stale_threshold_ms: STALE_MS,
    });
    expect(result).toBe(expected);
  });
});
