// SPIKE: MB-S01 context composer.
//
// Builds the (system, user_message) pair sent to Sonnet 4.6 per ratified
// P-0.4 Q4 (TIERED context) with `all active + explicitly referenced`
// session filter per ratified P-0.4-cross-Q3.
//
// Tier mapping:
//   Tier 1 → Anthropic API `system` parameter (orchestrator-facing prose
//             from system-prompt.md, between the marker lines).
//   Tier 2 → Build-doc content (path + commit SHA + raw markdown).
//   Tier 3 → Filtered daemon state (active + scenario-referenced sessions).
//   Tier 4 → 10-turn chat history verbatim.
//   Tier 5 → Older-turns summary.
//   Tier 6 → Triggering event for this call.
//
// All tiers 2-6 collapse into a single user message because the API
// requires alternating user/assistant turns and the spike's call is
// stateless (single round-trip). Production COARCH-T02 may distribute
// these across actual conversation turns; the spike does not.

import * as fs from "node:fs";
import * as path from "node:path";

export interface ScenarioContextInput {
  id: string;
  triggering_event: string;
  session_filter: string[];
}

export interface ComposeContextInput {
  systemPromptMarkdownPath: string;
  buildDocPath: string;
  daemonStatePath: string;
  chatHistoryPath: string;
  scenario: ScenarioContextInput;
}

export interface ComposeContextOutput {
  systemPrompt: string;
  userMessage: string;
  buildDocCommitSha: string;
  systemPromptLen: number;
  userMessageLen: number;
}

export function composeContext(input: ComposeContextInput): ComposeContextOutput {
  const rawSystemPrompt = fs.readFileSync(input.systemPromptMarkdownPath, "utf8");
  const systemPrompt = extractOrchestratorSystemPrompt(rawSystemPrompt);

  const buildDoc = fs.readFileSync(input.buildDocPath, "utf8");

  const daemonStateRaw = JSON.parse(fs.readFileSync(input.daemonStatePath, "utf8"));
  const filteredSessions = filterSessions(daemonStateRaw.sessions, input.scenario.session_filter);

  const chatHistory = JSON.parse(fs.readFileSync(input.chatHistoryPath, "utf8"));

  const userMessage = renderUserMessage({
    buildDoc,
    buildDocPath: input.buildDocPath,
    buildDocCommitSha: daemonStateRaw.build_doc_commit_sha,
    filteredSessions,
    olderTurnsSummary: chatHistory.older_turns_summary,
    turns: chatHistory.turns,
    triggeringEvent: input.scenario.triggering_event,
  });

  return {
    systemPrompt,
    userMessage,
    buildDocCommitSha: daemonStateRaw.build_doc_commit_sha,
    systemPromptLen: systemPrompt.length,
    userMessageLen: userMessage.length,
  };
}

function extractOrchestratorSystemPrompt(raw: string): string {
  const startMarker = "## Below is the system prompt sent to Sonnet 4.6";
  const endMarker = "## Below is implementation metadata";
  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      "system-prompt.md does not contain expected section markers; cannot extract orchestrator-facing prose",
    );
  }
  const afterStart = raw.indexOf("\n", startIdx) + 1;
  return raw.slice(afterStart, endIdx).trim();
}

// Per ratified P-0.4-cross-Q3: include all sessions in active states
// (RUNNING / IDLE / awaiting_review / armed) plus any session named in
// the scenario's session_filter (explicit reference). Excludes killed/
// archived sessions unless explicitly referenced.
function filterSessions(sessions: any[], explicit: string[]): any[] {
  const explicitSet = new Set(explicit);
  return sessions.filter((s) => {
    if (explicitSet.has(s.name)) return true;
    if (s.state === "killed") return false;
    if (s.computed_status === "archived") return false;
    return true;
  });
}

function renderUserMessage(args: {
  buildDoc: string;
  buildDocPath: string;
  buildDocCommitSha: string;
  filteredSessions: any[];
  olderTurnsSummary: string;
  turns: { role: string; content: string }[];
  triggeringEvent: string;
}): string {
  const turnsRendered = args.turns
    .map((t) => `[${t.role}]: ${t.content}`)
    .join("\n\n");

  return `=== Build doc ===
Path: ${args.buildDocPath}
Commit SHA: ${args.buildDocCommitSha}
Content:

${args.buildDoc}

=== Filtered daemon state (active + explicitly referenced sessions) ===
${JSON.stringify({ sessions: args.filteredSessions }, null, 2)}

=== Older-turns summary ===
${args.olderTurnsSummary}

=== Last 10 turns of orchestrator chat history (verbatim) ===
${turnsRendered}

=== Triggering event for this call ===
${args.triggeringEvent}

=== Output instructions ===
Respond with EXACTLY ONE JSON object validating against your output schema (action / card / multi-choice-card / escape-block). No markdown fences. No surrounding prose. No explanation. Output only the JSON object.`;
}
