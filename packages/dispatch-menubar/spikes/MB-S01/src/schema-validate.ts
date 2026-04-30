// SPIKE: MB-S01 output validator. Runs the proposed Zod schema (spike copy
// in dispatch-core/spikes/MB-S01/proposed-output-schema.ts) against an
// already-JSON-parsed Sonnet response. Returns ok/error/type discriminator.

import { OrchestratorOutputSchema } from "../../../../dispatch-core/spikes/MB-S01/proposed-output-schema.ts";

export interface ValidateResult {
  ok: boolean;
  error: string | null;
  type: string | null;
}

export function validateOutput(parsed: unknown): ValidateResult {
  const r = OrchestratorOutputSchema.safeParse(parsed);
  if (r.success) {
    return { ok: true, error: null, type: (r.data as { type: string }).type };
  }
  const summary = r.error.issues
    .map((i) => `${i.path.join(".") || "<root>"}: ${i.code} (${i.message})`)
    .join("; ");
  return { ok: false, error: summary, type: null };
}
