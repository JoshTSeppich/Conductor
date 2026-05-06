/**
 * MB-F-CORE-READ-RECOVERY-OPT-IN WB1 — readRegistry caller-controlled
 * recovery semantics.
 *
 * Closes sess-a finding #135 §Followups #2 — v1 readRegistry parallel
 * recovery semantics. Sess-a refactored the v1 WRITE path to delegate
 * to writeAtomicJson (gaining fsync + retry transparent to fd CLI).
 * Sess-f closes the symmetry on the READ side: caller-controlled
 * opt-in opts.onCorrupt='quarantine' mirrors v2 daemon's pattern
 * (readRegistryV2 in dispatch-daemon/src/migration/schema-v2.ts).
 *
 * Probes:
 *   R1 behavior-preservation — pinned EXPECTED_BYTES (verbatim mirror
 *      of sess-a's WB4 byte-stability fixture from registry-write-
 *      byte-stability.test.ts) round-trips through readRegistry
 *      structurally identical to FIXTURE. Pins .passthrough() invariant
 *      on the READ side (sess-a's WB4 covered the write side).
 *   R2 ENOENT default + fresh-object isolation — readRegistry with no
 *      opts, no file, returns {version:1, sessions:{}}; mutating the
 *      returned sessions does NOT leak across calls. Tests the
 *      operator-arbitrated CRITICAL DESIGN INVARIANT (Q-F1) that the
 *      ENOENT branch returns a fresh literal per call (NOT a shared
 *      module-level constant). FACT-F7 / read.ts:18-21 documents the
 *      hazard this defends against (init.ts:36 mutates registry.sessions
 *      in place; shared constant would pollute across calls).
 *   R3 corrupt JSON + default opts — readRegistry rejects with an Error
 *      naming the path. Helper's merged wording (Q-F2) accepted; only
 *      path-presence asserted, matching existing registry.test.ts:111
 *      pattern.
 *   R4 schema-fail + default opts — readRegistry rejects with an Error
 *      naming the path. Same wording-flexibility as R3.
 *   R5 corrupt JSON + opts.onCorrupt='quarantine' — readRegistry
 *      returns empty registry; <path>.corrupt-<ISO> sidecar exists at
 *      original directory; original target now contains canonical
 *      empty registry JSON.
 *   R6 schema-fail + opts.onCorrupt='quarantine' — same as R5 but
 *      triggered via schema-validation-failure rather than JSON-parse-
 *      failure. Both failure paths must converge on the same recovery.
 *   R7 ENOENT + opts.onCorrupt='quarantine' — returns empty registry,
 *      NO sidecar created. ENOENT is not corruption; the recovery
 *      path must not invent quarantine artifacts.
 *   R8 forensic preservation — after R5 quarantines, the sidecar bytes
 *      must be byte-equal to the pre-quarantine corrupt bytes (helper
 *      uses fs.rename, NOT a copy-then-rewrite cycle).
 *
 * RED expectation against pre-WB2 production (current readRegistry
 * has no opts param; the second-arg is silently ignored at runtime):
 *   R1-R4 PASS — behavior-preservation pin hits today's code path.
 *   R5/R6/R8 FAIL — current code throws on corrupt-JSON / schema-fail
 *     regardless of opts; promise rejects when assertions expect a
 *     resolved empty value or a sidecar artifact.
 *   R7 — happens to PASS in WB1 because current code's ENOENT branch
 *     already returns a fresh empty registry and never writes a
 *     sidecar; shared behavior between current code and the post-WB2
 *     helper-delegated form. Documented as a deliberate alignment
 *     test rather than a fail-now signal.
 *
 * Test isolation: every probe uses mkdtemp(join(tmpdir(), 'fd-sess-f-'))
 * + afterEach rm cleanup. NO live operator state touched.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readRegistry } from '../../src/registry/read.js';
import type { Registry } from '../../src/registry/schema.js';

/**
 * WB1 → WB2 transitional cast: lets probes call readRegistry with
 * the post-WB2 (path?, opts?) signature even while WB1 production
 * still exposes (path?). Vitest does not strict-typecheck tests
 * (tsconfig.json excludes test/) so the cast is purely for
 * type-aware editor authoring; runtime behavior is unaffected by
 * the cast either before or after WB2.
 */
interface ReadRegistryOptsTestShape {
  onCorrupt?: 'rethrow' | 'quarantine';
  logger?: { error: (...args: unknown[]) => void };
}
const readRegistryT = readRegistry as (
  path?: string,
  opts?: ReadRegistryOptsTestShape,
) => Promise<Registry>;

// ---------------------------------------------------------------------
// Fixture — VERBATIM duplicate of sess-a's
// registry-write-byte-stability.test.ts FIXTURE + EXPECTED_BYTES per
// operator Q-F3. Pins .passthrough() invariant on the READ side too.
// ---------------------------------------------------------------------
const FIXTURE: Registry = {
  version: 1,
  sessions: {
    sherpa: {
      cwd: '/Users/op/code/sherpa',
      tmux_target: 'sherpa:0.0',
      handoff_path: '/Users/op/code/sherpa/HANDOFF.md',
      last_prompt_sent_at: '2026-04-21T12:00:00.000Z',
      last_handoff_pulled_at: null,
      // v2-passthrough fields (DAEMON-Z-4 fix; finding #50): must
      // ride through v1 readRegistry untouched per .passthrough()
      // on SessionSchema.
      state: 'armed',
      last_commit_sha: null,
      last_status_json_at: null,
    },
    cygnus: {
      cwd: '/Users/op/code/cygnus',
      tmux_target: 'cygnus:1.2',
      handoff_path: '/Users/op/code/cygnus/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: '2026-05-01T08:30:00.000Z',
      state: 'paused',
      last_commit_sha: 'abc123def456',
      last_status_json_at: '2026-05-01T08:31:00.000Z',
    },
  },
};

const EXPECTED_BYTES = `{
  "version": 1,
  "sessions": {
    "sherpa": {
      "cwd": "/Users/op/code/sherpa",
      "tmux_target": "sherpa:0.0",
      "handoff_path": "/Users/op/code/sherpa/HANDOFF.md",
      "last_prompt_sent_at": "2026-04-21T12:00:00.000Z",
      "last_handoff_pulled_at": null,
      "state": "armed",
      "last_commit_sha": null,
      "last_status_json_at": null
    },
    "cygnus": {
      "cwd": "/Users/op/code/cygnus",
      "tmux_target": "cygnus:1.2",
      "handoff_path": "/Users/op/code/cygnus/HANDOFF.md",
      "last_prompt_sent_at": null,
      "last_handoff_pulled_at": "2026-05-01T08:30:00.000Z",
      "state": "paused",
      "last_commit_sha": "abc123def456",
      "last_status_json_at": "2026-05-01T08:31:00.000Z"
    }
  }
}
`;

const SCHEMA_FAIL_BYTES = '{"version":99,"sessions":{}}';
const CORRUPT_JSON_BYTES = '{"version":1,"sessions":{}}\n}\n';

describe('WB1 — registry-read-recovery (caller-controlled opts.onCorrupt)', () => {
  let dir: string | null = null;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
      dir = null;
    }
  });

  async function mkPath(): Promise<string> {
    dir = await mkdtemp(join(tmpdir(), 'fd-sess-f-'));
    return join(dir, 'sessions.json');
  }

  // -------------------------------------------------------------------
  // R1 — behavior-preservation pin: EXPECTED_BYTES round-trips through
  // readRegistry to FIXTURE without drift. Mirrors sess-a's WB4
  // byte-stability discipline on the READ side.
  // -------------------------------------------------------------------
  it('R1 behavior-preservation: pinned EXPECTED_BYTES → FIXTURE Registry', async () => {
    const path = await mkPath();
    await writeFile(path, EXPECTED_BYTES, 'utf8');
    const got = await readRegistryT(path);
    expect(got).toEqual(FIXTURE);
  });

  // -------------------------------------------------------------------
  // R2 — ENOENT default + fresh-object isolation. Tests the operator-
  // arbitrated CRITICAL DESIGN INVARIANT from Q-F1: the ENOENT branch
  // returns a fresh literal per call. Mutating one call's sessions
  // MUST NOT leak into a subsequent call's return value. (FACT-F7;
  // read.ts:18-21 documents the hazard.)
  // -------------------------------------------------------------------
  it('R2 ENOENT default: returns fresh empty registry; mutations do not leak across calls', async () => {
    const path = await mkPath();

    const a = await readRegistryT(path);
    expect(a).toEqual({ version: 1, sessions: {} });

    // Pollute call A's sessions; init.ts:36 does this exact mutation
    // pattern in production (registry.sessions[args.name] = session).
    (a.sessions as Record<string, unknown>).polluted = {
      cwd: '/tmp/x',
      tmux_target: 'x:0.0',
      handoff_path: '/tmp/x/HANDOFF.md',
      last_prompt_sent_at: null,
      last_handoff_pulled_at: null,
    };

    const b = await readRegistryT(path);
    expect(b).toEqual({ version: 1, sessions: {} });
    expect((b.sessions as Record<string, unknown>).polluted).toBeUndefined();
  });

  // -------------------------------------------------------------------
  // R3 — corrupt JSON + default opts: readRegistry rejects with an
  // Error naming the path. Wording-shift acceptable per Q-F2; only
  // path-presence asserted (matches registry.test.ts:111 pattern).
  // -------------------------------------------------------------------
  it('R3 corrupt JSON + default opts: rejects with Error naming the path', async () => {
    const path = await mkPath();
    await writeFile(path, '{not valid json', 'utf8');
    await expect(readRegistryT(path)).rejects.toThrow(path);
  });

  // -------------------------------------------------------------------
  // R4 — schema-fail + default opts: readRegistry rejects with an
  // Error naming the path. Wording-shift acceptable per Q-F2.
  // -------------------------------------------------------------------
  it('R4 schema-fail + default opts: rejects with Error naming the path', async () => {
    const path = await mkPath();
    await writeFile(path, SCHEMA_FAIL_BYTES, 'utf8');
    await expect(readRegistryT(path)).rejects.toThrow(path);
  });

  // -------------------------------------------------------------------
  // R5 — corrupt JSON + opts.onCorrupt='quarantine': returns empty
  // registry; sidecar exists; target now contains canonical empty.
  // RED in WB1 (current code throws regardless of opts). GREEN in WB2
  // (delegates to readJsonWithRecovery which honors opts.onCorrupt).
  // -------------------------------------------------------------------
  it("R5 corrupt JSON + onCorrupt='quarantine': returns empty + sidecar created", async () => {
    const path = await mkPath();
    await writeFile(path, CORRUPT_JSON_BYTES, 'utf8');

    const got = await readRegistryT(path, { onCorrupt: 'quarantine' });
    expect(got).toEqual({ version: 1, sessions: {} });

    const entries = await readdir(dir!);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);

    const targetBody = await readFile(path, 'utf8');
    expect(JSON.parse(targetBody)).toEqual({ version: 1, sessions: {} });
  });

  // -------------------------------------------------------------------
  // R6 — schema-fail + opts.onCorrupt='quarantine': returns empty
  // registry; sidecar exists. Schema-failure path converges on the
  // same recovery as JSON-parse-failure (both flow through the
  // helper's validate try/catch).
  // -------------------------------------------------------------------
  it("R6 schema-fail + onCorrupt='quarantine': returns empty + sidecar created", async () => {
    const path = await mkPath();
    await writeFile(path, SCHEMA_FAIL_BYTES, 'utf8');

    const got = await readRegistryT(path, { onCorrupt: 'quarantine' });
    expect(got).toEqual({ version: 1, sessions: {} });

    const entries = await readdir(dir!);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);
  });

  // -------------------------------------------------------------------
  // R7 — ENOENT + opts.onCorrupt='quarantine': returns empty registry;
  // NO sidecar. ENOENT is NOT corruption; recovery path must not
  // invent artifacts. Aligned with helper at read-with-recovery.ts:62-65.
  //
  // Note: this probe happens to PASS in WB1 because current code's
  // ENOENT branch already returns fresh empty + writes no sidecar.
  // Kept as a pinning test for the post-WB2 binding; deliberate
  // alignment test rather than RED-now signal.
  // -------------------------------------------------------------------
  it("R7 ENOENT + onCorrupt='quarantine': returns empty + NO sidecar", async () => {
    const path = await mkPath();
    // file deliberately not written

    const got = await readRegistryT(path, { onCorrupt: 'quarantine' });
    expect(got).toEqual({ version: 1, sessions: {} });

    const entries = await readdir(dir!);
    expect(entries.some((e) => e.includes('.corrupt-'))).toBe(false);
  });

  // -------------------------------------------------------------------
  // R8 — forensic preservation: post-quarantine sidecar bytes are
  // byte-equal to pre-quarantine corrupt bytes. Helper uses fs.rename
  // (not copy-then-rewrite), so the original bytes survive intact for
  // operator forensics.
  // -------------------------------------------------------------------
  it("R8 forensic preservation: sidecar bytes byte-equal pre-quarantine corrupt bytes", async () => {
    const path = await mkPath();
    await writeFile(path, CORRUPT_JSON_BYTES, 'utf8');

    await readRegistryT(path, { onCorrupt: 'quarantine' });

    const entries = await readdir(dir!);
    const sidecars = entries.filter((e) => e.startsWith('sessions.json.corrupt-'));
    expect(sidecars).toHaveLength(1);

    const sidecarBytes = await readFile(join(dir!, sidecars[0]!), 'utf8');
    expect(sidecarBytes).toBe(CORRUPT_JSON_BYTES);
  });
});
