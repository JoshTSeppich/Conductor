// MB-F-MB-T07-ORCHESTRATOR-CARD-EMITTER — pure variant-routing helper.
//
// Consumes the full streamed orchestrator response (after the for-await
// loop in coarchitect-ipc.ts:sendAndStream completes) and returns a
// RouteDecision describing how the shell should surface the output.
// Pure function (no Electron import); fully unit-testable.
//
// Schema variants per OrchestratorOutputSchema discriminated union in
// dispatch-core/src/v3/schema.ts:238-244:
//   - 'card' / 'multi-choice-card' → emit orchestrator-card-rendered to
//     the webview + populate cardContextCache.
//   - 'escape-block' → keep in chat (chunks already streamed by the
//     for-await loop; no card surface).
//   - 'action' → fire-without-card per cairn-Sonnet §2.7. Action
//     execution wiring is deferred to MB-T11; F5 only routes the
//     decision.
//   - non-JSON or non-OrchestratorOutput JSON → text-passthrough
//     (chunks already streamed; no extra surface).

import {
  OrchestratorOutputSchema,
  type ActionOutput,
  type EscapeBlockOutput,
  type CardOutput,
  type MultiChoiceCardOutput,
} from 'dispatch-core/dist/v3/schema.js';
import type { CardContext } from './card-ipc.js';

export type RouteDecision =
  | { kind: 'text-passthrough' }
  | {
      kind: 'card-or-multi-choice';
      cardId: string;
      context: CardContext;
      payload: { card_id: string; output: CardOutput | MultiChoiceCardOutput };
    }
  | { kind: 'escape-block'; output: EscapeBlockOutput }
  | { kind: 'action-fire-without-card'; output: ActionOutput };

export interface RouteContext {
  /** User prompt that triggered this stream cycle (becomes CardContext.trigger_event). */
  triggerEvent: string;
  /** Identifier for the active build doc (becomes CardContext.build_doc_id). */
  buildDocId: string;
  /** Generator for shell-minted card_id. Production: `() => crypto.randomUUID()`. */
  uuidGen: () => string;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```json') && trimmed.endsWith('```')) {
    return trimmed.slice(7, -3).trim();
  }
  if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    return trimmed.slice(3, -3).trim();
  }
  return trimmed;
}

export function routeOrchestratorOutput(
  fullResponse: string,
  ctx: RouteContext,
): RouteDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(fullResponse));
  } catch {
    return { kind: 'text-passthrough' };
  }
  const result = OrchestratorOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { kind: 'text-passthrough' };
  }
  const output = result.data;
  if (output.type === 'card' || output.type === 'multi-choice-card') {
    const cardId = ctx.uuidGen();
    const context: CardContext = {
      card_id: cardId,
      trigger_event: ctx.triggerEvent,
      build_doc_id: ctx.buildDocId,
      build_doc_commit_sha: output.build_doc_commit_sha,
      output_type: output.type,
      output_payload: output,
      superseded_card_ids: output.superseded_card_ids,
    };
    return {
      kind: 'card-or-multi-choice',
      cardId,
      context,
      payload: { card_id: cardId, output },
    };
  }
  if (output.type === 'escape-block') {
    return { kind: 'escape-block', output };
  }
  // Remaining variant: 'action'.
  return { kind: 'action-fire-without-card', output };
}
