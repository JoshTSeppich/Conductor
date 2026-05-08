/**
 * probe-06 — OrchestratorOutputSchema discriminated union (MB-T11-A WB1 RED)
 *
 * RED: SendPromptToSessionOutputSchema et al. do not exist in schema.ts §14 yet.
 * The import of these symbols will fail → all tests in this file fail.
 * GREEN: union accepts all 9 variants; type narrowing works per discriminator.
 */
import { describe, it, expect } from 'vitest';
import {
  OrchestratorOutputSchema,
  SendPromptToSessionOutputSchema,
  SpawnSessionOutputSchema,
  KillSessionOutputSchema,
  PullHandoffFromSessionOutputSchema,
  AssignTaskOutputSchema,
} from '../../../src/v3/schema.js';

describe('OrchestratorOutputSchema — extended discriminated union', () => {
  describe('existing variants still parse (non-regression)', () => {
    it('parses type:action variant', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'action',
        action: 'send',
        target: 'sherpa-001',
        rationale: 'triggering event',
        build_doc_commit_sha: 'abc123',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:card variant', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'card',
        action: 'send',
        target: 'sherpa-001',
        rationale: 'triggering event',
        free_form_prompt: 'please approve',
        superseded_card_ids: [],
        build_doc_commit_sha: 'abc123',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:multi-choice-card variant', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'multi-choice-card',
        question: 'Which session?',
        options: ['A', 'B'],
        rationale: 'Two candidates',
        build_doc_commit_sha: 'abc123',
        superseded_card_ids: [],
      });
      expect(result.success).toBe(true);
    });

    it('parses type:escape-block variant', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'escape-block',
        build_doc_path: 'BUILD.md',
        build_doc_commit_sha: 'abc123',
        triggering_event: 'unknown session state',
        what_i_tried: 'Checked all sessions',
        where_im_stuck: 'Cannot determine next action',
        build_doc_sections_consulted: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('new action variant members parse via union', () => {
    it('parses type:send-prompt-to-session via OrchestratorOutputSchema', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'send-prompt-to-session',
        sessionName: 'sherpa-001',
        prompt: 'Continue the auth implementation.',
        rationale: 'Auth is the next unblocking action.',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:spawn-session via OrchestratorOutputSchema', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'spawn-session',
        sessionName: 'sherpa-003',
        repoPath: '/Users/op/repo',
        rationale: 'New task requires dedicated session.',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:kill-session via OrchestratorOutputSchema', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'kill-session',
        sessionName: 'sherpa-001',
        rationale: 'Task complete.',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:pull-handoff-from-session via OrchestratorOutputSchema', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'pull-handoff-from-session',
        sessionName: 'sherpa-001',
        rationale: 'Context refresh before next action.',
      });
      expect(result.success).toBe(true);
    });

    it('parses type:assign-task via OrchestratorOutputSchema', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'assign-task',
        sessionName: 'atlas-001',
        taskDescription: 'Implement the payment module.',
        rationale: 'Payment module is the next milestone.',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('discriminated union rejects invalid types', () => {
    it('rejects an unknown type value', () => {
      const result = OrchestratorOutputSchema.safeParse({
        type: 'unknown-type',
        sessionName: 'sherpa-001',
        rationale: 'n/a',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing type field', () => {
      const result = OrchestratorOutputSchema.safeParse({
        sessionName: 'sherpa-001',
        rationale: 'n/a',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('type narrowing via discriminator field', () => {
    it('narrows to SendPromptToSessionOutput on type:send-prompt-to-session', () => {
      const raw = {
        type: 'send-prompt-to-session' as const,
        sessionName: 'sherpa-001',
        prompt: 'Continue.',
        rationale: 'reason',
      };
      const result = OrchestratorOutputSchema.safeParse(raw);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'send-prompt-to-session') {
        // TypeScript type narrowing: these fields must be accessible
        expect(result.data.sessionName).toBe('sherpa-001');
        expect(result.data.prompt).toBe('Continue.');
      }
    });

    it('narrows to AssignTaskOutput on type:assign-task', () => {
      const raw = {
        type: 'assign-task' as const,
        sessionName: 'atlas-001',
        taskDescription: 'Build the login page.',
        rationale: 'reason',
      };
      const result = OrchestratorOutputSchema.safeParse(raw);
      expect(result.success).toBe(true);
      if (result.success && result.data.type === 'assign-task') {
        expect(result.data.taskDescription).toBe('Build the login page.');
      }
    });
  });
});
