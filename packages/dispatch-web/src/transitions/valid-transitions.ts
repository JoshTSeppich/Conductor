import type { State } from 'dispatch-core/src/v2/schema.js';

// State machine per CONDUCTOR_API_CONTRACT.md §6.1.
//   armed  → paused | held | killed
//   paused → armed | killed
//   held   → armed | killed
//   killed → (terminal; re-init via POST /v2/sessions)
//
// Pattern note: Session A has validateTransition in their daemon
// transitions.ts; this is dispatch-web's parallel client-side
// awareness for UI button enable/disable. Cross-package lift to
// dispatch-core is operator/Session A territory — NOT preemptively
// lifted here per scope fence + W-3 finding direction.
export const VALID_TRANSITIONS: Record<State, ReadonlyArray<State>> = {
  armed: ['paused', 'held', 'killed'],
  paused: ['armed', 'killed'],
  held: ['armed', 'killed'],
  killed: [],
};

export function canTransition(from: State, to: State): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
