/**
 * MB-F-DAEMON-CONCURRENT-RACE — parent-side spawn helper for both
 * cli-writer-child and daemon-writer-child.
 *
 * Both children share the same RACE_ARGS env contract and stdout
 * protocol (READY → optional barrier → DONE). One spawn fn covers
 * both via the `flavor` arg.
 *
 * Confidence: KNOWN — child_process.spawn + readline against stdout
 * is a standard cross-process synchronization pattern.
 *
 * Resolution semantics:
 *   cwd defaults to the workspace root so `node --import tsx` resolves
 *   tsx via root node_modules (hoisted devDependency). The child's
 *   own ESM imports walk up from the script file's directory, finding
 *   dispatch-core via packages/dispatch-daemon/node_modules.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Workspace root resolved relative to this helper's location. */
const WORKSPACE_ROOT = resolve(__dirname, '../../../../../..');

export type Flavor = 'cli' | 'daemon';

export interface SpawnChildArgs {
  flavor: Flavor;
  registryPath: string;
  mutate: { session: string; field: string; value: unknown };
  /** When set, child snapshots, prints READY, awaits barrier, then writes. */
  barrierPath?: string;
}

export interface ChildHandle {
  process: ChildProcess;
  /** Resolves when child prints "READY\n" to stdout. */
  ready: Promise<void>;
  /**
   * Resolves when the child exits. Captures exit code, full stdout,
   * full stderr, and (if non-zero exit) any "ERROR <msg>" line.
   */
  done: Promise<ChildResult>;
  /** SIGKILL the child if still alive. Idempotent. */
  kill(): void;
}

export interface ChildResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

const SCRIPT_BY_FLAVOR: Record<Flavor, string> = {
  cli: join(__dirname, 'cli-writer-child.ts'),
  daemon: join(__dirname, 'daemon-writer-child.ts'),
};

export function spawnChild(args: SpawnChildArgs): ChildHandle {
  const script = SCRIPT_BY_FLAVOR[args.flavor];
  const env = {
    ...process.env,
    RACE_ARGS: JSON.stringify({
      registryPath: args.registryPath,
      mutate: args.mutate,
      barrierPath: args.barrierPath,
    }),
  };

  const child = spawn(
    process.execPath,
    ['--import', 'tsx', script],
    { cwd: WORKSPACE_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let stdout = '';
  let stderr = '';
  let resolveReady: () => void;
  let rejectReady: (err: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Tests that only await `done` (e.g., the missing-session probe in
  // probe-00) ignore `ready`. Attach a noop catch so a child-died-
  // before-READY rejection does not become an unhandled promise.
  // Tests that DO care about ready failures still observe the
  // rejection through their own `await child.ready`.
  ready.catch(() => {});
  let readySignaled = false;

  child.stdout!.setEncoding('utf8');
  child.stdout!.on('data', (chunk: string) => {
    stdout += chunk;
    if (!readySignaled && stdout.includes('READY\n')) {
      readySignaled = true;
      resolveReady();
    }
  });
  child.stderr!.setEncoding('utf8');
  child.stderr!.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const done = new Promise<ChildResult>((resolve) => {
    child.on('exit', (exitCode, signal) => {
      if (!readySignaled) {
        // Child died before printing READY. Surface via ready rejection.
        rejectReady(
          new Error(
            `${args.flavor} child exited (code=${exitCode}, signal=${signal}) before READY. stderr=${stderr.trim()}`,
          ),
        );
      }
      resolve({ exitCode, signal, stdout, stderr });
    });
  });

  return {
    process: child,
    ready,
    done,
    kill() {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    },
  };
}
