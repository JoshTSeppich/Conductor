// MB-T22 WB1 RED — commits-reader pure-function probes.
//
// Operator-confirmed dispositions (decisions doc 2026-05-07):
//   Q-MBT22-1=a — workstation child_process (no daemon route)
//   Q-MBT22-5=a — attribution precedence: subject-prefix → body
//                 sess-mbt* → "unknown"
//   Q-MBT22-8=a — real git init fixture for integration probe (separate
//                 file at test/integration/commits-reader/, lands at WB4)
//
// This file exercises the *pure functions* of commits-reader (no
// child_process). All tests fail RED at WB1 because the stubs throw
// unconditionally; WB3 green replaces stubs with real impl.

import { describe, it, expect } from 'vitest';
import {
  attributeSession,
  groupByDay,
  parseGitLogOutput,
  readCommits,
  type CommitEntry,
} from '../../../src/chat-shell/commits-reader.js';

// ---------------------------------------------------------------------------
// attributeSession — Q-MBT22-5 precedence
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — attributeSession (Q-MBT22-5 precedence)', () => {
  it('extracts MB-T<NN> from a green(MB-T13) subject prefix', () => {
    expect(attributeSession('green(MB-T13): WB6 — impl', '')).toBe('MB-T13');
  });

  it('extracts MB-T<NN> from a red(MB-T22) subject prefix', () => {
    expect(attributeSession('red(MB-T22): WB1 — scaffold', '')).toBe('MB-T22');
  });

  it('extracts MB-T<NN> from spike/contract/refactor/docs/chore prefixes', () => {
    expect(attributeSession('spike(MB-T19): Phase 1', '')).toBe('MB-T19');
    expect(attributeSession('contract(MB-T07): API freeze', '')).toBe('MB-T07');
    expect(attributeSession('refactor(MB-T11): rename helpers', '')).toBe(
      'MB-T11',
    );
    expect(attributeSession('docs(MB-T20): WB5 — findings', '')).toBe('MB-T20');
    expect(attributeSession('chore(MB-T18): bump deps', '')).toBe('MB-T18');
  });

  it('falls back to body sess-mbt<NN> when subject lacks ticket prefix', () => {
    expect(
      attributeSession(
        'merge: branch foo',
        'Closes the followup originally observed in sess-mbt13 WB7.',
      ),
    ).toBe('MB-T13');
  });

  it('treats body sess-mbt<NN> as case-insensitive', () => {
    expect(attributeSession('merge: x', 'See SESS-MBT09 incident.')).toBe(
      'MB-T09',
    );
  });

  it('returns "unknown" when neither subject nor body has a signal', () => {
    expect(
      attributeSession('Initial commit', 'Bootstrap repo with README.'),
    ).toBe('unknown');
  });

  it('prefers subject-prefix over body sess-mbt* when both are present', () => {
    expect(
      attributeSession(
        'green(MB-T22): WB1 — scaffold',
        'See sess-mbt13 lesson on dispatch-core import discipline.',
      ),
    ).toBe('MB-T22');
  });

  it('does not match a stray "MB-T13" reference inside a non-prefix subject', () => {
    // Reference in the *middle* of a freeform subject shouldn't be
    // promoted to attribution — only the canonical prefix shape counts.
    expect(
      attributeSession('Mention of MB-T13 inside narrative subject', ''),
    ).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// groupByDay — Today / Yesterday / Older bucketing
// ---------------------------------------------------------------------------

function commit(authoredAt: string, sha = 'a'.repeat(40)): CommitEntry {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    subject: 'placeholder',
    body: '',
    author: 'Tester',
    authoredAt,
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    sessionAttribution: 'unknown',
  };
}

describe('MB-T22 WB1 RED — groupByDay (Today/Yesterday/Older)', () => {
  const now = new Date('2026-05-07T12:00:00.000-07:00');

  it('puts a commit from today into the Today bucket', () => {
    const groups = groupByDay(
      [commit('2026-05-07T09:30:00.000-07:00', 'a'.repeat(40))],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Today');
    expect(groups[0]?.commits).toHaveLength(1);
  });

  it('puts a commit from yesterday into the Yesterday bucket', () => {
    const groups = groupByDay(
      [commit('2026-05-06T18:30:00.000-07:00', 'b'.repeat(40))],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Yesterday');
  });

  it('puts a commit from earlier than yesterday into the Older bucket', () => {
    const groups = groupByDay(
      [commit('2026-04-29T12:00:00.000-07:00', 'c'.repeat(40))],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Older');
  });

  it('returns groups in Today → Yesterday → Older order, omitting empty buckets', () => {
    const groups = groupByDay(
      [
        commit('2026-04-29T12:00:00.000-07:00', 'c'.repeat(40)),
        commit('2026-05-07T09:30:00.000-07:00', 'a'.repeat(40)),
        commit('2026-05-06T18:30:00.000-07:00', 'b'.repeat(40)),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Older']);
  });

  it('returns empty array when no commits', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseGitLogOutput — NUL-delimited record parser
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — parseGitLogOutput (NUL-delimited records)', () => {
  it('parses a single record with header + shortstat into one CommitEntry', () => {
    // Format invariants (decisions doc + Phase 1 R-MBT22-3):
    //   field separator = \x00 (NUL)
    //   record separator = \x1e (ASCII RS) — single record here, no
    //                                          trailing RS required
    //   shortstat line follows on its own line within the record
    const sha = 'd'.repeat(40);
    const stdout =
      [
        sha,
        'Tester One',
        '2026-05-07T09:30:00-07:00',
        'green(MB-T13): WB6 — impl',
        'Body line one\nsess-mbt13 reference here.',
      ].join('\x00') + '\n 2 files changed, 5 insertions(+), 1 deletion(-)\n';

    const entries = parseGitLogOutput(stdout);
    expect(entries).toHaveLength(1);
    const e = entries[0]!;
    expect(e.sha).toBe(sha);
    expect(e.shortSha).toBe(sha.slice(0, 7));
    expect(e.author).toBe('Tester One');
    expect(e.subject).toBe('green(MB-T13): WB6 — impl');
    expect(e.filesChanged).toBe(2);
    expect(e.insertions).toBe(5);
    expect(e.deletions).toBe(1);
  });

  it('parses multiple records separated by \\x1e', () => {
    const make = (sha: string, subject: string, stat: string) =>
      [sha, 'Author', '2026-05-07T09:30:00-07:00', subject, ''].join('\x00') +
      stat;
    const stdout =
      make(
        'a'.repeat(40),
        'green(MB-T22): WB2 — multi-tab',
        '\n 1 file changed, 10 insertions(+)\n',
      ) +
      '\x1e' +
      make(
        'b'.repeat(40),
        'green(MB-T22): WB1 — scaffold',
        '\n 3 files changed, 20 insertions(+), 4 deletions(-)\n',
      );
    const entries = parseGitLogOutput(stdout);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.subject).toBe('green(MB-T22): WB2 — multi-tab');
    expect(entries[1]?.subject).toBe('green(MB-T22): WB1 — scaffold');
  });

  it('treats a record with no shortstat line as zero files/insertions/deletions', () => {
    // git log emits no shortstat for empty commits
    const sha = 'e'.repeat(40);
    const stdout = [
      sha,
      'Author',
      '2026-05-07T09:30:00-07:00',
      'chore: empty commit',
      '',
    ].join('\x00');
    const entries = parseGitLogOutput(stdout);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.filesChanged).toBe(0);
    expect(entries[0]?.insertions).toBe(0);
    expect(entries[0]?.deletions).toBe(0);
  });

  it('returns empty array for empty stdout', () => {
    expect(parseGitLogOutput('')).toEqual([]);
  });

  it('populates sessionAttribution per Q-MBT22-5 precedence', () => {
    const sha = 'f'.repeat(40);
    const stdout =
      [
        sha,
        'Author',
        '2026-05-07T09:30:00-07:00',
        'green(MB-T22): WB1 — scaffold',
        'Body without session reference',
      ].join('\x00') + '\n 1 file changed, 1 insertion(+)\n';
    const entries = parseGitLogOutput(stdout);
    expect(entries[0]?.sessionAttribution).toBe('MB-T22');
  });
});

// ---------------------------------------------------------------------------
// readCommits — top-level entrypoint (WB3 wires execFile + grouping)
// ---------------------------------------------------------------------------

describe('MB-T22 WB1 RED — readCommits (top-level entrypoint)', () => {
  it('throws or rejects at WB1 (stub state)', async () => {
    // WB1 stub throws unconditionally. WB3 green replaces with real
    // execFile+parseGitLogOutput+groupByDay pipeline. Integration probe
    // at test/integration/commits-reader/probe-01-fixture-repo.test.ts
    // (Q-MBT22-8=a, lands at WB4) exercises the real pipeline against
    // a tmpdir git init.
    await expect(
      readCommits({ repoRoot: '/nonexistent', limit: 50 }),
    ).rejects.toThrow(/MB-T22 WB1 RED/);
  });
});
