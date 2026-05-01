/**
 * Persisted message shape. Fields match OrchestratorMessageRow from
 * dispatch-core/src/v3/schema.ts (field names, types, nullability).
 * Defined locally to avoid a reach-in import during scaffold;
 * Zipper-2 may replace with the v3-schema import once dispatch-core's
 * public export surface is confirmed (OPEN-Q-D-2).
 */
export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly created_at: string;
  readonly build_doc_id: string | null;
  readonly build_doc_commit_sha: string | null;
}

/**
 * Write-side shape for posting a new message. Structurally compatible with
 * OrchestratorMessage from dispatch-core/src/v3/schema.ts.
 */
export interface ChatMessageInput {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly build_doc_id?: string | null;
  readonly build_doc_commit_sha?: string | null;
}

/**
 * Frozen interface implemented by both the Round 2 stub and the real daemon
 * client (COARCH-T01 / COARCH-T02b). Zipper-2 swaps the stub for the real
 * implementation without changing any call site that receives a DaemonClient.
 */
export interface DaemonClient {
  fetchHistory(): Promise<ChatMessage[]>;
  postMessage(msg: ChatMessageInput): Promise<ChatMessage>;
}

/**
 * Stub DaemonClient for Round 2 dev harness and tests.
 * fetchHistory() returns a fixed list of 3 synthetic messages.
 * postMessage() echoes input back with a generated id and timestamp.
 * No HTTP calls. No side effects beyond in-memory history accumulation.
 */
export function createStubDaemonClient(): DaemonClient {
  const history: ChatMessage[] = [
    {
      id: 'stub-1',
      role: 'assistant',
      content: 'Welcome to Foxworks Workstation. How can I help?',
      created_at: '2026-04-30T00:00:00.000Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    },
    {
      id: 'stub-2',
      role: 'user',
      content: 'Show me the current build status.',
      created_at: '2026-04-30T00:01:00.000Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    },
    {
      id: 'stub-3',
      role: 'assistant',
      content: 'All sessions are currently IDLE.',
      created_at: '2026-04-30T00:01:05.000Z',
      build_doc_id: null,
      build_doc_commit_sha: null,
    },
  ];

  return {
    fetchHistory: () => Promise.resolve([...history]),

    postMessage: (msg: ChatMessageInput): Promise<ChatMessage> => {
      const row: ChatMessage = {
        id: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString(),
        build_doc_id: msg.build_doc_id ?? null,
        build_doc_commit_sha: msg.build_doc_commit_sha ?? null,
      };
      history.push(row);
      return Promise.resolve(row);
    },
  };
}
