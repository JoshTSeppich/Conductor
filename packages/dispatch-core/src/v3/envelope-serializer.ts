// MB-T09 — envelope serializer (Q-MBT09-2=a operator arbitration:
// dispatch-core/v3 placement, sit next to schema).
//
// Serializes a SendPromptEnvelope into the operator-visible
// comment-line + prompt format per CONDUCTOR_V3_RESCOPE.md §3.4
// (lines 107-111 — verbatim format string):
//
//   # orchestrator: intent_id=<uuid> step=<n>/<total> — <summary>
//   <prompt>
//
// Pure function — no IO, no Electron, no fs. Reusable on the
// orchestrator side in MB-T11 (action tools) without re-importing
// from dispatch-workstation.

import type { SendPromptEnvelope } from './schema.js';

export function serializeEnvelope(
  envelope: SendPromptEnvelope,
  prompt: string,
): string {
  const header = `# orchestrator: intent_id=${envelope.intent_id} step=${envelope.step}/${envelope.total_steps} — ${envelope.intent_summary}`;
  return `${header}\n${prompt}`;
}
