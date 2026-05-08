// MB-T22 WB1 RED — main-process git-log reader stub.
//
// All exports throw at call time so probe-02 (commits-reader pure-fn unit
// tests) and probe-03 (commits-tab render with `groups` prop) fail RED.
// Real implementation lands at WB3 green.
//
// Architectural note: this file is main-process (no JSX, executes
// `node:child_process` when implemented at WB3). Co-located under
// src/chat-shell/ per Q-MBT22-2=a (decisions doc 2026-05-07). Allow-
// listed in packages/dispatch-workstation/tsconfig.json `files` array
// despite the parent dir being excluded — mirrors the
// src/coarchitect/daemon-client.ts pattern.
//
// Renderer (commits-tab.tsx) consumes only the *types* exported here
// via `import type { CommitGroup, CommitEntry }` — type-only imports
// are erased by esbuild and do not pull node:child_process into the
// browser bundle.

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
  /** Injected for deterministic tests; defaults to `new Date()` in WB3 impl. */
  readonly now?: Date;
}

const NOT_IMPLEMENTED = 'MB-T22 WB1 RED — not implemented (lands at WB3 green)';

/**
 * Top-level entrypoint: spawn `git log` in `repoRoot`, parse output,
 * group by Today/Yesterday/Older against `now`. Returns groups in
 * descending recency (Today first). Returns `[]` when repoRoot is
 * not a git repo or git is unavailable.
 *
 * WB1 RED — throws unconditionally.
 */
export async function readCommits(
  _opts: ReadCommitsOptions,
): Promise<readonly CommitGroup[]> {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Pure-function attribution heuristic per Q-MBT22-5 (decisions doc
 * 2026-05-07).
 *
 * Precedence (first match wins):
 *   1. Subject-line ticket prefix → `MB-T<NN>` (e.g.
 *      `green(MB-T13): WB6 ...` → `MB-T13`).
 *   2. Body `sess-mbt<NN>` reference → `MB-T<NN>` (case-insensitive).
 *   3. `"unknown"`.
 *
 * WB1 RED — throws unconditionally.
 */
export function attributeSession(_subject: string, _body: string): string {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Pure-function grouping per Q-MBT22-6 / acceptance criteria. Buckets:
 *   - Today    — same calendar day as `now` (local TZ)
 *   - Yesterday — calendar day immediately preceding `now`
 *   - Older    — everything else
 *
 * Empty buckets are omitted from the returned array.
 *
 * WB1 RED — throws unconditionally.
 */
export function groupByDay(
  _commits: readonly CommitEntry[],
  _now: Date,
): readonly CommitGroup[] {
  throw new Error(NOT_IMPLEMENTED);
}

/**
 * Pure-function parser of NUL-delimited git log output. WB3 invokes
 * with: `git log --no-color --format=%H%x00%an%x00%aI%x00%s%x00%b%x1e
 * -n <limit> --shortstat`. Record separator is `\x1e` (ASCII RS); field
 * separator is `\x00` (ASCII NUL); `--shortstat` line follows on its
 * own line within the record.
 *
 * WB1 RED — throws unconditionally.
 */
export function parseGitLogOutput(_stdout: string): readonly CommitEntry[] {
  throw new Error(NOT_IMPLEMENTED);
}
