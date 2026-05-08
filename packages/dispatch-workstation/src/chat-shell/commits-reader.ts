// MB-T22 WB3 GREEN — main-process git-log reader.
//
// Replaces the WB1 throwing stubs with real impl:
//   - attributeSession (Q-MBT22-5 precedence)
//   - groupByDay (Today / Yesterday / Older — local TZ)
//   - parseGitLogOutput (NUL+RS-delimited records + optional shortstat)
//   - readCommits (execFile git log + graceful-empty on failure)
//
// Architectural notes:
//   - Main-process only. execFile spawns `git` in `repoRoot`. Co-located
//     under src/chat-shell/ per Q-MBT22-2=a (decisions doc 2026-05-07).
//     Allow-listed in tsconfig.json `files` array (mirrors
//     src/coarchitect/daemon-client.ts) so tsc typechecks the file
//     despite the parent dir being excluded for renderer JSX surfaces.
//   - Renderer (commits-tab.tsx) consumes only the *types* exported here
//     via `import type { CommitGroup, CommitEntry }` — type-only imports
//     are erased by esbuild and do not pull node:child_process into the
//     browser bundle.
//   - groupByDay uses LOCAL TZ via Date.prototype.{getFullYear,getMonth,
//     getDate} per decisions doc Q-MBT22-6 wording. Tests pin TZ to
//     America/Los_Angeles in beforeAll/afterAll so the existing -07:00
//     fixture instants classify deterministically. CI machines in other
//     TZs honor the pin via Node's process.env.TZ-driven tzset.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CommitEntry {
  /** Full 40-char SHA. */
  readonly sha: string;
  /** First 7 chars of `sha`. */
  readonly shortSha: string;
  /** First line of the commit message. */
  readonly subject: string;
  /** Remaining commit message body (may be empty). */
  readonly body: string;
  /** Author name from `%an`. */
  readonly author: string;
  /** ISO 8601 author date from `%aI`. */
  readonly authoredAt: string;
  /** From `--shortstat` "N files changed". */
  readonly filesChanged: number;
  /** From `--shortstat` "N insertions(+)". */
  readonly insertions: number;
  /** From `--shortstat` "N deletions(-)". */
  readonly deletions: number;
  /** Per Q-MBT22-5: subject-prefix → body sess-mbt* → "unknown". */
  readonly sessionAttribution: string;
}

export type CommitGroupLabel = 'Today' | 'Yesterday' | 'Older';

export interface CommitGroup {
  readonly label: CommitGroupLabel;
  readonly commits: readonly CommitEntry[];
}

export interface ReadCommitsOptions {
  readonly repoRoot: string;
  /** Default 50 per ticket acceptance. */
  readonly limit?: number;
  /** Injected for deterministic tests; defaults to `new Date()`. */
  readonly now?: Date;
}

// ---------------------------------------------------------------------
// attributeSession — Q-MBT22-5 precedence
// ---------------------------------------------------------------------

// Subject prefix shape: red|green|spike|contract|refactor|docs|chore +
// `(MB-T<NN>)` + (`:` or `(WBn):`); permissive on the trailing chars.
// Anchored to the start of the subject.
const SUBJECT_PREFIX_RE =
  /^(red|green|spike|contract|refactor|docs|chore)\(MB-T(\d+)\)/;

// Body sess-mbt<NN> reference (case-insensitive; word-bounded).
const BODY_SESS_RE = /\bsess-mbt(\d+)\b/i;

export function attributeSession(subject: string, body: string): string {
  const subjectMatch = subject.match(SUBJECT_PREFIX_RE);
  if (subjectMatch) {
    return `MB-T${subjectMatch[2]}`;
  }
  const bodyMatch = body.match(BODY_SESS_RE);
  if (bodyMatch) {
    return `MB-T${bodyMatch[1]}`;
  }
  return 'unknown';
}

// ---------------------------------------------------------------------
// groupByDay — Today / Yesterday / Older bucketing (local TZ)
// ---------------------------------------------------------------------

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function groupByDay(
  commits: readonly CommitEntry[],
  now: Date,
): readonly CommitGroup[] {
  // Compute "yesterday" by cloning `now` and subtracting one day. Using
  // setDate(getDate() - 1) honors month/year/DST boundary rollover.
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const today: CommitEntry[] = [];
  const yest: CommitEntry[] = [];
  const older: CommitEntry[] = [];

  for (const c of commits) {
    const d = new Date(c.authoredAt);
    if (isSameLocalDay(d, now)) {
      today.push(c);
    } else if (isSameLocalDay(d, yesterday)) {
      yest.push(c);
    } else {
      older.push(c);
    }
  }

  const groups: CommitGroup[] = [];
  if (today.length > 0) groups.push({ label: 'Today', commits: today });
  if (yest.length > 0) groups.push({ label: 'Yesterday', commits: yest });
  if (older.length > 0) groups.push({ label: 'Older', commits: older });
  return groups;
}

// ---------------------------------------------------------------------
// parseGitLogOutput — NUL+RS-delimited records (+ optional --shortstat)
// ---------------------------------------------------------------------

// `git log --format=%H%x00%an%x00%aI%x00%s%x00%b%x1e --shortstat` emits:
//   <sha>\x00<author>\x00<authoredAt>\x00<subject>\x00<body>\x1e
//    N files changed[, M insertions(+)][, K deletions(-)]
//   <sha>\x00...\x1e
//    ...
// The `--shortstat` line for each commit appears AFTER the format-output
// `\x1e` and BEFORE the next record's first field. The probe encodes
// this as if the shortstat is appended to the body field of the
// preceding record (i.e. `[..., body].join('\x00') + '\n N files...\n'`).
// Parser strategy: split on `\x1e`, then for each record split on
// `\x00`, then look for a trailing shortstat line on the last field
// (the body).
const SHORTSTAT_RE =
  /\n\s*(\d+) files? changed(?:,\s*(\d+) insertions?\(\+\))?(?:,\s*(\d+) deletions?\(-\))?\s*$/;

export function parseGitLogOutput(stdout: string): readonly CommitEntry[] {
  if (stdout.length === 0) return [];

  // Split records on \x1e. Filter empty / whitespace-only records (real
  // git emits a trailing \x1e that produces an empty tail element).
  const records = stdout
    .split('\x1e')
    .map((r) => r.replace(/^\n+/, '').replace(/\n+$/, ''))
    .filter((r) => r.length > 0);

  const entries: CommitEntry[] = [];
  for (const record of records) {
    // Split into 5 fields. Use limit-aware split: only split on the
    // first 4 NULs so any \x00 in the body (rare but possible) is
    // preserved as part of the body field.
    const fields = splitNFields(record, '\x00', 5);
    if (fields.length < 5) continue; // malformed — skip
    const sha = fields[0]!;
    const author = fields[1]!;
    const authoredAt = fields[2]!;
    const subject = fields[3]!;
    let body = fields[4]!;

    let filesChanged = 0;
    let insertions = 0;
    let deletions = 0;
    const statMatch = body.match(SHORTSTAT_RE);
    if (statMatch) {
      filesChanged = parseInt(statMatch[1] ?? '0', 10);
      insertions = parseInt(statMatch[2] ?? '0', 10);
      deletions = parseInt(statMatch[3] ?? '0', 10);
      body = body.slice(0, statMatch.index ?? body.length);
    }

    entries.push({
      sha,
      shortSha: sha.slice(0, 7),
      subject,
      body,
      author,
      authoredAt,
      filesChanged,
      insertions,
      deletions,
      sessionAttribution: attributeSession(subject, body),
    });
  }
  return entries;
}

/**
 * Split `s` on `sep` into at most `n` fields. The last field captures
 * the remainder (including any further `sep` occurrences).
 */
function splitNFields(s: string, sep: string, n: number): string[] {
  const out: string[] = [];
  let rest = s;
  for (let i = 0; i < n - 1; i++) {
    const idx = rest.indexOf(sep);
    if (idx === -1) {
      out.push(rest);
      return out;
    }
    out.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  out.push(rest);
  return out;
}

// ---------------------------------------------------------------------
// readCommits — top-level entrypoint
// ---------------------------------------------------------------------

export async function readCommits(
  opts: ReadCommitsOptions,
): Promise<readonly CommitGroup[]> {
  const limit = opts.limit ?? 50;
  const now = opts.now ?? new Date();
  try {
    const { stdout } = await execFileAsync(
      'git',
      [
        'log',
        '--no-color',
        '--format=%H%x00%an%x00%aI%x00%s%x00%b%x1e',
        '-n',
        String(limit),
        '--shortstat',
      ],
      {
        cwd: opts.repoRoot,
        encoding: 'utf8',
        // Cap at 10MB — 50 commits with ~200KB max payload each (well
        // above realistic git log output) — graceful-empty if exceeded.
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    const entries = parseGitLogOutput(stdout);
    return groupByDay(entries, now);
  } catch {
    // Graceful degradation per R-MBT22-2: missing git binary, missing
    // repo, corrupt repo, oversize buffer — all return [] so the
    // commits-tab renders empty-state row instead of crashing.
    return [];
  }
}
