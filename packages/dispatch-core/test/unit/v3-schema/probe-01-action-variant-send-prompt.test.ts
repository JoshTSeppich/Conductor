/**
 * probe-01 — SendPromptToSessionOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: SendPromptToSessionOutputSchema does not exist in schema.ts §3 yet.
 * Import will fail → all tests in this file fail.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
 *
 * Note: envelope field is NOT in this schema (IPC-transport detail, added by
 * MB-T11-B action handler). Schema is: {type, sessionName, prompt, rationale}.
 */
import { describe, it, expect } from 'vitest';
import {
  SendPromptToSessionOutputSchema,
} from '../../../src/v3/schema.js';

describe('SendPromptToSessionOutputSchema', () => {
  describe('positive parse', () => {
    it('parses a minimal valid send-prompt-to-session output', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        prompt: 'Continue implementing the authentication module.',
        rationale: 'Authentication is blocking the login flow.',
      });
      expect(result.success).toBe(true);
    });

    it('parsed output preserves sessionName and prompt verbatim', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'atlas-001',
        prompt: 'Run the test suite and fix all failures.',
        rationale: 'Test suite is a ship gate.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionName).toBe('atlas-001');
        expect(result.data.prompt).toBe('Run the test suite and fix all failures.');
        expect(result.data.type).toBe('send-prompt-to-session');
      }
    });
  });

  describe('negative parse', () => {
    it('rejects missing sessionName', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        prompt: 'do something',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing prompt', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rationale', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        prompt: 'do something',
      });
      expect(result.success).toBe(false);
    });

    it('rejects wrong type literal', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'action',
        sessionName: 'sherpa-001',
        prompt: 'do something',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects envelope field (not in schema — strict; envelope is IPC-transport, added by MB-T11-B)', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        prompt: 'do something',
        rationale: 'reason',
        envelope: { envelope_version: 1, intent_id: 'uuid', step: 1, total_steps: 2, intent_summary: 'x' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields (strict schema)', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        prompt: 'do something',
        rationale: 'reason',
        unexpectedField: 'should be rejected by strict()',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty sessionName', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: '',
        prompt: 'do something',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });
  });
});
