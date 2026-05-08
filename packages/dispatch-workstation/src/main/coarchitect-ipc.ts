import { ipcMain, app, webContents as allWebContents } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { HttpDaemonClient } from './http-daemon-client.js';
import {
  createAnthropicClient,
  classifyAnthropicError,
  type UsageInfo,
} from './anthropic-client.js';
import type { RateLimitState } from './anthropic-api-client.js';
import { readSplitterPosition, writeSplitterPosition } from './splitter-state.js';
// === BEGIN: MB-T26 cost-meter imports ===
import { computeCost } from './cost-calc.js';
import {
  appendCostLedgerEntry,
  todaysTotalCost,
} from './cost-ledger.js';
// === END: MB-T26 ===
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
import { emitCardEnvelopes, type CardEmitter } from './orchestrator-card-emitter.js';
import { cardContextCache } from './card-context-cache.js';
// === MB-T11 WB7 imports — action-fire route + Tier4 wiring closure ===
import {
  dispatchAction,
  defaultDispatchActionDeps,
  type SpawnIpcResult,
} from './orchestrator-action-handler.js';
import { AutopilotLoop } from './autopilot-loop.js';
import { buildTier4Payload } from './tier4-fan-out.js';
import { HttpSessionListClient } from './session-cap.js';
// === BEGIN: MB-T36 orchestrator-fired spawn imports ===
import {
  fireOrchestratorSpawn,
} from './orchestrator-fire-spawn.js';
import {
  sharedSpawnConfirmGate,
  SpawnIpcController,
  defaultSpawnHandlerDeps,
} from './spawn-ipc.js';
import { readDispatchMode } from './dispatch-mode-store.js';
// === END: MB-T36 ===

// === BEGIN: MB-T36 controller cache ===
// Lazy controller promise — same controllerPromise pattern as
// registerSpawnIpcHandlers:286. Resolved once; subsequent calls share the
// same controller (avoids re-resolving the claude binary path per spawn).
let _orchestratorSpawnControllerPromise: Promise<SpawnIpcController> | null = null;
function getOrchestratorSpawnController(): Promise<SpawnIpcController> {
  if (!_orchestratorSpawnControllerPromise) {
    _orchestratorSpawnControllerPromise = defaultSpawnHandlerDeps().then(
      (deps) => new SpawnIpcController(deps),
    );
  }
  return _orchestratorSpawnControllerPromise;
}
// === END: MB-T36 ===

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

// === MB-T11 WB7 — autopilot + Tier4 fan-out singletons + helpers ===

/**
 * Per-process autopilot state machine. Persists to <userData>/
 * autopilot-state.json per Q-MBT11-2=a + Q-MBT11-9=a. Consumed by:
 *   - The action-fire route (orchestrator-action-handler.dispatchAction
 *     → startIntent for assign-task) below.
 *   - The Tier 4 fan-out merge (tier4-fan-out.buildTier4Payload uses
 *     getPendingIntents + getLastActionFiredAt to overwrite the daemon
 *     hardcoded null/[] per Q-MBT11-8=a).
 */
const autopilot = new AutopilotLoop();

/**
 * Daemon session-list client used by the Tier 4 fan-out for the
 * registered-non-killed session-name source.
 */
const sessionListClient = new HttpSessionListClient();

const DAEMON_URL_FOR_TIER4 =
  process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

/** Read the daemon token; null if missing. Mirrors http-daemon-client. */
function readDaemonTokenForTier4(): string | null {
  try {
    return readFileSync(
      join(homedir(), '.foxworks-dispatch', 'token'),
      'utf8',
    ).trim();
  } catch {
    return null;
  }
}

// === BEGIN: MB-T26 cost-meter helpers ===
//
// Q-MBT26-3=c (onUsage callback in AnthropicChatClient signature) +
// Q-MBT26-5=d (push-based via onCostUpdate bridge method) operator-
// confirmed 2026-05-07.
//
// captureUsageToLedger is the onUsage callback wired into chatClient
// .streamMessages/.streamMessage calls in the sendAndStream handler
// below. It runs after each Conductor API call's stream completes.
//
// broadcastCostUpdate sends the new today-total to all webContents
// (renderer subscribes via coarchitectBridge.onCostUpdate per
// preload.mts MB-T26 zone).
//
// All work is best-effort: cost meter is observability, NOT load-bearing.
// Errors are silenced so the streaming handler stays robust.

function broadcastCostUpdate(): void {
  let total: number;
  try {
    total = todaysTotalCost();
  } catch {
    return;
  }
  for (const wc of allWebContents.getAllWebContents()) {
    try {
      wc.send('coarchitect:cost-update', total);
    } catch {
      // per-webContents send failure non-fatal
    }
  }
}

function captureUsageToLedger(usage: UsageInfo): void {
  try {
    const cost = computeCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
    );
    appendCostLedgerEntry({
      timestamp: new Date().toISOString(),
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: cost,
    });
    broadcastCostUpdate();
  } catch {
    // Unknown model (not in MODEL_RATES) or ledger write failure —
    // silent. Cost meter is observability, not load-bearing.
  }
}
// === END: MB-T26 ===

// === BEGIN: MB-T34 rate-limit broadcast helpers ===
//
// Q-MBT34-2=(b)+(c) + C-MBT34-1=(b mod) operator-acked HALT 0 2026-05-08.
//
// Mirrors the MB-T26 cost-meter pattern: captureRateLimitToBroadcast is
// the onRateLimit callback wired into chatClient.streamMessages /
// .streamMessage at the 3 sendAndStream call sites below.
// broadcastRateLimitUpdate sends the new state to all webContents
// (renderers subscribe via coarchitectBridge.onRateLimitUpdate per
// preload.mts MB-T34 zone).
//
// latestRateLimitState is the main-process snapshot consulted by the
// 'coarchitect:getRateLimitState' IPC handler so that newly-attached
// subscribers can fetch the current state without waiting for the next
// live update.
//
// Cross-session signal: Terminal B (MB-T25 plan-usage ring widget)
// consumes these broadcasts. Data contract = RateLimitState from
// anthropic-api-client.ts (Q-MBT34-6=(b) nested-bucket shape, operator-
// approved at HALT 0).

let latestRateLimitState: RateLimitState | null = null;

function broadcastRateLimitUpdate(state: RateLimitState): void {
  for (const wc of allWebContents.getAllWebContents()) {
    try {
      wc.send('coarchitect:rate-limit-update', state);
    } catch {
      // per-webContents send failure non-fatal
    }
  }
}

function captureRateLimitToBroadcast(state: RateLimitState): void {
  try {
    latestRateLimitState = state;
    broadcastRateLimitUpdate(state);
  } catch {
    // observability gap, not load-bearing — silent
  }
}
// === END: MB-T34 ===

export function registerIpcHandlers(): void {
  ipcMain.handle('coarchitect:fetchHistory', async () => {
    return daemonClient.fetchHistory();
  });

  // === BEGIN: MB-T26 cost-meter IPC handler ===
  // Q-MBT26-5=d operator-confirmed 2026-05-07. Renderer reads initial
  // cost via coarchitectBridge.onCostUpdate's internal invoke (see
  // preload.mts MB-T26 zone) and receives live updates via the
  // 'coarchitect:cost-update' webContents.send broadcast emitted by
  // captureUsageToLedger above.
  ipcMain.handle('coarchitect:getDailyCost', () => {
    try {
      return todaysTotalCost();
    } catch {
      return 0;
    }
  });
  // === END: MB-T26 ===

  // === BEGIN: MB-T34 rate-limit-state IPC handler ===
  // C-MBT34-1=(b mod) operator-confirmed 2026-05-08. Renderer reads
  // initial RateLimitState via coarchitectBridge.onRateLimitUpdate's
  // internal invoke (see preload.mts MB-T34 zone) and receives live
  // updates via the 'coarchitect:rate-limit-update' webContents.send
  // broadcast emitted by captureRateLimitToBroadcast above.
  ipcMain.handle('coarchitect:getRateLimitState', () => latestRateLimitState);
  // === END: MB-T34 ===

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

            // MB-T11 WB7 — Tier 4 wiring closure (closes
            // MB-F-T10-COARCHITECT-IPC-WIRE-TIER4 per Q-MBT11-7=a).
            // Per Q-MBT11-8=a, autopilot pending_intents +
            // last_action_fired_at are merged workstation-side into each
            // SessionContextSnapshot after the daemon fetch. Failure is
            // tolerated per assembleTier4Payload's per-session
            // graceful-degrade contract; if the daemon list itself fails,
            // buildTier4Payload returns an empty Tier4Payload and the
            // orchestrator sees "no spawned sessions".
            const spawnedSessions = await buildTier4Payload({
              sessionListClient,
              autopilot,
              fetchImpl: globalThis.fetch.bind(globalThis),
              daemonUrl: DAEMON_URL_FOR_TIER4,
              daemonToken: readDaemonTokenForTier4(),
            }).catch(() => null);

            const context = buildContext({
              systemPrompt,
              buildDocContent: buildDocResult.content,
              buildDocSha: buildDocResult.sha,
              daemonState: null,
              spawnedSessions,
              chatHistory,
              triggeringEvent: content,
            });
            const apiMessages = context.messages.filter(
              (m): m is { role: 'user' | 'assistant'; content: string } =>
                m.role === 'user' || m.role === 'assistant',
            );
            // MB-T26 onUsage (captureUsageToLedger) records cost after
            // stream completes. MB-T34 onRateLimit
            // (captureRateLimitToBroadcast) fires once per request at
            // response-open, broadcasting plan-usage state to renderers
            // for Terminal B's MB-T25 ring widget.
            stream = chatClient.streamMessages(
              context.systemPrompt,
              apiMessages,
              captureUsageToLedger,
              captureRateLimitToBroadcast,
            );
          } catch {
            stream = chatClient.streamMessage(
              content,
              captureUsageToLedger, // MB-T26 onUsage
              captureRateLimitToBroadcast, // MB-T34 onRateLimit
            );
          }
        } else {
          stream = chatClient.streamMessage(
            content,
            captureUsageToLedger, // MB-T26 onUsage
            captureRateLimitToBroadcast, // MB-T34 onRateLimit
          );
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
          // F5 emit: broadcast envelopes to all webContents via the pure
          // emitCardEnvelopes helper so superseded fires before rendered
          // when the new card has lineage (operator A6, MB-T07 Phase 2 WB2).
          const broadcaster: CardEmitter = {
            emit: (channel, payload) => {
              for (const wc of allWebContents.getAllWebContents()) {
                wc.send(channel, payload);
              }
            },
          };
          emitCardEnvelopes(decision, broadcaster);
        } else if (decision.kind === 'action-fire-without-card') {
          // MB-T11 WB7 — orchestrator-fired action route.
          // Per Q-MBT11-1..6 + Q-MBT11-8: validate payload via §12 sub-
          // schema, consult resolver-stub, route to MB-T09/MB-T05/WB3 IPC
          // or v2 handoff or autopilot.startIntent. Errors do not throw
          // out of the streaming handler — they're surfaced to operator
          // via the chat panel through the next orchestrator turn (the
          // dispatchAction result is logged here; a future ticket may
          // surface kind:'error' / kind:'pending-approval' as renderer
          // sentinels).
          const actionDeps = defaultDispatchActionDeps({
            fireSendPrompt: async (sessionName, payload) => {
              const {
                SessionSendPromptIpcController,
                defaultSessionSendPromptDeps,
              } = await import('./session-send-prompt-ipc.js');
              const ctl = new SessionSendPromptIpcController(
                defaultSessionSendPromptDeps(),
              );
              const reply = await ctl.handleSendPrompt({
                sessionName,
                prompt: payload.prompt,
                envelope: payload.envelope,
              });
              if (!reply.ok) {
                throw new Error(
                  `session-send-prompt ${reply.error.error_type}`,
                );
              }
              autopilot.recordAction(sessionName, 'send', payload);
            },
            // === BEGIN: MB-T36 fireSpawn implementation ===
            // Closes MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED.
            // Dispatch-mode-aware: 'auto' fires directly; 'ask' gates through
            // sharedSpawnConfirmGate + existing workstation:spawn-confirm-response
            // IPC handler. Operator decline resolves { declined: true } which
            // is mapped to a thrown error so dispatchAction returns kind:'error'.
            fireSpawn: async (payload): Promise<SpawnIpcResult> => {
              const result = await fireOrchestratorSpawn(payload, {
                readDispatchMode,
                getController: getOrchestratorSpawnController,
                spawnConfirmGate: sharedSpawnConfirmGate,
                broadcast: (channel, msg) => {
                  for (const wc of allWebContents.getAllWebContents()) {
                    wc.send(channel, msg);
                  }
                },
              });
              if ('declined' in result) {
                throw new Error('orchestrator spawn declined by operator');
              }
              return result;
            },
            // === END: MB-T36 ===
            fireKill: async (sessionName, payload) => {
              const { SessionKillIpcController, defaultSessionKillDeps } =
                await import('./session-kill-ipc.js');
              const ctl = new SessionKillIpcController(
                defaultSessionKillDeps(),
              );
              const reply = await ctl.handleKill({ sessionName });
              if (!reply.ok) {
                throw new Error(`session-kill ${reply.error.error_type}`);
              }
              autopilot.recordAction(sessionName, 'kill', payload);
            },
            firePullHandoff: async (sessionName) => {
              const token = readDaemonTokenForTier4();
              if (!token) {
                throw new Error('daemon token unavailable for handoff fetch');
              }
              const res = await globalThis.fetch(
                `${DAEMON_URL_FOR_TIER4}/v2/sessions/${encodeURIComponent(
                  sessionName,
                )}/handoff`,
                { headers: { 'X-Conductor-Token': token } },
              );
              if (!res.ok) {
                throw new Error(`handoff fetch returned HTTP ${res.status}`);
              }
              const body = (await res.json()) as {
                content: string;
                written_at: string;
                archived_to: string;
              };
              autopilot.recordAction(sessionName, 'pull', { sessionName });
              return body;
            },
            startIntent: async (payload) => {
              const result = autopilot.startIntent(payload);
              autopilot.recordAction(payload.sessionName, 'assign-task', payload);
              return result;
            },
          });

          await dispatchAction(
            {
              output: decision.output,
              triggerEvent: content,
              buildDocId: buildDocConfig?.relativePath ?? 'unknown',
            },
            actionDeps,
          ).catch((err: unknown) => {
            // dispatchAction itself doesn't throw, but defense-in-depth
            // here keeps a buggy dep from killing the streaming handler.
            event.sender.send('coarchitect:streamError', {
              code: 'action_dispatch_error',
              message:
                err instanceof Error ? err.message : String(err),
            });
          });
        }
        try { await daemonClient.postMessage({ role: 'assistant', content: fullResponse }); } catch {}
        event.sender.send('coarchitect:streamDone', fullResponse.trimEnd().slice(0, 120));
      } catch (err) {
        event.sender.send('coarchitect:streamError', classifyAnthropicError(err));
      }
    })();
  });
}
