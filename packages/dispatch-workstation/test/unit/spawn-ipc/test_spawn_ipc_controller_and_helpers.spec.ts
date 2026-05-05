// test-batch-1 Session B — spawn-ipc.ts coverage gap closure (Tier 1).
//
// Pre-state: stmt 15.15% / branch 14.28% / func 17.64% / line 15.38%.
// Largest gap among priority files. Operator scope decision §4 lifted
// the 200-LOC test-additions ceiling — factory module with verified
// injection points (SpawnIpcController already takes SpawnHandlerDeps;
// defaultSpawnHandlerDeps is opt-in via DefaultDepsOpts).
//
// This spec covers:
//   - toErrorReply (envelope mapper)
//   - SpawnIpcController.handleSpawnRequest (success + error)
//   - readApiKey (4 branches: persisted+available+decrypt-ok / -fail,
//     no-persisted / safeStorage-unavailable, env fallback)
//   - default tmux runners (new-session error wrapping + success;
//     kill-session best-effort; has-session reject propagation)
//   - defaultRegisterSession (5 paths: token-null / fetch-throw / 409
//     / non-ok / happy)
//   - defaultSpawnHandlerDeps (resolveClaudeBin success + failure)
//   - registerSpawnIpcHandlers IPC handler wiring + open-repo-dialog
//     (canceled / empty-filePaths / first-path) + spawn-requested
//     async result routing (success / error / send-throws)
//
// KNOWN: spawn-handler.spawnSession is mocked to a thin stub — the
// pipeline behavior is covered by mb-t05 / mb-t06 specs. This spec
// focuses on the spawn-ipc layer's responsibility: IPC wiring, deps
// factory branches, error envelope shape.
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  // electron mock surface
  const dialogShowOpen = vi
    .fn()
    .mockResolvedValue({ canceled: false, filePaths: ['/repo/path'] });
  const safeStorageAvailable = vi.fn().mockReturnValue(true);
  const safeStorageDecrypt = vi
    .fn()
    .mockReturnValue('decrypted-key');
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

  // SUT-internal mocks
  const spawnSession = vi.fn();
  const resolveClaudeBin = vi.fn();
  const readFileSync = vi.fn();
  const execFile = vi.fn();

  return {
    dialogShowOpen,
    safeStorageAvailable,
    safeStorageDecrypt,
    handleHandlers,
    onHandlers,
    ipcHandle,
    ipcOn,
    spawnSession,
    resolveClaudeBin,
    readFileSync,
    execFile,
  };
});

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.ipcHandle, on: mocks.ipcOn },
  dialog: { showOpenDialog: mocks.dialogShowOpen },
  safeStorage: {
    isEncryptionAvailable: mocks.safeStorageAvailable,
    decryptString: mocks.safeStorageDecrypt,
  },
}));

vi.mock('node:fs', () => ({
  readFileSync: mocks.readFileSync,
}));

// node:child_process.execFile is wrapped by promisify; mocking the named
// export is sufficient because promisify(fn) returns a wrapper around fn.
vi.mock('node:child_process', () => ({
  execFile: mocks.execFile,
}));

vi.mock('../../../src/main/spawn-handler.js', () => ({
  spawnSession: mocks.spawnSession,
}));

// HttpSessionListClient is constructed by defaultSpawnHandlerDeps; mock
// it as a no-op constructor so that branch is reachable without booting
// the real HTTP class.
vi.mock('../../../src/main/session-cap.js', () => ({
  HttpSessionListClient: function HttpSessionListClient() {
    /* no-op */
  },
}));

vi.mock('../../../src/main/binary-resolver.js', () => ({
  resolveClaudeBin: mocks.resolveClaudeBin,
}));

import {
  SpawnIpcController,
  defaultSpawnHandlerDeps,
  registerSpawnIpcHandlers,
} from '../../../src/main/spawn-ipc.js';

const ORIG_FETCH = globalThis.fetch;
const fetchSpy = vi.fn();

const SAVED_ENV = {
  apiKey: process.env['ANTHROPIC_API_KEY'],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchSpy);
  // Re-establish defaults
  mocks.dialogShowOpen.mockResolvedValue({
    canceled: false,
    filePaths: ['/repo/path'],
  });
  mocks.safeStorageAvailable.mockReturnValue(true);
  mocks.safeStorageDecrypt.mockReturnValue('decrypted-key');
  mocks.readFileSync.mockReturnValue('tok-default\n');
  mocks.resolveClaudeBin.mockResolvedValue('/usr/local/bin/claude');
  delete process.env['ANTHROPIC_API_KEY'];
  // execFile is invoked promisified: cb(err, {stdout, stderr}) →
  // resolves with stdout/stderr. By default, it resolves with empty.
  mocks.execFile.mockImplementation(
    (
      _bin: string,
      _args: readonly string[],
      _opts: unknown,
      cb: (
        err: NodeJS.ErrnoException | null,
        stdout: string,
        stderr: string,
      ) => void,
    ) => {
      // promisify-wrapped execFile takes (file, args, options, callback);
      // when options is callback (3-arg form), cb may be at position 2.
      // Match Node's loose binding by detecting callback position.
      const callback = typeof _opts === 'function' ? _opts : cb;
      callback(null, '', '');
    },
  );
});

afterAll(() => {
  globalThis.fetch = ORIG_FETCH;
  if (SAVED_ENV.apiKey !== undefined) {
    process.env['ANTHROPIC_API_KEY'] = SAVED_ENV.apiKey;
  } else {
    delete process.env['ANTHROPIC_API_KEY'];
  }
});

describe('SpawnIpcController.handleSpawnRequest', () => {
  it('returns SpawnSuccessReply when spawnSession resolves', async () => {
    const stubResult = {
      sessionName: 'alpha',
      tmuxTarget: 'foxworks:alpha',
      cwd: '/repo',
      registered: { name: 'alpha' },
    };
    mocks.spawnSession.mockResolvedValue(stubResult);
    const ctrl = new SpawnIpcController({} as never);
    const reply = await ctrl.handleSpawnRequest({
      sessionName: 'alpha',
      cwd: '/repo',
    } as never);
    expect(reply).toEqual({ type: 'success', result: stubResult });
  });

  it('maps WorkstationSpawnError fields onto SpawnErrorReply via toErrorReply', async () => {
    // KNOWN: §4 spawn-error envelope must carry error_type, message,
    // sessionName, stderr, activeCount, cap. toErrorReply propagates
    // every field for renderer-side toast formatting.
    const err = new Error('cap reached') as Error & {
      error_type: string;
      sessionName: string;
      activeCount: number;
      cap: number;
    };
    err.error_type = 'SessionCapExceeded';
    err.sessionName = 'alpha';
    err.activeCount = 5;
    err.cap = 5;
    mocks.spawnSession.mockRejectedValue(err);

    const ctrl = new SpawnIpcController({} as never);
    const reply = await ctrl.handleSpawnRequest({
      sessionName: 'alpha',
      cwd: '/repo',
    } as never);
    expect(reply).toEqual({
      type: 'error',
      error: {
        error_type: 'SessionCapExceeded',
        message: 'cap reached',
        sessionName: 'alpha',
        stderr: undefined,
        activeCount: 5,
        cap: 5,
      },
    });
  });

  it('toErrorReply defaults error_type to SpawnFailed for non-typed errors', async () => {
    // KNOWN: spawn-ipc.ts:68 — `?? 'SpawnFailed'` defends against an
    // un-tagged Error reaching the IPC envelope. Renderer always sees
    // a typed error_type for switch-case dispatch.
    mocks.spawnSession.mockRejectedValue(new Error('bare error'));
    const ctrl = new SpawnIpcController({} as never);
    const reply = await ctrl.handleSpawnRequest({
      sessionName: 'alpha',
      cwd: '/repo',
    } as never);
    expect(reply).toMatchObject({
      type: 'error',
      error: { error_type: 'SpawnFailed', message: 'bare error' },
    });
  });

  it('toErrorReply uses String(err) when err.message is undefined (defensive)', async () => {
    mocks.spawnSession.mockRejectedValue('string-thrown' as never);
    const ctrl = new SpawnIpcController({} as never);
    const reply = await ctrl.handleSpawnRequest({
      sessionName: 'alpha',
      cwd: '/repo',
    } as never);
    expect(reply).toMatchObject({
      type: 'error',
      error: { error_type: 'SpawnFailed', message: 'string-thrown' },
    });
  });
});

describe('defaultSpawnHandlerDeps — production deps factory', () => {
  it('resolves claudeBinPath via resolveClaudeBin on happy path', async () => {
    mocks.resolveClaudeBin.mockResolvedValue('/opt/claude/bin/claude');
    const deps = await defaultSpawnHandlerDeps();
    expect(deps.claudeBinPath).toBe('/opt/claude/bin/claude');
  });

  it('falls back to empty claudeBinPath when resolveClaudeBin throws (unresolved-bin guard pattern)', async () => {
    // KNOWN: cairn #72 — startup must not crash if `which claude` fails.
    // Empty claudeBinPath is the unresolved-bin guard signal; the
    // spawn-handler surfaces SpawnFailed on first spawn rather than
    // failing at app launch.
    mocks.resolveClaudeBin.mockRejectedValue(new Error('which claude: not found'));
    const deps = await defaultSpawnHandlerDeps();
    expect(deps.claudeBinPath).toBe('');
  });

  it('readApiKey: returns decrypted value when persistedEncrypted + safeStorage available', async () => {
    const buf = Buffer.from('encrypted-bytes');
    mocks.safeStorageAvailable.mockReturnValue(true);
    mocks.safeStorageDecrypt.mockReturnValue('sk-from-keychain');
    const deps = await defaultSpawnHandlerDeps({ persistedApiKey: buf });
    expect(deps.apiKey).toBe('sk-from-keychain');
    expect(mocks.safeStorageDecrypt).toHaveBeenCalledWith(buf);
  });

  it('readApiKey: falls through to env when safeStorage unavailable', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-from-env';
    mocks.safeStorageAvailable.mockReturnValue(false);
    const deps = await defaultSpawnHandlerDeps({
      persistedApiKey: Buffer.from('x'),
    });
    expect(deps.apiKey).toBe('sk-from-env');
    expect(mocks.safeStorageDecrypt).not.toHaveBeenCalled();
  });

  it('readApiKey: falls through to env when decryptString throws', async () => {
    // SPECULATIVE: keychain corruption / OS lock — decryptString throws.
    // Fallback to env keeps spawn flow working in dev or unlocked-on-
    // demand scenarios.
    process.env['ANTHROPIC_API_KEY'] = 'sk-from-env-fallback';
    mocks.safeStorageAvailable.mockReturnValue(true);
    mocks.safeStorageDecrypt.mockImplementation(() => {
      throw new Error('keychain locked');
    });
    const deps = await defaultSpawnHandlerDeps({
      persistedApiKey: Buffer.from('x'),
    });
    expect(deps.apiKey).toBe('sk-from-env-fallback');
  });

  it('readApiKey: returns empty string when no persisted + no env var', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    const deps = await defaultSpawnHandlerDeps();
    expect(deps.apiKey).toBe('');
  });
});

describe('defaultRegisterSession (via deps.registerSession round-trip)', () => {
  // The default registerSession is captured indirectly: deps factory
  // returns it bound. We exercise it by calling the returned function
  // with a stub req and asserting fetch shape + thrown errors.

  async function getRegisterSession(): Promise<
    SpawnHandlerRegisterSession
  > {
    const deps = await defaultSpawnHandlerDeps();
    return deps.registerSession as unknown as SpawnHandlerRegisterSession;
  }
  type SpawnHandlerRegisterSession = (req: {
    name: string;
    cwd: string;
    tmux_target: string;
  }) => Promise<unknown>;

  const REQ = {
    name: 'alpha',
    cwd: '/repo/path',
    tmux_target: 'foxworks:alpha',
  };

  it('throws DaemonUnreachable when token is null (readFileSync throws)', async () => {
    mocks.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const fn = await getRegisterSession();
    await expect(fn(REQ)).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('Daemon token not found'),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws DaemonUnreachable when fetch throws (network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const fn = await getRegisterSession();
    await expect(fn(REQ)).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('fetch failed'),
    });
  });

  it('throws SessionAlreadyRegistered on HTTP 409 (idempotency surface)', async () => {
    // KNOWN: 409 on /v2/sessions means daemon already has this session;
    // operator-experiential signal is "name collision," not a daemon
    // outage. Distinct error_type so renderer can disambiguate.
    fetchSpy.mockResolvedValue({ ok: false, status: 409 });
    const fn = await getRegisterSession();
    await expect(fn(REQ)).rejects.toMatchObject({
      error_type: 'SessionAlreadyRegistered',
    });
  });

  it('throws DaemonUnreachable on other non-ok HTTP statuses', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 });
    const fn = await getRegisterSession();
    await expect(fn(REQ)).rejects.toMatchObject({
      error_type: 'DaemonUnreachable',
      message: expect.stringContaining('HTTP 503'),
    });
  });

  it('returns parsed body on happy path; sends correct headers + JSON body', async () => {
    const body = {
      name: 'alpha',
      cwd: '/repo/path',
      tmux_target: 'foxworks:alpha',
      registered_at: '2026-05-05T12:00:00Z',
    };
    fetchSpy.mockResolvedValue({ ok: true, status: 200, json: async () => body });
    const fn = await getRegisterSession();
    const result = await fn(REQ);
    expect(result).toEqual(body);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe('http://localhost:7878/v2/sessions');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['X-Conductor-Token']).toBe('tok-default');
    expect(headers['content-type']).toBe('application/json');
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody).toMatchObject({
      name: 'alpha',
      cwd: '/repo/path',
      tmux_target: 'foxworks:alpha',
      handoff_path: '/repo/path/HANDOFF.md',
    });
  });
});

describe('default tmux runners (via deps.runTmux* round-trip)', () => {
  async function getRunners() {
    const deps = await defaultSpawnHandlerDeps();
    return deps;
  }

  it('runTmuxNewSession wraps execFile error and copies .stderr onto wrapped Error', async () => {
    // KNOWN: spawn-handler's isDuplicateSessionError heuristic depends on
    // the wrapped error carrying .stderr from the underlying tmux exec.
    // Drop this propagation and the heuristic stops detecting duplicate-
    // session collisions.
    mocks.execFile.mockImplementation(
      (
        _bin: string,
        _args: readonly string[],
        opts: unknown,
        cb: (e: NodeJS.ErrnoException | null) => void,
      ) => {
        const callback = typeof opts === 'function' ? (opts as typeof cb) : cb;
        const err = new Error('tmux failed') as NodeJS.ErrnoException & {
          stderr?: string;
        };
        err.stderr = 'duplicate session: alpha';
        callback(err);
      },
    );
    const deps = await getRunners();
    await expect(
      (deps.runTmuxNewSession as (a: readonly string[], e: unknown) => Promise<void>)(
        ['new-session', '-d'],
        {} as never,
      ),
    ).rejects.toMatchObject({ stderr: 'duplicate session: alpha' });
  });

  it('runTmuxNewSession resolves on execFile success', async () => {
    const deps = await getRunners();
    await expect(
      (deps.runTmuxNewSession as (a: readonly string[], e: unknown) => Promise<void>)(
        ['new-session', '-d'],
        {} as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('runTmuxKillSession swallows errors (best-effort cleanup)', async () => {
    // KNOWN: spawn-handler.ts calls runTmuxKillSession defensively after
    // a failed flow. The runner must never throw because a missing tmux
    // session is the expected case during cleanup.
    mocks.execFile.mockImplementation(
      (
        _bin: string,
        _args: readonly string[],
        opts: unknown,
        cb: (e: NodeJS.ErrnoException | null) => void,
      ) => {
        const callback = typeof opts === 'function' ? (opts as typeof cb) : cb;
        callback(new Error('no such session') as NodeJS.ErrnoException);
      },
    );
    const deps = await getRunners();
    await expect(
      (deps.runTmuxKillSession as (n: string) => Promise<void>)('alpha'),
    ).resolves.toBeUndefined();
  });

  it('runTmuxHasSession rejects on non-zero exit (duplicate-name guard)', async () => {
    // KNOWN: cairn #73 — has-session returns 0 for present, 1 for absent.
    // Caller wraps the rejection.
    mocks.execFile.mockImplementation(
      (
        _bin: string,
        _args: readonly string[],
        opts: unknown,
        cb: (e: NodeJS.ErrnoException | null) => void,
      ) => {
        const callback = typeof opts === 'function' ? (opts as typeof cb) : cb;
        callback(new Error('exit 1') as NodeJS.ErrnoException);
      },
    );
    const deps = await getRunners();
    await expect(
      (deps.runTmuxHasSession as (n: string) => Promise<void>)('alpha'),
    ).rejects.toThrow();
  });
});

describe('registerSpawnIpcHandlers — IPC wiring + dialog + spawn-result routing', () => {
  function makeEvent() {
    const send = vi.fn();
    return { event: { sender: { send } }, send };
  }

  async function waitForSendCalled(
    send: ReturnType<typeof vi.fn>,
    timeoutMs = 1000,
  ): Promise<unknown[]> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (send.mock.calls.length > 0) return send.mock.calls[0]!;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error('waitForSendCalled timeout');
  }

  it('registers workstation:open-repo-dialog (handle) and workstation:spawn-requested (on)', () => {
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    expect(Array.from(mocks.handleHandlers.keys())).toContain(
      'workstation:open-repo-dialog',
    );
    expect(Array.from(mocks.onHandlers.keys())).toContain(
      'workstation:spawn-requested',
    );
  });

  it('open-repo-dialog returns null when canceled', async () => {
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.handleHandlers.get('workstation:open-repo-dialog')!;
    mocks.dialogShowOpen.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await fn({})).toBeNull();
  });

  it('open-repo-dialog returns null when filePaths is empty', async () => {
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.handleHandlers.get('workstation:open-repo-dialog')!;
    mocks.dialogShowOpen.mockResolvedValue({ canceled: false, filePaths: [] });
    expect(await fn({})).toBeNull();
  });

  it('open-repo-dialog returns first filePath on success', async () => {
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.handleHandlers.get('workstation:open-repo-dialog')!;
    mocks.dialogShowOpen.mockResolvedValue({
      canceled: false,
      filePaths: ['/Users/test/repo'],
    });
    expect(await fn({})).toBe('/Users/test/repo');
  });

  it('spawn-requested success path sends workstation:spawn-result with success reply', async () => {
    const stubResult = {
      sessionName: 'alpha',
      tmuxTarget: 'foxworks:alpha',
      cwd: '/repo',
      registered: { name: 'alpha' },
    };
    mocks.spawnSession.mockResolvedValue(stubResult);
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.onHandlers.get('workstation:spawn-requested')!;
    const { event, send } = makeEvent();
    fn(event, { sessionName: 'alpha', cwd: '/repo' });
    const call = await waitForSendCalled(send);
    expect(call[0]).toBe('workstation:spawn-result');
    expect(call[1]).toEqual({ type: 'success', result: stubResult });
  });

  it('spawn-requested error path sends spawn-result with mapped error envelope', async () => {
    mocks.spawnSession.mockRejectedValue(
      Object.assign(new Error('cap reached'), {
        error_type: 'SessionCapExceeded',
        cap: 5,
        activeCount: 5,
      }),
    );
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.onHandlers.get('workstation:spawn-requested')!;
    const { event, send } = makeEvent();
    fn(event, { sessionName: 'alpha', cwd: '/repo' });
    const call = await waitForSendCalled(send);
    expect(call[0]).toBe('workstation:spawn-result');
    expect(call[1]).toMatchObject({
      type: 'error',
      error: { error_type: 'SessionCapExceeded', cap: 5, activeCount: 5 },
    });
  });

  it('spawn-requested swallows event.sender.send throws (renderer closed mid-flight)', async () => {
    // KNOWN: §4 — event.sender.send may throw if renderer closed. The
    // catch-and-ignore protects the main process from an unhandled
    // rejection bubble crashing the app.
    mocks.spawnSession.mockResolvedValue({
      sessionName: 'alpha',
      tmuxTarget: 'foxworks:alpha',
      cwd: '/repo',
      registered: { name: 'alpha' },
    });
    registerSpawnIpcHandlers({ controller: new SpawnIpcController({} as never) });
    const fn = mocks.onHandlers.get('workstation:spawn-requested')!;
    const send = vi.fn().mockImplementation(() => {
      throw new Error('renderer destroyed');
    });
    const event = { sender: { send } };
    // Must not throw or unhandled-reject; assert by waiting + observing
    // no unhandledRejection is raised in the test runner.
    fn(event, { sessionName: 'alpha', cwd: '/repo' });
    await new Promise((r) => setTimeout(r, 50));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('uses defaultSpawnHandlerDeps when no controller is injected (cairn #72 deferred-resolve path)', async () => {
    // KNOWN: production wiring path. defaultSpawnHandlerDeps awaits
    // resolveClaudeBin asynchronously; first spawn awaits the same
    // promise. Asserting the promise resolves means the deferred-
    // resolve path is reachable.
    mocks.resolveClaudeBin.mockResolvedValue('/usr/local/bin/claude');
    mocks.spawnSession.mockResolvedValue({
      sessionName: 'alpha',
      tmuxTarget: 'foxworks:alpha',
      cwd: '/repo',
      registered: { name: 'alpha' },
    });
    registerSpawnIpcHandlers({}); // no controller → defaultSpawnHandlerDeps
    const fn = mocks.onHandlers.get('workstation:spawn-requested')!;
    const { event, send } = makeEvent();
    fn(event, { sessionName: 'alpha', cwd: '/repo' });
    const call = await waitForSendCalled(send, 2000);
    expect(call[0]).toBe('workstation:spawn-result');
    expect(call[1]).toMatchObject({ type: 'success' });
  });
});
