/**
 * probe-04 — PullHandoffFromSessionOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: PullHandoffFromSessionOutputSchema does not exist in schema.ts §14 yet.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
 */
import { describe, it, expect } from 'vitest';
import {
  PullHandoffFromSessionOutputSchema,
} from '../../../src/v3/schema.js';

describe('PullHandoffFromSessionOutputSchema', () => {
  describe('positive parse', () => {
    it('parses a minimal valid pull-handoff-from-session output', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'sherpa-001',
        rationale: 'Reading HANDOFF before deciding next action.',
      });
      expect(result.success).toBe(true);
    });

    it('type literal is exactly pull-handoff-from-session', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'atlas-001',
        rationale: 'Context refresh.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('pull-handoff-from-session');
      }
    });

    it('sessionName preserved verbatim after parse', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'my-special-session-name',
        rationale: 'Needs context.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionName).toBe('my-special-session-name');
      }
    });
  });

  describe('negative parse', () => {
    it('rejects missing sessionName', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rationale', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'sherpa-001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects wrong type literal', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull',
        sessionName: 'sherpa-001',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty sessionName', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: '',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields (strict schema)', () => {
      const result = PullHandoffFromSessionOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'sherpa-001',
        rationale: 'reason',
        payload: 'extra field not in schema',
      });
      expect(result.success).toBe(false);
    });
  });
});
