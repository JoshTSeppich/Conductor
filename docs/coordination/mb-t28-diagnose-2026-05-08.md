# MB-T28 Phase 1 Diagnose — BUILD.md parser + DAG builder

**Terminal:** C (parallel-cairn 4-session run; per-session worktree isolation)
**Date:** 2026-05-08
**Working tree:** `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch-mbt28` (branch `mbt28-worktree`, clean)
**Origin parity:** HEAD = `c6ee1fa` (Round 3 cleanup); `git log origin/mbt28-worktree..HEAD` empty.
**Companion:** `docs/coordination/mb-t28-decisions-2026-05-08.md` (operator-skim review surface).
**Spec read:** `~/Downloads/BUILD-md-spec.md` (349 lines, cover-to-cover) — see R-MBT28-3 re: spec lives outside repo.

Inventory of the surface, schema proposal, decisions, risks, and ladder shape for MB-T28. Source of truth on dispositions = decisions doc. This file = full prose + verification trail.

---

## I. Ticket scope (operator prompt §2)

> **Title:** BUILD.md parser + DAG builder + parse-error surfacing
>
> **In scope:** TS parser at `packages/dispatch-core/src/build-doc-parser/`; `parseBuildDoc(text) → { ok: true, dag } | { ok: false, errors }`; preamble + task-section + DAG + cycle + orphan + duplicate-branch detection; line-numbered ParseErrors; spec §7.1 + §7.2 fixtures + cyclic + orphan + bad fixtures; 100% line coverage; pure-fn (no I/O).
>
> **Out of scope:** UI (T23/T30), auto-reload (T32), classifier (T29), dispatch loop (T30), profiles (T33).

Operator-prompt-stated open questions (§3 Phase 1 list): Q-MBT28-1..5 enumerated below + tentative dispositions in companion decisions doc.

Operator-confirmed scope context: "BUILD.md is in v3.0 ship-gate scope. Family C (T28-T33) is critical path, not deferred to v3.1." (§0 of dispatch prompt).

---

## II. Surface inventory (verified via tool reads)

### II-A. dispatch-core src layout
- `packages/dispatch-core/src/` — top-level dirs: `lib/`, `persist/`, `prompt/`, `registry/`, `state/`, `transport/`, `v2/`, `v3/`. [KNOWN, ls]
- `packages/dispatch-core/src/index.ts` — `export {};` (empty). [KNOWN, read]
- New parser dir: `packages/dispatch-core/src/build-doc-parser/` (matches prompt §3 WB1 + project §3.1 "every cross-package contract goes through dispatch-core"). [KNOWN — directory does not yet exist; will be created in WB1].
- Adding to `src/index.ts` public exports is operator-supervised mechanical translation per project §3.4 → surface for ack at HALT 0 (Q-MBT28-8).

### II-B. dispatch-core test layout + conventions
- `test/unit/<descriptor>.test.ts` flat-file pattern + nested dir (e.g., `test/unit/atomic-write-lock/atomic-write-lock.test.ts`). [KNOWN, ls]
- `vitest.config.ts:5` glob: `'test/**/*.test.{ts,tsx}'` — matches `.test.ts` ONLY, NOT `.spec.ts`. [KNOWN, read]
- `package.json` scripts: `test` = `vitest run --passWithNoTests`. NO `test:coverage` script. [KNOWN, read]
- `pnpm-lock.yaml` — `@vitest/coverage-v8@4.1.5` IS installed at workspace root. [KNOWN, grep]
- Existing test convention (e.g. `test/unit/state-derive.test.ts`): `import { describe, it, expect } from 'vitest'`; imports from `../../src/<dir>/<file>.js` (ESM `.js` extension, NodeNext). [KNOWN, read].

### II-C. CLAUDE.md vs dispatch-core test convention divergence
- CLAUDE.md §3.6 says: "Test files: `probe-NN-<descriptor>.spec.ts` (unit) or `probe-NN-<descriptor>.test.ts` (integration)."
- Dispatch prompt §3 WB1 enumerates `probe-01-minimal.spec.ts` etc.
- Dispatch-core actual `vitest.config.ts:5` only includes `*.test.{ts,tsx}` — `.spec.ts` files would NOT be picked up by `pnpm --filter dispatch-core test`. [KNOWN, read].
- Dispatch prompt §2 acceptance: "Tests use vitest (consistent with rest of dispatch-core test conventions)." → dispositive.
- **Default disposition: use `.test.ts`, name `probe-NN-<descriptor>.test.ts`.** Surface as Q-MBT28-7 to confirm.

### II-D. BUILD-md-spec.md location
- Spec is at `~/Downloads/BUILD-md-spec.md` (operator-side staging, last modified 2026-05-06). [KNOWN, ls]
- NOT committed to `docs/build-docs/` of repo (only `CONDUCTOR_REASONING_ARCHITECTURE_v0.1_NOTES.md`, `CONDUCTOR_V3_RESCOPE.md`, `V3_TICKETS.md`). [KNOWN, ls]
- **Risk:** spec is named in dispatch prompt §0 as "frozen contract" but is not version-controlled. Future spec amendments may drift from in-repo fixtures without an in-repo source-of-truth anchor. Surface as Q-MBT28-6 / R-MBT28-3.

### II-E. Spec content map (per-section relevant findings)
- §1 — motivation; informational; no parser implications. [KNOWN]
- §2 — file location + lifecycle; parser is pure-fn so location/discovery/mtime are out of scope (MB-T32 territory). Versioning via git SHA at parse time = consumer concern. [KNOWN]
- **§3.1 — Required preamble.** Required fields: `Repo`, `Plan rev`. Optional: `Operator`, `Conductor profile`. Format: bold name + colon + value. First H1 = `# BUILD`. [KNOWN]
- **§3.2 — Section structure.** H2 = task UNLESS H3 subsections present (then H3 = task, H2 = "task group" — informational, NOT a task). Heading shape: `## §N — Title` or `### §N.M — Title`. [KNOWN]
- **§3.3 — Recognized fields.** Goal (req, paragraph), Branch (req, git branch name), `Depends on` (req, comma-list of `§N` refs OR `—`), Acceptance (req, bulleted list), Hints (opt, bulleted list), `Approval policy` (opt, `tight|medium|loose`), Model (opt, `S4.6|O4.6|O4.7·1M|H`), Tier (opt, `1|2|3`), Estimate (opt, "rough WB count" — free text), Cap (opt, e.g., `5%`), Speculative (opt, `true|false`). [KNOWN]
- **§3.4 — Cross-references.** `§N` = H2 task (only valid when no subsections); `§N.M` = H3 task; `§N` (when H3s present) = group reference ("all tasks in §N must be done"). "Forward references are an error." [KNOWN — wording ambiguous; see Q-MBT28-1A]
- **§3.5 — Meta-blocks.** H1 sections like `# Glossary` / `# Out of scope` are stripped during DAG construction. [KNOWN]
- §4 — Conductor's parsing contract. MUST validate preamble, build DAG, detect cycles, detect orphan deps, detect duplicate-branch-non-sequential, compute classification, surface plan summary. **Classification (done/running/ready/blocked) requires git history + runtime state → MB-T29 territory, NOT MB-T28.** Parser produces DAG; classifier consumes DAG + runtime state. [KNOWN + MODELED]
- §5-§6 — dispatch contract + profile config — out of scope (T30 + T33).
- **§7.1 — Minimal example.** 1 task, no deps, all required fields present. Fixture source. [KNOWN]
- **§7.2 — DAG with deps.** 3 tasks linear chain: §1 → §2 → §3. Fixture source. [KNOWN]
- §7.3 — Speculative + capped example. Showcases optional `Speculative: true` + `Cap: 5%`. Useful for field-coverage fixture but not in dispatch prompt's enumerated WB1 fixtures.
- §8 — out-of-scope items (multi-repo, composition, conditional, hot-reload, cross-conductor) — informational; nothing for parser to enforce.
- §9 — open arbitrations Q1-Q7 are *operator-side* spec arbitrations:
  - Q1 (Branch required?) — RESOLVED in §3.3 table as required ✓.
  - Q2 (auto-detect done from git?) — classifier territory (T29).
  - Q3 (Acceptance machine-checkable?) — classifier territory (T29).
  - Q4 (multi-file BUILD?) — out of scope (§8).
  - Q5 (interaction w/ other roadmap docs) — informational.
  - Q6 (profile location) — T33 territory.
  - **Q7 (lenient vs strict on unknown fields?)** — directly affects parser. UNRESOLVED in spec → my Q-MBT28-9 below.

### II-F. Frozen-contract surface review (per project §3.4 + dispatch prompt §5)
- `dispatch-core/src/v3/schema.ts` — frozen Zod spine. **MB-T28 does NOT touch.** Parser types live in NEW `build-doc-parser/types.ts`. If consumer-facing schemas need to enter Zod spine in future tickets (T29+), that's operator-arbitrated. [VERIFIED — no need to extend schema.ts in MB-T28].
- `WORKSTATION_CONTRACT.md`, `CONDUCTOR_API_CONTRACT.md`, `CONDUCTOR_V3_RESCOPE.md`, `REGISTRY.md` — frozen, untouched.
- `BUILD-md-spec.md` — frozen, untouched (and not in repo per II-D).

### II-G. Cross-session territory (per dispatch prompt §4)
- Terminal A (mbt24): Auto/Ask toggle — `dispatch-workstation/src/chat-shell/`.
- Terminal B (mbt25): Plan-usage ring — `dispatch-workstation/src/chat-shell/`.
- Terminal D (mbt34): Anthropic API client — likely `dispatch-core/src/lib/` or `dispatch-daemon/`.
- **MB-T28 territory:** `packages/dispatch-core/src/build-doc-parser/`, `test/fixtures/build-doc/`, `test/unit/build-doc-parser/`, `docs/coordination/mb-t28-*`, `docs/FOLLOWUPS.md`. **Disjoint from A/B; potential micro-overlap with D only on `dispatch-core/src/index.ts` if both export new symbols.** [MODELED — D's territory is unverified; default-defer to operator coordination.]
- Per-session worktree isolation per Round 4 §3.12 pivot — structurally impossible to sweep cross-session edits in shared on-disk files. Push contention only.

---

## III. Schema design proposal (for operator ack at HALT 0)

Per project §3.4 + dispatch prompt §3, the type surface is operator-supervised mechanical translation. Surface for review.

```typescript
// packages/dispatch-core/src/build-doc-parser/types.ts (proposed)

/** §N (H2) or §N.M (H3) per spec §3.4. Stored without `§` prefix internally. */
export type TaskId = string;  // e.g. "1", "3.1", "11"

export type ApprovalPolicy = 'tight' | 'medium' | 'loose';
export type ModelHint = 'S4.6' | 'O4.6' | 'O4.7·1M' | 'H';
export type Tier = 1 | 2 | 3;

export interface Task {
  id: TaskId;             // without § prefix
  title: string;          // text after "— " in heading
  goal: string;           // §3.3 required (paragraph)
  branch: string;         // §3.3 required (git branch name)
  dependsOn: TaskId[];    // resolved refs; empty for "—"; may include group ids
  acceptance: string[];   // §3.3 required (bullets)
  hints?: string[];
  approvalPolicy?: ApprovalPolicy;
  model?: ModelHint;
  tier?: Tier;
  estimate?: string;      // free text per spec ("rough WB count")
  cap?: string;           // e.g., "5%"
  speculative?: boolean;
  sourceLine: number;     // 1-indexed; for diagnostics
}

/** H2 section that contains H3 subsections per spec §3.2 + §3.4 group-ref semantics. */
export interface TaskGroup {
  id: TaskId;
  title: string;
  taskIds: TaskId[];      // child H3 task ids
  sourceLine: number;
}

export interface Preamble {
  repo: string;           // §3.1 required
  planRev: string;        // §3.1 required
  operator?: string;
  conductorProfile?: string;
}

export interface TaskDAG {
  preamble: Preamble;
  tasks: Task[];          // ordered as in source
  groups: TaskGroup[];
  /** Edges expressed as `from depends on to`. */
  edges: Array<{ from: TaskId; to: TaskId }>;
}

export type ParseErrorCode =
  | 'preamble.missing'
  | 'preamble.field-missing'
  | 'preamble.field-malformed'
  | 'task.missing-required-field'
  | 'task.malformed-field'
  | 'task.id-conflict'
  | 'task.malformed-heading'
  | 'dependency.orphan'                    // §X doesn't exist
  | 'dependency.cycle'                     // cycle detected
  | 'branch.duplicate-non-sequential';     // parallel tasks share a branch

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  line: number;           // 1-indexed; 0 if not attributable
  details?: Record<string, unknown>;
}

export type ParseResult =
  | { ok: true; dag: TaskDAG }
  | { ok: false; errors: ParseError[] };

export function parseBuildDoc(text: string): ParseResult;
```

Design notes:
- `TaskId` is a plain string without `§` prefix internally (cleaner for Map/Record keys; error messages re-prepend `§`).
- `Task.dependsOn` may contain group ids (e.g., `"3"`) — consumers expand if needed; edges are also exploded so direct edge consumers don't need to. *Open: should `edges` expand group refs into one edge per child, or carry group ids as edge endpoints? See Q-MBT28-1C.*
- `TaskDAG.tasks` is `Task[]` (ordered). Consumers build their own `Map`/`Record` lookups. Avoids API surface bloat.
- `ParseError.details` is `Record<string, unknown>` (flexible). Cycle errors carry `cyclePath: TaskId[]`; orphans carry `missingRef: TaskId`. Documented per-code in JSDoc.
- `parseBuildDoc` is the sole exported function (plus types). No I/O, no side effects, no globals.

---

## IV. Open questions (Q-MBT28-N)

Tentative dispositions live in companion decisions doc. Full reasoning below.

### Q-MBT28-1 — spec ambiguity check (§3.1-§3.7)

Three sub-points encountered while reading:

- **Q-MBT28-1A: "Forward references are an error" (§3.4) — semantics?**
  - Interpretation (i): orphan-equivalent — reference to §X that doesn't exist anywhere.
  - Interpretation (ii): document-order constraint — reference to §X defined LATER than the referencing task in source order.
  - Spec §4 separately enumerates "orphan deps" as its own error class, suggesting (i) is already covered there → "forward references" might mean (ii). But (ii) is unusual for DAG languages; valid DAGs commonly have references to later-defined nodes.
  - **Tentative:** treat as (i) — alias for orphan. The §4 wording is the formal detection; §3.4 wording is informal. Surface for confirmation. If operator picks (ii), parser adds a separate error code `dependency.forward-reference`.

- **Q-MBT28-1B: H2 with body content AND H3 subsections — task or group?**
  - §3.2 example for §3 shows H2 with title only and direct H3 children (no body content under H2).
  - Spec doesn't say what happens if H2 has body fields (Goal, Branch, etc.) AND H3 subsections.
  - **Tentative:** strict — error `task.malformed-heading` if H2 has both body fields and H3 children. Operator may want lenient (treat H2 fields as defaults inherited by H3s) but spec doesn't say so. Surface.

- **Q-MBT28-1C: Group reference edge expansion?**
  - Spec §3.4: `§3` (when §3 has subsections) = "all tasks in §3 must be done". Means "task X depends on §3" expands to N edges (X → §3.1, X → §3.2, ...).
  - **Question:** does the parser expose group refs as edges to the *group* node, or expand into edges to *children*?
  - **Tentative:** expand into edges to children. `Task.dependsOn` keeps the group id (`"3"`) for round-trip fidelity; `TaskDAG.edges` carries the *expanded* edges. Cycle/orphan checks operate on expanded edges. Surface.

### Q-MBT28-2 — error reporting format

Options:
- **(a)** Single flat `ParseError[]` with `{ code, message, line, details? }`. Discriminated by `code`.
- **(b)** Tagged-union per error code (TS narrowing on `error.code === 'dependency.cycle'` reveals `error.cyclePath`).
- **(c)** Structured AST with embedded errors at AST nodes.

**Tentative: (a)** — flat list. `details: Record<string, unknown>` carries per-code structured data. Simpler test surface; downstream code can narrow on `code` and assert details shape. (b) is more type-safe but adds API surface. (c) is over-engineered for a parser whose primary consumer is a CLI/UI surfacing errors to operator.

### Q-MBT28-3 — cycle detection algorithm

Options:
- **(a)** DFS with white/gray/black coloring. Reports cycle path.
- **(b)** Tarjan's SCC. Reports all SCCs (multiple cycles).
- **(c)** Kahn's algorithm (toposort with cycle as residual).

**Tentative: (a)** — simple DFS. Reports the *first* cycle path found; if multiple cycles, parser surfaces them iteratively (re-run after each pruned cycle) OR surfaces only the first (operator fixes, re-parses). Tarjan is overkill for a config-doc parser. Kahn's reports cycle existence but not the offending path; less diagnostic.

### Q-MBT28-4 — parser library

Options:
- **(a)** Hand-rolled line-by-line scanner. ~200-400 LOC parser.
- **(b)** Markdown library (remark, marked) for AST + custom logic for §3.x sections.

**Tentative: (a)** — hand-rolled. The schema is constrained (specific H1/H2/H3 + specific bold-prefixed fields). A markdown lib introduces dependency surface for a parser that needs precise rejection of malformed input; lib AST parsers are also lenient by design (won't reject typos cleanly). Hand-rolled keeps full control + zero new deps. Existing `dispatch-core/package.json` deps: `proper-lockfile`, `zod` only — adding remark would be a dep escalation.

### Q-MBT28-5 — fixture authoring

Options:
- **(a)** Copy spec §7.1 + §7.2 verbatim as fixture files (preserves spec ↔ fixture parity).
- **(b)** Author canonical fixtures alongside spec (spec is illustration, fixtures are exhaustive).

**Tentative: (a) + augmentation.** Copy §7.1 + §7.2 verbatim into `minimal.md` + `dag.md` (verbatim string match against spec doc; if spec ever amends, fixtures can be re-extracted). Augment with synthetic fixtures for negative cases (cyclic, orphan, duplicate-branch, missing-preamble, malformed-field) that don't exist in spec §7. Each negative fixture is comment-headed with the error code(s) it exercises.

### Q-MBT28-6 — spec-in-repo

Spec lives at `~/Downloads/BUILD-md-spec.md`, not committed. Options:
- **(a)** Copy spec into `docs/build-docs/BUILD-md-spec.md` as part of MB-T28 Phase 1 commit (operator-arbitrated content; but the *commit* is mechanical translation — operator amends spec → operator amends in-repo copy).
- **(b)** Leave spec out of repo; MB-T28 references it only via comment / fixture text.
- **(c)** Defer to a separate operator-arbitrated commit (not part of this ticket).

**Tentative: (c)** — defer. Avoiding scope creep. Spec-in-repo is its own operator decision; out of MB-T28's lane. Surface as Tier-1 followup `MB-F-BUILD-MD-SPEC-NOT-IN-REPO`.

### Q-MBT28-7 — test file naming convention (CLAUDE.md §3.6 vs dispatch-core actual)

CLAUDE.md §3.6: `probe-NN-<descriptor>.spec.ts` (unit) vs dispatch-core `vitest.config.ts:5` glob `*.test.{ts,tsx}` (no `.spec.ts`).

Options:
- **(a)** Use `.test.ts` matching dispatch-core actual. File names `probe-NN-<descriptor>.test.ts`.
- **(b)** Use `.spec.ts` per CLAUDE.md §3.6 + dispatch prompt §3 wording, AND extend `vitest.config.ts:5` glob to include `.spec.ts`.

**Tentative: (a).** Dispatch prompt §2 acceptance: "Tests use vitest (consistent with rest of dispatch-core test conventions)" — dispositive. Avoid touching `vitest.config.ts` mid-ticket. File CLAUDE.md §3.6 ↔ dispatch-core convention divergence as Tier-3 docs followup.

### Q-MBT28-8 — `dispatch-core/src/index.ts` public exports

Per dispatch prompt §5: "If your work needs to extend `packages/dispatch-core/src/index.ts` or other dispatch-core public exports, surface to operator for ack first."

`src/index.ts` is currently `export {};`. MB-T28 produces `parseBuildDoc` + types in `src/build-doc-parser/`. Question: does parser need to be re-exported from the package root?

Options:
- **(a)** Re-export from `src/index.ts` so consumers `import { parseBuildDoc } from 'dispatch-core'`.
- **(b)** Consumers import via deep path `from 'dispatch-core/dist/build-doc-parser/index.js'` (per project §3.4 dist/.js discipline).
- **(c)** Defer — MB-T29 (next consumer) will re-export when it builds against parser.

**Tentative: (b) + (c) hybrid** — do NOT modify `src/index.ts` in MB-T28. Consumers import via deep path. MB-T29 author may re-export from the package root if desired (operator-arbitrated then). MB-T28 stays in disjoint territory.

### Q-MBT28-9 — strict vs lenient unknown-fields (operator-side spec Q7)

Spec §9 Q7 left this open. The parser MUST decide.

Options:
- **(a)** Strict — unknown fields = `task.malformed-field` error.
- **(b)** Lenient — unknown fields = warning (warning channel doesn't exist in current schema; would be added).
- **(c)** Lenient — unknown fields silently ignored.

**Tentative: (a) strict.** Cairn discipline favors strictness — typos surface immediately. If operator wants lenient, easy to flip in WB7 polish. If strict, narrative is also easier to test (every unknown field exercises an error path → 100% coverage). Surface for confirmation; this also moves the spec §9 Q7 arbitration forward.

---

## V. Risks (R-MBT28-N)

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| R-MBT28-1 | Spec ambiguity around "forward references" (§3.4) vs "orphan deps" (§4) | LOW | Q-MBT28-1A surfaces; operator clarifies. Default = treat as alias. |
| R-MBT28-2 | H2 with body + H3 children edge case | LOW | Q-MBT28-1B surfaces; default = strict reject. |
| R-MBT28-3 | BUILD-md-spec.md not version-controlled in repo | MEDIUM (drift risk for future amendments) | Q-MBT28-6 + Tier-1 followup `MB-F-BUILD-MD-SPEC-NOT-IN-REPO`. Out of MB-T28 scope. |
| R-MBT28-4 | 100% line coverage requirement vs hand-rolled parser's many error paths | MEDIUM | Each negative fixture exercises a code path. WB7-WB8 close gaps via targeted fixtures. Coverage verified via `pnpm --filter dispatch-core exec vitest run --coverage` at WB-final. |
| R-MBT28-5 | Field shape ambiguity (Goal "paragraph" — multiline?; Hints bullet char `-`/`*`/`+`) | LOW | Permissive on bullet char (`-`, `*`, `+`); Goal accepts text until next `**Field:**` boundary. Surface in WB2 commit body. |
| R-MBT28-6 | dispatch-core dist rebuild discipline (project §3.4) | LOW | Build dist before any cross-package consumer reads parser output. MB-T28 has no cross-package consumer in this ladder; rebuild discipline kicks in for MB-T29+. Note in WB-final findings. |
| R-MBT28-7 | Cross-session push contention on `mbt28-worktree` (only) | NEAR-ZERO | Each session pushes to own branch under worktree isolation. Pull-rebase only on own branch (no other writers). |
| R-MBT28-8 | Pre-existing dispatch-core test failures (CLAUDE.md §4.5) | ZERO new | NOT re-diagnosed. WB-final notes any encountered. |
| R-MBT28-9 | Markdown-in-markdown spec-fixture extraction (§7.1, §7.2 are inside spec doc code blocks) | LOW | Hand-extract once; commit as static fixture files. Re-extract if spec amends. |
| R-MBT28-10 | `vitest.config.ts:5` `.test.ts`-only glob skips `.spec.ts` files silently | LOW | Q-MBT28-7 default (a) `.test.ts` avoids this entirely. |

---

## VI. WB ladder shape (subject to ack)

Per dispatch prompt §3 — 6-8 WBs. Tentative split:

| WB | Concern | Output | Acceptance bullet closed |
|---|---|---|---|
| WB1 | Red scaffold | `src/build-doc-parser/{index,types,parser,dag-builder,validators}.ts` (RED stubs) + 6 fixtures + 6 RED probes | (none yet — all RED) |
| WB2 | §3.1 preamble parsing | Green: missing preamble error, missing required fields error, malformed fields | "Detects malformed sections, missing required fields" (partial) |
| WB3 | §3.2 task section parsing (H2/H3 + group detection + heading parse) | Green: valid task extraction; `task.id-conflict`, `task.malformed-heading` | "Detects malformed sections" (continued) |
| WB4 | §3.3 field parsing + §3.4 ref resolution + DAG construction | Green: §7.1 + §7.2 fixtures parse correctly with edges | "Parses §7.1 minimal", "Parses §7.2 DAG with correct edges" |
| WB5 | Cycle detection | Green: cyclic fixture surfaces `dependency.cycle` with path | "Detects cycles" |
| WB6 | Orphan deps + duplicate-branch-non-sequential + missing-preamble error polish | Green: orphan, duplicate-branch, missing-preamble fixtures | "Detects orphan deps", "Detects duplicate-branch-non-sequential" |
| WB7 | Error surfacing polish — line numbers, message consistency, ParseError shape contract | Green: line numbers asserted on every error | (consistency baseline for all error paths) |
| WB8 | Coverage closure + downstream-type-shape sanity check | Green: 100% line coverage; types satisfy MB-T29 expected shape (operator review) | "100% line coverage" |
| WB-final | Findings doc + followups | `docs/coordination/mb-t28-findings-2026-05-08.md` + FOLLOWUPS appends | (verification surface) |

8 WBs + 1 WB-final = 9 commits total. Falls within 6-8 envelope (WB-final is docs-only, doesn't count as ladder cycle).

---

## VII. Verification trail (confidence labels)

All claims labeled per CLAUDE.md §2.2:

| Claim | Label | Evidence |
|---|---|---|
| Worktree at `/Users/joshuatseppich/Desktop/Automata/foxworks-dispatch-mbt28` on `mbt28-worktree`, clean | KNOWN | `pwd` + `git rev-parse --abbrev-ref HEAD` + `git status --short` (this session) |
| HEAD at `c6ee1fa`; origin parity | KNOWN | `git log --oneline -3` (this session) |
| 4-worktree setup with mbt24/25/28/34 + main all at c6ee1fa | KNOWN | `git worktree list` (this session) |
| Spec at `~/Downloads/BUILD-md-spec.md` (349 lines, mtime 2026-05-06) | KNOWN | `ls -la` + Read (this session) |
| Spec content per §I-§9 above | KNOWN | Read full spec (this session) |
| `dispatch-core/src/` directory layout | KNOWN | `ls` (this session) |
| `dispatch-core/vitest.config.ts:5` glob `*.test.{ts,tsx}` | KNOWN | Read (this session) |
| `dispatch-core/package.json` lacks `test:coverage` script | KNOWN | Read (this session) |
| `@vitest/coverage-v8@4.1.5` installed at workspace root | KNOWN | grep pnpm-lock.yaml (this session) |
| existing `state-derive.test.ts` import pattern | KNOWN | Read (this session) |
| docs/coordination/ + docs/FOLLOWUPS.md exist | KNOWN | `ls` (this session) |
| MB-T29/T30 schema-shape requirements | MODELED | Inferred from dispatch prompt §4 + ticket inventory; not directly verified against MB-T29/T30 ticket text. |
| Forward-reference semantics in spec §3.4 | SPECULATIVE | Spec wording ambiguous; surfaced as Q-MBT28-1A. |
| `.spec.ts` would not be picked up by current vitest config | KNOWN | Read vitest.config.ts:5 glob; matches `.test.{ts,tsx}` only. |
| Hand-rolled parser is feasible in ~200-400 LOC | MODELED | Estimate from spec complexity; not yet implemented. |
| Cycle detection via DFS sufficient | MODELED | Standard CS — correct for any directed graph. |
| `dispatch-core/src/index.ts` is `export {};` (empty) | KNOWN | Read (this session). |
| Terminal D (mbt34) territory likely `dispatch-core/src/lib/` or `dispatch-daemon/` | SPECULATIVE | Inferred from MB-T34 ticket title (Anthropic API client); not verified against T34 prompt. |

---

## VIII. Halt boundary

Phase 1 ends with this doc + companion decisions doc + atomic-chain commit + push. **HALT 0** until operator acks Q-MBT28-N dispositions (§1.3 — nothing happens during halt; no production-file authoring, no parser scaffolding, no test fixture pre-creation).

If operator partially acks (e.g., flips Q-MBT28-3 to Tarjan), I update the diagnose with the flip + proceed.
