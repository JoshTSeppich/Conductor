import { ipcMain, app, webContents as allWebContents } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpDaemonClient } from './http-daemon-client.js';
import { createAnthropicClient, classifyAnthropicError } from './anthropic-client.js';
import { readSplitterPosition, writeSplitterPosition } from './splitter-state.js';
import type { ChatMessageInput } from '../coarchitect/daemon-client.js';
import {
  readBuildDocConfig,
  writeBuildDocConfig,
  clearBuildDocConfig,
  type BuildDocConfig,
} from '../coarchitect/build-doc-state.js';
import { readBuildDoc } from '../coarchitect/build-doc-reader.js';
import { buildContext } from '../coarchitect/context-builder.js';
import { routeOrchestratorOutput } from './orchestrator-output-router.js';
import { cardContextCache } from './card-context-cache.js';

const MOCK_RESPONSES: Record<string, string> = {
  self_check: `I'll analyze the current state and surface the self-check block.

Self-check:
1. Build doc authority confirmed — reading from current commit SHA.
2. Allowed actions per ticket: spawn-new-session, send.
3. Triggering event unambiguous — maps to green condition.
4. No escape required.
5. Output type: card.
6. Schema conformant: yes.
7. No superseded cards to retire.
8. Rationale complete.
9. Co-drafted-by trailer handled by action handler.

Generating card output for operator review.`,
  default: `Routing to orchestrator output. Build doc loaded and valid. No ambiguity in triggering event. Generating response.`,
};

async function* mockStreamChunks(text: string): AsyncIterable<string> {
  const words = text.split(' ');
  for (const word of words) {
    yield word + ' ';
  }
}

function loadSystemPrompt(): string {
  try {
    return readFileSync(join(app.getAppPath(), 'coarchitect/system-prompt.md'), 'utf8');
  } catch {
    return 'You are the Foxworks Workstation orchestrator.';
  }
}

/**
 * Singleton HttpDaemonClient instance used by both the coarchitect IPC
 * handlers (defined in this file) and the F2 card-ipc wiring (imported
 * from src/main/card-wiring.ts). Exported per coord §4 reconciliation:
 * the operator-prescribed F2 sentinel referenced `httpDaemonClient` as
 * if it lived in main.ts, but the actual construction site is here.
 * Single source of truth; one token-read on startup; both wirings share.
 */
export const daemonClient = new HttpDaemonClient();

export function registerIpcHandlers(): void {
  ipcMain.handle('coarchitect:fetchHistory', async () => {
    return daemonClient.fetchHistory();
  });

  ipcMain.handle('coarchitect:postMessage', async (_event, msg: unknown) => {
    return daemonClient.postMessage(msg as ChatMessageInput);
  });

  ipcMain.handle('shell:getSplitterPos', () => {
    return readSplitterPosition();
  });

  ipcMain.handle('shell:saveSplitterPos', (_event, pos: unknown) => {
    if (typeof pos === 'number' && pos > 0) {
      writeSplitterPosition(pos);
    }
  });

  ipcMain.handle('coarchitect:getBuildDocConfig', () => {
    return readBuildDocConfig();
  });

  ipcMain.handle('coarchitect:setBuildDocConfig', (_event, config: unknown) => {
    writeBuildDocConfig(config as BuildDocConfig);
  });

  ipcMain.handle('coarchitect:clearBuildDocConfig', () => {
    clearBuildDocConfig();
  });

  // One-way streaming handler: renderer sends, main pushes chunks back via webContents.send.
  // Fetches history before posting user message so triggering event is not duplicated in Tier 4.
  ipcMain.on('coarchitect:sendAndStream', (event, content: string) => {
    void (async () => {
      const historyRows = await daemonClient.fetchHistory().catch(() => []);

      try { await daemonClient.postMessage({ role: 'user', content }); } catch {}

      const isMock = process.env['MB_MOCK_ANTHROPIC'] === '1';
      let stream: AsyncIterable<string>;
      // F5 routing context needs buildDocConfig outside the !isMock branch.
      // Reading outside the branch adds one cheap file-IO under MB_MOCK_ANTHROPIC=1
      // but no behavioral change.
      const buildDocConfig = readBuildDocConfig();

      if (isMock) {
        const key = process.env['MB_MOCK_ANTHROPIC_RESPONSE'] ?? 'default';
        stream = mockStreamChunks(MOCK_RESPONSES[key] ?? MOCK_RESPONSES['default']!);
      } else {
        const systemPrompt = loadSystemPrompt();
        const chatClient = createAnthropicClient(systemPrompt);
        if (!chatClient) {
          event.sender.send('coarchitect:streamError', {
            code: 'auth_error',
            message: 'ANTHROPIC_API_KEY environment variable not set.',
          });
          return;
        }

        if (buildDocConfig) {
          try {
            const buildDocResult = await readBuildDoc(
              buildDocConfig.repoRoot,
              buildDocConfig.relativePath,
            );
            const chatHistory = historyRows
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
            const context = buildContext({
              systemPrompt,
              buildDocContent: buildDocResult.content,
              buildDocSha: buildDocResult.sha,
              daemonState: null,
              chatHistory,
              triggeringEvent: content,
            });
            const apiMessages = context.messages.filter(
              (m): m is { role: 'user' | 'assistant'; content: string } =>
                m.role === 'user' || m.role === 'assistant',
            );
            stream = chatClient.streamMessages(context.systemPrompt, apiMessages);
          } catch {
            stream = chatClient.streamMessage(content);
          }
        } else {
          stream = chatClient.streamMessage(content);
        }
      }

      let fullResponse = '';
      try {
        for await (const chunk of stream) {
          fullResponse += chunk;
          event.sender.send('coarchitect:streamChunk', chunk);
        }
        // F5: parse the full response and route variant. card / multi-choice-card
        // populate the cache + emit orchestrator-card-rendered to all webContents
        // (the dispatch-web React app in the kanban webview is the only consumer
        // with a registered listener for this channel; shell renderer + devtools
        // ignore). escape-block / action / non-JSON paths leave existing chat-
        // panel streaming as-is.
        const decision = routeOrchestratorOutput(fullResponse, {
          triggerEvent: content,
          buildDocId: buildDocConfig?.relativePath ?? 'unknown',
          uuidGen: () => randomUUID(),
        });
        if (decision.kind === 'card-or-multi-choice') {
          cardContextCache.set(decision.cardId, decision.context);
          for (const wc of allWebContents.getAllWebContents()) {
            wc.send('orchestrator-card-rendered', decision.payload);
          }
        }
        try { await daemonClient.postMessage({ role: 'assistant', content: fullResponse }); } catch {}
        event.sender.send('coarchitect:streamDone', fullResponse.trimEnd().slice(0, 120));
      } catch (err) {
        event.sender.send('coarchitect:streamError', classifyAnthropicError(err));
      }
    })();
  });
}
