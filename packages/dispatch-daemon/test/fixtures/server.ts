/**
 * Reusable test-server spawn helper. First introduced in DAEMON-T01;
 * consumed by subsequent DAEMON-T tests (T02 auth, T03 health, etc.).
 *
 * Provides a started daemon on a random port with a convenient handle
 * plus a cleanup function. Tests should call close() in afterEach.
 */

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { startup } from '../../src/lifecycle/startup.js';
import { readRegistryV2 } from '../../src/migration/schema-v2.js';
import type {
  WatcherFactory,
  WatcherHandle,
  HandoffWatcherOpts,
} from '../../src/watchers/handoff.js';

export interface TestServer {
  app: FastifyInstance;
  port: number;
  url: string;
  /** Current auth token (populated by DAEMON-T02 green). */
  token: string | undefined;
  /**
   * WebSocket URL for /v2/events/stream (no query string).
   * Tests append `?token=<ts.token>` to authenticate.
   * Added in DAEMON-T12.
   */
  wsUrl: string;
  /**
   * Direct event emit fn — tests trigger events without HTTP for
   * P3/P4 (raw emit observability). Added in DAEMON-T12.
   */
  emit: import('../../src/events/bus.js').EmitFn;
  /**
   * Trigger a synthetic handoff_written event for a session via
   * the stub WatcherFactory. Reads the session's handoff_path
   * from the seeded registry and fires the watcher's onWritten
   * callback with {path, size_bytes}. Added in DAEMON-T13.
   *
   * Naming pattern: T14/T15 will follow with triggerGitCommit
   * and triggerStatusJsonUpdate.
   */
  triggerHandoffWrite: (
    sessionName: string,
    opts?: { size_bytes?: number },
  ) => Promise<void>;
  close: () => Promise<void>;
}

export interface SpawnTestServerOpts {
  /** Pass a test-isolated token path so tests do not touch the operator's real token file. */
  tokenPath?: string;
  /**
   * Register routes before `app.listen()`. Added in DAEMON-T04
   * so tests can attach throwing routes that exercise the error
   * handler. Fastify 5 rejects route registration after listen,
   * so post-spawn `ts.app.get(...)` is not an option.
   */
  beforeListen?: (app: FastifyInstance) => Promise<void> | void;
  /**
   * Test-isolated sessions.json path. Added in DAEMON-T06 so tests
   * can seed the registry via writeRegistryV2 without touching the
   * operator's real registry.
   */
  registryPath?: string;
  /**
   * tmux operation injector. Tests supply a stub so side effects
   * are observable + simulatable-to-fail without hitting real tmux.
   * Added in DAEMON-T08.
   */
  tmuxOps?: import('../../src/state/transitions.js').TmuxOps;
  /**
   * Archive root directory for prompt + handoff persistence.
   * Auto-isolated per established T06 pattern when omitted.
   * Added in DAEMON-T09.
   */
  archiveRoot?: string;
  /**
   * Clipboard copy operation. Defaults to no-op so tests never
   * clobber the operator's real pbcopy clipboard. Tests can
   * override with a recording stub to verify clipboard delivery.
   * Added in DAEMON-T10.
   */
  clipboardCopy?: (content: string) => Promise<void>;
  /**
   * Event ring buffer. Tests pass a pre-seeded ring to verify
   * GET /v2/events pagination. When omitted, startup() creates
   * a default fresh ring at standard capacity. Added in
   * DAEMON-T11 (T17 pulled forward from D-5).
   */
  eventRing?: import('../../src/events/history.js').EventRing;
  /**
   * Watcher factory. Default = a stub mock that records onWritten
   * callbacks per handoff path; tests trigger via TestServer's
   * triggerHandoffWrite helper. Tests can pass their own factory
   * to observe attach/detach lifecycle directly. Added in
   * DAEMON-T13.
   */
  watcherFactory?: WatcherFactory;
}

/**
 * Mock watcher factory used by the fixture by default. Records
 * each createHandoffWatcher's onWritten callback keyed by the
 * handoffPath; close() removes that subscriber. Multiple
 * subscribers per path are supported (set semantics).
 *
 * fire(handoffPath, data) invokes every subscriber for that
 * path. The fixture's triggerHandoffWrite resolves a session's
 * handoff_path from the seeded registry and calls fire().
 */
interface MockWatcherFactory extends WatcherFactory {
  fire(
    handoffPath: string,
    data: { path: string; size_bytes: number },
  ): void;
}

function createMockWatcherFactory(): MockWatcherFactory {
  type Cb = (data: { path: string; size_bytes: number }) => void;
  const subscribers = new Map<string, Map<symbol, Cb>>();

  return {
    createHandoffWatcher(opts: HandoffWatcherOpts): WatcherHandle {
      const id = Symbol();
      let bucket = subscribers.get(opts.handoffPath);
      if (!bucket) {
        bucket = new Map();
        subscribers.set(opts.handoffPath, bucket);
      }
      bucket.set(id, opts.onWritten);
      return {
        close: () => {
          const b = subscribers.get(opts.handoffPath);
          b?.delete(id);
          if (b && b.size === 0) subscribers.delete(opts.handoffPath);
        },
      };
    },
    fire(handoffPath, data) {
      const bucket = subscribers.get(handoffPath);
      if (!bucket) return;
      for (const cb of bucket.values()) cb(data);
    },
  };
}

/**
 * Ensure the fixture never routes tests at the operator's real
 * ~/.foxworks-dispatch/token or ~/.foxworks-dispatch/sessions.json.
 * If the caller omits a path, generate a mkdtemp-isolated default
 * so startup's `getOrCreateToken` and `readRegistryV2` land on a
 * per-invocation tempdir instead of production state.
 */
async function isolatedDefault(prefix: string, filename: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  return join(dir, filename);
}

export async function spawnTestServer(
  opts: SpawnTestServerOpts = {},
): Promise<TestServer> {
  const tokenPath =
    opts.tokenPath ?? (await isolatedDefault('fd-fixture-tok-', 'token'));
  const registryPath =
    opts.registryPath ??
    (await isolatedDefault('fd-fixture-reg-', 'sessions.json'));
  const archiveRoot =
    opts.archiveRoot ?? (await isolatedDefault('fd-fixture-arc-', 'archive'));
  // Defense-in-depth: default to no-op clipboard so tests never
  // clobber operator's real pbcopy. Tests pass a stub explicitly
  // when they want to verify delivery.
  const clipboardCopy =
    opts.clipboardCopy ?? (async (_content: string) => { /* no-op */ });

  // Defense-in-depth: default to a mock watcher factory so tests
  // never touch real fs.watch on test-isolated handoff paths
  // (avoids fs.watch flake under CI). Tests can pass their own
  // factory to observe lifecycle directly.
  const mockFactory =
    opts.watcherFactory ?? createMockWatcherFactory();

  // logger:false silences per-request Pino output for test ergonomics.
  // Production startup() defaults to info-level logging.
  const { server, port, token, emit, close } = await startup({
    port: 0,
    logger: false,
    tokenPath,
    beforeListen: opts.beforeListen,
    registryPath,
    tmuxOps: opts.tmuxOps,
    archiveRoot,
    clipboardCopy,
    eventRing: opts.eventRing,
    watcherFactory: mockFactory,
  });

  const triggerHandoffWrite = async (
    sessionName: string,
    triggerOpts: { size_bytes?: number } = {},
  ): Promise<void> => {
    const reg = await readRegistryV2(registryPath);
    const session = reg.sessions[sessionName];
    if (!session) {
      throw new Error(
        `triggerHandoffWrite: session "${sessionName}" not in registry`,
      );
    }
    // Only the default mock factory exposes fire(); custom factories
    // passed by tests bypass this helper and trigger via their own
    // protocol.
    if ('fire' in mockFactory && typeof (mockFactory as MockWatcherFactory).fire === 'function') {
      (mockFactory as MockWatcherFactory).fire(session.handoff_path, {
        path: session.handoff_path,
        size_bytes: triggerOpts.size_bytes ?? 100,
      });
    } else {
      throw new Error(
        'triggerHandoffWrite: custom watcherFactory does not expose fire()',
      );
    }
  };

  return {
    app: server,
    port,
    url: `http://127.0.0.1:${port}`,
    wsUrl: `ws://127.0.0.1:${port}/v2/events/stream`,
    token,
    emit,
    triggerHandoffWrite,
    close,
  };
}
