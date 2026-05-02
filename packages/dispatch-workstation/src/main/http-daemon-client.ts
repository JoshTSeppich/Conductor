import type { DaemonClient, ChatMessage, ChatMessageInput } from '../coarchitect/daemon-client.js';
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
 * Real DaemonClient implementation that persists messages via POST /v3/orchestrator/messages
 * and fetches history via GET /v3/orchestrator/history.
 *
 * Fails gracefully when daemon is unreachable: fetchHistory returns empty array,
 * postMessage returns a synthetic local-only ChatMessage. This allows chat to work
 * even when the daemon isn't running (e.g. in tests or offline scenarios).
 */
export class HttpDaemonClient implements DaemonClient {
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
}
