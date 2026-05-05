// Probe-92 / Probe 2 — daemon precondition.
//
// Asserts that the foxworks-daemon HTTP server at localhost:7878:
//   (a) responds 200 on GET /v2/sessions when given a valid x-conductor-token
//       header (the token from probe 1's disk-read).
//   (b) does NOT respond 200 without the token — confirms token-auth is
//       real, not optional. If the daemon were running with auth disabled
//       this probe would fail.
//
// Together with Probe 1, this establishes that the operator-side
// preconditions for a meaningful Fix-92 verification are in place: a
// real token, a real daemon enforcing real auth. Without these,
// downstream probes (5-7) cannot distinguish "Fix-92 works" from
// "everything passed because nothing was checked."
//
// Cairn label: KNOWN — every assertion is the live HTTP roundtrip
// against the daemon process the operator is running. No mocks, no
// fixtures.
//
// Defense-in-depth: token never logged; sent via header only.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DAEMON_BASE = process.env.FOXWORKS_DAEMON_URL ?? 'http://localhost:7878';
const SESSIONS_URL = `${DAEMON_BASE}/v2/sessions`;
const TOKEN_PATH = join(homedir(), '.foxworks-dispatch', 'token');

let token: string;

beforeAll(() => {
  // KNOWN: probe 1 verifies token-file preconditions; we re-read here
  // for isolation (each probe self-contained so REPORT.md aggregation
  // can run any subset independently).
  token = readFileSync(TOKEN_PATH, 'utf8').trim();
  if (token.length === 0) {
    throw new Error(
      `token file at ${TOKEN_PATH} is empty/whitespace-only; ` +
        `probe 1 should have caught this. Halt.`,
    );
  }
});

async function fetchSessions(headers: Record<string, string>): Promise<{
  status: number;
  bodyText: string;
}> {
  // KNOWN: AbortController with a hard 5s budget — daemon should
  // respond in low ms. A timeout almost certainly means the daemon is
  // down (probe should report that crisply, not hang vitest's 10s
  // testTimeout).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(SESSIONS_URL, {
      headers,
      signal: controller.signal,
    });
    const bodyText = await res.text();
    return { status: res.status, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

describe('Probe-92 / Probe 2 — daemon precondition', () => {
  it(
    'GET /v2/sessions with valid x-conductor-token returns 200 + valid JSON',
    async () => {
      let result;
      try {
        result = await fetchSessions({ 'x-conductor-token': token });
      } catch (err) {
        throw new Error(
          `daemon fetch failed against ${SESSIONS_URL}; daemon likely ` +
            `down. Underlying: ${(err as Error).message}. Operator ` +
            `state issue, not a Fix-92 defect.`,
        );
      }

      // KNOWN: 200 = daemon up + auth accepted.
      expect(
        result.status,
        `expected 200 from authed GET; got ${result.status}. ` +
          `body[0..200]=${result.bodyText.slice(0, 200)}`,
      ).toBe(200);

      // KNOWN: response body parses as JSON. The shape contract (sessions
      // array) is verified more strictly in Probe 7 (where the call
      // originates from inside the webview).
      let parsed;
      try {
        parsed = JSON.parse(result.bodyText);
      } catch (err) {
        throw new Error(
          `expected JSON body from /v2/sessions; got non-JSON: ` +
            `${(err as Error).message}. body[0..200]=${result.bodyText.slice(0, 200)}`,
        );
      }
      expect(typeof parsed).toBe('object');
    },
    10_000,
  );

  it(
    'GET /v2/sessions WITHOUT x-conductor-token does NOT return 200 (auth is real)',
    async () => {
      // KNOWN: this is the negative-evidence assertion. If the daemon
      // ever ships with auth disabled (or a bypass), this probe catches
      // it. Without this assertion, the positive case (probe above)
      // could pass even on a wide-open daemon, so the whole verification
      // suite would be vacuous.
      let result;
      try {
        result = await fetchSessions({});
      } catch (err) {
        throw new Error(
          `unauthed daemon fetch threw — daemon likely down between ` +
            `the previous test and this one. Underlying: ` +
            `${(err as Error).message}`,
        );
      }

      // KNOWN: any status != 200 is acceptable here (401 is the
      // expected response per dispatch-daemon/src/lifecycle/auth.ts:105;
      // 403 would also satisfy the "not-200" invariant). We assert the
      // negative space rather than pin to 401 specifically so a future
      // daemon hardening (e.g. switching to 403 for token-mismatch vs
      // 401 for token-absent) doesn't break the probe suite.
      expect(
        result.status,
        `expected non-200 from UNAUTHED GET (auth bypass would be a ` +
          `daemon defect); got ${result.status}. body[0..200]=` +
          `${result.bodyText.slice(0, 200)}`,
      ).not.toBe(200);
    },
    10_000,
  );
});
