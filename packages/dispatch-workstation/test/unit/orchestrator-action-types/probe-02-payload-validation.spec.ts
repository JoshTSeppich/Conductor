// MB-T11 WB2 probe-02 — assertActionPayload validates per-action sub-schema.
//
// Behavior covered:
//   - Each MB-T11 action type's correct payload shape passes through
//   - Wrong-shape payload throws with a useful message
//   - Throws specifically include the action name + first-issue path

import { describe, expect, it } from 'vitest';
import { assertActionPayload } from '../../../src/main/orchestrator-action-types.js';

describe('orchestrator-action-types — assertActionPayload', () => {
  describe('send', () => {
    it('accepts a valid send payload (minimal — prompt only)', () => {
      const payload = { prompt: 'hello' };
      const result = assertActionPayload('send', payload);
      expect(result.prompt).toBe('hello');
      expect(result.envelope).toBeUndefined();
    });

    it('accepts a valid send payload with envelope', () => {
      const payload = {
        prompt: 'hello',
        envelope: {
          envelope_version: 1 as const,
          intent_id: '01963a35-7c9c-7b8a-bb9c-1234567890ab',
          step: 1,
          total_steps: 3,
          intent_summary: 'multi-step plan',
        },
      };
      const result = assertActionPayload('send', payload);
      expect(result.envelope?.intent_id).toBe('01963a35-7c9c-7b8a-bb9c-1234567890ab');
    });

    it('rejects send payload without prompt', () => {
      expect(() => assertActionPayload('send', {})).toThrow(
        /Invalid payload for action 'send'/,
      );
    });

    it('rejects send payload with empty prompt', () => {
      expect(() => assertActionPayload('send', { prompt: '' })).toThrow(
        /Invalid payload for action 'send'/,
      );
    });
  });

  describe('spawn-new-session', () => {
    it('accepts a valid spawn payload', () => {
      const payload = {
        sessionName: 'sess-x',
        repoPath: '/abs/path',
      };
      const result = assertActionPayload('spawn-new-session', payload);
      expect(result.sessionName).toBe('sess-x');
      expect(result.repoPath).toBe('/abs/path');
    });

    it('accepts permissionMode when provided', () => {
      const payload = {
        sessionName: 'sess-x',
        repoPath: '/abs/path',
        permissionMode: 'dangerously-skip' as const,
      };
      const result = assertActionPayload('spawn-new-session', payload);
      expect(result.permissionMode).toBe('dangerously-skip');
    });

    it('rejects spawn payload missing repoPath', () => {
      expect(() =>
        assertActionPayload('spawn-new-session', { sessionName: 'sess-x' }),
      ).toThrow(/Invalid payload for action 'spawn-new-session'/);
    });

    it('rejects spawn payload with invalid permissionMode', () => {
      expect(() =>
        assertActionPayload('spawn-new-session', {
          sessionName: 'sess-x',
          repoPath: '/abs',
          permissionMode: 'sudo',
        }),
      ).toThrow(/Invalid payload for action 'spawn-new-session'/);
    });
  });

  describe('kill', () => {
    it('accepts kill payload (minimal — sessionName only)', () => {
      const result = assertActionPayload('kill', { sessionName: 'sess-x' });
      expect(result.sessionName).toBe('sess-x');
    });

    it('accepts kill payload with reason', () => {
      const result = assertActionPayload('kill', {
        sessionName: 'sess-x',
        reason: 'task complete',
      });
      expect(result.reason).toBe('task complete');
    });

    it('rejects kill payload missing sessionName', () => {
      expect(() => assertActionPayload('kill', {})).toThrow(
        /Invalid payload for action 'kill'/,
      );
    });
  });

  describe('pull', () => {
    it('accepts pull payload (sessionName only)', () => {
      const result = assertActionPayload('pull', { sessionName: 'sess-x' });
      expect(result.sessionName).toBe('sess-x');
    });

    it('rejects pull payload missing sessionName', () => {
      expect(() => assertActionPayload('pull', {})).toThrow(
        /Invalid payload for action 'pull'/,
      );
    });

    it('rejects pull payload with extra keys (strict)', () => {
      expect(() =>
        assertActionPayload('pull', { sessionName: 'sess-x', extra: true }),
      ).toThrow(/Invalid payload for action 'pull'/);
    });
  });

  describe('assign-task', () => {
    it('accepts assign-task payload (minimal — name + summary)', () => {
      const result = assertActionPayload('assign-task', {
        sessionName: 'sess-x',
        intent_summary: 'rebuild auth',
      });
      expect(result.sessionName).toBe('sess-x');
      expect(result.intent_summary).toBe('rebuild auth');
    });

    it('accepts assign-task payload with expected_steps', () => {
      const result = assertActionPayload('assign-task', {
        sessionName: 'sess-x',
        intent_summary: 'rebuild auth',
        expected_steps: 4,
      });
      expect(result.expected_steps).toBe(4);
    });

    it('rejects assign-task payload missing intent_summary', () => {
      expect(() =>
        assertActionPayload('assign-task', { sessionName: 'sess-x' }),
      ).toThrow(/Invalid payload for action 'assign-task'/);
    });

    it('rejects assign-task payload with non-integer expected_steps', () => {
      expect(() =>
        assertActionPayload('assign-task', {
          sessionName: 'sess-x',
          intent_summary: 'plan',
          expected_steps: 1.5,
        }),
      ).toThrow(/Invalid payload for action 'assign-task'/);
    });
  });

  describe('error message shape', () => {
    it('includes action name and field path in error', () => {
      try {
        assertActionPayload('send', { prompt: 123 });
        throw new Error('expected throw');
      } catch (e) {
        expect((e as Error).message).toMatch(/action 'send'/);
        expect((e as Error).message).toMatch(/prompt/);
      }
    });
  });
});
