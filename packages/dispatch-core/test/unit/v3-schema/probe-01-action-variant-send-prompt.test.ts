/**
 * probe-01 — SendPromptToSessionOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: SendPromptToSessionOutputSchema does not exist in schema.ts §3/§14 yet.
 * Import will fail → all tests in this file fail.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
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

    it('parses with optional envelope field', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-002',
        prompt: 'Run the test suite and fix failures.',
        envelope: {
          envelope_version: 1,
          intent_id: '00000000-0000-4000-8000-000000000001',
          step: 2,
          total_steps: 4,
          intent_summary: 'Fix auth module end-to-end',
        },
        rationale: 'Step 2 of 4 in the auth fix plan.',
      });
      expect(result.success).toBe(true);
    });

    it('parses with envelope omitted (envelope is optional)', () => {
      const result = SendPromptToSessionOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'atlas-001',
        prompt: 'What is the current state of the feature branch?',
        rationale: 'Read-only status check before deciding next step.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.envelope).toBeUndefined();
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
