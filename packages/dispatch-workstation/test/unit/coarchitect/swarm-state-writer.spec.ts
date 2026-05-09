// MB-T38 WB1 (red) — swarm-state.md write protocol + handoff document
// generation contract tests.
//
// Contract asserted (9 probes):
//   Probe 01: tile-grid:session-add → peer entry appears in swarm-state.md
//   Probe 02: tile-grid:session-remove → peer entry removed from swarm-state.md
//   Probe 03: action-variant:fired → action recorded in swarm-state.md
//   Probe 04: halt:emitted → HALT entry with D2 fields (halt_urgency,
//             halt_emitted_at, halt_blocking) written to swarm-state.md
//   Probe 05: error:recorded → error entry written to swarm-state.md
//   Probe 06: peer:turn-complete → §7 YAML self-summary written to swarm-state.md
//   Probe 07: handoff:triggered → new file at handoffDir/handoff-<timestamp>.md
//             with 5 §8.2 mandatory sections
//   Probe 08: handoff:triggered does NOT modify swarm-state.md (D9 constraint)
//   Probe 09: atomic write — concurrent emissions produce no partial-write race;
//             no .tmp file persists after write
//
// WB1 red: constructor is a no-op stub; no listeners attached; no writes
// implemented. All probes fail because swarm-state.md is never written.
// WB2 green: full implementation passes all 9 probes.
//
// Mock emitter shape (recmd; Terminal A WB2 GREEN confirms actual shape):
//   EventEmitter, event 'action-variant:fired',
//   payload { actionType, payload, sessionName, firedAt }

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SwarmStateWriter } from '../../../src/coarchitect/swarm-state-writer.js';

describe('MB-T38 WB1 — SwarmStateWriter probes', () => {
  let tmpDir: string;
  let swarmStatePath: string;
  let handoffDir: string;
  let emitter: EventEmitter;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'mb-t38-'));
    handoffDir = join(tmpDir, 'coordination');
    mkdirSync(handoffDir, { recursive: true });
    swarmStatePath = join(tmpDir, 'swarm-state.md');
    emitter = new EventEmitter();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('probe-01: tile-grid:session-add event writes peer entry to swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('tile-grid:session-add', { sessionName: 'peer-alpha' } satisfies { sessionName: string });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content).toContain('peer-alpha');
    writer.dispose();
  });

  it('probe-02: tile-grid:session-remove event removes peer entry from swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('tile-grid:session-add', { sessionName: 'peer-beta' } satisfies { sessionName: string });
    emitter.emit('tile-grid:session-remove', { sessionName: 'peer-beta' } satisfies { sessionName: string });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content).not.toContain('peer-beta');
    writer.dispose();
  });

  it('probe-03: action-variant:fired event records action in swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('action-variant:fired', {
      actionType: 'send-prompt-to-session',
      payload: { prompt: 'continue WB2' },
      sessionName: 'peer-alpha',
      firedAt: '2026-05-08T10:00:00Z',
    } satisfies { actionType: string; payload: unknown; sessionName: string; firedAt: string });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content).toContain('send-prompt-to-session');
    expect(content).toContain('peer-alpha');
    writer.dispose();
  });

  it('probe-04: halt:emitted event writes HALT entry with D2 fields to swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('halt:emitted', {
      reason: 'frozen surface ambiguity — CONDUCTOR_API_CONTRACT.md §2 interpretation required',
      halt_urgency: 'high',
      halt_emitted_at: '2026-05-08T10:30:00Z',
      halt_blocking: ['MB-T37', 'MB-T38'],
    } satisfies { reason: string; halt_urgency: string; halt_emitted_at: string; halt_blocking: string[] });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content).toContain('halt_urgency: high');
    expect(content).toContain('halt_emitted_at: 2026-05-08T10:30:00Z');
    expect(content).toContain('halt_blocking:');
    expect(content).toContain('MB-T37');
    expect(content).toContain('MB-T38');
    writer.dispose();
  });

  it('probe-05: error:recorded event writes error entry to swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('error:recorded', {
      message: 'ERR_MODULE_NOT_FOUND: swarm-state-writer.js',
      sessionName: 'peer-gamma',
      timestamp: '2026-05-08T11:00:00Z',
    } satisfies { message: string; sessionName?: string; timestamp: string });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content).toContain('ERR_MODULE_NOT_FOUND');
    expect(content).toContain('peer-gamma');
    writer.dispose();
  });

  it('probe-06: peer:turn-complete event writes §7 YAML self-summary to swarm-state.md', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('peer:turn-complete', {
      sessionName: 'peer-delta',
      task: 'implement WB2 GREEN for MB-T38',
      filesTouched: ['src/coarchitect/swarm-state-writer.ts'],
      result: 'swarm-state-writer.ts GREEN implementation shipped',
      completionStatus: 'complete',
      noFollowUp: true,
    } satisfies {
      sessionName: string;
      task: string;
      filesTouched: string[];
      result: string;
      completionStatus: string;
      noFollowUp: boolean;
      followUpAction?: string;
    });
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    // §7 YAML self-summary field names are parser-anchored — exact match required
    expect(content).toContain('peer_session: peer-delta');
    expect(content).toContain('task: implement WB2 GREEN for MB-T38');
    expect(content).toContain('completion_status: complete');
    expect(content).toContain('no_follow_up: true');
    writer.dispose();
  });

  it('probe-07: handoff:triggered creates handoff-<timestamp>.md in handoffDir with 5 §8.2 sections', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    emitter.emit('handoff:triggered', {
      triggerType: 'marker',
      marker: '[HANDOFF-EMITTED]',
    } satisfies { triggerType: string; marker?: string });
    // A new handoff file must exist in handoffDir
    const files = readdirSync(handoffDir);
    const handoffFiles = files.filter((f) => f.startsWith('handoff-') && f.endsWith('.md'));
    expect(handoffFiles).toHaveLength(1);
    const handoffContent = readFileSync(join(handoffDir, handoffFiles[0]!), 'utf8');
    // 5 mandatory sections per orchestrator.md §8.2 (in order)
    expect(handoffContent).toContain('Where I was');       // Section 1: state summary
    expect(handoffContent).toContain('Verbatim unsent prompts'); // Section 2
    expect(handoffContent).toContain('Sequencing intent'); // Section 3
    expect(handoffContent).toContain('HALT severity rationale'); // Section 4
    expect(handoffContent).toContain('do not');            // Section 5: explicit do-not list
    writer.dispose();
  });

  it('probe-08: handoff:triggered does NOT modify swarm-state.md (D9 separate artifacts constraint)', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    // First establish swarm state via continuous trigger
    emitter.emit('tile-grid:session-add', { sessionName: 'peer-epsilon' } satisfies { sessionName: string });
    const contentBefore = readFileSync(swarmStatePath, 'utf8');
    // Now fire handoff trigger — must NOT touch swarm-state.md
    emitter.emit('handoff:triggered', { triggerType: 'token-threshold' } satisfies { triggerType: string; marker?: string });
    const contentAfter = readFileSync(swarmStatePath, 'utf8');
    expect(contentAfter).toEqual(contentBefore);
    writer.dispose();
  });

  it('probe-09: atomic write — no .tmp file persists after write; file is valid after concurrent emissions', () => {
    const writer = new SwarmStateWriter(emitter, { swarmStatePath, handoffDir });
    // Rapid-fire 10 events (synchronous; tests the temp+rename pattern)
    for (let i = 0; i < 10; i++) {
      emitter.emit('action-variant:fired', {
        actionType: 'send-prompt-to-session',
        payload: {},
        sessionName: `peer-${i}`,
        firedAt: '2026-05-08T12:00:00Z',
      });
    }
    // swarm-state.md must exist and be valid (starts with '#' — a partial write
    // would leave truncated content)
    expect(existsSync(swarmStatePath)).toBe(true);
    const content = readFileSync(swarmStatePath, 'utf8');
    expect(content.startsWith('#')).toBe(true);
    // No .tmp file should persist after atomic rename
    expect(existsSync(swarmStatePath + '.tmp')).toBe(false);
    writer.dispose();
  });
});
