// MB-T35-revised WB1 (red) — parseActionMarker contract tests.
//
// Contract asserted:
//   - parseActionMarker returns null when no [ACTION:...][/ACTION] block found
//   - parseActionMarker returns null when block is unclosed (no [/ACTION])
//   - parseActionMarker returns ParsedActionMarker with correct actionType +
//     fields for all 5 orchestrator.md §2 action variants
//   - parseActionMarker correctly extracts blocks embedded in surrounding prose
//   - parseActionMarker extracts unknown action types without validation
//     (type validation is action-variant-ipc.ts concern)
//
// WB1 red: parseActionMarker returns null unconditionally — all "found block"
//   assertions fail; null-return assertions pass (acceptable RED state).
// WB2 green: parseActionMarker regex + field-extraction implementation lands.

import { describe, it, expect } from 'vitest';
import { parseActionMarker } from '../../../src/coarchitect/chat-content-markers.js';

describe('MB-T35-revised WB1 — parseActionMarker: null cases', () => {
  it('P6: returns null when no [ACTION] block present', () => {
    const result = parseActionMarker('This is regular prose. No action markers here.');
    expect(result).toBeNull();
  });

  it('P7: returns null when [ACTION block has no matching [/ACTION] close', () => {
    const content = [
      '[ACTION:kill-session]',
      'sessionName: sess-x',
      'rationale: unclosed marker',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).toBeNull();
  });
});

describe('MB-T35-revised WB1 — parseActionMarker: extraction (RED — stubs throw null)', () => {
  it('P1: extracts send-prompt-to-session block with sessionName + prompt + rationale', () => {
    const content = [
      '[ACTION:send-prompt-to-session]',
      'sessionName: sess-worker-a',
      'prompt: Please implement WB3 as specified in the dispatch.',
      'rationale: Worker session is ready for next task',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('send-prompt-to-session');
    expect(result!.fields['sessionName']).toBe('sess-worker-a');
    expect(result!.fields['prompt']).toBe('Please implement WB3 as specified in the dispatch.');
    expect(result!.fields['rationale']).toBe('Worker session is ready for next task');
  });

  it('P2: extracts spawn-session block with sessionName + initialPrompt + rationale', () => {
    const content = [
      '[ACTION:spawn-session]',
      'sessionName: sess-mb-t38',
      'initialPrompt: You are Terminal B. Read ~/Downloads/MB-T38-DISPATCH.md and proceed.',
      'rationale: MB-T38 requires a fresh session for swarm-state writing',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('spawn-session');
    expect(result!.fields['sessionName']).toBe('sess-mb-t38');
    expect(result!.fields['initialPrompt']).toContain('Terminal B');
    expect(result!.fields['rationale']).toContain('MB-T38');
  });

  it('P3: extracts kill-session block with sessionName + rationale', () => {
    const content = [
      '[ACTION:kill-session]',
      'sessionName: sess-stale-worker',
      'rationale: Session has been idle for 30 minutes and scope is complete',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('kill-session');
    expect(result!.fields['sessionName']).toBe('sess-stale-worker');
    expect(result!.fields['rationale']).toContain('idle');
  });

  it('P4: extracts pull-handoff-from-session block with sessionName + rationale', () => {
    const content = [
      '[ACTION:pull-handoff-from-session]',
      'sessionName: sess-mb-t35-a',
      'rationale: Session context approaching capacity; need handoff before replacement',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('pull-handoff-from-session');
    expect(result!.fields['sessionName']).toBe('sess-mb-t35-a');
    expect(result!.fields['rationale']).toContain('capacity');
  });

  it('P5: extracts assign-task block with sessionName + ticketScope + rationale', () => {
    const content = [
      '[ACTION:assign-task]',
      'sessionName: sess-mb-t38',
      'ticketScope: MB-T38',
      'rationale: MB-T38 swarm-state writer must ship before WB4 integration',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('assign-task');
    expect(result!.fields['sessionName']).toBe('sess-mb-t38');
    expect(result!.fields['ticketScope']).toBe('MB-T38');
    expect(result!.fields['rationale']).toContain('swarm-state');
  });

  it('P8: extracts block correctly when embedded in surrounding prose', () => {
    const content = [
      'Based on current swarm state, I will kill the stale session.',
      '',
      '[ACTION:kill-session]',
      'sessionName: sess-stale',
      'rationale: Stale session cleanup; scope confirmed complete',
      '[/ACTION]',
      '',
      'Proceeding with next swarm step.',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('kill-session');
    expect(result!.fields['sessionName']).toBe('sess-stale');
    expect(result!.fields['rationale']).toContain('Stale');
  });

  it('P9: extracts unknown action type (handler validates type, not parser)', () => {
    const content = [
      '[ACTION:foo-bar]',
      'sessionName: sess-x',
      'someField: someValue',
      '[/ACTION]',
    ].join('\n');
    const result = parseActionMarker(content);
    expect(result).not.toBeNull();
    expect(result!.actionType).toBe('foo-bar');
    expect(result!.fields['sessionName']).toBe('sess-x');
    expect(result!.fields['someField']).toBe('someValue');
  });
});
