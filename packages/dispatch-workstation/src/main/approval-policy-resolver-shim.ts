// MB-F-T11-T13-RESOLVER-STUB closure — thin shim wrapping the real resolver.
//
// Bridges the v3.5 action-marker-router call site (WB9; calls via
// dispatchActionVariant.deps.resolveApproval) — passes
// `{ actionType, sessionName }` — to sess-mbt13's real resolver
// (which expects `{ policy, actionType }`). Responsibilities:
//
//   1. Fetch the per-session ApprovalPolicy via daemon HTTP
//      (`GET /v3/sessions/:name/approval-policy`).
//   2. Cast `MBT11ActionType` → `ApprovalActionType` (value-safe — the two
//      enums enumerate identical 5-member literal sets; nominal-type bridge
//      only). The cast is retired by `MB-F-T11-T13-ACTION-TYPE-ENUM-DEDUP`.
//   3. Delegate to `resolveApproval` with the assembled input.
//   4. Return the resolver's result unchanged.
//
// Failure-graceful posture differentiates two distinct failure classes:
//
//   - Daemon 200 OK + parseable body with a valid `approval_policy` → use
//     that policy verbatim. This includes the daemon's documented no-row
//     case, which returns `{ approval_policy: 'medium', ... }` per
//     approval-policy.ts L82. We trust the daemon's authoritative answer
//     (medium for no-row, tight/medium/loose for row-exists).
//
//   - Anything else (no token available, fetch throws, non-200 status,
//     malformed body, missing/invalid `approval_policy` field) → fall back
//     to `'tight'` as a safety posture. Rationale: when we cannot reach
//     the config service authoritatively, we don't know what policy was
//     intended for this session. The cost of a false-positive approval
//     gate is small (operator clicks Approve); the cost of a false-
//     negative auto-fire is large (irreversible action without operator
//     consent). Conservative gating is the right default for unknowns.
//
// IMPORTANT: do NOT "consolidate" the two failure paths to a single
// `'medium'` fallback for consistency with the daemon's no-row default.
// The distinction between "daemon says medium" (authoritative) and "we
// can't ask the daemon" (unknown) is load-bearing for safety semantics.
//
// Inline fetch helper instead of an `HttpDaemonClient` method: this shim is
// intentionally short-lived. Per `MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE`,
// the action-marker-router call site rewrites in a follow-on ticket to
// fetch the policy upstream once per dispatch cycle and pass it directly
// to the real (sync) resolver — at which point this shim is deleted
// entirely. Adding a reusable client method now would be premature
// investment.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  resolveApproval,
  type ApprovalActionType,
  type ApprovalPolicy,
  type ApprovalResolverResult,
} from './approval-policy-resolver.js';
import type { MBT11ActionType } from './orchestrator-action-types.js';

const DAEMON_URL = process.env['FOXWORKS_DAEMON_URL'] ?? 'http://localhost:7878';

/** Input to the shim — preserves the (actionType, sessionName) call shape from the stub era. */
export interface ShimResolverInput {
  actionType: MBT11ActionType;
  sessionName: string;
}

/** Result type — identical shape to `ApprovalResolverResult`; aliased for call-site stability. */
export type ShimResolverResult = ApprovalResolverResult;

function readDaemonToken(): string | null {
  try {
    const tokenPath = join(homedir(), '.foxworks-dispatch', 'token');
    return readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return null;
  }
}

const VALID_POLICIES: readonly ApprovalPolicy[] = ['tight', 'medium', 'loose'];

function isApprovalPolicy(v: unknown): v is ApprovalPolicy {
  return typeof v === 'string' && (VALID_POLICIES as readonly string[]).includes(v);
}

/**
 * Fetch the per-session approval policy. Returns whatever policy the daemon
 * reports on a successful 200 + valid-body response (including the daemon's
 * documented no-row default of `'medium'`). Returns `'tight'` on any failure
 * to obtain an authoritative answer (no token, fetch throws, non-200, body
 * cannot be parsed, body lacks a valid policy field).
 *
 * See file-header docblock for the rationale on differentiating "daemon says
 * medium" (authoritative no-row default) from "we can't reach the daemon"
 * (unknown — gate conservatively).
 *
 * Exported for unit-test injection. Production callers use the default-arg
 * `globalThis.fetch` + `readDaemonToken()` path.
 */
export async function fetchSessionApprovalPolicy(
  sessionName: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = DAEMON_URL,
  token: string | null = readDaemonToken(),
): Promise<ApprovalPolicy> {
  // No token → can't authenticate the daemon call. Treat as unknown-policy.
  if (!token) return 'tight';
  try {
    const res = await fetchImpl(
      `${baseUrl}/v3/sessions/${encodeURIComponent(sessionName)}/approval-policy`,
      { headers: { 'X-Conductor-Token': token } },
    );
    // Non-200 → daemon reachable but rejected/errored. Treat as unknown-policy.
    if (!res.ok) return 'tight';
    const body = (await res.json()) as { approval_policy?: unknown };
    // Authoritative answer (includes daemon's no-row default of 'medium' per
    // approval-policy.ts L82). Trust it.
    if (isApprovalPolicy(body.approval_policy)) return body.approval_policy;
    // 200 OK but body shape unexpected — daemon contract drift. Treat as
    // unknown-policy rather than guessing.
    return 'tight';
  } catch {
    // Fetch threw (network error, timeout, JSON parse fail). Unknown-policy.
    return 'tight';
  }
}

/**
 * Shim resolver. Fetches per-session policy, calls the real resolver, returns
 * its result. Async because of the daemon HTTP fetch — the underlying
 * `resolveApproval` is pure and synchronous.
 *
 * Predicates intentionally unset at this seam: the v3.5 dispatchActionVariant
 * call path does not yet compute willCommit / willTouchContract / isMultiStep predicates
 * from action payloads. Per the real resolver's R3 graceful-degradation
 * contract (approval-policy-resolver.ts L46–50), missing predicates yield the
 * most-permissive correct answer under medium — matching the §3.2 "low-friction
 * default" framing. Predicate computation lands with the call-site rewrite
 * tracked at MB-F-T11-T13-RESOLVER-CALL-SITE-REWRITE.
 */
export async function resolveApprovalShim(
  input: ShimResolverInput,
): Promise<ShimResolverResult> {
  const policy = await fetchSessionApprovalPolicy(input.sessionName);
  return resolveApproval({
    policy,
    actionType: input.actionType as ApprovalActionType,
  });
}
