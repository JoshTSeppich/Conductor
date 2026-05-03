// MB-T08 Cluster 4 GREEN — production ProcessController for SmokeHarness.
//
// Spawns the built workstation Electron app as a child process, parses stdout
// for sentinels (extends spawn-modal-emits-intent.test.ts:57 spawnApp pattern),
// pipes stdin commands through, and waits for clean exit on QUIT.
//
// "Headless" in v3.0 is best-effort: Electron's hidden-window mode is not
// fully headless on macOS (the dock icon still appears briefly per MB-S05
// ADR observations). For ship-gate validation that's acceptable — operator
// runs the smoke harness on a developer machine, not in CI. CI integration
// is operator-territory and tracked as a separate followup.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ProcessController,
  ProcessLaunchOpts,
} from './smoke-harness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../..');
const ELECTRON_BIN = resolve(PACKAGE_ROOT, 'node_modules/.bin/electron');
const MAIN_JS = resolve(PACKAGE_ROOT, 'dist/main/main.js');
const SHELL_HTML = resolve(PACKAGE_ROOT, 'dist/main/workstation-shell.html');
const PRELOAD_CJS = resolve(PACKAGE_ROOT, 'dist/main/preload.cjs');

const DEFAULT_SENTINEL_TIMEOUT_MS = 30_000;

export interface ElectronProcessControllerOpts {
  /** Override sentinel-wait timeout. Default 30s. */
  sentinelTimeoutMs?: number;
}

export class ElectronProcessController implements ProcessController {
  private child: ChildProcess | null = null;
  private stdoutBuffer = '';
  private stderrBuffer = '';
  private readonly sentinelTimeoutMs: number;

  constructor(opts: ElectronProcessControllerOpts = {}) {
    this.sentinelTimeoutMs = opts.sentinelTimeoutMs ?? DEFAULT_SENTINEL_TIMEOUT_MS;
  }

  isLaunched(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  async launch(opts: ProcessLaunchOpts): Promise<void> {
    if (this.isLaunched()) {
      throw new Error('Electron process already launched');
    }
    for (const required of [ELECTRON_BIN, MAIN_JS, SHELL_HTML, PRELOAD_CJS]) {
      if (!existsSync(required)) {
        throw new Error(
          `smoke prerequisite missing: ${required}. Run \`pnpm --filter dispatch-workstation build\` first.`,
        );
      }
    }
    this.child = spawn(ELECTRON_BIN, [MAIN_JS], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
        ...opts.env,
      },
    });
    this.child.stdout?.on('data', (d: Buffer) => {
      const s = d.toString();
      this.stdoutBuffer += s;
      // Mirror to operator stdout for live progress.
      process.stdout.write(`[smoke] ${s}`);
    });
    this.child.stderr?.on('data', (d: Buffer) => {
      const s = d.toString();
      this.stderrBuffer += s;
      process.stderr.write(`[smoke-err] ${s}`);
    });
  }

  async sendStdin(line: string): Promise<void> {
    if (!this.child || !this.child.stdin) {
      throw new Error('Cannot sendStdin: process not launched');
    }
    this.child.stdin.write(line + '\n');
  }

  async waitForSentinel(name: string): Promise<void> {
    return new Promise((resolveP, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (this.stdoutBuffer.split('\n').some((l) => l === name)) {
          clearInterval(interval);
          resolveP();
          return;
        }
        if (Date.now() - start > this.sentinelTimeoutMs) {
          clearInterval(interval);
          reject(
            new Error(
              `Timed out waiting for sentinel "${name}" after ${this.sentinelTimeoutMs}ms.\nstdout:\n${this.stdoutBuffer}\nstderr:\n${this.stderrBuffer}`,
            ),
          );
        }
      }, 50);
    });
  }

  async exit(): Promise<number | null> {
    if (!this.child) return 0;
    const child = this.child;
    return new Promise((resolveP) => {
      const onExit = (code: number | null): void => {
        this.child = null;
        resolveP(code);
      };
      if (child.exitCode !== null) {
        onExit(child.exitCode);
        return;
      }
      child.once('exit', onExit);
      // Fallback: SIGTERM if QUIT stdin doesn't work within 5s.
      setTimeout(() => {
        if (child.exitCode === null && !child.killed) {
          child.kill('SIGTERM');
        }
      }, 5_000);
    });
  }
}
