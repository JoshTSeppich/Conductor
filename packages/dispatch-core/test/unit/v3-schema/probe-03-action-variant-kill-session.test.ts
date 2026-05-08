/**
 * probe-03 — KillSessionOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: KillSessionOutputSchema does not exist in schema.ts §14 yet.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
 */
import { describe, it, expect } from 'vitest';
import {
  KillSessionOutputSchema,
} from '../../../src/v3/schema.js';

describe('KillSessionOutputSchema', () => {
  describe('positive parse', () => {
    it('parses a minimal valid kill-session output (no reason)', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'sherpa-001',
        rationale: 'Task complete; session no longer needed.',
      });
      expect(result.success).toBe(true);
    });

    it('parses with optional reason field', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'atlas-002',
        reason: 'Session produced conflicting changes; manual resolution needed.',
        rationale: 'Conflict detected between sherpa sessions on the same file.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe(
          'Session produced conflicting changes; manual resolution needed.',
        );
      }
    });

    it('parses without reason — reason is optional and absent is valid', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'sherpa-002',
        rationale: 'Session work complete.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBeUndefined();
      }
    });
  });

  describe('negative parse', () => {
    it('rejects missing sessionName', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rationale', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'sherpa-001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects wrong type literal', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill',
        sessionName: 'sherpa-001',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields (strict schema)', () => {
      const result = KillSessionOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'sherpa-001',
        rationale: 'reason',
        extraField: 'rejected',
      });
      expect(result.success).toBe(false);
    });
  });
});
