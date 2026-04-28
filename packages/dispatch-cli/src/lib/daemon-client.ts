/**
 * Daemon HTTP client primitives for CLI-T01.
 *
 * Pure helpers (formatDaemonError, buildInitRequestBody,
 * formatListOutput) get red→green TDD per finding #36
 * framework. HTTP variants of v1 commands (runInitV2 etc.)
 * live alongside; smoke-tested at CLI-T05 via the existing
 * v1 regression suite running with daemon live.
 *
 * Verbatim source preservation per finding #37 discipline:
 * - buildInitRequestBody applies "v1 init.ts:32 convention
 *   preserved" handoff_path = join(cwd, 'HANDOFF.md')
 * - formatListOutput matches "v1 list.ts:14-20 verbatim
 *   shape" (tab-separated, sorted, \n-terminated)
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { State } from 'dispatch-core/src/v2/schema.js';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:7878';

// ─── Pure helpers (P2-P4 testable layer) ────────────────────────

export interface InitArgsForBody {
  name: string;
  cwd: string;
  target: string;
}

export interface InitRequestBody {
  name: string;
  cwd: string;
  tmux_target: string;
  handoff_path: string;
}

/**
 * Build POST /v2/sessions request body from v1 fd init args.
 * v1 init.ts:32 convention preserved: handoff_path =
 * join(cwd, 'HANDOFF.md').
 */
export function buildInitRequestBody(args: InitArgsForBody): InitRequestBody {
  return {
    name: args.name,
    cwd: args.cwd,
    tmux_target: args.target,
    handoff_path: join(args.cwd, 'HANDOFF.md'),
  };
}

export interface ListSessionLike {
  name: string;
  cwd: string;
  tmux_target: string;
}

/**
 * Format daemon's GET /v2/sessions response into v1 fd list
 * stdout shape. Matches v1 list.ts:14-20 verbatim:
 *   tab-separated <name>\t<cwd>\t<tmux_target>
 *   sorted by name
 *   each line \n-terminated
 *   empty array → empty string
 *
 * Daemon already sorts by name (sessions.ts:84) but we sort
 * defensively to match v1's sort-locally semantic.
 */
export function formatListOutput(
  sessions: readonly ListSessionLike[],
): string {
  if (sessions.length === 0) return '';
  const sorted = [...sessions].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    sorted
      .map((s) => `${s.name}\t${s.cwd}\t${s.tmux_target}`)
      .join('\n') + '\n'
  );
}

/**
 * Extract a human-readable error string from a daemon HTTP
 * response. Daemon shape (T04 ADR + all routes): {error: '...'}.
 * Falls back to status text for non-daemon-shape bodies and
 * to a generic message for null bodies (network errors).
 */
export function formatDaemonError(
  response: Response,
  body: unknown,
): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'string' && err.length > 0) return err;
  }
  if (response.statusText && response.status > 0) {
    return `HTTP ${response.status} ${response.statusText}`;
  }
  return `daemon request failed (no response body)`;
}

/**
 * Build PATCH /v2/sessions/:name/state request body per
 * DAEMON-T08 + dispatch-core PatchStateRequest schema.
 * Pure shape lock (CLI-T03 P1).
 */
export function buildPatchStateBody(target: State): { state: State } {
  return { state: target };
}

// ─── CLI-T04 daemon-dead fallback primitives ────────────────────

export interface ProbeOpts {
  baseUrl?: string;
  /** Probe timeout. Default 500ms per X2 §CLI-T04 line 346
   *  verbatim. */
  timeoutMs?: number;
}

const PROBE_TIMEOUT_MS = 500;

/**
 * Probe GET /v2/health per contract §7.2 verbatim:
 *   "If daemon is not running (GET /v2/health fails), fd v1
 *    commands fall back to direct fd v1 behavior"
 *
 * Per Arbitration 4: never throws on failure. Connection
 * refused, timeout, and non-2xx all map to false. Caller
 * (dispatcher) decides UX (warn-log + fall back to v1, or
 * throw "requires daemon" for T03 commands via
 * assertDaemonRunning).
 */
export async function probeDaemon(opts: ProbeOpts = {}): Promise<boolean> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/health`;
  const timeoutMs = opts.timeoutMs ?? PROBE_TIMEOUT_MS;
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * X2 §CLI-T04 line 351 verbatim T03 fallback error:
 *   "This command requires the Conductor daemon. Start it
 *    with `launchctl ...`."
 *
 * T03 commands (kill/pause/hold/arm) prepend
 * assertDaemonRunning to fail-fast before any HTTP attempt
 * or destructive confirmation prompt. Per Arbitration 3A:
 * per-command guard placement (not in shared helper).
 */
const DAEMON_REQUIRED_MSG =
  'This command requires the Conductor daemon. Start it with `launchctl ...`.';

export async function assertDaemonRunning(
  opts: ProbeOpts = {},
): Promise<void> {
  const ok = await probeDaemon(opts);
  if (!ok) {
    throw new Error(DAEMON_REQUIRED_MSG);
  }
}

// ─── HTTP variants (smoke-tested at T05) ────────────────────────

export interface HttpClientOpts {
  baseUrl?: string;
  token: string;
}

interface JsonResponse {
  status: number;
  ok: boolean;
  body: unknown;
  raw: Response;
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<JsonResponse> {
  const raw = await fetch(url, init);
  let body: unknown = null;
  try {
    body = await raw.json();
  } catch {
    /* non-JSON body — leave as null */
  }
  return { status: raw.status, ok: raw.ok, body, raw };
}

function authHeaders(token: string): Record<string, string> {
  return {
    'x-conductor-token': token,
    'content-type': 'application/json',
  };
}

export interface InitV2Args extends InitArgsForBody {}

export async function runInitV2(
  args: InitV2Args,
  opts: HttpClientOpts,
): Promise<void> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/sessions`;
  const r = await fetchJson(url, {
    method: 'POST',
    headers: authHeaders(opts.token),
    body: JSON.stringify(buildInitRequestBody(args)),
  });
  if (r.status !== 201) {
    throw new Error(formatDaemonError(r.raw, r.body));
  }
}

export async function runListV2(opts: HttpClientOpts): Promise<string> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/sessions`;
  const r = await fetchJson(url, {
    method: 'GET',
    headers: authHeaders(opts.token),
  });
  if (!r.ok) {
    throw new Error(formatDaemonError(r.raw, r.body));
  }
  const sessions =
    (r.body as { sessions?: ListSessionLike[] } | null)?.sessions ?? [];
  return formatListOutput(sessions);
}

export interface SendV2Args {
  name: string;
  promptFile: string;
}

export async function runSendV2(
  args: SendV2Args,
  opts: HttpClientOpts,
): Promise<void> {
  const body = await readFile(args.promptFile, 'utf8');
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/sessions/${encodeURIComponent(args.name)}/prompts`;
  const r = await fetchJson(url, {
    method: 'POST',
    headers: authHeaders(opts.token),
    body: JSON.stringify({ body }),
  });
  if (!r.ok) {
    throw new Error(formatDaemonError(r.raw, r.body));
  }
}

export interface PullV2Args {
  name: string;
  stdout?: { write: (s: string) => void };
  clipboard?: (content: string) => Promise<void>;
}

/**
 * Extract notifications_available from /v2/health response
 * body. Per S03 ADR §"Graceful degradation": default to
 * false on missing/invalid (UI fallback path is always
 * correct when we say unavailable). Pure function — unit-
 * tested at P3.
 */
export function parseHealthResponse(
  body: unknown,
): { notifications_available: boolean } {
  if (!body || typeof body !== 'object') {
    return { notifications_available: false };
  }
  const v = (body as { notifications_available?: unknown })
    .notifications_available;
  return { notifications_available: typeof v === 'boolean' ? v : false };
}

/**
 * GET /v2/health (auth-exempt per §4.1 + auth.ts:74-76).
 * Smoke-tested at CLI-T05 (finding #36 boundary).
 */
export async function fetchHealth(
  opts: { baseUrl?: string } = {},
): Promise<{ notifications_available: boolean }> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/health`;
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`health check failed: HTTP ${r.status}`);
  }
  const body = await r.json().catch(() => null);
  return parseHealthResponse(body);
}

/**
 * CLI-T03 shared HTTP helper for the 4 state commands.
 * PATCH /v2/sessions/:name/state with target state body.
 * Reuses formatDaemonError for 422 (invalid transition per
 * §6.1) + 404 (unknown session) surfacing per X2 lines
 * 338-339 verbatim. Smoke-tested at T06.
 */
export async function runStateTransitionV2(
  name: string,
  target: State,
  opts: HttpClientOpts,
): Promise<void> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/sessions/${encodeURIComponent(name)}/state`;
  const r = await fetchJson(url, {
    method: 'PATCH',
    headers: authHeaders(opts.token),
    body: JSON.stringify(buildPatchStateBody(target)),
  });
  if (!r.ok) {
    throw new Error(formatDaemonError(r.raw, r.body));
  }
}

export async function runPullV2(
  args: PullV2Args,
  opts: HttpClientOpts,
): Promise<void> {
  const url = `${opts.baseUrl ?? DEFAULT_BASE_URL}/v2/sessions/${encodeURIComponent(args.name)}/handoff`;
  const r = await fetchJson(url, {
    method: 'GET',
    headers: authHeaders(opts.token),
  });
  if (!r.ok) {
    throw new Error(formatDaemonError(r.raw, r.body));
  }
  const content =
    (r.body as { content?: string } | null)?.content ?? '';
  const stdout = args.stdout ?? process.stdout;
  stdout.write(content);
  // Arbitration 6 = B: CLI also pbcopies for v1 parity.
  // Daemon already copied via T10's pbcopy; duplicate is
  // benign per X2 line 313 verbatim ("daemon already copies,
  // CLI prints; duplicate clipboard calls are benign").
  // Failure-mode robustness: if daemon's pbcopy failed
  // post-archive, CLI's pbcopy ensures clipboard still set.
  if (args.clipboard) {
    await args.clipboard(content);
  }
}
