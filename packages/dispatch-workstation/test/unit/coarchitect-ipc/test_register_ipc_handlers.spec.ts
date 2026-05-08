// test-batch-1 Session B — coarchitect-ipc.ts coverage gap closure (Tier 1).
//
// Pre-state coverage (branch HEAD 36e029e): stmt 3.03% / branch 0% / func 0% /
// line 3.17%. Practically greenfield. Operator scope decision §4: full ≥80%
// with 200-LOC test-additions ceiling LIFTED — factory module with verified
// injection points (other tests use the same vi.hoisted + vi.mock pattern).
//
// Single-spec strategy: 17 tests in one file avoid cross-file vi.mock
// resolution complexity. The handler surface includes 7 ipcMain.handle
// request/response handlers + 1 ipcMain.on streaming handler with branched
// async sub-flow (mock vs live, with vs without buildDocConfig, success vs
// error paths, card decision broadcast).
//
// KNOWN load-bearing dependencies are mocked:
// - electron (ipcMain, app, webContents)
// - http-daemon-client (HttpDaemonClient ctor + fetchHistory/postMessage)
// - splitter-state (read/write)
// - build-doc-state (read/write/clear)
// - build-doc-reader, context-builder
// - orchestrator-output-router, card-context-cache
// - anthropic-client (createAnthropicClient + classifyAnthropicError)
//
// MODELED: vi.hoisted runs before any vi.mock factory body so the spy
// surface is available at module-load time. Per-test vi.clearAllMocks
// resets call history without disturbing implementations; defaults are
// re-applied at the top of each test as needed.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const ipcMocks = vi.hoisted(() => {
  const fetchHistory = vi.fn().mockResolvedValue([]);
  const postMessage = vi.fn().mockResolvedValue(undefined);
  const readSplitterPosition = vi.fn().mockReturnValue(50);
  const writeSplitterPosition = vi.fn();
  const readBuildDocConfig = vi.fn().mockReturnValue(null);
  const writeBuildDocConfig = vi.fn();
  const clearBuildDocConfig = vi.fn();
  const readBuildDoc = vi.fn();
  const buildContext = vi.fn();
  const routeOrchestratorOutput = vi
    .fn()
    .mockReturnValue({ kind: 'no-card' });
  const cardContextCacheSet = vi.fn();
  const createAnthropicClient = vi.fn().mockReturnValue(null);
  const classifyAnthropicError = vi
    .fn()
    .mockReturnValue({ code: 'classified', message: 'mock-classified' });

  const handleHandlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >();
  const onHandlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => void
  >();
  const ipcHandle = vi.fn(
    (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, fn);
    },
  );
  const ipcOn = vi.fn(
    (channel: string, fn: (event: unknown, ...args: unknown[]) => void) => {
      onHandlers.set(channel, fn);
    },
  );

  const getAppPath = vi.fn().mockReturnValue('/mock/app/path');
  const getAllWebContents = vi.fn().mockReturnValue([]);

  return {
    fetchHistory,
    postMessage,
    readSplitterPosition,
    writeSplitterPosition,
    readBuildDocConfig,
    writeBuildDocConfig,
    clearBuildDocConfig,
    readBuildDoc,
    buildContext,
    routeOrchestratorOutput,
    cardContextCacheSet,
    createAnthropicClient,
    classifyAnthropicError,
    ipcHandle,
    ipcOn,
    handleHandlers,
    onHandlers,
    getAppPath,
    getAllWebContents,
  };
});

vi.mock('electron', () => ({
  ipcMain: { handle: ipcMocks.ipcHandle, on: ipcMocks.ipcOn },
  app: { getAppPath: ipcMocks.getAppPath },
  webContents: { getAllWebContents: ipcMocks.getAllWebContents },
}));

vi.mock('../../../src/main/http-daemon-client.js', () => ({
  // KNOWN: vitest's vi.fn arrow-impl errors on `new` (not a constructor).
  // Plain function declaration is a valid constructor target.
  HttpDaemonClient: function HttpDaemonClient(this: unknown) {
    Object.assign(this as object, {
      fetchHistory: ipcMocks.fetchHistory,
      postMessage: ipcMocks.postMessage,
    });
  },
}));

vi.mock('../../../src/main/splitter-state.js', () => ({
  readSplitterPosition: ipcMocks.readSplitterPosition,
  writeSplitterPosition: ipcMocks.writeSplitterPosition,
}));

vi.mock('../../../src/coarchitect/build-doc-state.js', () => ({
  readBuildDocConfig: ipcMocks.readBuildDocConfig,
  writeBuildDocConfig: ipcMocks.writeBuildDocConfig,
  clearBuildDocConfig: ipcMocks.clearBuildDocConfig,
}));

vi.mock('../../../src/coarchitect/build-doc-reader.js', () => ({
  readBuildDoc: ipcMocks.readBuildDoc,
}));

vi.mock('../../../src/coarchitect/context-builder.js', () => ({
  buildContext: ipcMocks.buildContext,
}));

vi.mock('../../../src/main/orchestrator-output-router.js', () => ({
  routeOrchestratorOutput: ipcMocks.routeOrchestratorOutput,
}));

vi.mock('../../../src/main/card-context-cache.js', () => ({
  cardContextCache: { set: ipcMocks.cardContextCacheSet },
}));

vi.mock('../../../src/main/anthropic-client.js', () => ({
  createAnthropicClient: ipcMocks.createAnthropicClient,
  classifyAnthropicError: ipcMocks.classifyAnthropicError,
}));

import { registerIpcHandlers } from '../../../src/main/coarchitect-ipc.js';

// Register once — handlers persist via ipcMocks.handleHandlers /
// onHandlers maps and survive vi.clearAllMocks (which only resets call
// history, not the maps populated at registration time).
registerIpcHandlers();

function makeEvent(): {
  event: { sender: { send: ReturnType<typeof vi.fn> } };
  send: ReturnType<typeof vi.fn>;
} {
  const send = vi.fn();
  return { event: { sender: { send } }, send };
}

async function waitForSend(
  send: ReturnType<typeof vi.fn>,
  channel: string,
  timeoutMs = 1000,
): Promise<unknown[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const call = send.mock.calls.find((c) => c[0] === channel);
    if (call) return call;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(
    `waitForSend: ${channel} not seen within ${timeoutMs}ms; saw ` +
      JSON.stringify(send.mock.calls.map((c) => c[0])),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish defaults that clearAllMocks does NOT preserve. fn-level
  // mockResolvedValue/mockReturnValue settings are preserved by default
  // (vitest >= 0.30 behavior), but we re-set explicitly for resilience.
  ipcMocks.fetchHistory.mockResolvedValue([]);
  ipcMocks.postMessage.mockResolvedValue(undefined);
  ipcMocks.readSplitterPosition.mockReturnValue(50);
  ipcMocks.readBuildDocConfig.mockReturnValue(null);
  ipcMocks.routeOrchestratorOutput.mockReturnValue({ kind: 'no-card' });
  ipcMocks.createAnthropicClient.mockReturnValue(null);
  ipcMocks.classifyAnthropicError.mockReturnValue({
    code: 'classified',
    message: 'mock-classified',
  });
  ipcMocks.getAllWebContents.mockReturnValue([]);
  ipcMocks.getAppPath.mockReturnValue('/mock/app/path');
});

describe('coarchitect-ipc — registerIpcHandlers (handler wiring)', () => {
  it('registers all 8 request/response handlers via ipcMain.handle', () => {
    // KNOWN: handlers are registered once at module-import time (above).
    // Channel names match the renderer-side preload contract; renaming
    // any of them is a renderer-coupled breaking change.
    // MB-T26 WB3: 'coarchitect:getDailyCost' added per Q-MBT26-5=d (push-
    // based bridge with initial-fetch invoke; preload.mts onCostUpdate
    // method invokes this channel).
    const channels = Array.from(ipcMocks.handleHandlers.keys()).sort();
    expect(channels).toEqual([
      'coarchitect:clearBuildDocConfig',
      'coarchitect:fetchHistory',
      'coarchitect:getBuildDocConfig',
      'coarchitect:getDailyCost',
      'coarchitect:postMessage',
      'coarchitect:setBuildDocConfig',
      'shell:getSplitterPos',
      'shell:saveSplitterPos',
    ]);
  });

  it('registers exactly one streaming handler via ipcMain.on (coarchitect:sendAndStream)', () => {
    const channels = Array.from(ipcMocks.onHandlers.keys());
    expect(channels).toEqual(['coarchitect:sendAndStream']);
  });
});

describe('coarchitect-ipc — request/response handlers', () => {
  it('coarchitect:fetchHistory delegates to daemonClient.fetchHistory and returns its resolved value', async () => {
    const rows = [{ role: 'user', content: 'hi' }];
    ipcMocks.fetchHistory.mockResolvedValueOnce(rows);
    const fn = ipcMocks.handleHandlers.get('coarchitect:fetchHistory')!;
    const result = await fn({});
    expect(ipcMocks.fetchHistory).toHaveBeenCalledTimes(1);
    expect(result).toBe(rows);
  });

  it('coarchitect:postMessage delegates to daemonClient.postMessage with the renderer-supplied msg', async () => {
    const fn = ipcMocks.handleHandlers.get('coarchitect:postMessage')!;
    await fn({}, { role: 'user', content: 'ping' });
    expect(ipcMocks.postMessage).toHaveBeenCalledWith({
      role: 'user',
      content: 'ping',
    });
  });

  it('shell:getSplitterPos delegates to readSplitterPosition and returns its result', () => {
    ipcMocks.readSplitterPosition.mockReturnValueOnce(173);
    const fn = ipcMocks.handleHandlers.get('shell:getSplitterPos')!;
    const result = fn({});
    expect(result).toBe(173);
  });

  it('shell:saveSplitterPos writes when pos is a positive number', () => {
    const fn = ipcMocks.handleHandlers.get('shell:saveSplitterPos')!;
    fn({}, 200);
    expect(ipcMocks.writeSplitterPosition).toHaveBeenCalledWith(200);
  });

  it('shell:saveSplitterPos does NOT write when pos is zero (guard branch)', () => {
    // KNOWN: menu-IPC guard `pos > 0` rejects zero. A 0-px splitter
    // would collapse one panel entirely; protected against.
    const fn = ipcMocks.handleHandlers.get('shell:saveSplitterPos')!;
    fn({}, 0);
    expect(ipcMocks.writeSplitterPosition).not.toHaveBeenCalled();
  });

  it('shell:saveSplitterPos does NOT write when pos is non-numeric (guard branch)', () => {
    const fn = ipcMocks.handleHandlers.get('shell:saveSplitterPos')!;
    fn({}, 'not a number');
    expect(ipcMocks.writeSplitterPosition).not.toHaveBeenCalled();
  });

  it('coarchitect:getBuildDocConfig delegates to readBuildDocConfig', () => {
    const cfg = {
      repoRoot: '/repo',
      relativePath: 'docs/x.build.md',
      allowedScopes: ['/repo'],
    };
    ipcMocks.readBuildDocConfig.mockReturnValueOnce(cfg);
    const fn = ipcMocks.handleHandlers.get('coarchitect:getBuildDocConfig')!;
    expect(fn({})).toEqual(cfg);
  });

  it('coarchitect:setBuildDocConfig delegates to writeBuildDocConfig', () => {
    const cfg = {
      repoRoot: '/repo',
      relativePath: 'docs/x.build.md',
      allowedScopes: ['/repo'],
    };
    const fn = ipcMocks.handleHandlers.get('coarchitect:setBuildDocConfig')!;
    fn({}, cfg);
    expect(ipcMocks.writeBuildDocConfig).toHaveBeenCalledWith(cfg);
  });

  it('coarchitect:clearBuildDocConfig delegates to clearBuildDocConfig', () => {
    const fn = ipcMocks.handleHandlers.get('coarchitect:clearBuildDocConfig')!;
    fn({});
    expect(ipcMocks.clearBuildDocConfig).toHaveBeenCalledTimes(1);
  });
});

describe('coarchitect-ipc — sendAndStream (streaming handler)', () => {
  const SAVED_ENV = {
    mockFlag: process.env['MB_MOCK_ANTHROPIC'],
    mockResp: process.env['MB_MOCK_ANTHROPIC_RESPONSE'],
  };

  beforeEach(() => {
    delete process.env['MB_MOCK_ANTHROPIC'];
    delete process.env['MB_MOCK_ANTHROPIC_RESPONSE'];
  });

  // Restore process env after the suite to avoid bleeding into siblings.
  // Using afterAll-pattern with vitest's cleanup in setup.ts is sufficient
  // for the test/setup.ts RTL cleanup; env restoration is local-only.
  it('mock mode (default response) streams chunks and posts assistant message', async () => {
    process.env['MB_MOCK_ANTHROPIC'] = '1';
    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'hello world');

    await waitForSend(send, 'coarchitect:streamDone');

    // KNOWN: chunks stream over coarchitect:streamChunk channel; total
    // call count >= 1 (default mock response is multi-word).
    const chunkCalls = send.mock.calls.filter(
      (c) => c[0] === 'coarchitect:streamChunk',
    );
    expect(chunkCalls.length).toBeGreaterThan(0);

    // postMessage called twice: once with user content, once with assistant.
    expect(ipcMocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'hello world' }),
    );
    expect(ipcMocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant' }),
    );
  });

  it('mock mode honors MB_MOCK_ANTHROPIC_RESPONSE=self_check selecting the self-check response', async () => {
    process.env['MB_MOCK_ANTHROPIC'] = '1';
    process.env['MB_MOCK_ANTHROPIC_RESPONSE'] = 'self_check';
    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'check me');

    const doneCall = await waitForSend(send, 'coarchitect:streamDone');

    // KNOWN: self_check response begins with "I'll analyze..." per
    // MOCK_RESPONSES.self_check at coarchitect-ipc.ts:21. Asserting on
    // the head of the streamed text confirms the env-var selector
    // routed correctly.
    const fullText = send.mock.calls
      .filter((c) => c[0] === 'coarchitect:streamChunk')
      .map((c) => c[1])
      .join('');
    expect(fullText.startsWith("I'll analyze")).toBe(true);
    // streamDone arg is the trimmed-and-truncated full response.
    expect(typeof doneCall[1]).toBe('string');
  });

  it('live mode sends streamError(auth_error) when createAnthropicClient returns null', async () => {
    // Default createAnthropicClient mock returns null (no API key).
    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'hello');

    const errCall = await waitForSend(send, 'coarchitect:streamError');
    expect(errCall[1]).toEqual(
      expect.objectContaining({
        code: 'auth_error',
        message: expect.stringContaining('ANTHROPIC_API_KEY'),
      }),
    );
    // streamDone must NOT be sent on the auth-error path.
    expect(
      send.mock.calls.some((c) => c[0] === 'coarchitect:streamDone'),
    ).toBe(false);
  });

  it('live mode with buildDocConfig + readBuildDoc success uses buildContext + streamMessages', async () => {
    // MODELED: this is the ship-gate-proximate happy path — orchestrator
    // is build-doc-aware. Asserting buildContext receives buildDocSha
    // confirms the SHA propagation invariant.
    const cfg = {
      repoRoot: '/repo',
      relativePath: 'docs/x.build.md',
      allowedScopes: ['/repo'],
    };
    ipcMocks.readBuildDocConfig.mockReturnValue(cfg);
    ipcMocks.readBuildDoc.mockResolvedValue({
      content: 'BUILD DOC BODY',
      sha: 'abc1234',
    });
    ipcMocks.buildContext.mockReturnValue({
      systemPrompt: 'system',
      messages: [{ role: 'user', content: 'hello' }],
    });
    const streamMessages = vi.fn(async function* () {
      yield 'live ';
      yield 'response';
    });
    const streamMessage = vi.fn();
    ipcMocks.createAnthropicClient.mockReturnValue({
      streamMessage,
      streamMessages,
    });

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'hello');

    await waitForSend(send, 'coarchitect:streamDone');

    expect(ipcMocks.readBuildDoc).toHaveBeenCalledWith(
      '/repo',
      'docs/x.build.md',
    );
    expect(ipcMocks.buildContext).toHaveBeenCalledWith(
      expect.objectContaining({
        buildDocContent: 'BUILD DOC BODY',
        buildDocSha: 'abc1234',
        triggeringEvent: 'hello',
      }),
    );
    expect(streamMessages).toHaveBeenCalled();
    expect(streamMessage).not.toHaveBeenCalled();
  });

  it('live mode with buildDocConfig + readBuildDoc failure falls back to streamMessage', async () => {
    // KNOWN: the inner try/catch in coarchitect-ipc.ts:124-147 falls
    // through to streamMessage on readBuildDoc failure. This guards
    // against a missing build-doc file silently breaking chat.
    const cfg = {
      repoRoot: '/repo',
      relativePath: 'docs/missing.build.md',
      allowedScopes: ['/repo'],
    };
    ipcMocks.readBuildDocConfig.mockReturnValue(cfg);
    ipcMocks.readBuildDoc.mockRejectedValue(new Error('ENOENT'));
    const streamMessage = vi.fn(async function* () {
      yield 'fallback';
    });
    const streamMessages = vi.fn();
    ipcMocks.createAnthropicClient.mockReturnValue({
      streamMessage,
      streamMessages,
    });

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'hello');

    await waitForSend(send, 'coarchitect:streamDone');
    // MB-T26 WB3: streamMessage is invoked with (content, captureUsageToLedger)
    // per Q-MBT26-3=c onUsage callback wiring.
    expect(streamMessage).toHaveBeenCalledWith('hello', expect.any(Function));
    expect(streamMessages).not.toHaveBeenCalled();
  });

  it('live mode without buildDocConfig uses streamMessage directly (no buildContext invocation)', async () => {
    ipcMocks.readBuildDocConfig.mockReturnValue(null);
    const streamMessage = vi.fn(async function* () {
      yield 'plain ';
      yield 'chat';
    });
    const streamMessages = vi.fn();
    ipcMocks.createAnthropicClient.mockReturnValue({
      streamMessage,
      streamMessages,
    });

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'no doc');

    await waitForSend(send, 'coarchitect:streamDone');
    // MB-T26 WB3: onUsage callback (captureUsageToLedger) passed as 2nd arg.
    expect(streamMessage).toHaveBeenCalledWith('no doc', expect.any(Function));
    expect(ipcMocks.buildContext).not.toHaveBeenCalled();
  });

  it('routeOrchestratorOutput card-or-multi-choice decision broadcasts to all webContents and caches context', async () => {
    process.env['MB_MOCK_ANTHROPIC'] = '1';
    ipcMocks.routeOrchestratorOutput.mockReturnValue({
      kind: 'card-or-multi-choice',
      cardId: 'card-xyz',
      context: { trigger: 'mock', buildDocId: 'unknown' },
      payload: { id: 'card-xyz', title: 'Test card' },
    });
    const wc1 = { send: vi.fn() };
    const wc2 = { send: vi.fn() };
    ipcMocks.getAllWebContents.mockReturnValue([wc1, wc2]);

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'spawn me');

    await waitForSend(send, 'coarchitect:streamDone');

    expect(ipcMocks.cardContextCacheSet).toHaveBeenCalledWith('card-xyz', {
      trigger: 'mock',
      buildDocId: 'unknown',
    });
    expect(wc1.send).toHaveBeenCalledWith('orchestrator-card-rendered', {
      id: 'card-xyz',
      title: 'Test card',
    });
    expect(wc2.send).toHaveBeenCalledWith('orchestrator-card-rendered', {
      id: 'card-xyz',
      title: 'Test card',
    });
  });

  it('stream iteration error sends classified streamError (no streamDone)', async () => {
    // SPECULATIVE: an Anthropic mid-stream error is the most common live-
    // path failure mode. classifyAnthropicError translates SDK-typed
    // errors into renderer-friendly {code, message}. Asserting the
    // classifier is invoked guards the error-routing contract.
    const streamMessage = vi.fn(
      // eslint-disable-next-line require-yield
      async function* () {
        throw new Error('rate limited');
      },
    );
    ipcMocks.createAnthropicClient.mockReturnValue({
      streamMessage,
      streamMessages: vi.fn(),
    });
    ipcMocks.classifyAnthropicError.mockReturnValue({
      code: 'rate_limit',
      message: 'too many requests',
    });
    ipcMocks.readBuildDocConfig.mockReturnValue(null);

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'oops');

    const errCall = await waitForSend(send, 'coarchitect:streamError');
    expect(ipcMocks.classifyAnthropicError).toHaveBeenCalled();
    expect(errCall[1]).toEqual({
      code: 'rate_limit',
      message: 'too many requests',
    });
    expect(
      send.mock.calls.some((c) => c[0] === 'coarchitect:streamDone'),
    ).toBe(false);
  });

  it('initial fetchHistory failure is swallowed and the handler continues to stream', async () => {
    // KNOWN: coarchitect-ipc.ts:98 uses .catch(() => []) on the initial
    // history fetch to make the streaming handler robust against daemon
    // unavailability. The handler must still proceed to send the user
    // message + stream chunks even when the daemon is unreachable.
    process.env['MB_MOCK_ANTHROPIC'] = '1';
    ipcMocks.fetchHistory.mockRejectedValueOnce(new Error('daemon down'));

    const { event, send } = makeEvent();
    const fn = ipcMocks.onHandlers.get('coarchitect:sendAndStream')!;
    fn(event, 'still ship');

    await waitForSend(send, 'coarchitect:streamDone');
    // postMessage is called twice (user + assistant) even though
    // fetchHistory rejected.
    const userPosts = ipcMocks.postMessage.mock.calls.filter(
      (c) => (c[0] as { role?: string }).role === 'user',
    );
    expect(userPosts.length).toBeGreaterThanOrEqual(1);
  });

  // After-suite: restore env vars to whatever they were on session start.
  // Avoids bleeding the MB_MOCK_ANTHROPIC flag into adjacent specs that
  // run in the same vitest worker.
  it('cleanup — restores process.env after the suite (no-op assertion)', () => {
    if (SAVED_ENV.mockFlag !== undefined) {
      process.env['MB_MOCK_ANTHROPIC'] = SAVED_ENV.mockFlag;
    } else {
      delete process.env['MB_MOCK_ANTHROPIC'];
    }
    if (SAVED_ENV.mockResp !== undefined) {
      process.env['MB_MOCK_ANTHROPIC_RESPONSE'] = SAVED_ENV.mockResp;
    } else {
      delete process.env['MB_MOCK_ANTHROPIC_RESPONSE'];
    }
    expect(true).toBe(true);
  });
});
