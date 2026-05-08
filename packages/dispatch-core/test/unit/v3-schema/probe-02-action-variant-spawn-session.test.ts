/**
 * probe-02 — SpawnSessionOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: SpawnSessionOutputSchema does not exist in schema.ts §14 yet.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
 */
import { describe, it, expect } from 'vitest';
import {
  SpawnSessionOutputSchema,
} from '../../../src/v3/schema.js';

describe('SpawnSessionOutputSchema', () => {
  describe('positive parse', () => {
    it('parses a minimal valid spawn-session output (no initialPrompt)', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'sherpa-003',
        repoPath: '/Users/operator/projects/my-api',
        rationale: 'Need a dedicated session for the API refactor.',
      });
      expect(result.success).toBe(true);
    });

    it('parses with optional initialPrompt', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'atlas-002',
        repoPath: '/Users/operator/projects/frontend',
        initialPrompt: 'Please read HANDOFF.md and continue the component work.',
        rationale: 'Frontend session needed for the UI task.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initialPrompt).toBe(
          'Please read HANDOFF.md and continue the component work.',
        );
      }
    });
  });

  describe('negative parse', () => {
    it('rejects missing sessionName', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        repoPath: '/some/path',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing repoPath', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'sherpa-003',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rationale', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'sherpa-003',
        repoPath: '/some/path',
      });
      expect(result.success).toBe(false);
    });

    it('rejects wrong type literal', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'action',
        sessionName: 'sherpa-003',
        repoPath: '/some/path',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields (strict schema)', () => {
      const result = SpawnSessionOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'sherpa-003',
        repoPath: '/some/path',
        rationale: 'reason',
        unexpectedField: 'rejected by strict()',
      });
      expect(result.success).toBe(false);
    });
  });
});
