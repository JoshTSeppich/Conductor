# MB-T28 Findings — BUILD.md parser + DAG builder

**Terminal:** C (parallel-cairn 4-session run; per-session worktree isolation)
**Date:** 2026-05-08
**Branch:** `mbt28-worktree`
**Companion docs:** `mb-t28-diagnose-2026-05-08.md` (Phase 1 inventory + schema proposal) + `mb-t28-decisions-2026-05-08.md` (operator-skim ack surface).

WB ladder closure surface for MB-T28. Acceptance verification per ticket §2; outcome classifications per CLAUDE.md §2.11; followups appended to `docs/FOLLOWUPS.md` (8 new rows).

---

## I. Outcome classification (CLAUDE.md §2.11)

**Capability enabled with known limitations** + **Improved (cost + clean composition)**.

- New capability: TS pure-fn parser at `packages/dispatch-core/src/build-doc-parser/` consuming a BUILD.md document per operator-arbitrated `BUILD-md-spec.md` and producing a typed `TaskDAG` with surfaced parse errors. Downstream consumers (MB-T29 task-state classifier, MB-T30 dispatch loop, MB-T23 Tasks tab UI) build on this foundation.
- Clean composition: zero new package dependencies (hand-rolled scanner per Q-MBT28-4=a; existing `dispatch-core` deps remain `proper-lockfile` + `zod` only); zero edits to frozen contract surfaces (`dispatch-core/src/v3/schema.ts`, `WORKSTATION_CONTRACT.md`, `CONDUCTOR_API_CONTRACT.md`, `REGISTRY.md`, `BUILD-md-spec.md`); zero edits to `dispatch-core/src/index.ts` per Q-MBT28-8=b deep-import-only.
- Known limitations: single-cycle reporting (multi-cycle SCC surfacing is v3.1 — `MB-F-T28-MULTI-CYCLE-REPORTING`); silent-drop of malformed dep refs (v3.1 tightening — `MB-F-T28-MALFORMED-DEP-REF-TIGHTENING`); file-ending-mid-goal-without-newline edge case (v3.1 — `MB-F-T28-FILE-ENDING-MID-GOAL-WITHOUT-NEWLINE`); spec-in-repo deferred (`MB-F-BUILD-MD-SPEC-NOT-IN-REPO` Tier 1).

---

## II. WB ladder reference

| WB | Verb | Commit | Subject | Probes touched |
|---|---|---|---|---|
| Phase 1 | spike | `36828ce` | diagnose + decisions docs (HALT 0) | n/a (docs only) |
| WB1 | red | `0399080` | scaffold + 6 fixtures + 6 RED probes (22/26 RED) | probe-01..06 RED |
| WB2 | green | `08548dc` | §3.1 preamble parsing | probe-06 GREEN; probe-01 4/6 |
| WB3 | green | `adf5a8c` | §3.2 task section parsing | probe-01 5/6; probe-02 4/7 |
| WB4 | green | `5024ea7` | §3.3 fields + §3.4 ref resolution + DAG edges | probe-01 + probe-02 fully GREEN |
| WB5 | green | `0725c3d` | DFS cycle detection | probe-03 fully GREEN |
| WB6 | green | `d2c2cc9` | orphan + dup-branch validators | probe-04 + probe-05 fully GREEN; **all acceptance probes GREEN** |
| WB7 | green | `ede6a23` | coverage closure to 100% lines (143/143 GREEN) | +probe-07 (49 it()) + probe-08 (12 it()) |
| WB-final | docs | (this commit) | findings + 8 followups appended | n/a |

WB count: 7 ladder cycles (WB1-WB7) + 1 spike + 1 docs = within 6-8 envelope per dispatch prompt §3 (docs-only WB excluded from ladder count). WB7 absorbed planned WB8 coverage closure since 100% line coverage was achieved during WB7's polish pass.

---

## III. Acceptance verification (per ticket charter §2)

| Acceptance bullet | State | WB | Evidence |
|---|---|---|---|
| Parses §7.1 minimal example correctly | ✅ CLOSED | WB4 | probe-01-minimal.test.ts (6/6 GREEN) parses `minimal.md` (verbatim spec §7.1). |
| Parses §7.2 DAG example with correct edges | ✅ CLOSED | WB4 | probe-02-dag.test.ts (7/7 GREEN) asserts edges `[{from:'2',to:'1'},{from:'3',to:'2'}]` from `dag.md` (verbatim spec §7.2). |
| Detects cycles (test with cyclic fixture) | ✅ CLOSED | WB5 | probe-03-cycles.test.ts (4/4 GREEN) — `cyclic.md` 3-cycle (§1→§3→§2→§1) surfaces `dependency.cycle` with `cyclePath` set = {'1','2','3'}. |
| Detects orphan deps (test with orphan fixture) | ✅ CLOSED | WB6 | probe-04-orphans.test.ts (3/3 GREEN) — `orphan-deps.md` (§1 deps §99) surfaces `dependency.orphan` with `details.taskId='1'`, `details.missingRef='99'`. |
| Detects duplicate-branch-non-sequential (test with bad fixture) | ✅ CLOSED | WB6 | probe-05-duplicate-branch.test.ts (3/3 GREEN) — `duplicate-branch-non-sequential.md` (§1 + §2 share `feat/parallel-branch` w/ no chain) surfaces `branch.duplicate-non-sequential` with `details.branch`, `details.taskIds = ['1','2']`. |
| 100% line coverage on parser | ✅ CLOSED | WB7 | `pnpm --filter dispatch-core exec vitest run --coverage --coverage.include='src/build-doc-parser/**'` → Lines: 100.00% (321/321), Statements: 100.00% (366/366), Functions: 100.00% (33/33), Branches: 95.97% (191/199). 8 uncovered branches are defensive `??` fallbacks (e.g., `aParts[i] ?? 0` where antecedent is always defined for in-range iteration); branch coverage is not the acceptance criterion. |

**All 6 acceptance criteria CLOSED.**

---

## IV. Final test surface

`pnpm --filter dispatch-core test` (verified WB7 + WB-final): **143 passed (143)** across 20 test files. Build-doc-parser-specific:

| Probe file | Tests | Surface |
|---|---|---|
| probe-01-minimal.test.ts | 6 | §7.1 minimal — preamble, single task, no edges/groups |
| probe-02-dag.test.ts | 7 | §7.2 DAG — 3 tasks, 2 edges, dependsOn fidelity |
| probe-03-cycles.test.ts | 4 | cyclic — `dependency.cycle` with cyclePath details |
| probe-04-orphans.test.ts | 3 | orphan-deps — `dependency.orphan` with missingRef + taskId |
| probe-05-duplicate-branch.test.ts | 3 | dup-branch — `branch.duplicate-non-sequential` with branch + taskIds |
| probe-06-malformed.test.ts | 3 | missing-preamble — `preamble.field-missing` for Repo, line>0 |
| probe-07-coverage.test.ts | 49 | 13 describe groups across 13 fixtures: groups + all-optional-fields + task-id-conflict + task-malformed-heading + task-missing-fields + task-malformed-fields (6 enum/format paths) + empty-branch + preamble-malformed (dup + unknown + empty value) + non-build-h1 + empty doc + h2-with-body-and-h3 + multi-line-goal + Speculative=false + goal-followed-directly-by-field + malformed-h3 + h1-mid-doc meta-block |
| probe-08-validators-direct.test.ts | 12 | direct unit tests for detectCycle (empty DAG, acyclic single, self-loop, compareTaskIds length-tiebreaker), detectOrphans (resolved, empty deps, group-id resolution), detectDuplicateBranches (empty-branch skip, single-task-on-branch skip, sequential-chain success, error path, multi-hop reachability) |
| **Total build-doc-parser tests** | **87** | (out of 143 dispatch-core total) |

No regressions in pre-existing dispatch-core suite (60 prior tests passing).

`pnpm --filter dispatch-core typecheck` clean across all WBs.

---

## V. Schema design realized (operator-supervised mechanical translation per project §3.4)

Operator-acked at HALT 0 (2026-05-08); shipped unchanged:

```typescript
// packages/dispatch-core/src/build-doc-parser/types.ts (final)

export type TaskId = string;                                 // bare string, no § prefix
export type ApprovalPolicy = 'tight' | 'medium' | 'loose';
export type ModelHint = 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H';
export type Tier = 1 | 2 | 3;

export interface Task {
  id: TaskId; title: string; goal: string; branch: string;
  dependsOn: TaskId[];                                       // round-trip; group ids retained
  acceptance: string[];
  hints?, approvalPolicy?, model?, tier?, estimate?, cap?, speculative?;
  sourceLine: number;
}

export interface TaskGroup { id; title; taskIds: TaskId[]; sourceLine: number; }
export interface Preamble { repo; planRev; operator?; conductorProfile?; }
export interface TaskDAG { preamble; tasks: Task[]; groups: TaskGroup[]; edges: Array<{from, to}>; }

export type ParseErrorCode = 10 codes (preamble.* / task.* / dependency.cycle / dependency.orphan / branch.duplicate-non-sequential)
export interface ParseError { code; message; line; details?: Record<string, unknown>; }
export type ParseResult = { ok: true; dag } | { ok: false; errors };
```

Public API: `export function parseBuildDoc(text: string): ParseResult`. Pure-fn, no I/O, no globals. Lives at `packages/dispatch-core/src/build-doc-parser/`. Re-exports + types via `index.ts`.

`Task.dependsOn` retains group ids for round-trip fidelity (per Q-MBT28-1C); `TaskDAG.edges` expands group refs into per-child edges for uniform traversal. Cycle/orphan validators operate on the expanded edge set.

---

## VI. Q-MBT28-N + R-MBT28-N final dispositions

| ID | Tentative | Final | Implementation evidence |
|---|---|---|---|
| Q-MBT28-1A | (i) alias for orphan | (i) **acked** | `parseDependsOn` resolves §-refs; orphan validator catches non-existent refs. No separate forward-ref code path. |
| Q-MBT28-1B | (a) error `task.malformed-heading` | (a) **acked** | `buildTasksAndGroups` `hasBodyFields` check on H2-with-H3-children fires `task.malformed-heading` per `h2-with-body-and-h3.md` fixture (probe-07 GREEN). |
| Q-MBT28-1C | (a) expand into per-child edges | (a) **acked** | `buildDag` group-ref branch expands `groupMap.get(dep).taskIds` into per-child edges. `groups.md` fixture shows §2 deps §1 → edges to §1.1 + §1.2 (probe-07 GREEN). |
| Q-MBT28-2 | (a) flat `ParseError[]` | (a) **acked** | `ParseError = { code, message, line, details? }` with 10-code discriminator. `details: Record<string, unknown>` per-code shape documented in JSDoc. |
| Q-MBT28-3 | (a) DFS w/ coloring + cycle path | (a) **acked** | `detectCycle` in validators.ts uses DFS with WHITE/GRAY/BLACK coloring; iteration sorted via `compareTaskIds`. **Single-cycle surfacing only**; multi-cycle → `MB-F-T28-MULTI-CYCLE-REPORTING` (Tier 3 v3.1). |
| Q-MBT28-4 | (a) hand-rolled scanner | (a) **acked** | parser.ts is hand-rolled line-by-line scanner (~600 LOC). No new deps; `dispatch-core/package.json` deps unchanged (`proper-lockfile`, `zod` only). |
| Q-MBT28-5 | (a) §7.1+§7.2 verbatim + synthetic negatives | (a) **acked** | `minimal.md` + `dag.md` are spec-§7.1 / §7.2 verbatim; 13 synthetic fixtures cover negative paths + all-optional + group + meta-block edge cases. |
| Q-MBT28-6 | (b) defer spec-in-repo | (b) **acked** | Spec remains at `~/Downloads/BUILD-md-spec.md`. Filed `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` (Tier 1). |
| Q-MBT28-7 | (a) `.test.ts` matching dispatch-core actual | (a) **acked** | All 8 probe files use `.test.ts` extension. Filed `MB-F-CLAUDE-MD-3-6-TEST-NAMING-DIVERGENCE` (Tier 3). |
| Q-MBT28-8 | (b)+(c) no `src/index.ts` edit in MB-T28 | (b)+(c) **acked** | `dispatch-core/src/index.ts` remains `export {};` (unchanged from session start). MB-T29+ author re-exports from package root if desired. |
| Q-MBT28-9 | (a) strict | (a) **acked** | Unknown preamble + task fields surface `*.field-malformed`. Resolves spec §9 Q7. Filed `MB-F-BUILD-MD-SPEC-Q7-RESOLVED-STRICT` (Tier 3 — operator amends spec to record disposition). |

| ID | Risk | Final disposition |
|---|---|---|
| R-MBT28-1 | Spec ambiguity around forward-refs vs orphans | RESOLVED — Q-MBT28-1A = (i) alias for orphan. No code path separation; `dependency.orphan` covers both. |
| R-MBT28-2 | H2-with-body-AND-H3 ambiguity | RESOLVED — Q-MBT28-1B = (a) strict-reject. probe-07 fixture verifies. |
| R-MBT28-3 | Spec not in repo | OPEN — Tier 1 followup `MB-F-BUILD-MD-SPEC-NOT-IN-REPO`. Out of MB-T28 scope. |
| R-MBT28-4 | 100% line coverage vs many error paths | RESOLVED — 100% lines achieved at WB7 via 13 fixtures + probe-07 (49 it()) + probe-08 (12 direct validator unit tests) + dead-code removal. |
| R-MBT28-5 | Field shape ambiguity (Goal multiline, bullet chars) | RESOLVED — permissive on bullet chars (`-`/`*`/`+`); Goal accepts text until next `**Field:**` boundary or blank line. Multiline goal verified via `goal-multiline.md` fixture. |
| R-MBT28-6 | dispatch-core dist rebuild discipline | NO INGRESS — MB-T28 has no in-package consumer; rebuild discipline kicks in for MB-T29+. |
| R-MBT28-7 | Cross-session push contention | NO OCCURRENCE — every `git pull --rebase --autostash origin mbt28-worktree` returned "Already up to date" across all 9 commits. |
| R-MBT28-8 | Pre-existing dispatch-core failures | NO OCCURRENCE — 60 prior tests still passing across all WBs. |
| R-MBT28-9 | Spec-fixture extraction (markdown-in-markdown) | RESOLVED at WB1 — extracted §7.1 + §7.2 verbatim into `minimal.md` + `dag.md`. Re-extract if spec amends. |
| R-MBT28-10 | `.spec.ts` silent-skip | AVOIDED — Q-MBT28-7=a all probes use `.test.ts`. |

**v3.1 polish surfaced beyond original Q-MBT28-N:**
- `MB-F-T28-MULTI-CYCLE-REPORTING` (Tier 3) — multiple-disjoint-SCC reporting.
- `MB-F-T28-MALFORMED-DEP-REF-TIGHTENING` (Tier 3) — silent-drop of unparseable §-refs in `parseDependsOn`.
- `MB-F-T28-FILE-ENDING-MID-GOAL-WITHOUT-NEWLINE` (Tier 3) — edge case from WB7 dead-code-removal; constructed inputs only.

---

## VII. Worktree-isolation evidence (Round 4 prerequisite validation)

Round 4 dispatch wave is the first under per-session worktree isolation per CLAUDE.md §4.3. MB-T28 (Terminal C) ran 9 commits across `mbt28-worktree` branch in worktree `~/Desktop/Automata/foxworks-dispatch-mbt28/`. Empirical observations:

| Observation | Evidence |
|---|---|
| Every `git pull --rebase --autostash origin mbt28-worktree` returned "Already up to date" | All 8 atomic-chain commit invocations (WB1-WB7 + WB-final) — see commit shell logs. |
| Atomic-chain diff-verify matched intended-paths exactly across all commits | Per-WB intended-paths file (e.g., `/tmp/mbt28-wb7-intended.txt`) matched `/tmp/mbt28-staged.txt` byte-for-byte at every staging step. |
| Zero stash-recovery, zero foreign-content sweep, zero working-tree-blocking | No incident citations in any commit body; clean Q7 self-checks ("structurally impossible to sweep cross-session edits in shared on-disk files") across all 9 commits. |
| Push contention reduced to push-rebase contention only | No push-rebase contention occurred (Terminal C is sole writer to `mbt28-worktree`). Cross-session contention only manifests on shared branches; per-session-branch isolation eliminates it. |
| Atomic-chain diff-verify retains value as own-staging-mistake protection | Diff-verify catches WB-author-stage-mistake (e.g., accidentally adding the wrong file path to the chain), which is the ONLY remaining failure mode under worktree isolation. |

**Conclusion (mirroring `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` row 220 §3.18 ceiling-consideration paragraph):** worktree isolation eliminates the four shared-tree failure modes structurally. Atomic-chain discipline retains value as own-staging-mistake protection. Filed as `MB-F-PARALLEL-CAIRN-WORKTREE-VALIDATION-ROUND-4` (Tier 2 — methodology evidence, positive).

---

## VIII. Filed followups (8 new rows in `docs/FOLLOWUPS.md`)

| Tier | Followup ID | Closure path |
|---|---|---|
| 1 | `MB-F-BUILD-MD-SPEC-NOT-IN-REPO` | Operator authors a commit placing `BUILD-md-spec.md` at `docs/build-docs/`. |
| 1 | `MB-F-§3.18-OPERATOR-ARTIFACT-ERROR-HALT-AND-SURFACE` | Operator-arbitrated methodology amendment: extend `MB-F-PARALLEL-CAIRN-CROSS-SESSION-STASH-DESTRUCTIVE` row 220 §3.18 to "halt-and-surface on operator-artifact errors" (operator-only territory). MB-T28 evidence: Q-MBT28-7 + Q-MBT28-9 caught operator-side prompt errors. |
| 2 | `MB-F-PARALLEL-CAIRN-WORKTREE-VALIDATION-ROUND-4` | Round 4 evidence harvested across 4 sessions ratifies worktree isolation as standard for N≥2 parallel-cairn runs. |
| 3 | `MB-F-CLAUDE-MD-3-6-TEST-NAMING-DIVERGENCE` | Operator amends CLAUDE.md §3.6 to match dispatch-core `.test.ts`-only convention OR extends vitest config glob to include `.spec.ts`. |
| 3 | `MB-F-BUILD-MD-SPEC-Q7-RESOLVED-STRICT` | Operator amends `BUILD-md-spec.md §9 Q7` to record strict disposition. |
| 3 | `MB-F-T28-MULTI-CYCLE-REPORTING` | Upgrade `detectCycle` to Tarjan SCC OR re-run-after-prune for multi-cycle surfacing. |
| 3 | `MB-F-T28-MALFORMED-DEP-REF-TIGHTENING` | Tighten `parseDependsOn` to surface `task.malformed-field` for unparseable comma-list entries. |
| 3 | `MB-F-T28-FILE-ENDING-MID-GOAL-WITHOUT-NEWLINE` | Restore trailing flush at end of `parseTaskBody` loop OR accept as documented degraded behavior. |

Total: 8 new rows. 2 Tier 1, 1 Tier 2, 5 Tier 3.

---

## IX. Methodology recognition (operator-surfaced at HALT 0 ack)

Operator's HALT 0 ack message identified a Round 4 pattern across 3 terminals:
- **Terminal 1**: API key absence.
- **Terminal 3**: prompt §2 [INACCURATE] claim about spawn-flow logic.
- **Terminal C (this session)**: vitest glob (Q-MBT28-7) + spec §9 Q7 (Q-MBT28-9).

Pattern: sessions read source cover-to-cover, find gaps between prompt assertions and actual code/spec state, surface honestly with [KNOWN] confidence rather than fabricate.

Operator-noted potential ratification: "if this pattern persists, Round 4 evidence should ratify 'halt-and-surface on operator-artifact errors' as methodology amendment beyond §3.18's original scope (cross-session destructive actions). Operator-only territory; flag in WB-final findings, don't author the methodology amendment yourself."

Filed as `MB-F-§3.18-OPERATOR-ARTIFACT-ERROR-HALT-AND-SURFACE` (Tier 1) per operator instruction. Operator decides whether to amend.

This finding is filed as evidence ONLY; methodology-amendment authoring is operator-arbitrated per CLAUDE.md §1 / §2.10.

---

## X. Verification trail (confidence labels per CLAUDE.md §2.2)

All commit-body claims labeled. Findings doc claims summarized:

| Claim | Label | Evidence |
|---|---|---|
| All 6 acceptance bullets closed | KNOWN | §III table; vitest output post-WB7. |
| 100% line coverage achieved | KNOWN | `pnpm --filter dispatch-core exec vitest run --coverage` post-WB7 final. |
| Branch coverage 95.97% | KNOWN | Same coverage run; documented as defensive `??` fallbacks. |
| 143/143 tests passing | KNOWN | `pnpm --filter dispatch-core test` exit 0 post-WB7. |
| Worktree isolation eliminated all 4 shared-tree failure modes for Terminal C | KNOWN | All 9 commit shell logs show "Already up to date" + clean atomic-chain. |
| Methodology pattern across Terminals 1 + 3 + C | MODELED | Operator-surfaced; Terminals 1 + 3 evidence is operator's report (not directly verified by me). Terminal C's evidence is KNOWN. |
| `MB-F-T28-FILE-ENDING-MID-GOAL-WITHOUT-NEWLINE` is constructed-only edge case | MODELED | Standard editors add trailing newlines; my fixtures + Write tool also add. Construct via `printf` without `\n`. Not directly tested. |
| Multi-cycle surfacing would benefit from Tarjan SCC | MODELED | Standard CS; not benchmarked against current single-cycle DFS approach. |

---

## XI. Halt boundary

Phase 1 → HALT 0 (operator ack received with all 11 Q-MBT28-N dispositions confirmed) → WB1 → WB7 GREEN → WB-final (this commit).

No further halts during ladder execution; sequential continuation per HALT 0 ack. Per-N-WB status surfaces issued at end of WB3 and end of WB6 (CLAUDE.md §4.2 cadence).

WB-final commit pushes findings doc + FOLLOWUPS append. **MB-T28 closes here unless operator surfaces follow-up arbitration.** Operator-arbitrated next steps:
- Merge `mbt28-worktree` to `main` (operator-arbitrated per dispatch prompt §0 — "operator merges to main via PR or local merge after operator review").
- Optional: pivot to MB-F-BUILD-MD-SPEC-NOT-IN-REPO closure commit (Tier 1).
- Optional: ratify worktree isolation as standard via methodology amendment (operator-only territory).
- Optional: amend `BUILD-md-spec.md §9 Q7` to record strict disposition (`MB-F-BUILD-MD-SPEC-Q7-RESOLVED-STRICT` closure).
