# MB-T28 Decisions — BUILD.md parser + DAG builder

**Terminal:** C (parallel-cairn 4-session run; per-session worktree isolation)
**Date:** 2026-05-08
**Companion to:** `docs/coordination/mb-t28-diagnose-2026-05-08.md`
**Status:** Phase 1 dispositions PENDING operator markup. Operator acks (or flips) each Q-MBT28-N + R-MBT28-N before Phase 2 WB1.

This doc is the operator-skim review surface. Full inventory + risks + prose live in the diagnose doc; here, each question gets one row with the tentative disposition + the option set + a one-line rationale.

---

## Q-MBT28-N — open questions + tentative dispositions

| ID | Question | Options | Tentative | Rationale (1 line) |
|---|---|---|---|---|
| Q-MBT28-1A | **"Forward references are an error" (§3.4) — semantics?** | (i) alias for orphan / (ii) document-order constraint (refs must point earlier) | **(i) alias for orphan** | §4 has separate orphan-dep rule; §3.4 wording reads as informal restatement, not a stricter doc-order rule. |
| Q-MBT28-1B | **H2 with body fields AND H3 subsections — task or group?** | (a) error `task.malformed-heading` / (b) treat H2 as defaults inherited by H3s / (c) treat H2 fields as ignored | **(a) error** | Spec doesn't say; strict-reject avoids silent drift. Easy to relax later; hard to tighten. |
| Q-MBT28-1C | **Group reference edge expansion in `TaskDAG.edges`?** | (a) expand into edges to children / (b) carry group id as edge endpoint | **(a) expand** | Cycle/orphan checks operate on a uniform task-only graph; consumers don't need to know group semantics to traverse edges. |
| Q-MBT28-2 | **Error reporting format** | (a) flat `ParseError[]` w/ `{code, message, line, details?}` / (b) tagged-union per code / (c) AST w/ embedded errors | **(a) flat list** | Simpler test surface; downstream narrows on `code`; details flexible. (b) is more type-safe but bloats API. |
| Q-MBT28-3 | **Cycle detection algorithm** | (a) DFS w/ white/gray/black coloring / (b) Tarjan SCC / (c) Kahn's toposort residual | **(a) DFS** | Reports cycle PATH (not just existence); minimal code; standard CS. Tarjan overkill for config-doc parser. |
| Q-MBT28-4 | **Parser library** | (a) hand-rolled scanner / (b) markdown lib (remark/marked) + custom logic | **(a) hand-rolled** | Constrained schema; need precise rejection; no new deps (current dispatch-core has 2 deps total). |
| Q-MBT28-5 | **Fixture authoring** | (a) §7.1 + §7.2 verbatim + synthetic negatives / (b) fully canonical fixtures | **(a) verbatim + synthetics** | Spec ↔ fixture parity for positive cases; synthetic for negatives (no spec coverage of bad input). |
| Q-MBT28-6 | **BUILD-md-spec.md not in repo (lives at `~/Downloads/`)** — should it be copied into `docs/build-docs/` as part of this ticket? | (a) yes, as part of Phase 1 commit / (b) no, defer to operator-arbitrated separate commit / (c) no, never (spec stays operator-side) | **(b) defer** | Spec-in-repo is its own operator decision; out of MB-T28 scope. File as Tier-1 followup `MB-F-BUILD-MD-SPEC-NOT-IN-REPO`. |
| Q-MBT28-7 | **Test file naming (CLAUDE.md §3.6 `.spec.ts` vs dispatch-core `vitest.config.ts:5` `.test.ts`-only glob)** | (a) `.test.ts` matching dispatch-core actual / (b) `.spec.ts` per CLAUDE.md + extend vitest config glob | **(a) `.test.ts`** | Dispatch prompt §2: "consistent with rest of dispatch-core test conventions" is dispositive; avoid mid-ticket vitest-config edit. File CLAUDE.md docs gap as Tier-3 FU. |
| Q-MBT28-8 | **`dispatch-core/src/index.ts` re-export of `parseBuildDoc`?** | (a) re-export from `src/index.ts` / (b) deep import from `dispatch-core/dist/build-doc-parser/index.js` only / (c) defer to MB-T29 | **(b) + (c) hybrid — no `src/index.ts` edit in MB-T28** | Disjoint territory discipline; MB-T28 has no in-package consumer; MB-T29 author re-exports if desired. |
| Q-MBT28-9 | **Strict vs lenient on unknown task fields (spec §9 Q7 unresolved)** | (a) strict — unknown = `task.malformed-field` / (b) lenient w/ warning channel / (c) lenient — silently ignore | **(a) strict** | Cairn discipline; typos surface immediately; easy to flip in WB7 polish; helps reach 100% coverage via dedicated negative fixtures. |

---

## R-MBT28-N — risks + dispositions

| ID | Risk | Severity | Disposition |
|---|---|---|---|
| R-MBT28-1 | Spec ambiguity around "forward references" (§3.4) vs "orphan deps" (§4) | LOW | **MITIGATE via Q-MBT28-1A** — operator confirms; default = alias for orphan. |
| R-MBT28-2 | H2 with body fields + H3 children edge case | LOW | **MITIGATE via Q-MBT28-1B** — default strict-reject. |
| R-MBT28-3 | BUILD-md-spec.md not version-controlled in repo | MEDIUM (drift risk) | **OUT OF MB-T28 SCOPE** — Tier-1 followup `MB-F-BUILD-MD-SPEC-NOT-IN-REPO`. Surface at WB-final. |
| R-MBT28-4 | 100% line coverage requirement vs hand-rolled parser's many error paths | MEDIUM | **MITIGATE** — each negative fixture exercises a code path; WB7-WB8 close gaps. Coverage via `pnpm --filter dispatch-core exec vitest run --coverage` at WB-final (no `test:coverage` script — invoke vitest directly). |
| R-MBT28-5 | Field shape ambiguity (Goal "paragraph" multiline?; Hints bullet char `-`/`*`/`+`) | LOW | **PERMISSIVE** on bullet chars; Goal accepts text until next `**Field:**` boundary. Document in WB2 commit body. |
| R-MBT28-6 | dispatch-core dist rebuild discipline (project §3.4) | LOW | **NO CROSS-PACKAGE CONSUMER IN MB-T28.** Note in WB-final findings; rebuild discipline kicks in for MB-T29+. |
| R-MBT28-7 | Cross-session push contention on `mbt28-worktree` | NEAR-ZERO | Each session pushes to own branch under worktree isolation; no other writers on this branch. |
| R-MBT28-8 | Pre-existing dispatch-core test failures (CLAUDE.md §4.5) | ZERO new | **NOT RE-DIAGNOSED.** WB-final notes any encountered. |
| R-MBT28-9 | Markdown-in-markdown spec-fixture extraction (§7.1, §7.2 are inside spec doc code blocks) | LOW | **HAND-EXTRACT ONCE** at WB1 fixture authoring; commit as static fixture files; re-extract if spec amends. |
| R-MBT28-10 | `vitest.config.ts:5` `.test.ts`-only glob silently skips `.spec.ts` files | LOW | **AVOID via Q-MBT28-7=a** — use `.test.ts` exclusively. |

---

## Schema design — operator-supervised mechanical translation per project §3.4

Full TS proposal in diagnose doc §III. Summary:

- `parseBuildDoc(text: string): { ok: true, dag: TaskDAG } | { ok: false, errors: ParseError[] }`
- `TaskDAG = { preamble, tasks: Task[], groups: TaskGroup[], edges: Array<{from, to}> }`
- `Task` carries all §3.3 fields + `sourceLine` for diagnostics.
- `TaskGroup` for H2-with-H3-subsections (group-ref resolution per spec §3.4).
- `ParseError = { code, message, line, details? }` with `code` discriminating union of 10 error kinds.
- Pure-fn; no I/O; no globals.
- Lives at `packages/dispatch-core/src/build-doc-parser/{index,types,parser,dag-builder,validators}.ts`.
- NO edit to `dispatch-core/src/v3/schema.ts` (frozen Zod spine).
- NO edit to `dispatch-core/src/index.ts` (deep-import only per Q-MBT28-8).

**Operator-ack request:** confirm shape. Specifically:
- `TaskId` as bare string (no `§` prefix) — OK?
- `Task.dependsOn` retains group ids while `TaskDAG.edges` is expanded to per-child (per Q-MBT28-1C) — OK?
- `ParseError.details: Record<string, unknown>` (flexible) — OK, or prefer tagged-union (Q-MBT28-2)?
- Discriminator on `ParseResult` is `ok: true | false` (boolean) — consistent with existing patterns?

---

## WB ladder shape (subject to ack)

Per dispatch prompt §3 — 6-8 WBs envelope. Tentative split (full table in diagnose §VI):

WB1 RED scaffold → WB2 preamble → WB3 task sections → WB4 fields + DAG → WB5 cycles → WB6 orphans/dup-branch/missing-preamble → WB7 error polish → WB8 coverage closure → WB-final docs/followups.

8 WBs + 1 docs WB. Falls within 6-8 envelope (docs-only WB doesn't count).

---

## Cross-session coordination

Per dispatch prompt §4: **disjoint territory** under per-session worktree isolation. MB-T28 territory is wholly within `packages/dispatch-core/src/build-doc-parser/` + `test/fixtures/build-doc/` + `test/unit/build-doc-parser/` + `docs/coordination/mb-t28-*` + `docs/FOLLOWUPS.md`. No coordination doc with A/B/D needed.

Push to `origin mbt28-worktree` only. Do NOT push to `origin main`.

---

## Operator markup template

When this doc returns from operator review, expected forms:

- **Unanimous accept:** "proceed with tentative dispositions, begin WB1."
- **Disposition flips:** e.g., "Q-MBT28-3 flip to (b); use Tarjan SCC. Re-plan WB5 to include all-cycles surfacing."
- **New question:** e.g., "Q-MBT28-10: should `Task.id` retain the `§` prefix for round-trip clarity?"
- **Schema flip:** e.g., "ParseError as tagged-union per Q-MBT28-2=b; updated types must cover X/Y/Z."
- **Rejected scope:** e.g., "MB-T28 deferred until BUILD-md-spec is in repo; close ticket as not-yet-actionable."

---

## Confidence labels

All claims in this decisions doc + companion diagnose doc carry CLAUDE.md §2.2 labels:
- **[KNOWN]** observations from this session's tool reads (`pwd`, `git`, file content, glob match)
- **[MODELED]** reasoned from observed facts + stated model (e.g., MB-T29/T30 schema-shape requirements)
- **[SPECULATIVE]** hypotheses without current evidence (e.g., spec §3.4 forward-reference exact semantics)

See diagnose §VII for explicit labels per claim.
