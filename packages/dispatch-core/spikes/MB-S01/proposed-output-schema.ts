// SPIKE: pending P-0.3 commit; not the freeze anchor.
//
// Spike-only Zod schema for the v3 orchestrator output discriminated union,
// authored under MB-S01 to validate Sonnet 4.6's structured-output discipline
// (cairn-Sonnet primitive §2.5) against representative scenarios. The freeze
// anchor for v3 schema is `packages/dispatch-core/src/v3/schema.ts`,
// operator-authored under P-0.3 commit per WORKSTATION_CONTRACT.md §2.
// This file is throwaway evidence; production code MUST NOT import from here.
//
// Action enumeration: vision §7.5 ratifies eight action types for v3.0
// (`spawn-new-session`, `send`, `pull`, `kill`, `pause`, `hold`, `arm`,
// `read-file`). The v3.x deferral mentions `draft-commit-message`
// (WORKSTATION_CONTRACT.md §3.3 + §3.5). MB-S01 validation target #5
// requires self-check generation evidence per ratified P-0.3 Q5 in advance
// of v3.x; this spike's `ActionTypeSchema` therefore extends the v3.0 set
// with `draft-commit-message` so self-check scenario outputs schema-validate
// inside the spike. The freeze anchor will NOT include
// `draft-commit-message` until a v3.x contract amendment.

import { z } from "zod";

export const ActionTypeSchema = z.enum([
  "spawn-new-session",
  "send",
  "pull",
  "kill",
  "pause",
  "hold",
  "arm",
  "read-file",
  "draft-commit-message",
]);

const PayloadSchema = z
  .union([z.string(), z.record(z.string(), z.unknown())])
  .optional();

export const ActionOutputSchema = z
  .object({
    type: z.literal("action"),
    action: ActionTypeSchema,
    target: z.string().min(1),
    payload: PayloadSchema,
    rationale: z.string().min(1),
  })
  .strict();

export const CardOutputSchema = z
  .object({
    type: z.literal("card"),
    action: ActionTypeSchema,
    target: z.string().min(1),
    payload: PayloadSchema,
    rationale: z.string().min(1),
    free_form_prompt: z.string().optional(),
    superseded_card_ids: z.array(z.string()).optional(),
  })
  .strict();

export const MultiChoiceCardOutputSchema = z
  .object({
    type: z.literal("multi-choice-card"),
    question: z.string().min(1),
    options: z
      .array(
        z
          .object({
            label: z.string().min(1),
            value: z.string().min(1),
          })
          .strict(),
      )
      .min(2)
      .max(4),
    context: z.string().min(1),
  })
  .strict();

export const EscapeBlockOutputSchema = z
  .object({
    type: z.literal("escape-block"),
    build_doc_path: z.string().min(1),
    build_doc_commit_sha: z.string().min(1),
    triggering_event: z.string().min(1),
    what_i_tried: z.string().min(1),
    where_im_stuck: z.string().min(1),
    build_doc_sections_consulted: z.array(z.string()),
  })
  .strict();

export const OrchestratorOutputSchema = z.discriminatedUnion("type", [
  ActionOutputSchema,
  CardOutputSchema,
  MultiChoiceCardOutputSchema,
  EscapeBlockOutputSchema,
]);

export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;
export type ActionOutput = z.infer<typeof ActionOutputSchema>;
export type CardOutput = z.infer<typeof CardOutputSchema>;
export type MultiChoiceCardOutput = z.infer<typeof MultiChoiceCardOutputSchema>;
export type EscapeBlockOutput = z.infer<typeof EscapeBlockOutputSchema>;
