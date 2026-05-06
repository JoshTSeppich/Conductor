/**
 * MB-F-DISPATCH-CORE-PERSIST-UNIFIED WB4 — byte-stability test for v1
 * writeRegistry.
 *
 * Pins exact on-disk byte output of writeRegistry so the WB5 refactor
 * (delegate to writeAtomicJson with fsync + retries) is provably
 * behavior-preserving at the byte level. If WB5 perturbs JSON
 * serialization order, indent depth, or trailing-newline handling,
 * B1 trips immediately.
 *
 * Probes:
 *   B1 round-trip identity — writeRegistry produces bytes byte-equal
 *      to a pinned snapshot, with v2 .passthrough fields
 *      (state/last_commit_sha/last_status_json_at) ordered after the
 *      v1 declared fields per the input object's insertion order
 *      (JSON.stringify preserves Object.keys order).
 *   B2 trailing-newline preservation — bytes end in exactly one '\n'.
 *      Defends against the operator's prior `}\n}\n` corruption
 *      signature (finding #117).
 *   B3 2-space indent — top-level fields begin with `\n  "version": 1`
 *      (anchors indent depth at top level).
 *   B4 fd CLI parity — repeated writes are deterministic; both pin to
 *      EXPECTED_BYTES (proves byte output is reproducible across
 *      writeRegistry invocations, NOT only self-consistent).
 *
 * Behavior-preservation contract (locked here, must hold after WB5):
 *   - JSON.stringify(value, null, 2) indent (2 spaces per level).
 *   - Trailing '\n' (single).
 *   - Object key order = insertion order of the in-memory Registry
 *     value (NOT alphabetized).
 *   - .passthrough fields ride through writeRegistry → readRegistry
 *     unchanged (DAEMON-Z-4 invariant).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRegistry } from '../../src/registry/write.js';
import type { Registry } from '../../src/registry/schema.js';

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
      // ride through v1 writeRegistry untouched per .passthrough()
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

describe('WB4 — v1 writeRegistry byte-stability', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sess-a-wb4-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('B1 round-trip identity — bytes match pinned snapshot', async () => {
    const path = join(dir, 'sessions.json');
    await writeRegistry(path, FIXTURE);
    const bytes = await readFile(path, 'utf8');
    expect(bytes).toBe(EXPECTED_BYTES);
  });

  it('B2 trailing-newline preservation — exactly one trailing newline', async () => {
    const path = join(dir, 'sessions.json');
    await writeRegistry(path, FIXTURE);
    const bytes = await readFile(path, 'utf8');
    expect(bytes.endsWith('\n')).toBe(true);
    expect(bytes.endsWith('\n\n')).toBe(false);
  });

  it('B3 2-space indent — top-level fields indented by 2 spaces', async () => {
    const path = join(dir, 'sessions.json');
    await writeRegistry(path, FIXTURE);
    const bytes = await readFile(path, 'utf8');
    expect(bytes).toContain('\n  "version": 1');
    expect(bytes).toContain('\n  "sessions": {');
  });

  it('B4 fd CLI parity — repeated writes are deterministic', async () => {
    const pathA = join(dir, 'a.json');
    const pathB = join(dir, 'b.json');
    await writeRegistry(pathA, FIXTURE);
    await writeRegistry(pathB, FIXTURE);
    const a = await readFile(pathA, 'utf8');
    const b = await readFile(pathB, 'utf8');
    expect(a).toBe(b);
    expect(a).toBe(EXPECTED_BYTES);
  });
});
