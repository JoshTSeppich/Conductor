/**
 * Command dispatchers for CLI-T01 (Shape B sequencing).
 *
 * Each fd command has a dispatcher that routes between the
 * v1 path (preserves existing behavior; tests at HEAD stay
 * green) and the V2 HTTP path (new in T01). T01 default
 * useHttp=false; T04 will invert based on a /v2/health
 * probe.
 *
 * Per finding #36 framework: dispatcher logic itself is
 * unit-tested at P5 (default-to-v1 wiring lock); the V2
 * branch is smoke-tested at CLI-T05 via the existing v1
 * regression suite running with a live daemon.
 */

import { runInit, type InitArgs } from '../commands/init.js';
import { runList, type ListArgs } from '../commands/list.js';
import { runPull, type PullArgs } from '../commands/pull.js';
import { runSend, type SendArgs } from '../commands/send.js';
import { runStatus } from '../commands/status.js';
import { runStatusV2 } from '../commands/status-v2.js';
import {
  runInitV2,
  runListV2,
  runPullV2,
  runSendV2,
} from './daemon-client.js';
import { loadToken } from './token.js';

export interface DispatchOpts {
  /** When true, dispatcher takes the V2 HTTP path. T01
   *  default: false (preserves v1 behavior). T04 inverts
   *  based on /v2/health probe result. */
  useHttp?: boolean;
  /** Base URL for daemon HTTP. Default
   *  http://127.0.0.1:7878. */
  baseUrl?: string;
  /** Pre-loaded token; if omitted, dispatcher calls
   *  loadToken() with optional tokenPath. */
  token?: string;
  /** Override default token path (~/.foxworks-dispatch/
   *  token). Useful for tests. */
  tokenPath?: string;
}

async function ensureToken(opts: DispatchOpts): Promise<string> {
  if (opts.token) return opts.token;
  return loadToken(opts.tokenPath);
}

export async function runInitDispatch(
  args: InitArgs,
  opts: DispatchOpts = {},
): Promise<void> {
  if (opts.useHttp) {
    const token = await ensureToken(opts);
    return runInitV2(
      { name: args.name, cwd: args.cwd, target: args.target },
      { token, baseUrl: opts.baseUrl },
    );
  }
  return runInit(args);
}

export async function runListDispatch(
  args: ListArgs = {},
  opts: DispatchOpts = {},
): Promise<string> {
  if (opts.useHttp) {
    const token = await ensureToken(opts);
    return runListV2({ token, baseUrl: opts.baseUrl });
  }
  return runList(args);
}

export async function runSendDispatch(
  args: SendArgs,
  opts: DispatchOpts = {},
): Promise<void> {
  if (opts.useHttp) {
    const token = await ensureToken(opts);
    return runSendV2(
      { name: args.name, promptFile: args.promptFile },
      { token, baseUrl: opts.baseUrl },
    );
  }
  return runSend(args);
}

export async function runPullDispatch(
  args: PullArgs,
  opts: DispatchOpts = {},
): Promise<void> {
  if (opts.useHttp) {
    const token = await ensureToken(opts);
    return runPullV2(
      { name: args.name, stdout: args.stdout, clipboard: args.clipboard },
      { token, baseUrl: opts.baseUrl },
    );
  }
  return runPull(args);
}

export interface StatusDispatchArgs {
  registryPath?: string;
}

/** CLI-T02 status dispatcher. Default useHttp=false routes
 *  to v1 runStatus (registry polling); T04 will invert based
 *  on /v2/health probe. V2 path requires a token; default
 *  v1 path doesn't. */
export async function runStatusDispatch(
  args: StatusDispatchArgs = {},
  opts: DispatchOpts = {},
): Promise<void> {
  if (opts.useHttp) {
    const token = await ensureToken(opts);
    return runStatusV2({ token, baseUrl: opts.baseUrl });
  }
  return runStatus(args);
}
