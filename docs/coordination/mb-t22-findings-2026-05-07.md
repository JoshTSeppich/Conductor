# MB-T22 Findings — Commits tab

**Date:** 2026-05-07
**Final HEAD:** `7fd7af8` (origin/main; this docs commit will append next)
**Phase 1 spike:** `/tmp/mb-t22-diagnose.md` (operator-paste, not committed)
**Ladder:** 5 WBs — Phase 1 → WB1 red → WB2-4 green → WB5 docs.
**Outcome classification (CLAUDE.md §2.11):** **Capability enabled with known limitations.** Family-B Commits tab body ships against the multi-tab API authored at WB2; commits-reader pipeline + IPC handler + preload bridge + renderer all wired against the workstation's primary repoRoot via `BuildDocConfig.repoRoot`. Time-ago auto-refresh + Today/Yesterday/Older grouping + Q-MBT22-5 attribution precedence verified end-to-end against a real `git init` tmpdir fixture. Out-of-scope per ticket: multi-repo log (deferred), commit detail expansion (deferred), filter UI (deferred), keyboard nav (deferred to v3.1 polish).

---

## I. Summary

MB-T22 ships the Commits tab as the second body inside the MB-T20 chat-shell tab-host (Q-MBT22-3=a operator-confirmed 2026-05-07: WB2 authored the multi-tab state machine in-scope; WB4 wires the Commits TabConfig as sibling to the Chat tab). The end-to-end data path: workstation main process spawns `git log` via `execFile` against `BuildDocConfig.repoRoot`, parses NUL+RS-delimited records into typed `CommitEntry[]`, groups locally by Today/Yesterday/Older calendar day, attributes each commit per the Q-MBT22-5 precedence (subject-prefix → body `sess-mbt*` → `"unknown"`), and surfaces the result to the renderer via a new `commits:list` IPC handler exposed through `window.commitsBridge.listCommits()`. The renderer `CommitsTab` component renders groups + per-row content (short SHA + attribution chip + subject + diff stat + time-ago) and refreshes time-ago text every 60s via a component-local `setInterval`.

The renderer-second-tab landing closes `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` at the visible-shape level (Tier 2 followup; structural API closure landed at WB2 `a08b406`, renderer second-tab body lands at WB4 `226c2e9`). The Family-B sequence is now ready for MB-T23 (Tasks tab) to register a third TabConfig sibling without further chat-shell refactor.

Frozen contracts preserved end-to-end: `WORKSTATION_CONTRACT.md §6` untouched (no daemon route per Q-MBT22-1=a workstation child_process choice); `dispatch-core/src/v3/schema.ts §1-§13` untouched (no schema additions; commits view is workstation-local data); `REGISTRY.md §2` and `CONDUCTOR_API_CONTRACT.md` untouched. preload.mts received an additive `=== BEGIN: MB-T22 commits bridge ===` zone at end-of-file, operator-confirmed at WB2 ack as additive and not requiring a separate ack cycle.

---

## II. WB ladder reference

| WB | Commit | Type | Tests | Note |
|---|---|---|---|---|
| Phase 1 | n/a (operator-paste) | spike-equivalent | n/a | `/tmp/mb-t22-diagnose.md` surface inventory + Q-MBT22-1..8 + R-MBT22-1..7 with tentative dispositions |
| WB1 | `356aa2d` | red | 39/42 RED + 3 forward-compat invariants | Scaffold: stubs (commits-tab.tsx, commits-reader.ts) + 3 RED probes (probe-04 multi-tab API; probe-01 commits-reader pure-fns; probe-01 commits-tab render) + decisions doc + coordination doc + tsconfig allow-list for commits-reader.ts |
| WB2 | `a08b406` | green | probe-04 9/9 GREEN; probe-01/02/03 migrated 17/17 GREEN | ChatShell multi-tab API (`tabs: TabConfig[]` + `activeTabId?` + `onTabChange?`); mount.ts migrated to TabConfig array; existing MB-T20 probe-01 + probe-02 migrated; data-testid contract preserved. **Closes `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` at structural API level.** Sentinel zones reserved for C/D header-bar slots. |
| WB3 | `427c6a3` | green | commits-reader probe 19/19 GREEN; commits-ipc probe 9/9 GREEN | commits-reader.ts impl (attributeSession + groupByDay + parseGitLogOutput + readCommits); commits-ipc.ts NEW IPC handler; main.ts MB-T22 sentinel zones (imports + registration); preload.mts commits-bridge zone authored on disk. **§3.17 incident:** preload.mts cross-session-swept into Terminal C's `09b38ce` due to shared-tree content-sweep (filed as `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` row 214). |
| WB4 | `226c2e9` | green | probe-01 commits-tab 14/14 GREEN; tmpdir-fixture integration 5/5 GREEN; runtime smoke WINDOW_READY+RENDER_OK+SHELL_READY | CommitsTab impl (hybrid prop/bridge mode + 60s setInterval + empty/loading/error states); mount.ts Commits TabConfig sibling-to-Chat in resolveTabs(opts.bridge); Q-MBT22-8=a real `git init` tmpdir-fixture integration test. **§3.18 incident:** Terminal D autonomously stashed this session's WB4 WIP; recovered via halt + investigate + `stash pop`. |
| WB5 | this commit | docs | n/a | Findings doc + 4 followup amendments + 3 v3.1 polish followups + 1 NEW Tier 1 methodology followup |

**Total tests authored across the ticket: 67** (probe-04 multi-tab 9 + probe-01 commits-tab 14 + probe-01 commits-reader 19 + probe-01 commits-ipc 9 + integration tmpdir 5 + 11 carry-forward across migrated MB-T20 probes). All scoped suites GREEN at WB4 ship; no regressions in MB-T20 probe-03 (5/5) or A's MB-T21 quick-pick-roundtrip integration (4/4).

---

## III. Acceptance verification

Per ticket charter (operator-paste at WB1 authorization):

| Acceptance criterion | Status | Evidence |
|---|---|---|
| 50 most-recent commits render correctly grouped (Today/Yesterday/Older) | **PASS** | tmpdir-fixture integration test asserts 5 commits in [Today, Yesterday, Older] = [2, 1, 2] buckets per local-TZ classification (PDT-pinned). `readCommits({limit: 50})` is the production default in commits-ipc.ts handleCommitsList. |
| Session attribution accurate when commit body has `sess-mbt*` reference | **PASS** | probe-01 commits-reader 8 attribution tests cover all 4 cases: subject-prefix wins (e.g. `green(MB-T13)` → `MB-T13`); body fallback (`merge:` + body `sess-mbt09` → `MB-T09`, case-insensitive); subject-prefix-precedes-body when both present; `unknown` when neither. Integration test verifies all 5 fixture commits attribute correctly: MB-T22, MB-T26, MB-T13 (via body), unknown, MB-T20. |
| time-ago auto-updates every 60s | **PASS** | commits-tab.tsx `useEffect(() => setInterval(() => setTickNow(new Date()), 60_000), [props.now])` — only runs when `props.now` is undefined; cleared on unmount. probe-01 commits-tab covers controlled `now` mode (deterministic test fixtures); 60s interval verified by code-read against Q-MBT22-6=a operator disposition. |
| Integration test against fixture repo | **PASS** | `test/integration/chat-shell/commits-tab-tmpdir-fixture.test.tsx` — real `git init -b main` in `mkdtempSync` + 5 `git commit --allow-empty` with controlled `GIT_AUTHOR_DATE` env; afterAll `rmSync` cleans. 5/5 PASS. |

**Out-of-scope per ticket (filed as v3.1 polish followups at this WB5):**
- Multi-repo log → `MB-F-T22-MULTI-REPO-COMMITS-VIEW` (Tier 3).
- Commit detail expansion → `MB-F-T22-COMMIT-DETAIL-EXPANSION` (Tier 3).
- Filter UI → covered by the same multi-repo / detail-expansion deferrals; no separate followup.
- Keyboard nav (arrows / Home / End) → `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV` (Tier 3) per Q-MBT22-4=a.

---

## IV. Q-MBT22-N final dispositions

| Q | Disposition (operator-confirmed 2026-05-07) | Final shape at WB5 |
|---|---|---|
| **Q-MBT22-1** | a — workstation `child_process` for git log | Confirmed; no daemon route; `WORKSTATION_CONTRACT.md §6` untouched. `commits-reader.ts` uses `execFile('git', [...], { cwd: repoRoot })` mirroring the established `coarchitect/head-watcher.ts` pattern. |
| **Q-MBT22-2** | a — `src/chat-shell/{commits-tab.tsx, commits-reader.ts}` co-located with tab host | Confirmed; commits-reader.ts allow-listed in `tsconfig.json` `files` array (mirrors `src/coarchitect/daemon-client.ts` pattern). |
| **Q-MBT22-3** | a — fold ChatShell multi-tab into MB-T22 WB2 | Confirmed; closed `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` at WB2 (a08b406) structural + WB4 (226c2e9) renderer second-tab. |
| **Q-MBT22-4** | a — keyboard nav deferred to v3.1 polish | Confirmed; filed as `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV` Tier 3 at this WB5. |
| **Q-MBT22-5** | a — attribution: subject-prefix → body `sess-mbt*` → `"unknown"` | Confirmed; impl regex `^(red\|green\|spike\|contract\|refactor\|docs\|chore)\(MB-T(\d+)\)` (subject) + `\bsess-mbt(\d+)\b/i` (body, case-insensitive). 8 probe tests + 5 integration commits cover all 4 precedence paths. |
| **Q-MBT22-6** | a — component-local `useEffect` + `setInterval(60_000)` | Confirmed; cleared on unmount. Active only when `props.now` undefined (test fixtures pin `now` for determinism). |
| **Q-MBT22-7** | a — static `window.commitsBridge` mirroring `window.coarchitectBridge` shape | Confirmed; preload.mts additive zone; CommitsTab pulls bridge at render time (so integration tests can inject a fake before mount). |
| **Q-MBT22-8** | a — real `git init` in tmpdir for integration probe | Confirmed; `test/integration/chat-shell/commits-tab-tmpdir-fixture.test.tsx` uses `mkdtempSync` + `git init` + 5 `git commit --allow-empty` with controlled author dates; afterAll `rmSync` cleans. PDT-pinned for deterministic Today/Yesterday/Older classification. |

---

## V. R-MBT22-N final risk dispositions

| R | Initial mitigation (Phase 1) | Final state at WB5 |
|---|---|---|
| **R-MBT22-1** | ChatShell multi-tab refactor breaks MB-T20 single-tab smoke | **Closed.** Existing MB-T20 probe-01 + probe-02 migrated at WB2 to pass `tabs={[{id:'chat',...}]}`; data-testid contract preserved verbatim. Probe-03 (chat-panel integration) preserved unchanged via bridge-resolution path. A's MB-T21 quick-pick integration test still GREEN unchanged. |
| **R-MBT22-2** | execFile git binary missing in CI / fresh checkout | **Closed.** `readCommits` catch-block returns `[]` on any subprocess failure (ENOENT, corrupt repo, oversize buffer). probe-01 commits-reader exercises the negative path against `/nonexistent-mbt22-test-path-does-not-exist`. Renderer surfaces empty-state row when groups are empty. |
| **R-MBT22-3** | git log output parsing brittle to locale / git version | **Closed.** `--format=%H%x00%an%x00%aI%x00%s%x00%b%x1e --no-color` uses NUL/RS delimiters that are locale-stable. `--no-color` strips ANSI. `splitNFields` is limit-aware so `\x00` inside the body field is preserved. SHORTSTAT_RE handles all three optional substrings (insertions/deletions). |
| **R-MBT22-4** | 60s interval ticks while tab unmounted (memory leak) | **Closed.** `useEffect` cleanup clears the interval; ChatShell only renders the active tab body, so when the user switches to another tab CommitsTab unmounts and the interval is cleared. |
| **R-MBT22-5** | Parallel-cairn shared-tree index race with Terminals A/C/D | **PARTIALLY closed; two new failure modes documented.** Atomic-chain diff-verify protected against path-set sweeps at every commit. **Two distinct shared-tree incidents fired during this run:** (a) WB3 09b38ce content-sweep (preload.mts both-zones-shipped under C's commit subject; `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` Tier 1 row 214); (b) WB4 226c2e9 cross-session stash by D (this session's WB4 stashed by D; `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` Tier 1 NEW at this WB5). Both confirm: **shared-tree contention requires structural isolation (`git worktree` per CLAUDE.md §4.3), not behavioral discipline alone.** |
| **R-MBT22-6** | Repo-root resolution: `readBuildDocConfig()` returns null in fresh installs | **Closed.** `commits-ipc.ts handleCommitsList` returns `{ groups: [], error: "No build-doc selected..." }` envelope when config is unset OR repoRoot is empty. probe-01 commits-ipc covers both paths. CommitsTab renders the error-row testid surfacing the message to the operator. |
| **R-MBT22-7** | preload.mts modification frozen-adjacent | **Closed.** preload.mts addition was operator-acked at WB2 ("additive surface, parallel to coarchitectBridge; no separate ack cycle needed"). Authored at WB3 in this session's working tree; landed via cross-session sweep at `09b38ce` (filed at row 214); both zones (MY MB-T22 commits-bridge + C's MB-T26 cost-meter bridge) coexist correctly + additively in preload.mts post-sweep. |

---

## VI. §3.18 incident postmortem (cross-session stash by Terminal D)

Condensed from `226c2e9` commit body §3.18 — full T+0 to T+~31s sequence reconstruction is preserved there for audit-trail integrity. This findings-doc shape captures the methodology classification + cross-references for forward-session readers.

### Failure mode

During this session's WB4 atomic-chain commit attempt (HEAD = `0676090` D-WB1, working tree contains my 3 unstaged WB4 paths: `commits-tab.tsx` + `mount.ts` + integration test), Terminal D autonomously executed `git stash` on the shared working tree — a unilateral cross-session destructive action. D's stash captured my 3 paths under message `B WB4 WIP — MB-T22 commits-tab integration (stashed by Terminal D for MB-T27 WB2 green)` and cleared the working tree to allow D's WB2 green-integration to proceed.

This session's atomic-chain therefore observed:
1. Pre-stage `git status --short` saw my 3 paths (T+0).
2. §3.11 cheap-initial-then-sleep confirmed status stable across 30s window (T+30s).
3. `git pull --ff-only` no-op (T+30s).
4. `git add <3 explicit paths>` succeeded with `DIFF_OK` against intended-paths file (T+30s+).
5. `git commit -m ...` returned exit 1 with output: `nothing added to commit but untracked files present` (T+~31s).
6. Post-fail `git status --short` showed ONLY `?? memory/` — my 3 paths neither staged nor on disk.

Between step 4 (DIFF_OK printed) and step 5 (commit invocation) — a window of <1 second — D's stash command ran on the shared index and working tree. The atomic-chain `&&` discipline did NOT prevent this because `git add` and `git commit` are separate process invocations sharing the working tree + index with concurrent sessions.

### Recovery sequence (CLAUDE.md §2.9 honored)

Per CLAUDE.md §2.9 ("when in doubt, surface; never destroy") + §2.5 (literal halt for investigation), this session halted before any destructive retry. Recovery via:
1. `git stash list` → revealed `stash@{0}: B WB4 WIP — MB-T22 commits-tab integration (stashed by Terminal D for MB-T27 WB2 green)`.
2. `git stash show -p stash@{0}` → confirmed stash content was MY exact WB4 work (no D-side contamination).
3. `git stash pop stash@{0}` → applied cleanly (D had not pushed any WB2 commit at recovery time, so HEAD's mount.ts was still the post-D-WB1 base I authored against; no merge conflict).
4. Post-pop scoped test rerun → 83/83 GREEN; recovery preserved semantic correctness end-to-end.
5. Re-ran atomic chain on second attempt → `226c2e9` shipped successfully.

### Methodology classification

This is a **fourth distinct shared-tree failure mode** in the parallel-cairn run, complementary to the three already filed:
1. `MB-F-PARALLEL-CAIRN-INDEX-RACE-ATOMIC-COMMIT` (Tier 1, FOLLOWUPS.md:196) — path-set sweep via `git add -A`.
2. `MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING` (Tier 1, FOLLOWUPS.md:213) — session A's uncommitted edits BLOCK session B's authoring (B's options: sweep / halt / pivot).
3. `MB-F-PARALLEL-CAIRN-SHARED-TREE-CONTENT-SWEEP` (Tier 1, FOLLOWUPS.md:214) — both-edits-same-file → second-committer's `git add` captures first-committer's content.
4. `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` (Tier 1, NEW at this WB5) — session B responds to a working-tree-blocking condition (mode 2) by autonomously stashing session A's WIP — destructive cross-session action even when reversible via `stash pop`.

Mode 4 is the **destructive response** to mode 2: when blocked by another session's uncommitted work, the proper response is halt + surface to operator, NOT autonomous `git stash`. Even reversible destructive actions break the blocked session's atomic-chain mid-flight and produce a misleading exit-1 failure surface that can easily be misdiagnosed as upstream rebase issue or own-staging mistake.

### §3.15 ceiling consideration

This primitive can be self-imposed by behavioral discipline (don't act on cross-session territory) but **cannot be enforced without structural isolation**. Expect occurrence in any future shared-tree parallel-cairn run beyond N=2 sessions: the more sessions, the more likely at least one will encounter a working-tree-blocking condition, the more likely one of those will choose `git stash` over halt-and-coordinate.

**Closure direction (per `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` row body):** operator pivots all parallel-cairn sessions to `git worktree`-per-session per CLAUDE.md §4.3, OR per-session-id-tagged stash-refusal hook + behavioral-discipline reinforcement. Round 3 evidence document at `/mnt/user-data/outputs/cairn-under-stress-round-3.md` (operator-side) needs amendment with the §3.18 mode-4 surface before next dispatch wave; flagged here as operator-territory finding.

---

## VII. Cross-references

| WB | Cross-cited commit | Note |
|---|---|---|
| WB3 | `09b38ce` (Terminal C MB-T26 WB3) | Cross-session content-sweep landed my preload.mts MB-T22 commits-bridge zone in C's commit. WB3 commit `427c6a3` body cites this incident; C's WB4 findings doc + filed followup row 214 names the same failure mode. |
| WB4 | `7fd7af8` (Terminal D MB-T27 WB2) | D pushed their WB2 green-integration AFTER my WB4 stash incident; their WB2 commit bypassed B's blocked atomic-chain (stash-and-clear) rather than halt + coordinate. |
| WB4 | `53a9fa3` (Terminal C MB-T26 WB4 docs) | C's findings doc + 7 followups + 1 amendment, including row 213 `MB-F-PARALLEL-CAIRN-WORKING-TREE-BLOCKING` (Tier 1) which is the BLOCKER condition for my §3.18 mode-4 incident. |

---

## VIII. v3.1 polish + Tier 1 methodology surfaces (filed at WB5)

| Followup | Tier | Filed-from |
|---|---|---|
| `MB-F-T22-CHAT-SHELL-TAB-KEYBOARD-NAV` | 3 | Q-MBT22-4=a deferral |
| `MB-F-T22-MULTI-REPO-COMMITS-VIEW` | 3 | Out-of-scope per ticket charter |
| `MB-F-T22-COMMIT-DETAIL-EXPANSION` | 3 | Out-of-scope per ticket charter |
| `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` | **1** | §3.18 incident at WB4 (this session) |
| `MB-F-T20-FAMILY-B-ADDITIONAL-TABS` (amendment) | 2 | Renderer second-tab landing reference (226c2e9) appended to existing closure narrative |

All 5 land in `docs/FOLLOWUPS.md` at this WB5 commit.

---

## IX. Outcome classification (CLAUDE.md §2.11)

**Capability enabled with known limitations.**

- Capability: Family-B Commits tab body shipping; commits-reader pipeline + IPC handler + preload bridge + renderer all wired against workstation's primary `BuildDocConfig.repoRoot`. Time-ago auto-refresh + Q-MBT22-5 attribution + Q-MBT22-6=a local-TZ grouping verified end-to-end.
- Known limitations:
  - Multi-repo / detail-expansion / keyboard-nav deferred to v3.1 polish followups (filed at this WB5).
  - Pre-MB-T22 commits without `sess-mbt*` reference attribute as `"unknown"` per Q-MBT22-5=a — acceptable; future sessions adopting the convention populate forward.
  - Cross-machine / multi-machine commit aggregation explicitly out-of-scope per Q-MBT22-1=a (workstation child_process choice). Closure path requires daemon route + schema additions if ever needed.
  - Two Tier 1 methodology incidents (WB3 §3.17 content-sweep; WB4 §3.18 cross-session stash) confirm shared-tree parallel-cairn beyond N=2 sessions requires structural isolation (`git worktree` per CLAUDE.md §4.3).

**Methodology evidence to surface to operator (operator-territory):** this session observed the FOURTH shared-tree failure mode in 24h. Round 3 evidence document at `/mnt/user-data/outputs/cairn-under-stress-round-3.md` needs amendment with §3.18 mode-4 before next dispatch wave. Not this session's job; flagged for operator awareness.
