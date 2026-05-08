/**
 * probe-05 — AssignTaskOutputSchema Zod parse (MB-T11-A WB1 RED)
 *
 * RED: AssignTaskOutputSchema does not exist in schema.ts §14 yet.
 * GREEN: import succeeds; positive parse passes; negative tests fail as expected.
 */
import { describe, it, expect } from 'vitest';
import {
  AssignTaskOutputSchema,
} from '../../../src/v3/schema.js';

describe('AssignTaskOutputSchema', () => {
  describe('positive parse', () => {
    it('parses a minimal valid assign-task output (no parameters)', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-001',
        taskDescription: 'Implement the JWT authentication middleware.',
        rationale: 'Auth is the unblocking dependency for all session work.',
      });
      expect(result.success).toBe(true);
    });

    it('parses with optional parameters record', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'atlas-001',
        taskDescription: 'Write comprehensive tests for the payment service.',
        parameters: {
          target_coverage: '90%',
          deadline: '2026-05-10',
          priority: 'high',
        },
        rationale: 'Payment tests are a ship gate per MB-T07 acceptance.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters).toEqual({
          target_coverage: '90%',
          deadline: '2026-05-10',
          priority: 'high',
        });
      }
    });

    it('parses with parameters omitted — optional field, undefined when absent', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-002',
        taskDescription: 'Refactor the config loader.',
        rationale: 'Config loader is too tightly coupled.',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters).toBeUndefined();
      }
    });

    it('parameters values are z.unknown() — accepts mixed types', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-003',
        taskDescription: 'Deploy to staging.',
        parameters: {
          environment: 'staging',
          replicas: 3,
          debug: true,
          tags: ['v1', 'canary'],
        },
        rationale: 'Staging deploy before operator review.',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('negative parse', () => {
    it('rejects missing sessionName', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        taskDescription: 'do something',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing taskDescription', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-001',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing rationale', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-001',
        taskDescription: 'do something',
      });
      expect(result.success).toBe(false);
    });

    it('rejects wrong type literal', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task-action',
        sessionName: 'sherpa-001',
        taskDescription: 'do something',
        rationale: 'reason',
      });
      expect(result.success).toBe(false);
    });

    it('rejects extra unknown fields (strict schema)', () => {
      const result = AssignTaskOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'sherpa-001',
        taskDescription: 'do something',
        rationale: 'reason',
        build_doc_commit_sha: 'should not be here — not in MB-T11-A action variant schema',
      });
      expect(result.success).toBe(false);
    });
  });
});
