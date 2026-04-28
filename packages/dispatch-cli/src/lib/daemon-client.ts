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
