// MB-T16 WB2 — approval-policy IPC controller + HTTP helpers.
//
// Main-process IPC controller for the per-session approval-policy
// GET/PUT routes (sess-mbt13 WB5, shipped at
// `packages/dispatch-daemon/src/routes/v3/sessions/approval-policy.ts`).
// Per Q-MBT16-1..8 operator dispositions
// (`docs/coordination/mb-t16-decisions-2026-05-07.md`).
//
// Pattern mirrors `src/main/audit-modal-ipc.ts` (sess-mbt13 WB7) and
// `src/main/session-kill-ipc.ts` (sess-mbt11 WB3): module-level
// DAEMON_URL constant, readDaemonToken() helper, top-level pure-fn
// HTTP helpers exported with `fetchImpl` test seam, controller class
// with DI-injectable options.
//
// Different from `src/main/approval-policy-resolver-shim.ts` (which
// graceful-degrades to 'tight' for the v3.5 dispatchActionVariant
// resolver use case). The picker UI needs explicit error states so
// the operator sees "policy unavailable" rather than a misleading
// "tight" — these helpers throw on any error path; caller (renderer
// TileApprovalPicker per Q-MBT16-2=a) renders disabled state on throw.
//
// Workstation main-process import discipline (MB-F-DISPATCH-CORE-DUAL-
// IMPORT-PATTERN-DRIFT — sess-mbt09 lesson): all dispatch-core imports
// use dispatch-core/dist/...js NOT dispatch-core/src/...js.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ApprovalPolicyEnum,
  ApprovalPolicyGetResponseSchema,
  type ApprovalPolicy,
  type ApprovalPolicyGetResponse,
} from 'dispatch-core/dist/v3/schema.js';

const DAEMON_URL =
  process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

function readDaemonToken(): string | null {
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    return readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return null;
  }
}

/** Minimal shape of Electron's ipcMain that we depend on. Tests inject a
 *  fake; production passes the real `ipcMain` singleton. */
export interface ApprovalPolicyIpcMain {
  handle: (
    channel: string,
    fn: (event: unknown, ...args: unknown[]) => Promise<unknown> | unknown,
  ) => void;
}

export interface ApprovalPolicyIpcOptions {
  /** Daemon base URL (e.g., 'http://localhost:7878'). */
  readonly daemonUrl: string;
  /** Token reader. Called per request — token can rotate. */
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
 * Throws on:
 *   - missing token (caller treats as "policy unavailable")
 *   - non-2xx HTTP status
 *   - response JSON shape drift (Zod parse failure)
 *   - network error / fetch reject
 *
 * Different from `approval-policy-resolver-shim.ts:fetchSessionApprovalPolicy`
 * which graceful-degrades to 'tight' for the resolver use case.
 *
 * Exported for unit-test injection.
 */
export async function fetchSessionApprovalPolicy(
  sessionName: string,
  baseUrl: string,
  token: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<ApprovalPolicyGetResponse> {
  if (!token) {
    throw new Error('daemon token unavailable');
  }
  const url = `${baseUrl}/v3/sessions/${encodeURIComponent(sessionName)}/approval-policy`;
  const res = await fetchImpl(url, {
    headers: { 'X-Conductor-Token': token },
  });
  if (!res.ok) {
    throw new Error(`daemon returned ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as unknown;
  const parsed = ApprovalPolicyGetResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`daemon GET response shape invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Pure-function HTTP helper for PUT /v3/sessions/:name/approval-policy.
 * Returns the GetResponse shape (server-assigned updated_at).
 *
 * Throws on same conditions as fetchSessionApprovalPolicy. Caller
 * (TileApprovalPicker) handles rollback per Q-MBT16-3=a (optimistic
 * UI + silent rollback + tooltip on error).
 *
 * Exported for unit-test injection.
 */
export async function putSessionApprovalPolicy(
  sessionName: string,
  policy: ApprovalPolicy,
  baseUrl: string,
  token: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<ApprovalPolicyGetResponse> {
  if (!token) {
    throw new Error('daemon token unavailable');
  }
  const url = `${baseUrl}/v3/sessions/${encodeURIComponent(sessionName)}/approval-policy`;
  const res = await fetchImpl(url, {
    method: 'PUT',
    headers: {
      'X-Conductor-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ approval_policy: policy }),
  });
  if (!res.ok) {
    throw new Error(`daemon returned ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as unknown;
  const parsed = ApprovalPolicyGetResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`daemon PUT response shape invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * IPC controller registering two invoke channels:
 *   - 'workstation:approval-policy-get'  invoked with { sessionName }
 *   - 'workstation:approval-policy-put'  invoked with { sessionName, policy }
 *
 * Each handler validates the payload (throws on missing sessionName or
 * invalid policy enum), then delegates to the pure-fn helpers above
 * with the controller's daemon-URL + token-reader + fetch deps.
 */
export class ApprovalPolicyIpcController {
  private readonly opts: ApprovalPolicyIpcOptions;

  constructor(opts: ApprovalPolicyIpcOptions) {
    this.opts = opts;
  }

  registerHandlers(ipcMain: ApprovalPolicyIpcMain): void {
    ipcMain.handle(
      'workstation:approval-policy-get',
      async (_event, ...args) => {
        const payload = args[0];
        const sessionName =
          payload !== null && typeof payload === 'object'
            ? (payload as Record<string, unknown>)['sessionName']
            : undefined;
        if (typeof sessionName !== 'string' || sessionName.length === 0) {
          throw new Error(
            "workstation:approval-policy-get requires { sessionName: string }",
          );
        }
        return fetchSessionApprovalPolicy(
          sessionName,
          this.opts.daemonUrl,
          this.opts.readToken(),
          this.opts.fetchImpl,
        );
      },
    );

    ipcMain.handle(
      'workstation:approval-policy-put',
      async (_event, ...args) => {
        const payload = args[0];
        if (payload === null || typeof payload !== 'object') {
          throw new Error(
            "workstation:approval-policy-put requires { sessionName: string, policy: 'tight'|'medium'|'loose' }",
          );
        }
        const r = payload as Record<string, unknown>;
        const sessionName = r['sessionName'];
        const policy = r['policy'];
        if (typeof sessionName !== 'string' || sessionName.length === 0) {
          throw new Error(
            'workstation:approval-policy-put requires non-empty sessionName',
          );
        }
        const policyParse = ApprovalPolicyEnum.safeParse(policy);
        if (!policyParse.success) {
          throw new Error(
            `workstation:approval-policy-put invalid policy: ${policyParse.error.message}`,
          );
        }
        return putSessionApprovalPolicy(
          sessionName,
          policyParse.data,
          this.opts.daemonUrl,
          this.opts.readToken(),
          this.opts.fetchImpl,
        );
      },
    );
  }
}

/**
 * Production factory. main.ts (WB4) calls this to construct the
 * controller with default deps (DAEMON_URL env var + fs-token-read).
 */
export function createDefaultApprovalPolicyIpcController(): ApprovalPolicyIpcController {
  return new ApprovalPolicyIpcController({
    daemonUrl: DAEMON_URL,
    readToken: readDaemonToken,
  });
}
