// MB-T11 WB5 — orchestrator-action-handler dispatcher.
//
// Consumes an OrchestratorOutput (action variant or operator-approved card
// variant), validates the payload via the v3 §12 per-action sub-schema,
// consults the approval-policy resolver, and routes the action to the
// correct downstream surface:
//
//   action / card  →  payload validated → resolver decision →
//     'send'              → workstation:session-send-prompt IPC (MB-T09)
//     'spawn-new-session' → workstation:spawn-requested IPC     (MB-T05)
//     'kill'              → workstation:session-kill IPC        (MB-T11 WB3)
//     'pull'              → GET /v2/sessions/:name/handoff      (existing v2 route)
//     'assign-task'       → autopilot-loop.startIntent          (MB-T11 WB6)
//
// Convention (per WB5 design choice 2026-05-06):
//   - `action.target` (v3 schema §3) is the canonical session name source
//     for ALL five MB-T11 action types. Payload's `sessionName` field
//     (where present) is redundant; the handler reads `action.target`.
//   - For 'spawn-new-session', `action.target` is the name of the new
//     session being created.
//
// Dep-injection seam: every downstream IPC / HTTP / autopilot call is
// expressed as a narrow function dep on DispatchActionDeps. Default
// production wiring lives at the bottom of this module
// (defaultDispatchActionDeps); unit tests inject vi.fn() stubs.
//
// Approval-required path: when the resolver decides approvalRequired:true
// for an `action` (fires-without-card) variant, dispatchAction returns
// {kind:'pending-approval'} WITHOUT firing. The caller (coarchitect-ipc.ts
// integration in WB7) is responsible for emitting an orchestrator-card
// envelope so the operator can approve/decline.
//
// Card-approved path: when the input is a CardOutput (i.e., the card was
// already approved by the operator via card:approved IPC), dispatchAction
// SKIPS the resolver and fires directly. The operator's approval is the
// authority signal.
//
// Import-path discipline (per MB-F-DISPATCH-CORE-DUAL-IMPORT-PATTERN-DRIFT):
// dispatch-core symbols ALWAYS imported from `dispatch-core/dist/...js`.

import type {
  ActionOutput,
  CardOutput,
  ActionType,
  SendPromptActionPayload,
  SpawnSessionActionPayload,
  KillSessionActionPayload,
  PullHandoffActionPayload,
  AssignTaskActionPayload,
} from 'dispatch-core/dist/v3/schema.js';
import {
  assertActionPayload,
  isMBT11ActionType,
  type MBT11ActionType,
} from './orchestrator-action-types.js';
import {
  resolveApprovalShim,
  type ShimResolverInput,
  type ShimResolverResult,
} from './approval-policy-resolver-shim.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input to dispatchAction. The caller (coarchitect-ipc.ts integration in WB7)
 * passes either an ActionOutput (orchestrator-fired-without-card per
 * cairn-Sonnet §2.7) or a CardOutput (operator-approved via card:approved).
 *
 * The discriminator on `output_or_action.type`:
 *   - 'action' → consult resolver before firing.
 *   - 'card'   → fire directly (operator already approved).
 */
export interface DispatchInput {
  /**
   * The orchestrator-emitted action OR the operator-approved card.
   * Both carry `action: ActionTypeEnum`, `target: string` (session name),
   * and `payload?: unknown` (validated against pickPayloadSchema).
   */
  output: ActionOutput | CardOutput;
  /** The chat-turn trigger event (operator's prompt) for audit context. */
  triggerEvent: string;
  /** Active build-doc id for audit context. */
  buildDocId: string;
}

/** Outcome of a single dispatchAction call. */
export type DispatchActionResult =
  | {
      kind: 'fired';
      actionType: MBT11ActionType;
      sessionName: string;
      /** Populated only for 'assign-task' (autopilot.startIntent return). */
      intent_id?: string;
    }
  | {
      kind: 'pending-approval';
      actionType: MBT11ActionType;
      sessionName: string;
      reason: string;
    }
  | {
      kind: 'error';
      reason: string;
      actionType?: ActionType;
      sessionName?: string;
    };

/**
 * Spawn-IPC dep return shape. Mirrors MB-T05 SpawnSessionResult sans the
 * panelMounted bookkeeping (action-handler does not need it).
 */
export interface SpawnIpcResult {
  sessionName: string;
}

/** Pull-handoff HTTP dep response. Mirrors handoff.ts:91 PullHandoffResponse. */
export interface PullHandoffResult {
  content: string;
  written_at: string;
  archived_to: string;
}

/** Autopilot startIntent dep return. WB6 will wire this to autopilot-loop. */
export interface AutopilotStartIntentResult {
  intent_id: string;
}

/**
 * Dependency surface — every downstream call is a narrow injectable
 * function. Default production wiring at defaultDispatchActionDeps below.
 */
export interface DispatchActionDeps {
  /**
   * Resolver. Defaults to resolveApprovalShim — a thin wrapper around the
   * real `resolveApproval` (sess-mbt13) that fetches the per-session policy
   * via daemon HTTP. Async because of the fetch; underlying resolver is
   * pure. Call-site rewrite that drops the shim is tracked at
   * MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE.
   */
  resolveApproval: (input: ShimResolverInput) => Promise<ShimResolverResult>;

  /**
   * Send-prompt fire (MB-T09 IPC). The handler invokes this with
   * sessionName + the validated SendPromptActionPayload.
   */
  fireSendPrompt: (
    sessionName: string,
    payload: SendPromptActionPayload,
  ) => Promise<void>;

  /**
   * Spawn-session fire (MB-T05 spawn pipeline). The handler invokes this
   * with the validated SpawnSessionActionPayload.
   */
  fireSpawn: (payload: SpawnSessionActionPayload) => Promise<SpawnIpcResult>;

  /**
   * Kill-session fire (MB-T11 WB3 IPC). The handler invokes this with
   * sessionName + the validated KillSessionActionPayload.
   */
  fireKill: (
    sessionName: string,
    payload: KillSessionActionPayload,
  ) => Promise<void>;

  /**
   * Pull-handoff HTTP fire — GET /v2/sessions/:name/handoff. The handler
   * invokes this with sessionName from action.target. Returns the
   * handoff content + archive metadata so the caller can surface it
   * back into the orchestrator's chat context.
   */
  firePullHandoff: (sessionName: string) => Promise<PullHandoffResult>;

  /**
   * Autopilot startIntent (MB-T11 WB6). The handler invokes this with the
   * validated AssignTaskActionPayload. Autopilot returns the new intent_id
   * for subsequent send-prompt envelope tracking.
   */
  startIntent: (
    payload: AssignTaskActionPayload,
  ) => Promise<AutopilotStartIntentResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core dispatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch an orchestrator action or operator-approved card to its
 * downstream surface. Single entry point consumed by the WB7 coarchitect-
 * ipc integration (action-fire-without-card route) and by the card-ipc
 * card:approved → action-fire path (also wired in WB7).
 */
export async function dispatchAction(
  input: DispatchInput,
  deps: DispatchActionDeps,
): Promise<DispatchActionResult> {
  const { output } = input;
  const actionType = output.action;

  // Filter to MB-T11 action types only — legacy 'pause' / 'hold' / 'arm' /
  // 'read-file' enum members are not in v3.0 MB-T11 scope.
  if (!isMBT11ActionType(actionType)) {
    return {
      kind: 'error',
      reason: `unsupported action type for MB-T11 dispatch: ${actionType}`,
      actionType,
    };
  }

  // Second-pass payload validation per Q-MBT11-1=a.
  let typedPayload: unknown;
  try {
    typedPayload = assertActionPayload(actionType, output.payload);
  } catch (e) {
    return {
      kind: 'error',
      reason: e instanceof Error ? e.message : String(e),
      actionType,
    };
  }

  const sessionName = output.target;

  // Approval gate. For 'card' inputs (operator-approved already), skip the
  // resolver — the operator's approval is the authority signal. For 'action'
  // inputs (fires-without-card), consult the resolver.
  if (output.type === 'action') {
    const resolverResult = await deps.resolveApproval({
      actionType,
      sessionName,
      // Predicate-computation seam lives at the call-site rewrite tracked
      // at MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE; the shim graceful-
      // degrades to no predicates and the real resolver yields the most-
      // permissive correct answer under medium (R3 contract).
    });
    if (resolverResult.approvalRequired) {
      return {
        kind: 'pending-approval',
        actionType,
        sessionName,
        reason: resolverResult.reason,
      };
    }
  }

  // Approved (or operator-approved card): route to the right surface.
  try {
    switch (actionType) {
      case 'send': {
        const p = typedPayload as SendPromptActionPayload;
        await deps.fireSendPrompt(sessionName, p);
        return { kind: 'fired', actionType, sessionName };
      }
      case 'spawn-new-session': {
        const p = typedPayload as SpawnSessionActionPayload;
        const result = await deps.fireSpawn(p);
        // Handler returns the spawned session name for caller integration.
        // For consistency, normalize to action.target if they match;
        // otherwise prefer the spawn IPC's authoritative reply name.
        return {
          kind: 'fired',
          actionType,
          sessionName: result.sessionName,
        };
      }
      case 'kill': {
        const p = typedPayload as KillSessionActionPayload;
        await deps.fireKill(sessionName, p);
        return { kind: 'fired', actionType, sessionName };
      }
      case 'pull': {
        // PullHandoffActionPayload exists for symmetry but carries no
        // additional fields beyond sessionName, which we already have
        // from action.target. Validation already happened above.
        await deps.firePullHandoff(sessionName);
        return { kind: 'fired', actionType, sessionName };
      }
      case 'assign-task': {
        const p = typedPayload as AssignTaskActionPayload;
        const result = await deps.startIntent(p);
        return {
          kind: 'fired',
          actionType,
          sessionName,
          intent_id: result.intent_id,
        };
      }
      default: {
        // Exhaustiveness check — isMBT11ActionType filtered above.
        const _exhaustive: never = actionType;
        void _exhaustive;
        return {
          kind: 'error',
          reason: `unhandled action type in dispatchAction switch: ${actionType as string}`,
        };
      }
    }
  } catch (e) {
    return {
      kind: 'error',
      reason: e instanceof Error ? e.message : String(e),
      actionType,
      sessionName,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default deps wiring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configure default deps. Intended to be invoked from coarchitect-ipc.ts
 * (WB7) at registration time. Each downstream dep is wired through a
 * narrow factory the caller supplies — this keeps the handler decoupled
 * from Electron and HTTP concerns at module-load time.
 *
 * v3.0 default: resolver = resolveApprovalShim (real resolver wrapped with
 * daemon-fetch of per-session policy). The other deps are caller-supplied
 * because they require Electron's ipcMain (not always available at unit-
 * test time) or HTTP runtime (daemon token, fetch).
 */
export function defaultDispatchActionDeps(
  overrides: Partial<DispatchActionDeps> & {
    fireSendPrompt: DispatchActionDeps['fireSendPrompt'];
    fireSpawn: DispatchActionDeps['fireSpawn'];
    fireKill: DispatchActionDeps['fireKill'];
    firePullHandoff: DispatchActionDeps['firePullHandoff'];
    startIntent: DispatchActionDeps['startIntent'];
  },
): DispatchActionDeps {
  return {
    resolveApproval: overrides.resolveApproval ?? resolveApprovalShim,
    fireSendPrompt: overrides.fireSendPrompt,
    fireSpawn: overrides.fireSpawn,
    fireKill: overrides.fireKill,
    firePullHandoff: overrides.firePullHandoff,
    startIntent: overrides.startIntent,
  };
}
