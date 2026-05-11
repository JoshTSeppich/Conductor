// MB-T-HSO-WIRE WB7 (green) — action-marker-router.
//
// Subscribes to a PTY broadcaster (MB-T37 IConsoleBroadcaster fan-out),
// filters `__orchestrator_active` chunks, accumulates a per-session string
// buffer, and invokes dispatchActionVariant for each complete
// `[ACTION:type]...[/ACTION]` block extracted from the buffer.
//
// Pattern B per WB1 spike binding (commit 3c9629b ADR §V):
//   - Per-session string buffer (Map<sessionName, string>).
//   - parseActionMarker(buf) called after each chunk append.
//   - On parse success: STRIP everything up to and including `[/ACTION]`
//     and re-invoke the parser; matches accumulate in a loop. WB1 spike
//     Concern (i) addressed — multi-marker bursts produce N dispatches
//     per burst, not a single late-marker-silent-leak.
//   - Buffer-size cap: omitted (MODELED — DEFER per WB1 ADR §V).
//   - Buffer cleanup on session end: not wired in WB7 (Q-WB7-3 = defer).
//
// Independent observer from MB-T40 pty-stream-relay: this router taps the
// same broadcaster fan-out via a SEPARATE addStdoutObserver subscription
// and maintains its OWN buffer with strip-and-re-parse semantics. The
// pty-stream-relay's renderer-IPC fast-path (whole-buffer-clear on first
// match) is left unchanged.
//
// Approval policy gate (Q-WB7-2 = Sub-Y-1 stub-fires): dispatchDeps.
// resolveApproval is constructed at the wiring site (main.ts) as an
// always-approve placeholder at WB7. WB9 GREEN swaps to the real MB-T13
// approval-policy-resolver-shim per ticket §4 WB9. Approval interception
// happens inside dispatchActionVariant (action-variant-ipc.ts:264-266
// and analogous in each variant branch) BEFORE each fire step.

import { parseActionMarker } from '../coarchitect/chat-content-markers.js';
import type { ParsedActionMarker } from '../coarchitect/chat-content-markers.js';
import type {
  ActionVariantDispatchDeps,
  ActionVariantDispatchResult,
} from './action-variant-ipc.js';

// ─────────────────────────────────────────────────────────────────────────────
// Dependency interfaces (structural; testable without Electron imports)
// ─────────────────────────────────────────────────────────────────────────────

export interface IConsoleBroadcaster {
  addStdoutObserver(
    fn: (sessionName: string, chunk: string) => void,
  ): () => void;
}

export type DispatchFn = (
  parsed: ParsedActionMarker,
  deps: ActionVariantDispatchDeps,
) => Promise<ActionVariantDispatchResult>;

export interface ActionMarkerRouterDeps {
  broadcaster: IConsoleBroadcaster;
  dispatch: DispatchFn;
  dispatchDeps: ActionVariantDispatchDeps;
  onError: (message: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ORCHESTRATOR_SESSION_NAME = '__orchestrator_active';
const ACTION_CLOSER = '[/ACTION]';

// ─────────────────────────────────────────────────────────────────────────────
// registerActionMarkerRouter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register the action-marker router on the given PTY broadcaster.
 * Returns a cleanup function that disposes the observer and clears buffers.
 */
export function registerActionMarkerRouter(
  deps: ActionMarkerRouterDeps,
): () => void {
  const { broadcaster, dispatch, dispatchDeps, onError } = deps;

  // Per-session buffer keyed by sessionName. WB7 only consumes
  // __orchestrator_active per Condition (1), so this Map effectively has at
  // most one entry; the per-session shape is required by WB1 ADR §V for
  // future fan-out into additional sessions through this observer.
  const buffers = new Map<string, string>();

  const disposeObserver = broadcaster.addStdoutObserver(
    (sessionName, chunk) => {
      // Condition (1): __orchestrator_active filter (mirrors pty-stream-
      // relay.ts:47-48 filter shape).
      if (sessionName !== ORCHESTRATOR_SESSION_NAME) return;

      // Pattern B: append-then-parse against the per-session buffer.
      let buf = (buffers.get(sessionName) ?? '') + chunk;

      // Strip-and-re-parse loop (WB1 spike Concern (i)): consume every
      // complete `[ACTION:...][/ACTION]` block currently in the buffer.
      const matches: ParsedActionMarker[] = [];
      let parsed = parseActionMarker(buf);
      while (parsed !== null) {
        matches.push(parsed);
        const closerIdx = buf.indexOf(ACTION_CLOSER);
        // Defensive: parseActionMarker returns non-null only when a closer
        // is present in the buffer, so closerIdx >= 0 is guaranteed. The
        // check below is paranoia against future parser regressions.
        if (closerIdx < 0) break;
        buf = buf.slice(closerIdx + ACTION_CLOSER.length);
        parsed = parseActionMarker(buf);
      }

      // Persist remaining (post-all-strips) buffer for the next chunk.
      buffers.set(sessionName, buf);

      if (matches.length === 0) return;

      // Async-IIFE dispatch: broadcaster's caller (PTY chunk producer) is
      // synchronous; we don't block PTY forwarding on dispatch latency.
      // Sequential `await` inside the IIFE preserves action ordering within
      // a single chunk's burst.
      void (async () => {
        for (const m of matches) {
          try {
            const result = await dispatch(m, dispatchDeps);
            if (result.kind === 'error') {
              onError(result.message);
            }
            // kind:'fired' and kind:'pending-approval' are non-error
            // outcomes; ACTION_VARIANT_FIRED_EVENT emission lives inside
            // dispatchActionVariant (action-variant-ipc.ts:271 etc.) and
            // is consumed by swarm-state-writer via its constructor
            // subscription chain.
          } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
          }
        }
      })();
    },
  );

  return () => {
    disposeObserver();
    buffers.clear();
  };
}
