import { ipcMain, app } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const daemonClient = new HttpDaemonClient();

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

        const buildDocConfig = readBuildDocConfig();
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
        try { await daemonClient.postMessage({ role: 'assistant', content: fullResponse }); } catch {}
        event.sender.send('coarchitect:streamDone', fullResponse.trimEnd().slice(0, 120));
      } catch (err) {
        event.sender.send('coarchitect:streamError', classifyAnthropicError(err));
      }
    })();
  });
}
