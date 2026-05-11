// spike(MB-T-HSO-WIRE): chat-content-markers parser resilience under PTY chunking.
//
// WB1 spike per CONDUCTOR_MB-T-HSO-WIRE_BUILD.md §4 lines 199-205.
// Simulation-driven per operator reframe 2026-05-10 — no real claude session
// spawn, no PTY transport. Fixtures fed directly through the MB-T35-revised
// parser (shipped fc15a26 at src/coarchitect/chat-content-markers.ts) across
// two caller patterns:
//
//   Pattern A (control):   parseActionMarker(chunk) per chunk; no accumulator.
//   Pattern B (treatment): parseActionMarker(buffer) after each chunk append.
//
// Evidence binds WB7 (pty-stream-relay marker-parse observer) caller
// architecture. Companion ADR:
//   docs/coordination/spike-mbthsowire-01-marker-chunking-resilience-2026-05-11.md

import { describe, expect, it } from 'vitest';
import {
  parseActionMarker,
  type ParsedActionMarker,
} from '../../src/coarchitect/chat-content-markers.js';

/** Fixture markers — one per orchestrator.md §2 action variant. */
const FIXTURES: Record<string, string> = {
  'send-prompt-to-session': [
    '[ACTION:send-prompt-to-session]',
    'sessionName: sess-worker-a',
    'prompt: Please implement WB3 as specified in the dispatch.',
    'rationale: Worker session is ready for next task',
    '[/ACTION]',
  ].join('\n'),
  'spawn-session': [
    '[ACTION:spawn-session]',
    'sessionName: sess-mb-t38',
    'initialPrompt: You are Terminal B. Read ~/Downloads/MB-T38-DISPATCH.md and proceed.',
    'rationale: MB-T38 requires a fresh session for swarm-state writing',
    '[/ACTION]',
  ].join('\n'),
  'kill-session': [
    '[ACTION:kill-session]',
    'sessionName: sess-stale-worker',
    'rationale: Session has been idle for 30 minutes and scope is complete',
    '[/ACTION]',
  ].join('\n'),
  'pull-handoff-from-session': [
    '[ACTION:pull-handoff-from-session]',
    'sessionName: sess-mb-t35-a',
    'rationale: Session context approaching capacity; need handoff before replacement',
    '[/ACTION]',
  ].join('\n'),
  'assign-task': [
    '[ACTION:assign-task]',
    'sessionName: sess-mb-t38',
    'ticketScope: MB-T38',
    'rationale: MB-T38 swarm-state writer must ship before WB4 integration',
    '[/ACTION]',
  ].join('\n'),
};

const ONE_CHUNK = Number.MAX_SAFE_INTEGER;
const CHUNK_SIZES = [1, 16, 64, 1024, ONE_CHUNK] as const;
const CHUNK_LABEL: Record<number, string> = {
  1: '1B',
  16: '16B',
  64: '64B',
  1024: '1KB',
  [ONE_CHUNK]: 'one-chunk',
};

function sliceIntoChunks(content: string, size: number): string[] {
  if (size <= 0 || size >= content.length) return [content];
  const out: string[] = [];
  for (let i = 0; i < content.length; i += size) {
    out.push(content.slice(i, i + size));
  }
  return out;
}

/** Pattern A: caller invokes parser per chunk; no buffer between chunks. */
function patternA(chunks: readonly string[]): ParsedActionMarker | null {
  for (const c of chunks) {
    const r = parseActionMarker(c);
    if (r !== null) return r;
  }
  return null;
}

/** Pattern B: caller appends each chunk to a buffer; parses buffer per append. */
function patternB(chunks: readonly string[]): ParsedActionMarker | null {
  let buf = '';
  for (const c of chunks) {
    buf += c;
    const r = parseActionMarker(buf);
    if (r !== null) return r;
  }
  return null;
}

describe('spike-mbthsowire-01 — Pattern A (control: per-chunk-parse, no accumulator)', () => {
  for (const [variant, fixture] of Object.entries(FIXTURES)) {
    for (const size of CHUNK_SIZES) {
      const sizeLabel = CHUNK_LABEL[size];
      // Predicted: match only when one chunk holds the complete fixture
      // (i.e., chunk size >= fixture length); otherwise null because the
      // parser regex requires both opener and closer in the same string.
      const oneChunkHoldsAll = size >= fixture.length;
      const predicted: 'match' | 'null' = oneChunkHoldsAll ? 'match' : 'null';

      it(`${variant} / ${sizeLabel} → predicted=${predicted}`, () => {
        const chunks = sliceIntoChunks(fixture, size);
        const result = patternA(chunks);
        if (predicted === 'match') {
          expect(result).not.toBeNull();
          expect(result!.actionType).toBe(variant);
        } else {
          expect(result).toBeNull();
        }
      });
    }
  }
});

describe('spike-mbthsowire-01 — Pattern B (treatment: buffer accumulator + parse-on-each-append)', () => {
  for (const [variant, fixture] of Object.entries(FIXTURES)) {
    for (const size of CHUNK_SIZES) {
      const sizeLabel = CHUNK_LABEL[size];

      it(`${variant} / ${sizeLabel} → predicted=match`, () => {
        const chunks = sliceIntoChunks(fixture, size);
        const result = patternB(chunks);
        expect(result).not.toBeNull();
        expect(result!.actionType).toBe(variant);
        expect(result!.fields['sessionName']).toBeDefined();
        expect(result!.fields['rationale']).toBeDefined();
      });
    }
  }
});

describe('spike-mbthsowire-01 — chunking-adjacent concerns', () => {
  it('(i) multi-marker-in-buffer — parser returns FIRST block; subsequent silently invisible', () => {
    const m1 = FIXTURES['kill-session'];
    const m2 = FIXTURES['send-prompt-to-session'];
    const buf = `${m1}\n${m2}`;

    const result = parseActionMarker(buf);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('kill-session');
    // Evidence for ADR Concern (i): the second marker is NOT extracted by a
    // single parser call. WB7 observer MUST strip-and-re-parse to consume
    // late markers in the same burst.
  });

  it('(ii) mid-[/ACTION] chunk split — Pattern A returns null; Pattern B returns match', () => {
    const fixture = FIXTURES['kill-session'];
    const closerIdx = fixture.indexOf('[/ACTION]');
    // Split inside the closer, after "[/".
    const splitAt = closerIdx + 2;
    const chunks = [fixture.slice(0, splitAt), fixture.slice(splitAt)];

    expect(patternA(chunks)).toBeNull();
    const b = patternB(chunks);
    expect(b).not.toBeNull();
    expect(b!.actionType).toBe('kill-session');
  });

  it('(iii) mid-[ACTION:...] chunk split — Pattern A returns null; Pattern B returns match', () => {
    const fixture = FIXTURES['spawn-session'];
    // Split inside the opener, after "[ACT".
    const splitAt = 4;
    const chunks = [fixture.slice(0, splitAt), fixture.slice(splitAt)];

    expect(patternA(chunks)).toBeNull();
    const b = patternB(chunks);
    expect(b).not.toBeNull();
    expect(b!.actionType).toBe('spawn-session');
  });
});
