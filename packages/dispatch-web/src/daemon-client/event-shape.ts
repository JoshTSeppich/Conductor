// Contract §5.2 event envelope shape. Runtime validation via the
// operator-published v2 Zod schema (EventV2 in packages/dispatch-core/
// src/v2/schema.ts) happens at the ingress boundary where events
// arrive; internal handoffs use this TS interface for type flow.
export interface EventShape {
  type: string;
  timestamp: string;
  session: string;
  data: Record<string, unknown>;
}
