// Tiered context injection per ratified P-0.4 Q4 (TIERED) + WORKSTATION_CONTRACT.md §4.3.
// Context tiers injected per Sonnet API call (MB-T10 Q-MBT10-1=a renumber):
//   1. System prompt (system parameter)
//   2. Build doc content (full, as first user message — per system-prompt.md runtime injection §2)
//   3. Filtered daemon state (all RUNNING + IDLE per P-0.4-cross-Q3)
//   4. Spawned-session context (Tier4Payload — MB-T10, CONDUCTOR_V3_RESCOPE.md §3.5)
//   5. Last 10 turns of chat history (per P-0.4-cross-Q4)         ← was Tier 4
//   6. Triggering event (current operator message)                 ← was Tier 5
//
// HALT SURFACE: ticket description says "only the ticket section relevant to the
// triggering event included (not entire build doc body)". This conflicts with
// system-prompt.md §"Context-injection at runtime" item 2: "Loaded build doc content
// as the first user message". Current implementation uses full-doc injection
// (matching the frozen system prompt). Pending operator arbitration of the conflict.
// Cite: WORKSTATION_CONTRACT.md §4.3 + system-prompt.md (frozen at e6e83f9).

import type { Tier4Payload } from 'dispatch-core/dist/v3/schema.js';

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DaemonStatePayload {
  sessions?: Array<{ id: string; name?: string; status?: string }>;
}

export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BuildContextParams {
  systemPrompt: string;
  buildDocContent: string;
  buildDocSha: string;
  daemonState: DaemonStatePayload | null;
  spawnedSessions: Tier4Payload | null;
  chatHistory: HistoryTurn[];
  triggeringEvent: string;
}

export interface BuiltContext {
  systemPrompt: string;
  messages: ContextMessage[];
}

const MAX_HISTORY_TURNS = 10; // per P-0.4-cross-Q4

/**
 * Assemble the tiered context for a Sonnet orchestrator call.
 * Returns { systemPrompt, messages } ready for the Anthropic SDK messages.create() call.
 */
export function buildContext(params: BuildContextParams): BuiltContext {
  const {
    systemPrompt,
    buildDocContent,
    buildDocSha,
    daemonState,
    spawnedSessions,
    chatHistory,
    triggeringEvent,
  } = params;

  const messages: ContextMessage[] = [];

  // Tier 2: Build doc content (full, as per frozen system-prompt.md)
  messages.push({
    role: 'user',
    content: `[Build doc at SHA ${buildDocSha}]\n\n${buildDocContent}`,
  });

  // Tier 3: Filtered daemon state (RUNNING + IDLE sessions per P-0.4-cross-Q3)
  if (daemonState) {
    const activeSessions = (daemonState.sessions ?? []).filter(
      (s) => s.status === 'RUNNING' || s.status === 'IDLE',
    );
    messages.push({
      role: 'user',
      content: `[Daemon state — active sessions]\n${JSON.stringify(activeSessions, null, 2)}`,
    });
  }

  // Tier 4: Spawned-session context (MB-T10 — CONDUCTOR_V3_RESCOPE.md §3.5).
  // Emit when spawnedSessions is non-null, INCLUDING when sessions_context is
  // an empty record — the orchestrator sees an explicit "no spawned sessions"
  // signal rather than a missing tier (probe P14 case c).
  if (spawnedSessions) {
    messages.push({
      role: 'user',
      content: `[Spawned sessions]\n${JSON.stringify(spawnedSessions, null, 2)}`,
    });
  }

  // Tier 5: Last N turns of chat history (verbatim per P-0.4-cross-Q4)
  const recentHistory = chatHistory.slice(-MAX_HISTORY_TURNS);
  for (const turn of recentHistory) {
    messages.push({ role: turn.role, content: turn.content });
  }

  // Tier 6: Triggering event
  messages.push({
    role: 'user',
    content: `[Triggering event]\n${triggeringEvent}`,
  });

  return { systemPrompt, messages };
}
