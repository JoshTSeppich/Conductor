// MB-T16 WB1 — approval-policy IPC stub module.
//
// Main-process IPC controller + HTTP helpers for the per-session
// approval-policy GET/PUT routes (sess-mbt13 WB5, shipped). Per
// Q-MBT16-1..8 operator dispositions (decisions doc 2026-05-07).
// WB1 ships type signatures + Q-disposition comments; impls land at
// WB2 alongside their unit tests. Stubs throw with WB2-deferral
// messages to keep the RED state honest.
//
// Pattern mirrors src/main/audit-modal-ipc.ts (sess-mbt13 WB7) and
// src/main/session-kill-ipc.ts (sess-mbt11 WB3): module-level
// DAEMON_URL constant, readDaemonToken() helper, top-level pure-fn
// HTTP helpers (fetchSessionApprovalPolicy, putSessionApprovalPolicy),
// and a controller class that registers ipcMain.handle channels.
//
// Workstation main-process import discipline (MB-F-DISPATCH-CORE-DUAL-
// IMPORT-PATTERN-DRIFT — sess-mbt09 lesson): all dispatch-core imports
// use dispatch-core/dist/...js NOT dispatch-core/src/...js.

import type {
  ApprovalPolicy,
  ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';

/** Minimal shape of Electron's ipcMain that we depend on. Tests inject a
 *  fake; production passes the real `ipcMain` singleton. */
export interface ApprovalPolicyIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface ApprovalPolicyIpcOptions {
  /** Daemon base URL (e.g., 'http://localhost:7878'). Production reads
   *  from process.env.FOXWORKS_DAEMON_URL with default fallback. */
  readonly daemonUrl: string;
  /** Token reader. Production reads ~/.foxworks-dispatch/token via fs. */
  readonly readToken: () => string | null;
  /** Test seam: fetch implementation. Defaults to globalThis.fetch. */
  readonly fetchImpl?: typeof fetch;
}

/**
 * Pure-function HTTP helper for GET /v3/sessions/:name/approval-policy.
 * Returns the full GetResponse shape (session_name + approval_policy +
 * updated_at) so the picker can show no-row sentinel via updated_at===null
 * (Q-MBT16-8=a — defer to daemon authoritative answer).
 *
 * Behavior on errors:
 *   - No token: throws (caller treats as "policy unavailable" per Q-MBT16-2=a)
 *   - Non-2xx HTTP: throws with status code
 *   - Network error / parse fail: throws underlying Error
 *
 * Different from `approval-policy-resolver-shim.ts:fetchSessionApprovalPolicy`
 * which graceful-degrades to 'tight' for the resolver use case. The
 * picker UI needs explicit error states, NOT silent fallback.
 *
 * Exported for unit-test injection. WB2 implementation; WB1 stub throws.
 */
export async function fetchSessionApprovalPolicy(
  _sessionName: string,
  _baseUrl: string,
  _token: string | null,
  _fetchImpl: typeof fetch = fetch,
): Promise<ApprovalPolicyGetResponse> {
  throw new Error(
    'MB-T16 WB1 stub: fetchSessionApprovalPolicy implementation lands at WB2',
  );
}

/**
 * Pure-function HTTP helper for PUT /v3/sessions/:name/approval-policy.
 * Returns the GetResponse shape (server-assigned updated_at).
 *
 * Behavior on errors: same throw semantics as fetchSessionApprovalPolicy.
 * Caller (TileApprovalPicker) handles rollback per Q-MBT16-3=a.
 *
 * Exported for unit-test injection. WB2 implementation; WB1 stub throws.
 */
export async function putSessionApprovalPolicy(
  _sessionName: string,
  _policy: ApprovalPolicy,
  _baseUrl: string,
  _token: string | null,
  _fetchImpl: typeof fetch = fetch,
): Promise<ApprovalPolicyGetResponse> {
  throw new Error(
    'MB-T16 WB1 stub: putSessionApprovalPolicy implementation lands at WB2',
  );
}

/**
 * IPC controller registering two invoke channels:
 *   - 'workstation:approval-policy-get'
 *   - 'workstation:approval-policy-put'
 *
 * Each handler delegates to the pure-fn helpers above with deps from
 * ApprovalPolicyIpcOptions. WB2 wires the handlers; WB1 stub throws on
 * registerHandlers.
 */
export class ApprovalPolicyIpcController {
  constructor(_opts: ApprovalPolicyIpcOptions) {
    // WB1 no-op constructor; opts captured at WB2 impl.
  }

  registerHandlers(_ipcMain: ApprovalPolicyIpcMain): void {
    throw new Error(
      'MB-T16 WB1 stub: ApprovalPolicyIpcController.registerHandlers implementation lands at WB2',
    );
  }
}
