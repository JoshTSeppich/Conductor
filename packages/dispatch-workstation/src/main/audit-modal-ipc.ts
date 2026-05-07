// MB-T13 WB7: workstation:audit-modal-fetch IPC handler + dep-injected
// controller seam.
//
// Handles the operator-facing "Show recent orchestrator actions" menu
// item per CONDUCTOR_V3_RESCOPE.md §3.8 + Phase 2 brief WB7. Fetches
// last-100 swarm-audit rows from daemon GET /v3/audit/swarm-audit per
// Q-MBT13-9=a (single-page modal at v3.0; rich pagination deferred to
// v3.1 followup MB-F-T13-AUDIT-MODAL-FILTERS).
//
// Pattern mirrors session-send-prompt-ipc.ts: dep-injected controller
// with a fetchSwarmAudit seam for unit tests; default deps wire a
// production fetch helper that reads the daemon token + base URL.
//
// Result shape uses a LOCAL discriminated union (NOT WorkstationError —
// "daemon-unreachable" is a network condition, not a workstation-domain
// error class; the WorkstationErrorSchema discriminated union at
// schema.ts §8 is operator-frozen surface and not extensible from
// sess-mbt13 territory per coordination doc Rule 2). The local shape
// captures the same information without forcing a §8 amendment.
//
// Workstation main-process import discipline (MB-F-DISPATCH-CORE-DUAL-
// IMPORT-PATTERN-DRIFT — sess-mbt09 lesson): all dispatch-core imports
// use dispatch-core/dist/...js NOT dispatch-core/src/...js. The latter
// typechecks but fails at Node ESM runtime.

import { ipcMain } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  OrchestratorSwarmAuditQueryResponseSchema,
  type OrchestratorSwarmAuditQueryResponse,
  type OrchestratorSwarmAuditRow,
} from 'dispatch-core/dist/v3/schema.js';

const DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';
const DEFAULT_LIMIT = 100;

function readDaemonToken(): string | null {
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    return readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Pure-function GET helper for /v3/audit/swarm-audit. Top-level export so
 * unit tests can exercise the URL + headers shape with an injected
 * fetchImpl, without mocking globals or node:fs. Mirrors the
 * postAuditViaFetch pattern at http-daemon-client.ts:28.
 *
 * Behavior:
 *   - No token: throws (callers can interpret as daemon-unreachable).
 *   - Non-2xx response: throws an Error with the status code.
 *   - Network error: bubbles the underlying Error to caller.
 *   - 2xx: returns the parsed JSON body (caller validates shape).
 *
 * The "throws on failure" shape (different from postAuditViaFetch's
 * fire-and-forget null-on-fail) is intentional — audit-modal-fetch is
 * a synchronous user-facing UI request where errors need to surface
 * to the operator, not be silently swallowed.
 */
export async function fetchSwarmAuditViaFetch(
  baseUrl: string,
  token: string | null,
  limit: number,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  if (!token) {
    throw new Error('daemon token unavailable');
  }
  const url = `${baseUrl}/v3/audit/swarm-audit?limit=${limit}`;
  const res = await fetchImpl(url, {
    headers: { 'X-Conductor-Token': token },
  });
  if (!res.ok) {
    throw new Error(`daemon returned ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

export interface AuditModalFetchDeps {
  /** Fetches the last-N swarm-audit rows from the daemon. */
  fetchSwarmAudit: (limit: number) => Promise<unknown>;
}

/**
 * IPC reply shape. Local discriminated union — see header doc-comment
 * for why this does NOT extend WorkstationErrorSchema (§8 is frozen
 * non-sess-mbt13 territory).
 */
export type AuditModalFetchResult =
  | {
      ok: true;
      rows: OrchestratorSwarmAuditRow[];
      total: number;
    }
  | {
      ok: false;
      error: {
        type: 'daemon-unreachable' | 'parse-failure';
        message: string;
      };
    };

export class AuditModalIpcController {
  constructor(private readonly deps: AuditModalFetchDeps) {}

  async handleFetch(): Promise<AuditModalFetchResult> {
    let raw: unknown;
    try {
      raw = await this.deps.fetchSwarmAudit(DEFAULT_LIMIT);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : typeof e === 'string' ? e : String(e);
      return {
        ok: false,
        error: {
          type: 'daemon-unreachable',
          message: message.length > 0 ? message : 'unknown fetch failure',
        },
      };
    }

    const parsed = OrchestratorSwarmAuditQueryResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          type: 'parse-failure',
          message: parsed.error.message,
        },
      };
    }

    const validated: OrchestratorSwarmAuditQueryResponse = parsed.data;
    return {
      ok: true,
      rows: validated.rows,
      total: validated.total,
    };
  }
}

/**
 * Production deps factory: wires the real HTTP fetch + daemon-token
 * read. Tests construct controllers with their own mock deps.
 */
export function defaultAuditModalFetchDeps(): AuditModalFetchDeps {
  const token = readDaemonToken();
  return {
    fetchSwarmAudit: (limit: number) =>
      fetchSwarmAuditViaFetch(DAEMON_URL, token, limit),
  };
}

export interface RegisterAuditModalIpcOpts {
  controller?: AuditModalIpcController;
}

export function registerAuditModalIpcHandlers(
  opts: RegisterAuditModalIpcOpts = {},
): void {
  const controller =
    opts.controller ??
    new AuditModalIpcController(defaultAuditModalFetchDeps());

  ipcMain.handle('workstation:audit-modal-fetch', async () => {
    return controller.handleFetch();
  });
}
