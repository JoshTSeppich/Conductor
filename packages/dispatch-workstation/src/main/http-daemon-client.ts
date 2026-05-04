import type { DaemonClient, ChatMessage, ChatMessageInput } from '../coarchitect/daemon-client.js';
import type { DaemonAuditClient } from './card-ipc.js';
import type { OrchestratorAuditWriteRequest } from 'dispatch-core/src/v3/schema.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

function readDaemonToken(): string | null {
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    return readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Pure-function POST helper for /v3/orchestrator/audit (COARCH-T01 endpoint).
 * Extracted to a top-level export so unit tests can exercise the call shape
 * with an injected fetchImpl, without mocking globals or node:fs.
 *
 * Audit is fire-and-forget per WORKSTATION_CONTRACT.md §6.2: any failure path
 * (no token, daemon 401/422/500, network error) returns null and does not
 * throw. The card-ipc handler awaits this call but discards the result.
 */
export async function postAuditViaFetch(
  baseUrl: string,
  token: string | null,
  req: OrchestratorAuditWriteRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  if (!token) {
    return null;
  }
  try {
    const res = await fetchImpl(`${baseUrl}/v3/orchestrator/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Conductor-Token': token,
      },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Real DaemonClient implementation that persists messages via POST /v3/orchestrator/messages
 * and fetches history via GET /v3/orchestrator/history. Also implements
 * DaemonAuditClient for the MB-T07 card-ipc audit-write path.
 *
 * Fails gracefully when daemon is unreachable: fetchHistory returns empty array,
 * postMessage returns a synthetic local-only ChatMessage, postAudit returns null.
 * This allows the workstation to function even when the daemon isn't running
 * (e.g. in tests or offline scenarios).
 */
export class HttpDaemonClient implements DaemonClient, DaemonAuditClient {
  private readonly token: string | null;

  constructor() {
    this.token = readDaemonToken();
  }

  async fetchHistory(): Promise<ChatMessage[]> {
    try {
      if (!this.token) return [];
      const res = await fetch(`${DAEMON_URL}/v3/orchestrator/history?limit=50`, {
        headers: { 'X-Conductor-Token': this.token },
      });
      if (!res.ok) return [];
      const body = await res.json() as { messages?: ChatMessage[] };
      return body.messages ?? [];
    } catch {
      return [];
    }
  }

  async postMessage(msg: ChatMessageInput): Promise<ChatMessage> {
    const fallback: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: msg.role,
      content: msg.content,
      created_at: new Date().toISOString(),
      build_doc_id: msg.build_doc_id ?? null,
      build_doc_commit_sha: msg.build_doc_commit_sha ?? null,
    };

    try {
      if (!this.token) return fallback;
      const res = await fetch(`${DAEMON_URL}/v3/orchestrator/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Conductor-Token': this.token,
        },
        body: JSON.stringify(msg),
      });
      if (!res.ok) return fallback;
      return await res.json() as ChatMessage;
    } catch {
      return fallback;
    }
  }

  async postAudit(req: OrchestratorAuditWriteRequest): Promise<unknown> {
    return postAuditViaFetch(DAEMON_URL, this.token, req);
  }
}
